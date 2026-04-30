import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingRemindersProcessor } from './booking-reminders.processor';
import { PushModule } from '../push/push.module';

const isWorkerSeparate = process.env.WORKER_MODE === 'separate';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'booking-reminders' }),
    PushModule, // exposes FcmService and OptionalAppUserAuthGuard
  ],
  providers: [
    BookingService,
    // Only include the processor in-process when NOT running a separate worker.
    // In production with WORKER_MODE=separate, the processor lives in worker.module.ts.
    ...(isWorkerSeparate ? [] : [BookingRemindersProcessor]),
  ],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
