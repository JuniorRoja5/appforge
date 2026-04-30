import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FcmService } from './fcm.service';

/**
 * Standalone module that exposes FcmService without pulling in the HTTP
 * controllers (which depend on ThrottlerGuard). Imported by:
 *   - PushModule (re-exports it for the API context)
 *   - OrdersModule (only needs FcmService)
 *   - BookingModule (only needs FcmService)
 *   - WorkerModule (separate worker process, no HTTP, no Throttler)
 */
@Module({
  imports: [PrismaModule],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
