import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { TelegramService } from '../notifications/telegram.service';
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
    private telegram: TelegramService,
  ) {}

  /**
   * Fires a Telegram alert for new-user registration. Called from both
   * registration paths (email/password via `register`, Google via the
   * "new user" branch of `googleLogin`). NOT called from the "existing
   * user" branch of `googleLogin` — that path is a login, not a registration.
   *
   * Fire-and-forget by design: `void` discards the Promise so the caller
   * doesn't block on Telegram's network round-trip, and TelegramService
   * never rethrows so there's no unhandled rejection. A failing Telegram
   * MUST NOT break the registration.
   */
  private notifyNewRegistration(
    user: { email: string; firstName?: string | null; lastName?: string | null },
    via: 'email' | 'Google',
  ): void {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
    void this.telegram.sendMessage(
      `🆕 Nuevo registro en Creatu.app\n` +
        `Email: ${user.email}\n` +
        `Nombre: ${name}\n` +
        `Vía: ${via}`,
    );
  }

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

  /**
   * Sign a short-lived (1h) JWT with an `impersonatedBy` flag.
   * Used by admin.service.impersonate. The payload carries the IMPERSONATED
   * user's id/email/role/tenantId — JwtStrategy.validate runs against that
   * user (not the super-admin), so guards like User.status / Tenant.status
   * still apply to the impersonated identity. The `impersonatedBy` field
   * is metadata: it surfaces in req.user for UI banners ("Estás suplantando
   * a X") and audit, but does not change auth semantics.
   */
  signImpersonationToken(
    impersonatedUser: { id: string; email: string; role: string; tenantId: string | null },
    superAdminId: string,
    impersonationLogId: string,
  ): string {
    const payload = {
      email: impersonatedUser.email,
      sub: impersonatedUser.id,
      role: impersonatedUser.role,
      tenantId: impersonatedUser.tenantId,
      impersonatedBy: superAdminId,
      impersonationLogId,
    };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  async register(data: Prisma.UserCreateInput) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Verify FREE plan exists BEFORE creating anything (fail-loud)
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType: 'FREE' },
    });
    if (!freePlan) {
      throw new BadRequestException(
        'Sistema no inicializado correctamente. Contacta al administrador.',
      );
    }

    // Comprobación explícita de email duplicado ANTES de la transaction:
    // sin esto, el insert dentro de $transaction falla con
    // PrismaClientKnownRequestError (P2002) y NestJS lo traduce a 500
    // genérico — el cliente ve "Error al registrar" sin saber que basta
    // con usar otro email. Devolver 409 ConflictException con mensaje en
    // español plano cierra el bucle UX. Defensa en profundidad: el unique
    // constraint en DB sigue siendo la verdad última si hay race condition
    // entre este check y el insert (improbable pero posible).
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException(
        'Este email ya está registrado. Inicia sesión o usa otro email.',
      );
    }

    // Atomic: create tenant + subscription + user en UNA SOLA transaction.
    // Pre-fix: el user.create vivía fuera del $transaction; si fallaba
    // (p. ej. unique constraint en email tras una race entre el check
    // L125 y el insert), quedaba un tenant + subscription huérfanos en
    // DB sin user asociado. usersService.create() es trivialmente
    // equivalente a prisma.user.create({ data }) (medido en
    // users.service.ts L44-48) — sin side effects que se pierdan al
    // moverlo dentro del tx.
    const { user } = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: { name: data.email.split('@')[0] },
      });
      await tx.subscription.create({
        data: {
          tenantId: t.id,
          planId: freePlan.id,
          expiresAt: new Date('2099-12-31'),
        },
      });
      const u = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: 'CLIENT',
          tenant: { connect: { id: t.id } },
        },
      });
      return { tenant: t, user: u };
    });

    this.notifyNewRegistration(user, 'email');
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

    // Verify FREE plan exists BEFORE creating anything (fail-loud)
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { planType: 'FREE' },
    });
    if (!freePlan) {
      throw new BadRequestException(
        'Sistema no inicializado correctamente. Contacta al administrador.',
      );
    }

    // Atomic: create tenant + subscription in a single transaction
    const tenantName = payload.name || payload.email.split('@')[0];
    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: { name: tenantName },
      });
      await tx.subscription.create({
        data: {
          tenantId: t.id,
          planId: freePlan.id,
          expiresAt: new Date('2099-12-31'),
        },
      });
      return t;
    });

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

    this.notifyNewRegistration(user, 'Google');
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

  // --- Change Password (authenticated, current → new) ---
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado.');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Notify the user that their password was changed (best-effort).
    // No throw if SMTP is not configured — the change itself succeeded.
    this.emailService.sendPasswordChangedEmail(
      user.email,
      user.firstName ?? user.email,
    ).catch(() => { /* ignore — email is informational */ });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
