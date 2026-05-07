import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppsService } from './apps.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, Prisma } from '@prisma/client';
import { UpdateAppConfigDto, UpdateSmtpConfigDto } from './dto/update-app-config.dto';

@Controller('apps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppsController {
  constructor(
    private readonly appsService: AppsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  async create(
    @Body() createAppDto: { name: string; slug: string; schema?: unknown; designTokens?: unknown },
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('User has no tenant assigned');
    }

    // Subscription enforcement: check app creation limit
    const appCheck = await this.subscriptionService.canCreateApp(tenantId);
    if (!appCheck.allowed) {
      throw new ForbiddenException(appCheck.reason);
    }

    return this.appsService.create({
      name: createAppDto.name,
      slug: createAppDto.slug,
      ...(createAppDto.schema !== undefined && { schema: createAppDto.schema as Prisma.InputJsonValue }),
      ...(createAppDto.designTokens !== undefined && { designTokens: createAppDto.designTokens as Prisma.InputJsonValue }),
      tenant: { connect: { id: tenantId } },
    });
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(@Request() req) {
    const filterTenant = req.user.role === Role.CLIENT ? req.user.tenantId : undefined;
    return this.appsService.findAll(filterTenant);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findOne(@Param('id') id: string, @Request() req) {
    return this.appsService.findOne(id, req.user.tenantId, req.user.role);
  }

  @Put(':id/schema')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateSchema(
    @Param('id') id: string,
    @Body() body: { schema: unknown; designTokens?: unknown },
    @Request() req,
  ) {
    return this.appsService.updateSchema(id, body.schema, body.designTokens, req.user.tenantId, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.appsService.remove(id, req.user.tenantId, req.user.role);
  }

  // ─── App Config ───────────────────────────────────────────────

  @Get(':id/config')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getConfig(@Param('id') id: string, @Request() req) {
    return this.appsService.getConfig(id, req.user.tenantId, req.user.role);
  }

  @Put(':id/config')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateConfig(
    @Param('id') id: string,
    @Body() body: UpdateAppConfigDto,
    @Request() req,
  ) {
    // Cast: service expects a plain Record for JSON merging. The DTO has been
    // validated by ValidationPipe before reaching this point.
    return this.appsService.updateConfig(id, body as unknown as Record<string, unknown>, req.user.tenantId, req.user.role);
  }

  @Put(':id/config/smtp')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateSmtp(
    @Param('id') id: string,
    @Body() body: UpdateSmtpConfigDto,
    @Request() req,
  ) {
    return this.appsService.updateSmtp(id, body, req.user.tenantId, req.user.role);
  }

  @Post(':id/config/test-smtp')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  testSmtp(
    @Param('id') id: string,
    @Body() body: { host?: string; port?: number; secure?: boolean; username?: string; password?: string; fromEmail?: string; fromName?: string },
    @Request() req,
  ) {
    return this.appsService.testSmtp(id, req.user.email, body, req.user.tenantId, req.user.role);
  }
}
