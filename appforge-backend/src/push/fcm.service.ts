import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { FirebaseArrayIndexError } from 'firebase-admin/app';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../lib/crypto';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Lazy-initialize Firebase Admin SDK from DB config. */
  private async getApp(): Promise<admin.app.App> {
    if (this.app) return this.app;

    const config = await this.prisma.platformFcmConfig.findFirst();
    if (!config) {
      throw new Error('FCM no está configurado. Configúralo en Admin > Settings.');
    }

    const serviceAccountJson = decrypt(config.serviceAccountJson);
    const serviceAccount = JSON.parse(serviceAccountJson);

    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.logger.log(`Firebase Admin initialized for project: ${config.projectId}`);
    return this.app;
  }

  /** Reset cached app (e.g., after config update). */
  resetApp(): void {
    if (this.app) {
      this.app.delete().catch(() => {});
      this.app = null;
    }
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.prisma.platformFcmConfig.findFirst({
      select: { id: true },
    });
    return !!config;
  }

  /**
   * Send notification to the topic `app_{appId}`.
   * Returns success/failure counts. Also cleans up invalid tokens.
   */
  async sendToTopic(
    appId: string,
    title: string,
    body: string,
    imageUrl?: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    const firebaseApp = await this.getApp();
    const messaging = firebaseApp.messaging();
    const topic = `app_${appId}`;

    const message: admin.messaging.Message = {
      topic,
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      ...(data && { data }),
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'appforge_default',
          ...(imageUrl && { imageUrl }),
        },
      },
    };

    try {
      await messaging.send(message);
      return { successCount: 1, failureCount: 0 };
    } catch (err: any) {
      this.logger.error(`Failed to send to topic ${topic}: ${err.message}`);
      return { successCount: 0, failureCount: 1 };
    }
  }

  /** Subscribe device tokens to the app topic. */
  async subscribeToTopic(tokens: string[], appId: string): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const firebaseApp = await this.getApp();
      const response = await firebaseApp
        .messaging()
        .subscribeToTopic(tokens, `app_${appId}`);

      if (response.failureCount > 0) {
        const invalidTokens = this.extractInvalidTokens(tokens, response.errors);
        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(appId, invalidTokens);
        }
      }
    } catch (err: any) {
      this.logger.warn(`subscribeToTopic failed for app ${appId}: ${err.message}`);
    }
  }

  /** Unsubscribe device tokens from the app topic. */
  async unsubscribeFromTopic(tokens: string[], appId: string): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const firebaseApp = await this.getApp();
      await firebaseApp
        .messaging()
        .unsubscribeFromTopic(tokens, `app_${appId}`);
    } catch (err: any) {
      this.logger.warn(`unsubscribeFromTopic failed for app ${appId}: ${err.message}`);
    }
  }

  /**
   * Envía push a un token FCM concreto. No lanza si FCM no está configurado.
   * Usado por sendToAppUser y otros casos puntuales.
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    let firebaseApp: admin.app.App;
    try {
      firebaseApp = await this.getApp();
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'FCM not configured' };
    }
    try {
      await firebaseApp.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high' as const,
          notification: { channelId: 'appforge_default' },
        },
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Unknown FCM error' };
    }
  }

  /**
   * Envía push a todos los dispositivos asociados a un AppUser concreto.
   * Crea un registro PushNotification para auditoría con SENT/FAILED + counts.
   * No lanza errores; siempre devuelve un resumen.
   */
  async sendToAppUser(
    appId: string,
    appUserId: string,
    title: string,
    body: string,
    metadata: Record<string, any> = {},
  ): Promise<{ notificationId: string; successCount: number; failureCount: number }> {
    // 1. Crear registro de auditoría en estado DRAFT
    const notification = await this.prisma.pushNotification.create({
      data: {
        appId,
        title,
        body,
        data: metadata,
        status: 'DRAFT',
      },
    });

    // 2. Buscar todos los dispositivos del usuario
    const devices = await this.prisma.pushDevice.findMany({
      where: { appUserId },
    });

    if (devices.length === 0) {
      await this.prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          errorMessage: 'No devices registered for user',
          sentAt: new Date(),
        },
      });
      return { notificationId: notification.id, successCount: 0, failureCount: 0 };
    }

    // 3. Enviar a cada dispositivo (data debe ser Record<string,string> para FCM)
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    const fcmData = Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => [k, String(v)]),
    );

    for (const device of devices) {
      const result = await this.sendToToken(device.token, title, body, fcmData);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (result.error) errors.push(result.error);
      }
    }

    // 4. Actualizar el registro con el outcome
    await this.prisma.pushNotification.update({
      where: { id: notification.id },
      data: {
        status: successCount > 0 ? 'SENT' : 'FAILED',
        sentAt: new Date(),
        successCount,
        failureCount,
        errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      },
    });

    return { notificationId: notification.id, successCount, failureCount };
  }

  /** Test Firebase connection by getting app info. */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const firebaseApp = await this.getApp();
      // A simple way to verify: access the project ID
      const projectId = firebaseApp.options.projectId;
      if (!projectId) {
        return { ok: false, error: 'No se pudo obtener el project ID de Firebase.' };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // --- Private helpers ---

  private extractInvalidTokens(
    tokens: string[],
    errors: FirebaseArrayIndexError[],
  ): string[] {
    const invalidCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];
    return errors
      .filter((e) => invalidCodes.includes(e.error.code))
      .map((e) => tokens[e.index]);
  }

  private async removeInvalidTokens(appId: string, tokens: string[]): Promise<void> {
    const deleted = await this.prisma.pushDevice.deleteMany({
      where: { appId, token: { in: tokens } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Cleaned up ${deleted.count} invalid tokens for app ${appId}`);
    }
  }
}
