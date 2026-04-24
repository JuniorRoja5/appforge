import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanType } from '@prisma/client';

export interface UsageStats {
  appsCount: number;
  buildsThisMonth: number;
  storageBytes: number;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

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

  /** Calculate current usage for a tenant (active apps only for display) */
  async getTenantUsage(tenantId: string): Promise<UsageStats> {
    const appsCount = await this.prisma.app.count({ where: { tenantId, deletedAt: null } });

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

    // Storage: sum artifactSize of all completed builds for this tenant
    const storageResult = await this.prisma.appBuild.aggregate({
      where: {
        app: { tenantId },
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
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
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

    const appsCount = await this.prisma.app.count({ where: { tenantId } });
    if (appsCount >= subscription.plan.maxApps) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de ${subscription.plan.maxApps} app(s) en tu plan ${subscription.plan.name}. Actualiza tu plan para crear más apps.`,
      };
    }

    return { allowed: true };
  }

  /** Check if a tenant can request a build */
  async canBuild(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
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

    // Check storage limit
    const storageResult = await this.prisma.appBuild.aggregate({
      where: {
        app: { tenantId },
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

    // Prevent downgrade if tenant has more active apps than the new plan allows
    if (!force) {
      const activeApps = await this.prisma.app.count({ where: { tenantId, deletedAt: null } });
      if (activeApps > plan.maxApps) {
        throw new ForbiddenException(
          `Tienes ${activeApps} apps activas. El plan ${plan.name} solo permite ${plan.maxApps}. Elimina ${activeApps - plan.maxApps} app(s) antes de cambiar de plan.`,
        );
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
