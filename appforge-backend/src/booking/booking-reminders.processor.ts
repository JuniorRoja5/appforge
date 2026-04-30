import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { BookingService } from './booking.service';

interface ReminderJobData {
  bookingId: string;
  type: '24h' | '2h';
}

@Processor('booking-reminders')
export class BookingRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingRemindersProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { bookingId, type } = job.data;
    try {
      await this.bookingService.sendReminder(bookingId, type);
    } catch (err) {
      this.logger.warn(
        `Reminder ${type} for booking ${bookingId} failed: ${(err as Error).message}`,
      );
      throw err; // let BullMQ retry per its policy
    }
  }
}
