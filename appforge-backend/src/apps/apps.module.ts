import { Module } from '@nestjs/common';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  providers: [AppsService],
  controllers: [AppsController],
})
export class AppsModule {}
