import { Global, Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformSmtpService } from './platform-smtp.service';
import { PlatformEmailService } from './platform-email.service';
import { PlatformFcmService } from './platform-fcm.service';

@Global()
@Module({
  controllers: [PlatformController],
  providers: [PlatformSmtpService, PlatformEmailService, PlatformFcmService],
  exports: [PlatformEmailService, PlatformFcmService],
})
export class PlatformModule {}
