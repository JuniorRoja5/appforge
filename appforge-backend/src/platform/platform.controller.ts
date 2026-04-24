import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PlatformSmtpService } from './platform-smtp.service';
import { PlatformFcmService } from './platform-fcm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { UpdatePlatformSmtpDto } from './dto/update-platform-smtp.dto';
import type { UpdatePlatformFcmDto } from './dto/update-platform-fcm.dto';

@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformController {
  constructor(
    private readonly smtpService: PlatformSmtpService,
    private readonly fcmService: PlatformFcmService,
  ) {}

  // ─── SMTP ────────────────────────────────────

  @Get('smtp')
  @Roles(Role.SUPER_ADMIN)
  getSmtp() {
    return this.smtpService.getConfig();
  }

  @Put('smtp')
  @Roles(Role.SUPER_ADMIN)
  updateSmtp(@Body() dto: UpdatePlatformSmtpDto) {
    return this.smtpService.upsertConfig(dto);
  }

  @Post('test-smtp')
  @Roles(Role.SUPER_ADMIN)
  testSmtp(
    @Body() body: { host?: string; port?: number; secure?: boolean; username?: string; password?: string; fromEmail?: string; fromName?: string },
    @Request() req: any,
  ) {
    return this.smtpService.testConnection(body, req.user.email);
  }

  // ─── FCM ─────────────────────────────────────

  @Get('fcm')
  @Roles(Role.SUPER_ADMIN)
  getFcm() {
    return this.fcmService.getConfig();
  }

  @Put('fcm')
  @Roles(Role.SUPER_ADMIN)
  updateFcm(@Body() dto: UpdatePlatformFcmDto) {
    return this.fcmService.upsertConfig(dto);
  }

  @Post('test-fcm')
  @Roles(Role.SUPER_ADMIN)
  testFcm() {
    return this.fcmService.testConnection();
  }
}
