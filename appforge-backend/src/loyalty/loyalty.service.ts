import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetupLoyaltyDto } from './dto/setup-loyalty.dto';
import { StampDto } from './dto/stamp.dto';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

@Injectable()
export class LoyaltyService {
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

  // --- Setup (create/update loyalty card config) ---
  async setup(appId: string, dto: SetupLoyaltyDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    return this.prisma.loyaltyCard.upsert({
      where: { appId },
      create: {
        appId,
        totalStamps: dto.totalStamps,
        reward: dto.reward,
        rewardDescription: dto.rewardDescription ?? null,
        businessPin: hashedPin,
      },
      update: {
        totalStamps: dto.totalStamps,
        reward: dto.reward,
        rewardDescription: dto.rewardDescription ?? null,
        businessPin: hashedPin,
      },
    });
  }

  // --- Public config (without PIN) ---
  async getConfig(appId: string) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { appId },
    });
    if (!card) throw new NotFoundException('Loyalty card not configured');
    const { businessPin, ...config } = card;
    return config;
  }

  // --- My card (app user's stamps + canRedeem) ---
  async getMyCard(appId: string, appUserId: string) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { appId },
    });
    if (!card) throw new NotFoundException('Loyalty card not configured');

    const stampsCollected = await this.countStampsSinceLastRedemption(appId, appUserId);
    const totalRedemptions = await this.prisma.loyaltyRedemption.count({
      where: { appId, appUserId },
    });

    return {
      totalStamps: card.totalStamps,
      reward: card.reward,
      rewardDescription: card.rewardDescription,
      stampsCollected,
      canRedeem: stampsCollected >= card.totalStamps,
      totalRedemptions,
    };
  }

  // --- Stamp (public, with PIN + brute-force protection) ---
  async stamp(appId: string, dto: StampDto) {
    // Brute-force check
    const lockKey = `loyalty:lockout:${appId}`;
    const failKey = `loyalty:fails:${appId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new HttpException('Demasiados intentos fallidos. Espera 15 minutos.', 429);
    }

    const card = await this.prisma.loyaltyCard.findUnique({
      where: { appId },
    });
    if (!card) throw new NotFoundException('Loyalty card not configured');

    // Verify PIN
    const pinValid = await bcrypt.compare(dto.pin, card.businessPin);
    if (!pinValid) {
      const fails = await this.redis.incr(failKey);
      await this.redis.expire(failKey, 900); // 15 min TTL
      if (fails >= 10) {
        await this.redis.set(lockKey, '1', 'EX', 900);
      }
      throw new ForbiddenException('PIN incorrecto');
    }

    // PIN correct — reset fail counter
    await this.redis.del(failKey);

    // Find app user by email
    const appUser = await this.prisma.appUser.findUnique({
      where: { appId_email: { appId, email: dto.appUserEmail } },
    });
    if (!appUser) throw new NotFoundException('Usuario no encontrado');

    // Check if user already has enough stamps for a redemption
    const currentStamps = await this.countStampsSinceLastRedemption(appId, appUser.id);
    if (currentStamps >= card.totalStamps) {
      throw new BadRequestException(
        'El usuario ya tiene todos los sellos. Debe canjear la recompensa primero.',
      );
    }

    // Create stamp
    const stamp = await this.prisma.loyaltyStamp.create({
      data: {
        appId,
        appUserId: appUser.id,
      },
    });

    const newCount = currentStamps + 1;
    return {
      stamp,
      stampsCollected: newCount,
      totalStamps: card.totalStamps,
      canRedeem: newCount >= card.totalStamps,
    };
  }

  // --- Redeem (app user auth required) ---
  async redeem(appId: string, appUserId: string) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { appId },
    });
    if (!card) throw new NotFoundException('Loyalty card not configured');

    const stampsCollected = await this.countStampsSinceLastRedemption(appId, appUserId);
    if (stampsCollected < card.totalStamps) {
      throw new BadRequestException(
        `Necesitas ${card.totalStamps} sellos para canjear. Tienes ${stampsCollected}.`,
      );
    }

    const redemption = await this.prisma.loyaltyRedemption.create({
      data: { appId, appUserId },
    });

    return {
      redemption,
      reward: card.reward,
      rewardDescription: card.rewardDescription,
    };
  }

  // --- Stats (for builder client) ---
  async getStats(appId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeUsers, stampsThisMonth, totalRedemptions] = await Promise.all([
      this.prisma.loyaltyStamp
        .findMany({
          where: { appId },
          select: { appUserId: true },
          distinct: ['appUserId'],
        })
        .then((r) => r.length),
      this.prisma.loyaltyStamp.count({
        where: { appId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.loyaltyRedemption.count({
        where: { appId },
      }),
    ]);

    return { activeUsers, stampsThisMonth, totalRedemptions };
  }

  // --- Helper: count stamps since last redemption ---
  private async countStampsSinceLastRedemption(appId: string, appUserId: string): Promise<number> {
    const lastRedemption = await this.prisma.loyaltyRedemption.findFirst({
      where: { appId, appUserId },
      orderBy: { redeemedAt: 'desc' },
    });

    return this.prisma.loyaltyStamp.count({
      where: {
        appId,
        appUserId,
        ...(lastRedemption ? { createdAt: { gt: lastRedemption.redeemedAt } } : {}),
      },
    });
  }
}
