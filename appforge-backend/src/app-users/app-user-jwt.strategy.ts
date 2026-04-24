import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppUserJwtStrategy extends PassportStrategy(Strategy, 'app-user-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.APP_USER_JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; email: string; appId: string }) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id: payload.sub },
    });

    if (!appUser) {
      throw new UnauthorizedException();
    }

    if (appUser.status === 'BANNED') {
      throw new UnauthorizedException('Cuenta bloqueada.');
    }

    if (appUser.appId !== payload.appId) {
      throw new UnauthorizedException();
    }

    return {
      appUserId: appUser.id,
      email: appUser.email,
      appId: appUser.appId,
    };
  }
}
