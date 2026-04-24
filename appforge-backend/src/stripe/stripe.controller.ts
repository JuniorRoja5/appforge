import {
  Controller,
  Post,
  Body,
  Request,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanType } from '@prisma/client';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /** Create a Stripe Checkout Session */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @Request() req,
    @Body() body: { planType: PlanType },
  ) {
    return this.stripeService.createCheckoutSession(
      req.user.tenantId,
      body.planType,
    );
  }

  /**
   * Stripe webhook endpoint.
   * No auth guard — Stripe calls this directly.
   * Body is raw (Buffer) thanks to middleware in main.ts.
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.stripeService.handleWebhook(req.body, signature);
    return { received: true };
  }

  /** Cancel subscription at end of current billing period */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Request() req) {
    await this.stripeService.cancelSubscription(req.user.tenantId);
    return { ok: true };
  }

  /** Create a Stripe Customer Portal session */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  createPortal(@Request() req) {
    return this.stripeService.createPortalSession(req.user.tenantId);
  }
}
