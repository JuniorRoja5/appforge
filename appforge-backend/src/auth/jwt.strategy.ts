import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Fallback: support ?token= query parameter for file downloads
        (req: any) => req?.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cuenta no activa.');
    }

    // Check tenant suspension (SUPER_ADMIN is exempt to avoid self-lockout)
    if (user.tenantId && user.role !== 'SUPER_ADMIN') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { status: true },
      });
      if (tenant?.status === 'SUSPENDED') {
        throw new UnauthorizedException('Tu organización ha sido suspendida.');
      }
    }

    // Always use current DB values, not stale JWT payload.
    // Pass through impersonation flags untouched — they live in the
    // signed payload and identify the super-admin who initiated the
    // session. UI banners and audit reads use these.
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      impersonatedBy: payload.impersonatedBy ?? null,
      impersonationLogId: payload.impersonationLogId ?? null,
    };
  }
}
