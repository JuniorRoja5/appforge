import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterAppUserDto } from './dto/register-app-user.dto';
import { LoginAppUserDto } from './dto/login-app-user.dto';
import { UpdateAppUserDto } from './dto/update-app-user.dto';
import { ListAppUsersQueryDto } from './dto/list-app-users-query.dto';
import { RedeemPasswordResetDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { AppUser, Prisma } from '@prisma/client';

@Injectable()
export class AppUsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ──────────────────── Public (runtime) ────────────────────

  async register(appId: string, dto: RegisterAppUserDto) {
    await this.ensureAppExists(appId);

    const existing = await this.prisma.appUser.findUnique({
      where: { appId_email: { appId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.appUser.create({
      data: {
        appId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    return {
      access_token: this.signToken(user),
      user: this.toResponse(user),
    };
  }

  async login(appId: string, dto: LoginAppUserDto) {
    await this.ensureAppExists(appId);

    const user = await this.prisma.appUser.findUnique({
      where: { appId_email: { appId, email: dto.email } },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Cuenta bloqueada.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.signToken(user),
      user: this.toResponse(user),
    };
  }

  async getMe(appUserId: string) {
    const user = await this.prisma.appUser.findUnique({
      where: { id: appUserId },
    });
    if (!user) throw new NotFoundException();
    return this.toResponse(user);
  }

  async updateMe(appUserId: string, dto: UpdateAppUserDto) {
    const user = await this.prisma.appUser.update({
      where: { id: appUserId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
      },
    });
    return this.toResponse(user);
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  async listUsers(
    appId: string,
    query: ListAppUsersQueryDto,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AppUserWhereInput = { appId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appUser.count({ where }),
    ]);

    return { data: data.map(this.toResponse), total, page, limit };
  }

  async getStats(appId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const [total, active, banned] = await Promise.all([
      this.prisma.appUser.count({ where: { appId } }),
      this.prisma.appUser.count({ where: { appId, status: 'ACTIVE' } }),
      this.prisma.appUser.count({ where: { appId, status: 'BANNED' } }),
    ]);

    return { total, active, banned };
  }

  async banUser(appId: string, userId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const user = await this.ensureAppUserExists(appId, userId);

    if (user.status === 'BANNED') return this.toResponse(user);

    const updated = await this.prisma.appUser.update({
      where: { id: userId },
      data: { status: 'BANNED' },
    });
    return this.toResponse(updated);
  }

  async unbanUser(appId: string, userId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const user = await this.ensureAppUserExists(appId, userId);

    if (user.status === 'ACTIVE') return this.toResponse(user);

    const updated = await this.prisma.appUser.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });
    return this.toResponse(updated);
  }

  async deleteUser(appId: string, userId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);
    await this.ensureAppUserExists(appId, userId);

    await this.prisma.appUser.delete({ where: { id: userId } });
  }

  async getUserDetail(appId: string, userId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const user = await this.ensureAppUserExists(appId, userId);

    const [socialPosts, socialComments, socialLikes, fanPosts, fanLikes, reports] =
      await Promise.all([
        this.prisma.socialPost.count({ where: { appUserId: userId } }),
        this.prisma.socialComment.count({ where: { appUserId: userId } }),
        this.prisma.socialLike.count({ where: { appUserId: userId } }),
        this.prisma.fanPost.count({ where: { appUserId: userId } }),
        this.prisma.fanLike.count({ where: { appUserId: userId } }),
        this.prisma.contentReport.count({ where: { appUserId: userId } }),
      ]);

    const [recentSocialPosts, recentFanPosts] = await Promise.all([
      this.prisma.socialPost.findMany({
        where: { appUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, content: true, imageUrl: true, likesCount: true, createdAt: true },
      }),
      this.prisma.fanPost.findMany({
        where: { appUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, imageUrl: true, caption: true, likesCount: true, createdAt: true },
      }),
    ]);

    return {
      ...this.toResponse(user),
      activity: { socialPosts, socialComments, socialLikes, fanPosts, fanLikes, reports },
      recentPosts: { socialPosts: recentSocialPosts, fanPosts: recentFanPosts },
    };
  }

  async initiatePasswordReset(appId: string, userId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);
    await this.ensureAppUserExists(appId, userId);

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Store hash in DB, not the raw token
    await this.prisma.appUser.update({
      where: { id: userId },
      data: { resetToken: hashedToken, resetTokenExpiry },
    });

    return {
      resetToken, // Return raw token to admin (for manual delivery)
      expiresAt: resetTokenExpiry.toISOString(),
      emailSent: false,
    };
  }

  async redeemPasswordReset(appId: string, dto: RedeemPasswordResetDto) {
    await this.ensureAppExists(appId);

    const user = await this.prisma.appUser.findUnique({
      where: { appId_email: { appId, email: dto.email } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');
    if (
      !user.resetToken ||
      !user.resetTokenExpiry ||
      user.resetToken !== hashedToken ||
      user.resetTokenExpiry < new Date()
    ) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Contraseña actualizada.' };
  }

  async exportUsersCsv(appId: string, tenantId?: string, role?: string): Promise<string> {
    await this.ensureAppOwnership(appId, tenantId, role);

    // Corrección #3: limit to 5000 to prevent timeout
    const users = await this.prisma.appUser.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const total = await this.prisma.appUser.count({ where: { appId } });

    const header = 'Email,Nombre,Apellido,Estado,Ultimo Login,Registrado\n';
    const rows = users
      .map(
        (u) =>
          `"${u.email}","${u.firstName ?? ''}","${u.lastName ?? ''}","${u.status}","${u.lastLoginAt?.toISOString() ?? ''}","${u.createdAt.toISOString()}"`,
      )
      .join('\n');

    const warning =
      total > 5000
        ? `# NOTA: Se exportaron 5000 de ${total} usuarios. Use filtros para reducir el rango.\n`
        : '';

    return warning + header + rows;
  }

  // ──────────────────── Private helpers ────────────────────

  private async ensureAppExists(appId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null } });
    if (!app) throw new NotFoundException('App no encontrada.');
    return app;
  }

  private async ensureAppOwnership(appId: string, tenantId?: string, role?: string) {
    const app = await this.ensureAppExists(appId);
    if (role === 'CLIENT' && app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app.');
    }
    return app;
  }

  private async ensureAppUserExists(appId: string, userId: string) {
    const user = await this.prisma.appUser.findUnique({ where: { id: userId } });
    if (!user || user.appId !== appId) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return user;
  }

  private signToken(user: AppUser): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      appId: user.appId,
    });
  }

  private toResponse(user: AppUser) {
    return {
      id: user.id,
      appId: user.appId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
