import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: PlatformEmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      if (user.status === 'PENDING_DELETION') {
        throw new UnauthorizedException('Esta cuenta tiene una solicitud de eliminación pendiente.');
      }
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Esta cuenta ha sido suspendida.');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, tenantId: user.tenantId };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        avatarUrl: user.avatarUrl ?? null,
        company: user.company ?? null,
      },
    };
  }

  async register(data: Prisma.UserCreateInput) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create a tenant for the new user automatically
    const tenant = await this.prisma.tenant.create({
      data: { name: data.email.split('@')[0] },
    });

    // Assign FREE plan to new tenant
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType: 'FREE' },
    });
    if (freePlan) {
      await this.prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          expiresAt: new Date('2099-12-31'),
        },
      });
    }

    const user = await this.usersService.create({
      email: data.email,
      password: hashedPassword,
      role: 'CLIENT',
      tenant: { connect: { id: tenant.id } },
    });

    return this.login(user);
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException('Google login no configurado.');
    }

    const client = new OAuth2Client(clientId);
    let payload: { email?: string; name?: string; picture?: string };

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload() as any;
    } catch {
      throw new UnauthorizedException('Token de Google inválido.');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google.');
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(payload.email);

    if (existingUser) {
      if (existingUser.status === 'PENDING_DELETION') {
        throw new UnauthorizedException('Esta cuenta tiene una solicitud de eliminación pendiente.');
      }
      if (existingUser.status === 'SUSPENDED') {
        throw new UnauthorizedException('Esta cuenta ha sido suspendida.');
      }

      // Update avatar if changed
      if (payload.picture && payload.picture !== existingUser.avatarUrl) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { avatarUrl: payload.picture },
        });
      }

      return this.login(existingUser);
    }

    // Create new user with random password (Google-only user)
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    const tenant = await this.prisma.tenant.create({
      data: { name: payload.name || payload.email.split('@')[0] },
    });

    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType: 'FREE' },
    });
    if (freePlan) {
      await this.prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          expiresAt: new Date('2099-12-31'),
        },
      });
    }

    const nameParts = (payload.name || '').split(' ');
    const user = await this.usersService.create({
      email: payload.email,
      password: randomPassword,
      role: 'CLIENT',
      firstName: nameParts[0] || null,
      lastName: nameParts.slice(1).join(' ') || null,
      avatarUrl: payload.picture || null,
      tenant: { connect: { id: tenant.id } },
    });

    return this.login(user);
  }

  // --- Forgot Password ---
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) return { message: 'Si el email existe, recibirás un código de recuperación.' };

    // Generate 6-digit token, 1 hour expiry
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store hash in DB, not the raw token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry },
    });

    // Send ORIGINAL token by email (user needs the raw code)
    this.emailService.sendPasswordResetEmail(
      email,
      user.firstName || user.email.split('@')[0],
      resetToken,
    );

    return { message: 'Si el email existe, recibirás un código de recuperación.' };
  }

  // --- Reset Password ---
  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Código inválido o expirado.');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (
      !user.resetToken ||
      !user.resetTokenExpiry ||
      user.resetToken !== hashedToken ||
      user.resetTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Código inválido o expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
