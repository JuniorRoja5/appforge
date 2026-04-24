import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { IngestEventsDto } from './dto/ingest-events.dto';

@Controller('apps/:appId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ──────────────────── Public (runtime ingestion) ────────────────

  @Post('events')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  ingestEvents(
    @Param('appId') appId: string,
    @Body() dto: IngestEventsDto,
  ) {
    return this.analyticsService.ingestEvents(appId, dto);
  }

  // ──────────────────── Protected (builder dashboard) ─────────────

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getOverview(
    @Param('appId') appId: string,
    @Query('period') period = '30d',
    @Req() req: any,
  ) {
    return this.analyticsService.getOverview(
      appId,
      period,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Get('modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getModules(
    @Param('appId') appId: string,
    @Query('period') period = '30d',
    @Req() req: any,
  ) {
    return this.analyticsService.getModuleRanking(
      appId,
      period,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getDevices(
    @Param('appId') appId: string,
    @Query('period') period = '30d',
    @Req() req: any,
  ) {
    return this.analyticsService.getDeviceBreakdown(
      appId,
      period,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Get('retention')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getRetention(
    @Param('appId') appId: string,
    @Query('period') period = '30d',
    @Req() req: any,
  ) {
    return this.analyticsService.getRetention(
      appId,
      period,
      req.user.tenantId,
      req.user.role,
    );
  }
}
