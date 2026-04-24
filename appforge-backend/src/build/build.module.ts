import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BuildController } from './build.controller';
import { BuildService } from './build.service';
import { BuildProcessor } from './build.processor';
import { KeystoreService } from './keystore.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';

/**
 * HTTP-side build module.
 *
 * In production, BuildProcessor runs in a separate worker process (src/worker.ts).
 * In development (WORKER_MODE !== 'separate'), the processor runs in-process
 * for convenience — single `npm run start:dev` starts everything.
 */
const isWorkerSeparate = process.env.WORKER_MODE === 'separate';

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule,
    BullModule.registerQueue({ name: 'app-build' }),
  ],
  controllers: [BuildController],
  providers: [
    BuildService,
    KeystoreService,
    // Only include BuildProcessor in-process when NOT running separate worker
    ...(isWorkerSeparate ? [] : [BuildProcessor]),
  ],
  exports: [BuildService, KeystoreService],
})
export class BuildModule {}
