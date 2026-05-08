import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { PlanType } from '@prisma/client';
import Stripe from 'stripe';

const PLAN_PRICE_MAP: Partial<Record<PlanType, string>> = {
  [PlanType.STARTER]: process.env.STRIPE_PRICE_STARTER || '',
  [PlanType.PRO]: process.env.STRIPE_PRICE_PRO || '',
  [PlanType.RESELLER_STARTER]: process.env.STRIPE_PRICE_RESELLER_STARTER || '',
  [PlanType.RESELLER_PRO]: process.env.STRIPE_PRICE_RESELLER_PRO || '',
};

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly emailService: PlatformEmailService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }

  /** Get or create a Stripe customer for a tenant */
  async getOrCreateCustomer(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { take: 1, select: { email: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      name: tenant.name,
      email: tenant.users[0]?.email,
      metadata: { tenantId },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /** Create a Stripe Checkout Session for subscription */
  async createCheckoutSession(
    tenantId: string,
    planType: PlanType,
  ): Promise<{ url: string }> {
    if (planType === PlanType.FREE) {
      throw new BadRequestException('El plan Free no requiere pago.');
    }

    const priceId = PLAN_PRICE_MAP[planType];
    if (!priceId) {
      throw new BadRequestException(`No hay precio configurado para el plan ${planType}.`);
    }

    const customerId = await this.getOrCreateCustomer(tenantId);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel`,
      metadata: { tenantId, planType },
      subscription_data: {
        metadata: { tenantId, planType },
      },
    });

    return { url: session.url! };
  }

  /** Handle incoming Stripe webhook events */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    this.logger.log(`Webhook received — signature present: ${!!signature}, body length: ${rawBody?.length ?? 0}, secret prefix: ${webhookSecret.slice(0, 10)}...`);

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe event verified: ${event.type} (id: ${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Cancel a tenant's Stripe subscription.
   *
   * - `immediate: false` (default) — cancel at period end. Used by the
   *   Stripe Customer Portal flow where the merchant retains access
   *   until their billing period closes.
   * - `immediate: true` — cancel right now via stripe.subscriptions.cancel.
   *   Used by deleteTenant to stop billing before the BD record disappears.
   *
   * - `skipBdUpdate: true` — skip the prisma.subscription.update that flips
   *   `cancelAtPeriodEnd`. Pass this from callers that are about to delete
   *   the Subscription row anyway (cascade from tenant.delete) — the inner
   *   update would be redundant and creates phantom state if it failed
   *   between the Stripe call and the cascade.
   */
  async cancelSubscription(
    tenantId: string,
    options: { immediate?: boolean; skipBdUpdate?: boolean } = {},
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No tienes una suscripción de Stripe activa.');
    }

    if (options.immediate) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    if (!options.skipBdUpdate) {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { cancelAtPeriodEnd: !options.immediate },
      });
    }
  }

  /** Create a Stripe Customer Portal session */
  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(tenantId);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/account`,
    });

    return { url: session.url };
  }

  // ─── Private webhook handlers ─────────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(`handleCheckoutCompleted — session.id: ${session.id}, metadata: ${JSON.stringify(session.metadata)}, subscription: ${session.subscription}`);

    const tenantId = session.metadata?.tenantId;
    const planType = session.metadata?.planType as PlanType | undefined;

    if (!tenantId || !planType) {
      this.logger.warn(`checkout.session.completed missing metadata — tenantId: ${tenantId}, planType: ${planType}`);
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data'],
    });
    // In API 2026-02-25.clover, current_period_end is on SubscriptionItem, not Subscription
    const firstItem = stripeSub.items?.data?.[0];
    const periodEndTs = firstItem?.current_period_end ?? (Date.now() / 1000 + 30 * 24 * 3600);
    const currentPeriodEnd = new Date(periodEndTs * 1000);

    await this.subscriptionService.changePlan(tenantId, planType, {
      stripeSubscriptionId,
      currentPeriodEnd,
    });

    this.logger.log(`Tenant ${tenantId} upgraded to ${planType} via Stripe`);
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
    // In API 2026-02-25.clover, current_period_end is on SubscriptionItem
    const firstItem = stripeSub.items?.data?.[0];
    const periodEndTs = firstItem?.current_period_end ?? null;
    const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000) : undefined;

    await this.prisma.subscription.updateMany({
      where: {
        tenant: { stripeCustomerId: stripeSub.customer as string },
      },
      data: {
        ...(currentPeriodEnd && { stripeCurrentPeriodEnd: currentPeriodEnd }),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const tenantId = stripeSub.metadata?.tenantId;
    if (!tenantId) {
      // Fallback: find tenant by customer ID
      const tenant = await this.prisma.tenant.findFirst({
        where: { stripeCustomerId: stripeSub.customer as string },
      });
      if (!tenant) return;
      await this.subscriptionService.changePlan(tenant.id, PlanType.FREE);
      this.logger.log(`Tenant ${tenant.id} downgraded to FREE (subscription deleted)`);
      return;
    }

    await this.subscriptionService.changePlan(tenantId, PlanType.FREE);
    this.logger.log(`Tenant ${tenantId} downgraded to FREE (subscription deleted)`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    this.logger.warn(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);

    // Find tenant and notify via email
    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!tenant) return;

      const user = await this.prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { email: true, firstName: true },
      });

      if (user?.email) {
        await this.emailService.sendPaymentFailedEmail(
          user.email,
          user.firstName ?? tenant.name,
          (invoice.amount_due ?? 0) / 100,
          invoice.currency?.toUpperCase() ?? 'USD',
        );
        this.logger.log(`Payment failed email sent to ${user.email}`);
      }
    } catch (err) {
      this.logger.warn(`Could not send payment failed notification: ${err}`);
    }
  }

  // ─── Admin billing queries ────────────────────────────────────

  /** Map Stripe invoices to DTOs with tenant info */
  private async mapInvoicesToDtos(invoices: Stripe.Invoice[]): Promise<StripeInvoiceDto[]> {
    const customerIds = [
      ...new Set(
        invoices
          .map((inv) => (typeof inv.customer === 'string' ? inv.customer : inv.customer?.id))
          .filter(Boolean) as string[],
      ),
    ];

    const tenants = customerIds.length > 0
      ? await this.prisma.tenant.findMany({
          where: { stripeCustomerId: { in: customerIds } },
          select: { id: true, name: true, stripeCustomerId: true },
        })
      : [];

    const customerToTenant = new Map(
      tenants.map((t) => [t.stripeCustomerId!, { id: t.id, name: t.name }]),
    );

    return invoices.map((inv) => {
      const custId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      const tenant = custId ? customerToTenant.get(custId) : undefined;
      return {
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due / 100,
        amountPaid: inv.amount_paid / 100,
        currency: inv.currency,
        created: new Date(inv.created * 1000).toISOString(),
        dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        tenantId: tenant?.id ?? null,
        tenantName: tenant?.name ?? null,
      };
    });
  }

  /** List recent invoices from Stripe, mapped to tenant info */
  async listRecentInvoices(limit = 50): Promise<StripeInvoiceDto[]> {
    const invoices = await this.stripe.invoices.list({ limit });
    return this.mapInvoicesToDtos(invoices.data);
  }

  /** List failed/open/uncollectible invoices */
  async listFailedInvoices(): Promise<StripeInvoiceDto[]> {
    const [openInvoices, uncollectibleInvoices] = await Promise.all([
      this.stripe.invoices.list({ status: 'open', limit: 50 }),
      this.stripe.invoices.list({ status: 'uncollectible', limit: 20 }),
    ]);
    return this.mapInvoicesToDtos([...openInvoices.data, ...uncollectibleInvoices.data]);
  }
}

export interface StripeInvoiceDto {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  dueDate: string | null;
  hostedInvoiceUrl: string | null;
  tenantId: string | null;
  tenantName: string | null;
}
