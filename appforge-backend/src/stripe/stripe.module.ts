import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PlatformModule } from '../platform/platform.module';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [PrismaModule, SubscriptionModule, PlatformModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
