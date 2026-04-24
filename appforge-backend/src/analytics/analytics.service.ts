import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestEventsDto } from './dto/ingest-events.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────

  private async ensureAppExists(appId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!app) throw new NotFoundException('App no encontrada');
    return app;
  }

  private async ensureAppOwnership(
    appId: string,
    tenantId?: string,
    role?: string,
  ) {
    const app = await this.ensureAppExists(appId);
    if (role === Role.SUPER_ADMIN) return app;
    if (app.tenantId !== tenantId)
      throw new ForbiddenException('No tienes acceso a esta app');
    return app;
  }

  private periodToDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: // 30d
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // ─── Ingestion ────────────────────────────────────────────

  async ingestEvents(appId: string, dto: IngestEventsDto) {
    // Validate appId exists (corrección #2: prevent fake events)
    await this.ensureAppExists(appId);

    const { events } = dto;
    if (events.length === 0) return { received: 0 };

    // Process session events
    for (const evt of events) {
      if (evt.eventType === 'session_start') {
        await this.prisma.analyticsSession.create({
          data: {
            id: evt.sessionId,
            appId,
            appUserId: evt.appUserId || null,
            platform: evt.platform,
            deviceModel: evt.deviceModel || null,
            osVersion: evt.osVersion || null,
            startedAt: new Date(evt.timestamp),
          },
        });
      } else if (evt.eventType === 'session_end') {
        const session = await this.prisma.analyticsSession.findUnique({
          where: { id: evt.sessionId },
        });
        if (session) {
          const endedAt = new Date(evt.timestamp);
          const duration = Math.round(
            (endedAt.getTime() - session.startedAt.getTime()) / 1000,
          );
          await this.prisma.analyticsSession.update({
            where: { id: evt.sessionId },
            data: { endedAt, duration: Math.max(0, duration) },
          });
        }
      }
    }

    // Bulk insert all events
    await this.prisma.analyticsEvent.createMany({
      data: events.map((evt) => ({
        appId,
        sessionId: evt.sessionId,
        eventType: evt.eventType,
        moduleId: evt.moduleId || null,
        platform: evt.platform,
        deviceModel: evt.deviceModel || null,
        osVersion: evt.osVersion || null,
        appUserId: evt.appUserId || null,
        metadata: (evt.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        timestamp: new Date(evt.timestamp),
      })),
    });

    return { received: events.length };
  }

  // ─── Overview ─────────────────────────────────────────────

  async getOverview(
    appId: string,
    period: string,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const since = this.periodToDate(period);

    const [totalSessions, activeUsersRaw, avgDuration, totalScreenViews, dailyTrend] =
      await Promise.all([
        // Total sessions
        this.prisma.analyticsSession.count({
          where: { appId, startedAt: { gte: since } },
        }),
        // Unique active users (distinct appUserId, fallback to session id for anonymous)
        this.prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(DISTINCT COALESCE("appUserId", id))::int as count
          FROM "AnalyticsSession"
          WHERE "appId" = ${appId} AND "startedAt" >= ${since}
        `,
        // Average session duration
        this.prisma.analyticsSession.aggregate({
          where: { appId, startedAt: { gte: since }, duration: { not: null } },
          _avg: { duration: true },
        }),
        // Total screen views
        this.prisma.analyticsEvent.count({
          where: {
            appId,
            eventType: { in: ['screen_view', 'module_view'] },
            timestamp: { gte: since },
          },
        }),
        // Daily trend
        this.prisma.$queryRaw<
          Array<{ day: string; users: number; sessions: number }>
        >`
          SELECT
            date_trunc('day', "startedAt")::date::text as day,
            COUNT(DISTINCT COALESCE("appUserId", id))::int as users,
            COUNT(*)::int as sessions
          FROM "AnalyticsSession"
          WHERE "appId" = ${appId} AND "startedAt" >= ${since}
          GROUP BY day
          ORDER BY day ASC
        `,
      ]);

    return {
      totalSessions,
      activeUsers: activeUsersRaw[0]?.count ?? 0,
      avgSessionDuration: Math.round(avgDuration._avg.duration ?? 0),
      totalScreenViews,
      dailyTrend,
    };
  }

  // ─── Module Ranking ───────────────────────────────────────

  async getModuleRanking(
    appId: string,
    period: string,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const since = this.periodToDate(period);

    return this.prisma.$queryRaw<Array<{ moduleId: string; views: number }>>`
      SELECT "moduleId", COUNT(*)::int as views
      FROM "AnalyticsEvent"
      WHERE "appId" = ${appId}
        AND "eventType" = 'module_view'
        AND "moduleId" IS NOT NULL
        AND "timestamp" >= ${since}
      GROUP BY "moduleId"
      ORDER BY views DESC
      LIMIT 15
    `;
  }

  // ─── Device Breakdown ─────────────────────────────────────

  async getDeviceBreakdown(
    appId: string,
    period: string,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);
    const since = this.periodToDate(period);

    const [platformsRaw, topDevices] = await Promise.all([
      this.prisma.$queryRaw<Array<{ platform: string; count: number }>>`
        SELECT "platform", COUNT(*)::int as count
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${since}
        GROUP BY "platform"
      `,
      this.prisma.$queryRaw<Array<{ model: string; count: number }>>`
        SELECT "deviceModel" as model, COUNT(*)::int as count
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${since} AND "deviceModel" IS NOT NULL
        GROUP BY "deviceModel"
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    const platforms: Record<string, number> = {
      android: 0,
      ios: 0,
      web: 0,
    };
    for (const row of platformsRaw) {
      platforms[row.platform] = row.count;
    }

    return { platforms, topDevices };
  }

  // ─── Retention ────────────────────────────────────────────

  async getRetention(
    appId: string,
    period: string,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodSince = this.periodToDate(period);

    const [dauRaw, wauRaw, mauRaw, dailyActiveUsers] = await Promise.all([
      this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT COALESCE("appUserId", id))::int as count
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${since24h}
      `,
      this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT COALESCE("appUserId", id))::int as count
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${since7d}
      `,
      this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT COALESCE("appUserId", id))::int as count
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${since30d}
      `,
      this.prisma.$queryRaw<Array<{ day: string; users: number }>>`
        SELECT
          date_trunc('day', "startedAt")::date::text as day,
          COUNT(DISTINCT COALESCE("appUserId", id))::int as users
        FROM "AnalyticsSession"
        WHERE "appId" = ${appId} AND "startedAt" >= ${periodSince}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    return {
      dau: dauRaw[0]?.count ?? 0,
      wau: wauRaw[0]?.count ?? 0,
      mau: mauRaw[0]?.count ?? 0,
      dailyActiveUsers,
    };
  }
}
