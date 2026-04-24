import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AppUserAuthGuard } from '../app-users/app-user-auth.guard';
import { SetupLoyaltyDto } from './dto/setup-loyalty.dto';
import { StampDto } from './dto/stamp.dto';

@Controller('apps/:appId/loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // Builder client: create/update loyalty config
  @Post('setup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  setup(
    @Param('appId') appId: string,
    @Body() dto: SetupLoyaltyDto,
    @Request() req,
  ) {
    return this.loyaltyService.setup(appId, dto, req.user.tenantId);
  }

  // Public: get config (without PIN)
  @Get('config')
  getConfig(@Param('appId') appId: string) {
    return this.loyaltyService.getConfig(appId);
  }

  // Stats must be declared BEFORE :id-like routes
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getStats(@Param('appId') appId: string, @Request() req) {
    return this.loyaltyService.getStats(appId, req.user.tenantId);
  }

  // App user: get my stamps + canRedeem
  @Get('my-card')
  @UseGuards(AppUserAuthGuard)
  getMyCard(@Param('appId') appId: string, @Request() req) {
    return this.loyaltyService.getMyCard(appId, req.user.id);
  }

  // Public: stamp with PIN (rate limited + Redis lockout)
  @Post('stamp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  stamp(@Param('appId') appId: string, @Body() dto: StampDto) {
    return this.loyaltyService.stamp(appId, dto);
  }

  // App user: redeem reward
  @Post('redeem')
  @UseGuards(AppUserAuthGuard)
  redeem(@Param('appId') appId: string, @Request() req) {
    return this.loyaltyService.redeem(appId, req.user.id);
  }
}
