import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { StorageService } from '../storage/storage.service';
import { StripeService } from '../stripe/stripe.service';
import { TenantStatus, UserStatus, BuildStatus, PlanType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private storage: StorageService,
    private stripeService: StripeService,
    @InjectQueue('app-build') private buildQueue: Queue,
  ) {}

  // ─── Tenants ──────────────────────────────────────────────

  async listTenants(query: {
    search?: string;
    planType?: PlanType;
    status?: TenantStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.planType) {
      where.subscription = { plan: { planType: query.planType } };
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { apps: true, users: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    // Enrich with builds this month and storage per tenant
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const tenantIds = data.map((t) => t.id);

    const [buildCounts, storageSums] = await Promise.all([
      this.prisma.appBuild.groupBy({
        by: ['appId'],
        where: {
          app: { tenantId: { in: tenantIds } },
          createdAt: { gte: startOfMonth },
        },
        _count: true,
      }).then(async (rows) => {
        // Map appId → tenantId
        const apps = await this.prisma.app.findMany({
          where: { tenantId: { in: tenantIds } },
          select: { id: true, tenantId: true },
        });
        const appToTenant = new Map(apps.map((a) => [a.id, a.tenantId]));
        const result: Record<string, number> = {};
        for (const row of rows) {
          const tid = appToTenant.get(row.appId);
          if (tid) result[tid] = (result[tid] ?? 0) + row._count;
        }
        return result;
      }),
      this.prisma.appBuild.groupBy({
        by: ['appId'],
        where: {
          app: { tenantId: { in: tenantIds } },
          status: 'COMPLETED',
          artifactSize: { not: null },
        },
        _sum: { artifactSize: true },
      }).then(async (rows) => {
        const apps = await this.prisma.app.findMany({
          where: { tenantId: { in: tenantIds } },
          select: { id: true, tenantId: true },
        });
        const appToTenant = new Map(apps.map((a) => [a.id, a.tenantId]));
        const result: Record<string, number> = {};
        for (const row of rows) {
          const tid = appToTenant.get(row.appId);
          if (tid) result[tid] = (result[tid] ?? 0) + (row._sum.artifactSize ?? 0);
        }
        return result;
      }),
    ]);

    const enriched = data.map((t) => ({
      ...t,
      buildsThisMonth: buildCounts[t.id] ?? 0,
      storageBytes: storageSums[t.id] ?? 0,
    }));

    return { data: enriched, total, page, limit };
  }

  async getTenantDetail(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: {
          select: {
            id: true, email: true, role: true, status: true,
            firstName: true, lastName: true, createdAt: true,
            deletionRequestedAt: true,
          },
        },
        apps: {
          where: { deletedAt: null },
          include: {
            builds: { take: 5, orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const usage = await this.subscriptionService.getTenantUsage(id);
    return { ...tenant, usage };
  }

  async updateTenantStatus(id: string, status: TenantStatus) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.prisma.tenant.update({ where: { id }, data: { status } });

    if (status === 'SUSPENDED') {
      // Only suspend currently ACTIVE users (don't touch PENDING_DELETION)
      await this.prisma.user.updateMany({
        where: { tenantId: id, status: UserStatus.ACTIVE },
        data: { status: UserStatus.SUSPENDED },
      });
    } else if (status === 'ACTIVE') {
      // Only reactivate SUSPENDED users (don't touch PENDING_DELETION)
      await this.prisma.user.updateMany({
        where: { tenantId: id, status: UserStatus.SUSPENDED },
        data: { status: UserStatus.ACTIVE },
      });
    }

    return this.prisma.tenant.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } } },
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { users: { select: { status: true } }, apps: { select: { id: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const hasNonDeletionUsers = tenant.users.some(
      (u) => u.status !== UserStatus.PENDING_DELETION,
    );
    if (hasNonDeletionUsers) {
      throw new ForbiddenException(
        'No se puede eliminar un tenant con usuarios activos. Todos los usuarios deben tener solicitud de eliminación pendiente.',
      );
    }

    // STEP 1: storage cleanup. Per-artifact try/catch with continue —
    // a single broken artifact (already deleted, missing key) must not
    // abort the whole delete. Only abort if the phase itself throws an
    // uncaught error (rare programming bug). Moved here from the bottom
    // so that a catastrophic MinIO failure does not leave Stripe in an
    // inconsistent state.
    for (const app of tenant.apps) {
      try {
        const builds = await this.prisma.appBuild.findMany({
          where: { appId: app.id, artifactUrl: { not: null } },
          select: { artifactUrl: true },
        });
        for (const build of builds) {
          if (build.artifactUrl) {
            try { await this.storage.delete(build.artifactUrl); } catch { /* ignore */ }
          }
        }
        const keystore = await this.prisma.appKeystore.findUnique({
          where: { appId: app.id },
          select: { keystorePath: true },
        });
        if (keystore?.keystorePath) {
          try { await this.storage.delete(keystore.keystorePath); } catch { /* ignore */ }
        }
      } catch { /* continue with other apps */ }
    }

    // STEP 2: cancel Stripe subscription IMMEDIATELY. Only proceeds if
    // storage passed. If Stripe fails, abort — preferable to "BD deleted +
    // Stripe still billing" (the original Bug #7). Storage already deleted
    // is idempotent: a future rebuild regenerates artifacts.
    if (tenant.stripeCustomerId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { tenantId: id },
      });
      if (subscription?.stripeSubscriptionId) {
        try {
          // skipBdUpdate: la cascade de prisma.tenant.delete borra la
          // Subscription completa en milisegundos; el update interno de
          // cancelSubscription es redundante y crea estado fantasma si
          // falla entre las dos llamadas.
          await this.stripeService.cancelSubscription(id, {
            immediate: true,
            skipBdUpdate: true,
          });
        } catch (err: any) {
          console.error('[STRIPE_CANCEL_FAILED]', { tenantId: id, error: err });
          throw new InternalServerErrorException(
            'No se pudo cancelar la suscripción de Stripe. El delete ha sido abortado para evitar cargos huérfanos. Reintenta en unos minutos.',
          );
        }
      }
    }

    // STEP 3: cascade delete BD. Postgres local — failure here is
    // improbable but possible (deadlock, connection drop). If it happens
    // AFTER Stripe success, log a marker so the super-admin can reconcile
    // manually (Stripe is canceled but tenant still exists in BD).
    try {
      await this.prisma.tenant.delete({ where: { id } });
    } catch (err: any) {
      console.error('[STRIPE_BD_INCONSISTENT]', {
        tenantId: id,
        stripeCustomerId: tenant.stripeCustomerId,
        message: 'Stripe subscription canceled but tenant delete failed in DB. Reconcile manually.',
        error: err,
      });
      throw new InternalServerErrorException(
        'Error al eliminar el tenant en BD tras cancelar Stripe. Revisa los logs y contacta soporte para reconciliación manual.',
      );
    }
    return { deleted: true };
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(query: {
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true, status: true,
          firstName: true, lastName: true, company: true,
          createdAt: true, deletionRequestedAt: true,
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async toggleUserSuspension(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status === UserStatus.PENDING_DELETION) {
      throw new ForbiddenException(
        'No se puede cambiar el estado de un usuario con eliminación pendiente.',
      );
    }

    const newStatus = user.status === UserStatus.ACTIVE
      ? UserStatus.SUSPENDED
      : UserStatus.ACTIVE;

    return this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true, email: true, role: true, status: true,
        firstName: true, lastName: true,
      },
    });
  }

  async permanentDeleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status !== UserStatus.PENDING_DELETION) {
      throw new ForbiddenException(
        'Solo se pueden eliminar permanentemente usuarios con solicitud de eliminación pendiente.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Builds ──────────────────────────────────────────────

  async listBuilds(query: {
    status?: BuildStatus;
    tenantId?: string;
    appId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.appId) where.appId = query.appId;
    if (query.tenantId) where.app = { tenantId: query.tenantId };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.appBuild.findMany({
        where,
        include: {
          app: {
            select: { id: true, name: true, tenant: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appBuild.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async retryBuild(buildId: string) {
    const build = await this.prisma.appBuild.findUnique({
      where: { id: buildId },
      include: { app: { select: { id: true, tenantId: true } } },
    });
    if (!build) throw new NotFoundException('Build not found');

    if (build.status !== 'FAILED') {
      throw new ForbiddenException('Solo se pueden reintentar builds fallidos.');
    }

    // Validate subscription limits
    const buildCheck = await this.subscriptionService.canBuild(build.app.tenantId);
    if (!buildCheck.allowed) {
      throw new ForbiddenException(buildCheck.reason);
    }

    // Check no active build for same app
    const active = await this.prisma.appBuild.findFirst({
      where: {
        appId: build.appId,
        status: { in: ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'] },
      },
    });
    if (active) {
      throw new ConflictException('Ya hay un build en progreso para esta app.');
    }

    // Reset and re-queue
    await this.prisma.appBuild.update({
      where: { id: buildId },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        logOutput: null,
        startedAt: null,
        completedAt: null,
        artifactUrl: null,
        artifactSize: null,
      },
    });

    await this.prisma.app.update({
      where: { id: build.appId },
      data: { status: 'BUILDING' },
    });

    await this.buildQueue.add(
      'build-app',
      { buildId: build.id, appId: build.appId, buildType: build.buildType },
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );

    return this.prisma.appBuild.findUnique({ where: { id: buildId } });
  }

  // ─── Analytics ──────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTenants,
      totalApps,
      buildsThisMonth,
      storageAgg,
      tenantsByPlanRaw,
      weeklyRegistrations,
      moduleUsage,
      recentFailedBuilds,
      failedPaymentsCount,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.app.count({ where: { deletedAt: null } }),
      this.prisma.appBuild.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.appBuild.aggregate({
        where: { status: 'COMPLETED', artifactSize: { not: null } },
        _sum: { artifactSize: true },
      }),
      // Tenants by plan
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: true,
      }).then(async (groups) => {
        const plans = await this.prisma.subscriptionPlan.findMany();
        const planMap = new Map(plans.map((p) => [p.id, p.planType]));
        const result: Record<string, number> = {};
        for (const g of groups) {
          const pt = planMap.get(g.planId);
          if (pt) result[pt] = g._count;
        }
        return result;
      }),
      // Weekly registrations (last 12 weeks)
      this.prisma.$queryRaw<Array<{ week: string; count: number }>>`
        SELECT date_trunc('week', "createdAt")::date::text as week, COUNT(*)::int as count
        FROM "Tenant"
        WHERE "createdAt" >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week ASC
      `,
      // Module usage across all active apps
      this.prisma.$queryRaw<Array<{ module_id: string; count: number }>>`
        SELECT elem->>'moduleId' as module_id, COUNT(*)::int as count
        FROM "App", jsonb_array_elements(schema) AS elem
        WHERE elem->>'moduleId' IS NOT NULL
          AND "deletedAt" IS NULL
        GROUP BY module_id
        ORDER BY count DESC
        LIMIT 10
      `.then((rows) => rows.map((r) => ({ moduleId: r.module_id, count: r.count }))),
      // Recent failed builds
      this.prisma.appBuild.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          app: {
            select: { name: true, tenant: { select: { name: true } } },
          },
        },
      }),
      // Failed Stripe payments count (for dashboard alert)
      this.stripeService.listFailedInvoices().then((inv) => inv.length).catch(() => 0),
    ]);

    return {
      totals: {
        tenants: totalTenants,
        apps: totalApps,
        buildsThisMonth,
        storageBytes: storageAgg._sum.artifactSize ?? 0,
        tenantsByPlan: tenantsByPlanRaw,
        failedPaymentsCount,
      },
      weeklyRegistrations,
      moduleUsage,
      recentFailedBuilds,
    };
  }

  // ─── Billing Analytics ──────────────────────────────────────

  async getBillingAnalytics() {
    const [mrr, recentInvoices, failedPayments, mrrHistory] = await Promise.all([
      this.calculateMrr(),
      this.stripeService.listRecentInvoices(50),
      this.stripeService.listFailedInvoices(),
      this.calculateMrrHistory(6),
    ]);

    return { mrr, mrrHistory, recentInvoices, failedPayments };
  }

  private async calculateMrr(): Promise<{
    total: number;
    byPlan: Record<string, { count: number; revenue: number }>;
  }> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        plan: { planType: { not: PlanType.FREE } },
        OR: [
          { cancelAtPeriodEnd: false },
          { stripeCurrentPeriodEnd: { gte: new Date() } },
        ],
      },
      include: { plan: true },
    });

    const byPlan: Record<string, { count: number; revenue: number }> = {};
    let total = 0;

    for (const sub of subscriptions) {
      const planName = sub.plan.planType;
      const price = sub.plan.priceMonthly;
      if (!byPlan[planName]) byPlan[planName] = { count: 0, revenue: 0 };
      byPlan[planName].count += 1;
      byPlan[planName].revenue += price;
      total += price;
    }

    return { total, byPlan };
  }

  private async calculateMrrHistory(
    months: number,
  ): Promise<Array<{ month: string; mrr: number }>> {
    const now = new Date();
    const result: Array<{ month: string; mrr: number }> = [];

    // Get all plans for price lookup
    const plans = await this.prisma.subscriptionPlan.findMany();
    const planPriceMap = new Map(plans.map((p) => [p.id, p.priceMonthly]));

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      // Subscriptions that were active during this month:
      // created before monthEnd AND (expires after monthStart OR not cancelled)
      const activeSubs = await this.prisma.subscription.findMany({
        where: {
          plan: { planType: { not: PlanType.FREE } },
          createdAt: { lte: monthEnd },
          OR: [
            { expiresAt: { gte: monthStart } },
            { cancelAtPeriodEnd: false },
          ],
        },
        select: { planId: true },
      });

      let mrr = 0;
      for (const sub of activeSubs) {
        mrr += planPriceMap.get(sub.planId) ?? 0;
      }

      result.push({
        month: monthStart.toISOString().slice(0, 7),
        mrr,
      });
    }

    return result;
  }
}
