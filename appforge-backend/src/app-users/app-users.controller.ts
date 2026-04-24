import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AppUserAuthGuard } from './app-user-auth.guard';
import { AppUsersService } from './app-users.service';
import { RegisterAppUserDto } from './dto/register-app-user.dto';
import { LoginAppUserDto } from './dto/login-app-user.dto';
import { UpdateAppUserDto } from './dto/update-app-user.dto';
import { ListAppUsersQueryDto } from './dto/list-app-users-query.dto';
import { RedeemPasswordResetDto } from './dto/reset-password.dto';

@Controller('apps/:appId/users')
export class AppUsersController {
  constructor(private readonly appUsersService: AppUsersService) {}

  // ──────────────────── Public (runtime) ────────────────────

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(
    @Param('appId') appId: string,
    @Body() dto: RegisterAppUserDto,
  ) {
    return this.appUsersService.register(appId, dto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(
    @Param('appId') appId: string,
    @Body() dto: LoginAppUserDto,
  ) {
    return this.appUsersService.login(appId, dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  redeemPasswordReset(
    @Param('appId') appId: string,
    @Body() dto: RedeemPasswordResetDto,
  ) {
    return this.appUsersService.redeemPasswordReset(appId, dto);
  }

  // ──────────────────── Authenticated app-user ────────────────────

  @Get('me')
  @UseGuards(AppUserAuthGuard)
  getMe(@Req() req: any) {
    return this.appUsersService.getMe(req.user.appUserId);
  }

  @Put('me')
  @UseGuards(AppUserAuthGuard)
  updateMe(@Req() req: any, @Body() dto: UpdateAppUserDto) {
    return this.appUsersService.updateMe(req.user.appUserId, dto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AppUserAuthGuard)
  logout() {
    // Stateless JWT — nothing to invalidate server-side
    return { message: 'ok' };
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getStats(@Param('appId') appId: string, @Req() req: any) {
    return this.appUsersService.getStats(appId, req.user.tenantId, req.user.role);
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  async exportCsv(
    @Param('appId') appId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const csv = await this.appUsersService.exportUsersCsv(
      appId,
      req.user.tenantId,
      req.user.role,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="users-${appId.slice(0, 8)}.csv"`,
    );
    res.send(csv);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  listUsers(
    @Param('appId') appId: string,
    @Query() query: ListAppUsersQueryDto,
    @Req() req: any,
  ) {
    return this.appUsersService.listUsers(
      appId,
      query,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getUserDetail(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.appUsersService.getUserDetail(
      appId,
      id,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Post(':id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  initiatePasswordReset(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.appUsersService.initiatePasswordReset(
      appId,
      id,
      req.user.tenantId,
      req.user.role,
    );
  }

  @Put(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  banUser(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.appUsersService.banUser(appId, id, req.user.tenantId, req.user.role);
  }

  @Put(':id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  unbanUser(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.appUsersService.unbanUser(appId, id, req.user.tenantId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  deleteUser(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.appUsersService.deleteUser(appId, id, req.user.tenantId, req.user.role);
  }
}
