import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

export interface TenantBrandingResponse {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandColors: Prisma.JsonValue | null;
  isWhiteLabel: boolean;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Branding del tenant del usuario + `isWhiteLabel` computado server-side.
   *
   * Path del flag: Tenant → Subscription (1:1 opcional) → SubscriptionPlan.isWhiteLabel.
   * Tenant sin subscription (estado raro de onboarding) → isWhiteLabel = false.
   */
  async getMyBranding(tenantId: string): Promise<TenantBrandingResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        brandName: true,
        brandLogoUrl: true,
        brandColors: true,
        subscription: {
          select: { plan: { select: { isWhiteLabel: true } } },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return {
      brandName: tenant.brandName,
      brandLogoUrl: tenant.brandLogoUrl,
      brandColors: tenant.brandColors ?? null,
      isWhiteLabel: tenant.subscription?.plan?.isWhiteLabel ?? false,
    };
  }

  /**
   * Actualiza brandName/brandLogoUrl/brandColors del tenant.
   *
   * Guard server-side: si el plan NO es white-label → 403. El frontend
   * esconde la página para tenants no reseller, pero la verdad final
   * vive aquí — un cliente que descubra el endpoint y haga curl directo
   * recibe 403 sin tocar BD.
   */
  async updateMyBranding(
    tenantId: string,
    dto: UpdateTenantBrandingDto,
  ): Promise<TenantBrandingResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: { select: { isWhiteLabel: true } } },
    });

    if (!sub?.plan?.isWhiteLabel) {
      throw new ForbiddenException(
        'Tu plan no incluye personalización de marca',
      );
    }

    // Spread condicional: solo escribir campos enviados, no pisar con
    // undefined. Mismo patrón que apps.controller.ts:38-39.
    const data: Prisma.TenantUpdateInput = {
      ...(dto.brandName !== undefined && { brandName: dto.brandName }),
      ...(dto.brandLogoUrl !== undefined && { brandLogoUrl: dto.brandLogoUrl }),
      ...(dto.brandColors !== undefined && {
        brandColors: dto.brandColors as Prisma.InputJsonValue,
      }),
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    return this.getMyBranding(tenantId);
  }
}
