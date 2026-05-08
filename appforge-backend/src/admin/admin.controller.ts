import {
  Controller, Get, Put, Delete, Post,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ListBuildsDto } from './dto/list-builds.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Analytics ────────────────────────────────────────────

  @Get('analytics')
  @Roles(Role.SUPER_ADMIN)
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('billing')
  @Roles(Role.SUPER_ADMIN)
  getBillingAnalytics() {
    return this.adminService.getBillingAnalytics();
  }

  // ─── Tenants ──────────────────────────────────────────────

  @Get('tenants')
  @Roles(Role.SUPER_ADMIN)
  listTenants(@Query() dto: ListTenantsDto) {
    return this.adminService.listTenants(dto);
  }

  @Get('tenants/:id')
  @Roles(Role.SUPER_ADMIN)
  getTenantDetail(@Param('id') id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Put('tenants/:id/status')
  @Roles(Role.SUPER_ADMIN)
  updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.adminService.updateTenantStatus(id, dto.status);
  }

  @Delete('tenants/:id')
  @Roles(Role.SUPER_ADMIN)
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ─── Users ────────────────────────────────────────────────

  @Get('users')
  @Roles(Role.SUPER_ADMIN)
  listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Put('users/:id/suspend')
  @Roles(Role.SUPER_ADMIN)
  toggleUserSuspension(@Param('id') id: string) {
    return this.adminService.toggleUserSuspension(id);
  }

  @Delete('users/:id/permanent')
  @Roles(Role.SUPER_ADMIN)
  permanentDeleteUser(@Param('id') id: string) {
    return this.adminService.permanentDeleteUser(id);
  }

  // ─── Builds ───────────────────────────────────────────────

  @Get('builds')
  @Roles(Role.SUPER_ADMIN)
  listBuilds(@Query() dto: ListBuildsDto) {
    return this.adminService.listBuilds(dto);
  }

  @Post('builds/:buildId/retry')
  @Roles(Role.SUPER_ADMIN)
  retryBuild(@Param('buildId') buildId: string) {
    return this.adminService.retryBuild(buildId);
  }
}
