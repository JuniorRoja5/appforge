import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SendPushDto } from './dto/send-push.dto';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId)
      throw new ForbiddenException('No tienes acceso a esta app');
  }

  private async ensureAppExists(appId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { id: true },
    });
    if (!app) throw new NotFoundException('App not found');
  }

  // --- Device registration (public — called from runtime) ---

  async registerDevice(appId: string, dto: RegisterDeviceDto) {
    await this.ensureAppExists(appId);

    if (!dto.token || dto.token.length < 10) {
      throw new BadRequestException('Token inválido');
    }

    const device = await this.prisma.pushDevice.upsert({
      where: { appId_token: { appId, token: dto.token } },
      update: {
        platform: dto.platform || 'android',
        updatedAt: new Date(),
      },
      create: {
        appId,
        token: dto.token,
        platform: dto.platform || 'android',
      },
    });

    // Subscribe to FCM topic in background (don't block response)
    this.fcmService.subscribeToTopic([dto.token], appId).catch((err) => {
      this.logger.warn(`Topic subscription failed: ${err.message}`);
    });

    return device;
  }

  async unregisterDevice(appId: string, token: string) {
    await this.prisma.pushDevice.deleteMany({
      where: { appId, token },
    });

    // Unsubscribe from topic in background
    this.fcmService.unsubscribeFromTopic([token], appId).catch((err) => {
      this.logger.warn(`Topic unsubscription failed: ${err.message}`);
    });

    return { ok: true };
  }

  // --- Protected endpoints (builder client) ---

  async getDeviceCount(appId: string): Promise<{ count: number }> {
    const count = await this.prisma.pushDevice.count({ where: { appId } });
    return { count };
  }

  async findAll(appId: string) {
    return this.prisma.pushNotification.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(appId: string, id: string) {
    const notification = await this.prisma.pushNotification.findFirst({
      where: { id, appId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async sendNotification(appId: string, dto: SendPushDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    if (!dto.title || !dto.body) {
      throw new BadRequestException('title and body are required');
    }

    const configured = await this.fcmService.isConfigured();
    if (!configured) {
      throw new BadRequestException(
        'FCM no está configurado. El administrador debe configurar Firebase en Settings.',
      );
    }

    // Create notification record as DRAFT
    const notification = await this.prisma.pushNotification.create({
      data: {
        appId,
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl ?? null,
        data: dto.data ?? undefined,
        status: 'DRAFT',
      },
    });

    // Send via FCM
    try {
      const result = await this.fcmService.sendToTopic(
        appId,
        dto.title,
        dto.body,
        dto.imageUrl,
        dto.data,
      );

      return this.prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: result.successCount > 0 ? 'SENT' : 'FAILED',
          sentAt: new Date(),
          successCount: result.successCount,
          failureCount: result.failureCount,
        },
      });
    } catch (err: any) {
      return this.prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    }
  }

  async getStats(appId: string) {
    const [deviceCount, notificationsSent, lastNotification] =
      await Promise.all([
        this.prisma.pushDevice.count({ where: { appId } }),
        this.prisma.pushNotification.count({
          where: { appId, status: 'SENT' },
        }),
        this.prisma.pushNotification.findFirst({
          where: { appId, status: 'SENT' },
          orderBy: { sentAt: 'desc' },
          select: { sentAt: true },
        }),
      ]);

    return {
      deviceCount,
      notificationsSent,
      lastSentAt: lastNotification?.sentAt ?? null,
    };
  }
}
