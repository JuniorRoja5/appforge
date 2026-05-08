import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StripeModule } from '../stripe/stripe.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule,
    StripeModule,
    AuthModule,
    BullModule.registerQueue({ name: 'app-build' }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
