import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanType } from '@prisma/client';

export interface UsageStats {
  appsCount: number;
  buildsThisMonth: number;
  storageBytes: number;
}

interface BillableBreakdown {
  /** Apps en uso normal: deletedAt null. */
  active: number;
  /** Apps soft-deleted que conservan AppKeystore: ocupan slot por la
   *  identidad de firma en Play Store / App Store. */
  deletedWithKeystore: number;
  /** Suma — total de slots consumidos del plan. */
  total: number;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the breakdown of slots the tenant occupies. Active apps plus
   * soft-deleted apps that retain an AppKeystore — those keystores are the
   * merchant's identity for publishing updates on Play Store / App Store, so
   * "deleting" the app at SaaS level cannot release the slot without
   * abandoning that identity.
   */
  private async getBillableBreakdown(tenantId: string): Promise<BillableBreakdown> {
    const active = await this.prisma.app.count({
      where: { tenantId, deletedAt: null },
    });
    const deletedWithKeystore = await this.prisma.app.count({
      where: {
        tenantId,
        deletedAt: { not: null },
        keystore: { isNot: null },
      },
    });
    return { active, deletedWithKeystore, total: active + deletedWithKeystore };
  }

  /** Convenience: total only. Used by getTenantUsage where the breakdown
   *  is not surfaced to the client. */
  private async countBillableApps(tenantId: string): Promise<number> {
    const { total } = await this.getBillableBreakdown(tenantId);
    return total;
  }

