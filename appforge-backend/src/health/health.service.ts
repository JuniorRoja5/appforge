import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health checks for the `/health` endpoint consumed by UptimeRobot.
 *
 * Two dependencies checked in parallel: Postgres (via Prisma) and Redis.
 * Each check is wrapped in a 2-second timeout. A check that does not resolve
 * inside the window is reported as `down`. The Nest controller then maps
 * the aggregate to HTTP 200 (all up) or 503 (any down).
 *
 * Scope decisions for v1 (intentional):
 *   - `SELECT 1` proves the Prisma connection pool can hand out a TCP
 *     connection to Postgres. It does NOT prove the database serves data
 *     against a real table, nor that it's not in recovery/read-only. For
 *     a basic liveness probe this is enough and cheap. If we ever want
 *     "data path is alive" we'd switch to a `SELECT count(*) FROM "SubscriptionPlan"`
 *     against a table we know holds 5 rows.
 *   - Redis check uses an EPHEMERAL connection (new ioredis per call, ping,
 *     quit). NOT a persistent singleton: an ioredis client that has lived
 *     through a Redis restart can enter a reconnection state where ping()
 *     hangs / throws / returns stale — your 2s timeout then reports `down`
 *     for a degraded client, not for a real Redis outage (false 🚨). At
 *     UptimeRobot's 5-min cadence (~0.2 req/min) the cost of opening a
 *     socket per check is noise; the reliability gain is large.
 *
 * Scope NOT covered (deliberate):
 *   - External dependencies (Stripe, SMTP, FCM): their outages are not
 *     "the backend is down". A health endpoint that conflates the two
 *     produces 🚨 the operator cannot action.
 *   - BullMQ workers: separate PM2 process, separate monitoring.
 */
@Injectable()
export class HealthService {
  private readonly redisHost = process.env.REDIS_HOST || 'localhost';
  private readonly redisPort = Number(process.env.REDIS_PORT || 6379);

  constructor(private readonly prisma: PrismaService) {}

  async checkDb(): Promise<DepStatus> {
    return runWithTimeout(2000, async () => {
      const t = Date.now();
      // Liveness of the Prisma connection pool ↔ Postgres TCP, NOT a real
      // data path. See class-level doc-comment for the why.
      await this.prisma.$queryRaw`SELECT 1`;
      return Date.now() - t;
    });
  }

  async checkRedis(): Promise<DepStatus> {
    return runWithTimeout(2000, async () => {
      const t = Date.now();
      const client = new Redis({
        host: this.redisHost,
        port: this.redisPort,
        // Fail fast: do NOT queue commands while disconnected, do NOT retry
        // forever on transient errors. We want a clear `down` signal, not a
        // ping that eventually arrives after Redis is back.
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1500,
        // Lazy connect so we can catch connection errors inside the await.
        lazyConnect: true,
      });
      try {
        await client.connect();
        const reply = await client.ping();
        if (reply !== 'PONG') {
          throw new Error(`Unexpected PING reply: ${reply}`);
        }
        return Date.now() - t;
      } finally {
        // disconnect (not quit) — disconnect is synchronous and won't hang
        // if the client is in a broken state. quit() can wait for an ack
        // that may never arrive.
        client.disconnect();
      }
    });
  }
}

export type DepStatus =
  | { up: true; ms: number }
  | { up: false; error: string };

/**
 * Runs `check` with a hard timeout. `check` returns the elapsed ms on
 * success. If `check` throws → `{ up: false, error: message }`. If the
 * timeout fires first → `{ up: false, error: 'timeout' }`.
 */
async function runWithTimeout(
  ms: number,
  check: () => Promise<number>,
): Promise<DepStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<DepStatus>((resolve) => {
    timer = setTimeout(
      () => resolve({ up: false, error: 'timeout' }),
      ms,
    );
  });
  const work = check()
    .then<DepStatus>((elapsed) => ({ up: true, ms: elapsed }))
    .catch<DepStatus>((err: any) => ({
      up: false,
      error: err?.message ?? String(err),
    }));
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
