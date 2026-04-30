import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { FcmModule } from './fcm.module';
import { OptionalAppUserAuthGuard } from './optional-app-user.guard';

@Module({
  imports: [FcmModule],
  controllers: [PushController],
  providers: [PushService, OptionalAppUserAuthGuard],
  // Re-export FcmModule so callers that imported PushModule keep working
  exports: [FcmModule, OptionalAppUserAuthGuard],
})
export class PushModule {}
