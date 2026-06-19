import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Guard del tenantId. Para un CLIENT siempre debería existir, pero si
   * por lo que sea llega null, `findUnique({ where: { id: null } })`
   * revienta en 500 sucio. Mejor 400 limpio con mensaje accionable.
   * Mismo patrón que apps.controller.ts:24-27.
   */
  private getTenantIdOrThrow(req): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('User has no tenant assigned');
    }
    return tenantId;
  }

  /**
   * Devuelve el branding del tenant del usuario logueado + `isWhiteLabel`
   * computado server-side. El frontend nunca decide si el plan es reseller.
   * tenantId sale de req.user.tenantId (token JWT) — patrón validado en
   * apps.controller.ts y confirmado robusto contra IDOR.
   */
  @Get('me/branding')
  @Roles(Role.CLIENT)
  async getMyBranding(@Request() req) {
    return this.tenantsService.getMyBranding(this.getTenantIdOrThrow(req));
  }

  /**
   * Actualiza brandName/brandLogoUrl/brandColors del tenant del usuario.
   * Service hace guard 403 si el plan no es white-label.
   */
  @Patch('me/branding')
  @Roles(Role.CLIENT)
  async updateMyBranding(
    @Body() dto: UpdateTenantBrandingDto,
    @Request() req,
  ) {
    return this.tenantsService.updateMyBranding(
      this.getTenantIdOrThrow(req),
      dto,
    );
  }
}
