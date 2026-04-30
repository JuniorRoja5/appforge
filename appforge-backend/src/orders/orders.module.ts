import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule], // exposes FcmService and OptionalAppUserAuthGuard
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
