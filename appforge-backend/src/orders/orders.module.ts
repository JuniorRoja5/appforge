import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { FcmModule } from '../push/fcm.module';
import { OptionalAppUserAuthGuard } from '../push/optional-app-user.guard';

@Module({
  imports: [FcmModule], // exposes FcmService only — no HTTP, no Throttler
  controllers: [OrdersController],
  providers: [OrdersService, OptionalAppUserAuthGuard],
})
export class OrdersModule {}
