import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SendPushDto } from './dto/send-push.dto';

@Controller('apps/:appId/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /* ─── Public (end-user runtime — no auth) ─── */

  @Post('devices')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  registerDevice(
    @Param('appId') appId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.pushService.registerDevice(appId, dto);
  }

  @Delete('devices/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  unregisterDevice(
    @Param('appId') appId: string,
    @Param('token') token: string,
  ) {
    return this.pushService.unregisterDevice(appId, token);
  }

  /* ─── Protected (builder client) ─── */

  @Get('devices/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getDeviceCount(@Param('appId') appId: string) {
    return this.pushService.getDeviceCount(appId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(@Param('appId') appId: string) {
    return this.pushService.findAll(appId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getStats(@Param('appId') appId: string) {
    return this.pushService.getStats(appId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.pushService.findOne(appId, id);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  sendNotification(
    @Param('appId') appId: string,
    @Body() dto: SendPushDto,
    @Request() req: any,
  ) {
    return this.pushService.sendNotification(appId, dto, req.user.tenantId);
  }
}
