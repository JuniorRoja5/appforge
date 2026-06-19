import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Hosts the public `/health` endpoint consumed by UptimeRobot.
 *
 * Imports PrismaModule to inject PrismaService. Redis is NOT inside any
 * module — HealthService creates an ephemeral ioredis client per request
 * (see HealthService doc for why a singleton would be a footgun).
 *
 * ThrottlerModule is global (registered in AppModule), so ThrottlerGuard
 * is usable directly in HealthController without importing here.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
