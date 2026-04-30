import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RedeemCouponDto } from './dto/redeem-coupon.dto';
import { SetupCouponMerchantConfigDto } from './dto/setup-coupon-merchant-config.dto';
import { MerchantRedeemCouponDto } from './dto/merchant-redeem-coupon.dto';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

@Injectable()
export class CouponsService {
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  // ============================================================
  // CRUD existente (sin cambios)
  // ============================================================

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

  // ============================================================
  // Redemption en-app (existente, sin cambios)
  // ============================================================

  async redeem(appId: string, couponId: string, dto: RedeemCouponDto) {
    const coupon = await this.findOne(appId, couponId);

    if (!coupon.isActive) throw new BadRequestException('Este cupón no está activo');
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      throw new BadRequestException('Este cupón ha expirado');
    }
    if (coupon.maxUses != null && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('Este cupón ha alcanzado el límite de canjes');
    }

    if (coupon.maxUses != null && coupon.maxUses > 0) {
      if (!dto.appUserId) {
        throw new UnauthorizedException('Inicia sesión para canjear este cupón');
      }
      const existing = await this.prisma.couponRedemption.findFirst({
        where: { couponId, appUserId: dto.appUserId },
      });
      if (existing) {
        throw new ConflictException('Ya has canjeado este cupón');
      }
    }

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

  // ============================================================
  // NUEVO: Merchant Config (PIN del negocio)
  // ============================================================

  async setupMerchantConfig(appId: string, dto: SetupCouponMerchantConfigDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    const config = await this.prisma.couponMerchantConfig.upsert({
      where: { appId },
      create: {
        appId,
        businessPin: hashedPin,
      },
      update: {
        businessPin: hashedPin,
      },
    });

    // No exponer el hash
    return {
      id: config.id,
      appId: config.appId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async getMerchantConfigStatus(appId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    const config = await this.prisma.couponMerchantConfig.findUnique({
      where: { appId },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    return {
      configured: !!config,
      createdAt: config?.createdAt ?? null,
      updatedAt: config?.updatedAt ?? null,
    };
  }

  // ============================================================
  // NUEVO: Redemption con PIN del comerciante
  // ============================================================

  async redeemByMerchant(appId: string, dto: MerchantRedeemCouponDto) {
    // 1. Brute-force protection (Redis)
    const lockKey = `coupon:lockout:${appId}`;
    const failKey = `coupon:fails:${appId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new HttpException(
        'Demasiados intentos fallidos. Espera 15 minutos.',
        429,
      );
    }

    // 2. Verificar que existe la config del comerciante
    const config = await this.prisma.couponMerchantConfig.findUnique({
      where: { appId },
    });
    if (!config) {
      throw new NotFoundException(
        'No hay PIN configurado para este negocio. Configúralo en el panel del módulo de cupones.',
      );
    }

    // 3. Validar PIN
    const pinValid = await bcrypt.compare(dto.pin, config.businessPin);
    if (!pinValid) {
      const fails = await this.redis.incr(failKey);
      await this.redis.expire(failKey, 900); // 15 min TTL
      if (fails >= 10) {
        await this.redis.set(lockKey, '1', 'EX', 900);
      }
      throw new ForbiddenException('PIN incorrecto');
    }

    // PIN correcto — resetear contador de fallos
    await this.redis.del(failKey);

    // 4. Buscar el cupón por código (case-insensitive)
    const code = dto.code.trim().toUpperCase();
    const coupon = await this.prisma.discountCoupon.findUnique({
      where: { appId_code: { appId, code } },
    });
    if (!coupon) {
      throw new NotFoundException(`No existe ningún cupón con el código "${code}"`);
    }

    // 5. Validar estado del cupón
    if (!coupon.isActive) {
      throw new BadRequestException('Este cupón no está activo');
    }
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) {
      throw new BadRequestException('Este cupón aún no es válido');
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      throw new BadRequestException('Este cupón ha expirado');
    }
    if (coupon.maxUses != null && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('Este cupón ha alcanzado el límite de canjes');
    }

    // 6. Si se proporcionó email del cliente, verificar uso previo
    let appUserId: string | null = null;
    if (dto.appUserEmail) {
      const appUser = await this.prisma.appUser.findUnique({
        where: { appId_email: { appId, email: dto.appUserEmail } },
      });
      if (!appUser) {
        throw new NotFoundException(
          `No existe ningún usuario con el email "${dto.appUserEmail}" en esta app`,
        );
      }
      appUserId = appUser.id;

      // Si tiene maxUses limitado, comprobar si ya canjeó
      if (coupon.maxUses != null) {
        const existing = await this.prisma.couponRedemption.findFirst({
          where: { couponId: coupon.id, appUserId },
        });
        if (existing) {
          throw new ConflictException('Este cliente ya canjeó este cupón anteriormente');
        }
      }
    }

    // 7. Transacción atómica: crear redemption + incrementar contador
    const [redemption] = await this.prisma.$transaction([
      this.prisma.couponRedemption.create({
        data: {
          appId,
          couponId: coupon.id,
          appUserId,
          deviceId: 'merchant-validated',
        },
      }),
      this.prisma.discountCoupon.update({
        where: { id: coupon.id },
        data: { currentUses: { increment: 1 } },
      }),
    ]);

    return {
      success: true,
      redemption: { id: redemption.id },
      coupon: {
        id: coupon.id,
        title: coupon.title,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        currentUses: coupon.currentUses + 1,
        maxUses: coupon.maxUses,
      },
      message: 'Cupón canjeado correctamente',
    };
  }

  // Endpoint público mínimo: comprueba si el negocio tiene cupones activos
  // (lo necesita la página /redeem/:appId para mostrar info inicial)
  async getMerchantPublicInfo(appId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!app) throw new NotFoundException('App no encontrada');

    const config = await this.prisma.couponMerchantConfig.findUnique({
      where: { appId },
      select: { id: true },
    });
    if (!config) {
      throw new NotFoundException('Esta app no tiene PIN de comerciante configurado');
    }

    const activeCoupons = await this.prisma.discountCoupon.count({
      where: { appId, isActive: true },
    });

    return {
      appName: app.name,
      activeCoupons,
    };
  }
}