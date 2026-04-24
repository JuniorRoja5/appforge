import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AppUsersModule } from '../app-users/app-users.module';
import { SocialWallService } from './social-wall.service';
import { SocialWallController } from './social-wall.controller';

@Module({
  imports: [
    PrismaModule,
    AppUsersModule,
    JwtModule.register({
      secret: process.env.APP_USER_JWT_SECRET as string,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [SocialWallService],
  controllers: [SocialWallController],
})
export class SocialWallModule {}