  /**
   * Ensure a tenant has at least a FREE subscription. Self-healing for tenants
   * that were created before the SubscriptionPlan rows existed (or for users
   * registered while the seed had not been run). Idempotent — does nothing
   * if a subscription already exists.
   *
   * Throws if the FREE plan itself is missing (the seed must run first).
   */
  async ensureFreeSubscription(tenantId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (existing) return existing;

    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType: PlanType.FREE },
    });
    if (!freePlan) {
      throw new Error(
        'FREE SubscriptionPlan not found in database. Run `npx prisma db seed` to populate plans.',
      );
    }

    return this.prisma.subscription.create({
      data: {
        tenantId,
        planId: freePlan.id,
        expiresAt: new Date('2099-12-31'),
      },
    });
  }

  /** Get the tenant's current subscription with plan details */
  async getTenantPlan(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found for this tenant');
    }
    const usage = await this.getTenantUsage(tenantId);
    return { subscription, usage };
  }

  /** Calculate current usage for a tenant (billable slots: active + soft-deleted-with-keystore) */
  async getTenantUsage(tenantId: string): Promise<UsageStats> {
    const appsCount = await this.countBillableApps(tenantId);

    // Builds this calendar month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const buildsThisMonth = await this.prisma.appBuild.count({
      where: {
        app: { tenantId },
        createdAt: { gte: startOfMonth },
        status: { in: ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING', 'COMPLETED'] },
      },
    });

    // Storage: sum artifactSize of all completed builds for this tenant.
    // Soft-deleted apps are excluded — once the merchant deletes an app,
    // those bytes stop counting against the plan's storage cap. The slot
    // can stay occupied (keystore rule) but the storage is a separate
    // resource that does free up.
    const storageResult = await this.prisma.appBuild.aggregate({
      where: {
        app: { tenantId, deletedAt: null },
        status: 'COMPLETED',
        artifactSize: { not: null },
      },
      _sum: { artifactSize: true },
    });
    const storageBytes = storageResult._sum.artifactSize ?? 0;

    return { appsCount, buildsThisMonth, storageBytes };
  }

  /** Check if a tenant can create a new app */
  async canCreateApp(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    // Self-heal: if tenant has no subscription, assign FREE automatically
    if (!subscription) {
      try {
        await this.ensureFreeSubscription(tenantId);
        subscription = await this.prisma.subscription.findUnique({
          where: { tenantId },
          include: { plan: true },
        });
      } catch (err: any) {
        return { allowed: false, reason: err?.message ?? 'No tienes una suscripción activa.' };
      }
    }
    if (!subscription) {
      return { allowed: false, reason: 'No tienes una suscripción activa.' };
    }

    // Auto-downgrade expired paid subscriptions to FREE (force=true to skip active app check)
    // null expiresAt means "no expiry"; FREE plans never expire
    if (
      subscription.plan.planType !== PlanType.FREE &&
      subscription.expiresAt &&
      subscription.expiresAt < new Date()
    ) {
      await this.changePlan(tenantId, PlanType.FREE, undefined, true);
      return { allowed: false, reason: 'Tu suscripción ha expirado. Tu plan ha sido cambiado a Free.' };
    }

    const billable = await this.getBillableBreakdown(tenantId);
    if (billable.total >= subscription.plan.maxApps) {
      // Decisión consciente: cuando el cliente tiene apps activas Y borradas-con-keystore
      // ocupando slots simultáneamente, prevalece el mensaje estándar. Primero hay que
      // resolver lo que el cliente sí puede resolver solo (borrar apps activas) antes de
      // mostrarle el problema más complejo del keystore que requiere soporte.
      if (billable.deletedWithKeystore > 0 && billable.active < subscription.plan.maxApps) {
        return {
          allowed: false,
          reason: `Tu plan ${subscription.plan.name} permite ${subscription.plan.maxApps} app(s). Tienes ${billable.active} activa(s) y ${billable.deletedWithKeystore} publicada(s) en stores que sigue(n) ocupando slot (las apps con firma de Play Store / App Store no liberan el slot al borrarse). Actualiza tu plan o contacta soporte si necesitas liberar la firma.`,
        };
      }
      return {
        allowed: false,
        reason: `Has alcanzado el límite de ${subscription.plan.maxApps} app(s) en tu plan ${subscription.plan.name}. Actualiza tu plan para crear más apps.`,
      };
    }

    return { allowed: true };
  }

  /** Check if a tenant can request a build */
  async canBuild(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    // Self-heal: if tenant has no subscription, assign FREE automatically
    if (!subscription) {
      try {
        await this.ensureFreeSubscription(tenantId);
        subscription = await this.prisma.subscription.findUnique({
          where: { tenantId },
          include: { plan: true },
        });
      } catch (err: any) {
        return { allowed: false, reason: err?.message ?? 'No tienes una suscripción activa.' };
      }
    }
    if (!subscription) {
      return { allowed: false, reason: 'No tienes una suscripción activa.' };
    }

    // Auto-downgrade expired paid subscriptions to FREE (force=true to skip active app check)
    // null expiresAt means "no expiry"; FREE plans never expire
    if (
      subscription.plan.planType !== PlanType.FREE &&
      subscription.expiresAt &&
      subscription.expiresAt < new Date()
    ) {
      await this.changePlan(tenantId, PlanType.FREE, undefined, true);
      return { allowed: false, reason: 'Tu suscripción ha expirado. Tu plan ha sido cambiado a Free.' };
    }

    if (!subscription.plan.canBuild) {
      return {
        allowed: false,
        reason: `Tu plan ${subscription.plan.name} no incluye builds. Actualiza a Starter o superior para generar tu app.`,
      };
    }

    // Check monthly build limit
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const buildsThisMonth = await this.prisma.appBuild.count({
      where: {
        app: { tenantId },
        createdAt: { gte: startOfMonth },
        status: { in: ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING', 'COMPLETED'] },
      },
    });

    if (buildsThisMonth >= subscription.plan.maxBuildsPerMonth) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de ${subscription.plan.maxBuildsPerMonth} builds/mes en tu plan ${subscription.plan.name}. Actualiza tu plan para más builds.`,
      };
    }

    // Check storage limit — exclude soft-deleted apps, paralleling getTenantUsage.
    // The merchant should not be blocked from a new build because of bytes from
    // an app they have already deleted.
    const storageResult = await this.prisma.appBuild.aggregate({
      where: {
        app: { tenantId, deletedAt: null },
        status: 'COMPLETED',
        artifactSize: { not: null },
      },
      _sum: { artifactSize: true },
    });
    const storageBytes = storageResult._sum.artifactSize ?? 0;
    const storageLimitBytes = subscription.plan.storageGb * 1024 * 1024 * 1024;

    if (storageBytes >= storageLimitBytes) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de almacenamiento (${subscription.plan.storageGb} GB) de tu plan ${subscription.plan.name}. Actualiza tu plan para más espacio.`,
      };
    }

    return { allowed: true };
  }

  /** Change a tenant's plan (SUPER_ADMIN or Stripe webhook) */
  async changePlan(
    tenantId: string,
    planType: PlanType,
    stripeData?: {
      stripeSubscriptionId?: string;
      currentPeriodEnd?: Date;
    },
    force = false,
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${planType} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Prevent downgrade if tenant has more billable slots than the new plan allows.
    // When the excess is caused by deleted-with-keystore apps, the client cannot
    // resolve it self-service (no UI to abandon a keystore) — redirect to support.
    if (!force) {
      const billable = await this.getBillableBreakdown(tenantId);
      if (billable.total > plan.maxApps) {
        const msg = billable.deletedWithKeystore > 0
          ? `Tienes ${billable.active} app(s) activa(s) y ${billable.deletedWithKeystore} publicada(s) en stores que conservan su firma. El plan ${plan.name} solo permite ${plan.maxApps} slot(s) en total. Para liberar las firmas y bajar de plan, contacta soporte — el procedimiento requiere revisión manual porque abandonar un keystore implica perder la posibilidad de actualizar esas apps en Play Store / App Store.`
          : `Tienes ${billable.active} apps activas. El plan ${plan.name} solo permite ${plan.maxApps}. Elimina ${billable.active - plan.maxApps} app(s) antes de cambiar de plan.`;
        throw new ForbiddenException(msg);
      }
    }

    // If Stripe provides period end, use it; otherwise fallback to hardcoded expiry
    const expiresAt = stripeData?.currentPeriodEnd
      ?? (planType === PlanType.FREE
        ? new Date('2099-12-31')
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        expiresAt,
        ...(stripeData?.stripeSubscriptionId && { stripeSubscriptionId: stripeData.stripeSubscriptionId }),
        ...(stripeData?.currentPeriodEnd && { stripeCurrentPeriodEnd: stripeData.currentPeriodEnd }),
        cancelAtPeriodEnd: false,
      },
      create: {
        tenantId,
        planId: plan.id,
        expiresAt,
        ...(stripeData?.stripeSubscriptionId && { stripeSubscriptionId: stripeData.stripeSubscriptionId }),
        ...(stripeData?.currentPeriodEnd && { stripeCurrentPeriodEnd: stripeData.currentPeriodEnd }),
      },
    });

    return this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { plan: true },
    });
  }

  /** List all plans available */
  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });
  }

  /** List all tenants with their subscription info (SUPER_ADMIN) */
  async listAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: { plan: true, tenant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Update plan limits/prices (SUPER_ADMIN only) */
  async updatePlan(planType: PlanType, data: {
    name?: string;
    maxApps?: number;
    maxBuildsPerMonth?: number;
    storageGb?: number;
    priceMonthly?: number;
    canBuild?: boolean;
    isWhiteLabel?: boolean;
  }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { planType } });
    if (!plan) throw new NotFoundException(`Plan ${planType} not found`);

    return this.prisma.subscriptionPlan.update({
      where: { planType },
      data,
    });
  }
}
