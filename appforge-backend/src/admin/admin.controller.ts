import {
  Controller, Get, Put, Delete, Post,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, TenantStatus, UserStatus, BuildStatus, PlanType } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

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
  listTenants(
    @Query('search') search?: string,
    @Query('planType') planType?: PlanType,
    @Query('status') status?: TenantStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listTenants({
      search,
      planType,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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
  listUsers(
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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
  listBuilds(
    @Query('status') status?: BuildStatus,
    @Query('tenantId') tenantId?: string,
    @Query('appId') appId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listBuilds({
      status,
      tenantId,
      appId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('builds/:buildId/retry')
  @Roles(Role.SUPER_ADMIN)
  retryBuild(@Param('buildId') buildId: string) {
    return this.adminService.retryBuild(buildId);
  }
}
