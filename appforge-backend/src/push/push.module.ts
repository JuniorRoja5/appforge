import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { FcmService } from './fcm.service';
import { OptionalAppUserAuthGuard } from './optional-app-user.guard';

@Module({
  controllers: [PushController],
  providers: [PushService, FcmService, OptionalAppUserAuthGuard],
  exports: [FcmService, OptionalAppUserAuthGuard],
})
export class PushModule {}
