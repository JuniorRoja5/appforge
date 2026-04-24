import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BuildProcessor } from './build/build.processor';
import { KeystoreService } from './build/keystore.service';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { PlatformModule } from './platform/platform.module';

/**
 * Minimal module for the standalone BullMQ worker process.
 * Only imports what BuildProcessor needs — no HTTP controllers, no auth, no admin.
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

    // Dependencies required by BuildProcessor
    PrismaModule,
    StorageModule,
    PlatformModule,
  ],
  providers: [BuildProcessor, KeystoreService],
})
export class WorkerModule {}