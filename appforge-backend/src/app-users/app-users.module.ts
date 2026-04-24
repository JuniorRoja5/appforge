import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AppUsersService } from './app-users.service';
import { AppUsersController } from './app-users.controller';
import { AppUserJwtStrategy } from './app-user-jwt.strategy';
import { AppUserAuthGuard } from './app-user-auth.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.APP_USER_JWT_SECRET as string,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [AppUsersService, AppUserJwtStrategy, AppUserAuthGuard],
  controllers: [AppUsersController],
  exports: [AppUserAuthGuard],
})
export class AppUsersModule {}
