import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BuildProcessor } from './build/build.processor';
import { KeystoreService } from './build/keystore.service';
import { BookingService } from './booking/booking.service';
import { BookingRemindersProcessor } from './booking/booking-reminders.processor';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { PlatformModule } from './platform/platform.module';
import { FcmModule } from './push/fcm.module';

/**
 * Minimal module for the standalone BullMQ worker process.
 * Only imports what processors need — no HTTP controllers, no auth, no admin.
 * This runs in a separate process from the NestJS HTTP server.
 */
@Module({
  imports: [
    // Redis connection for BullMQ
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'app-build' }),
    BullModule.registerQueue({ name: 'booking-reminders' }),

    // Dependencies required by processors
    PrismaModule,
    StorageModule,
    PlatformModule,
    FcmModule,
  ],
  providers: [
    BuildProcessor,
    KeystoreService,
    BookingService,
    BookingRemindersProcessor,
  ],
})
export class WorkerModule {}
