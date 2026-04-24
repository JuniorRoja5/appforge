import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RedeemCouponDto } from './dto/redeem-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  async findAll(appId: string) {
    return this.prisma.discountCoupon.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(appId: string, id: string) {
    const coupon = await this.prisma.discountCoupon.findFirst({
      where: { id, appId },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(appId: string, dto: CreateCouponDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    if (!dto.title || !dto.code || !dto.discountType || dto.discountValue === undefined) {
      throw new BadRequestException('title, code, discountType, and discountValue are required');
    }

    // Check code uniqueness within app
    const existing = await this.prisma.discountCoupon.findUnique({
      where: { appId_code: { appId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException('A coupon with this code already exists');

    return this.prisma.discountCoupon.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        imageUrl: dto.imageUrl ?? null,
        conditions: dto.conditions ?? null,
        maxUses: dto.maxUses ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        app: { connect: { id: appId } },
      },
    });
  }

  async update(appId: string, id: string, dto: UpdateCouponDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    const coupon = await this.findOne(appId, id);

    // If code is changing, check uniqueness
    if (dto.code && dto.code.toUpperCase() !== coupon.code) {
      const existing = await this.prisma.discountCoupon.findUnique({
        where: { appId_code: { appId, code: dto.code.toUpperCase() } },
      });
      if (existing) throw new ConflictException('A coupon with this code already exists');
    }

    return this.prisma.discountCoupon.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions || null }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.validFrom !== undefined && { validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(appId: string, id: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);
    return this.prisma.discountCoupon.delete({ where: { id } });
  }

  async generateCode(appId: string, tenantId: string): Promise<{ code: string }> {
    await this.ensureAppOwnership(appId, tenantId);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = 'AFF-';
      for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await this.prisma.discountCoupon.findUnique({
        where: { appId_code: { appId, code } },
      });
      if (!existing) return { code };
      attempts++;
    } while (attempts < 10);
    throw new BadRequestException('Could not generate unique code');
  }

  // --- Redemption ---

  async redeem(appId: string, couponId: string, dto: RedeemCouponDto) {
    const coupon = await this.findOne(appId, couponId);

    // Validate coupon state
    if (!coupon.isActive) throw new BadRequestException('Este cupón no está activo');
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      throw new BadRequestException('Este cupón ha expirado');
    }
    if (coupon.maxUses != null && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('Este cupón ha alcanzado el límite de canjes');
    }

    // If coupon has maxUses, require appUserId
    if (coupon.maxUses != null && coupon.maxUses > 0) {
      if (!dto.appUserId) {
        throw new UnauthorizedException('Inicia sesión para canjear este cupón');
      }
      // Check double redemption by user
      const existing = await this.prisma.couponRedemption.findFirst({
        where: { couponId, appUserId: dto.appUserId },
      });
      if (existing) {
        throw new ConflictException('Ya has canjeado este cupón');
      }
    }

    // Atomic transaction: create redemption + increment currentUses
    const [redemption] = await this.prisma.$transaction([
      this.prisma.couponRedemption.create({
        data: {
          appId,
          couponId,
          appUserId: dto.appUserId ?? null,
          deviceId: dto.deviceId ?? null,
        },
      }),
      this.prisma.discountCoupon.update({
        where: { id: couponId },
        data: { currentUses: { increment: 1 } },
      }),
    ]);

    return {
      redemption,
      currentUses: coupon.currentUses + 1,
      maxUses: coupon.maxUses,
    };
  }

  async getRedemptions(appId: string, couponId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, couponId);

    return this.prisma.couponRedemption.findMany({
      where: { couponId, appId },
      include: {
        appUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  async resetRedemptions(appId: string, couponId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, couponId);

    await this.prisma.$transaction([
      this.prisma.couponRedemption.deleteMany({ where: { couponId, appId } }),
      this.prisma.discountCoupon.update({
        where: { id: couponId },
        data: { currentUses: 0 },
      }),
    ]);

    return { message: 'Canjes reseteados correctamente' };
  }
}
