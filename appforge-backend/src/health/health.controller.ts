import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import type { DepStatus } from './health.service';

interface HealthBody {
  ok: boolean;
  deps: {
    db: DepStatus;
    redis: DepStatus;
  };
  ts: string;
}

/**
 * Public health endpoint consumed by UptimeRobot every 5 minutes. NO auth
 * by design — operational endpoint. Throttled at 60/min: UptimeRobot's
 * 0.2 req/min is well under the limit, and the cap chokes any scraping.
 *
 * Status code contract is load-bearing for UptimeRobot:
 *   - All deps up → 200 OK with body.
 *   - Any dep down → 503 Service Unavailable with the SAME body shape.
 * Returning 200 with { ok: false } would be invisible to UptimeRobot
 * (it judges by status code), so we throw HttpException(body, 503) to
 * keep the body shape consistent regardless of outcome.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async check(): Promise<HealthBody> {
    const [db, redis] = await Promise.all([
      this.health.checkDb(),
      this.health.checkRedis(),
    ]);
    const ok = db.up && redis.up;
    const body: HealthBody = {
      ok,
      deps: { db, redis },
      ts: new Date().toISOString(),
    };
    if (!ok) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}
