import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt } from '../lib/crypto';
import * as admin from 'firebase-admin';
import type { UpdatePlatformFcmDto } from './dto/update-platform-fcm.dto';

@Injectable()
export class PlatformFcmService {
  private readonly logger = new Logger(PlatformFcmService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Public config — never expose raw JSON credentials */
  async getConfig() {
    const config = await this.prisma.platformFcmConfig.findFirst();
    if (!config) return null;
    return {
      id: config.id,
      projectId: config.projectId,
      configured: true,
    };
  }

  async upsertConfig(dto: UpdatePlatformFcmDto) {
    if (!dto.serviceAccountJson || !dto.googleServicesJson) {
      throw new BadRequestException(
        'Debes proporcionar ambos archivos: Service Account JSON y google-services.json.',
      );
    }

    // Validate and extract project ID from service account JSON
    let projectId: string;
    try {
      const parsed = JSON.parse(dto.serviceAccountJson);
      projectId = parsed.project_id;
      if (!projectId) {
        throw new Error('El JSON no contiene project_id');
      }
    } catch (err: any) {
      throw new BadRequestException(
        `El Service Account JSON no es válido: ${err.message}`,
      );
    }

    // Validate google-services.json
    try {
      const parsed = JSON.parse(dto.googleServicesJson);
      if (!parsed.project_info?.project_id) {
        throw new Error('El JSON no contiene project_info.project_id');
      }
    } catch (err: any) {
      throw new BadRequestException(
        `El google-services.json no es válido: ${err.message}`,
      );
    }

    const encryptedServiceAccount = encrypt(dto.serviceAccountJson);
    const encryptedGoogleServices = encrypt(dto.googleServicesJson);

    const existing = await this.prisma.platformFcmConfig.findFirst();

    const data = {
      projectId,
      serviceAccountJson: encryptedServiceAccount,
      googleServicesJson: encryptedGoogleServices,
    };

    if (existing) {
      await this.prisma.platformFcmConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.platformFcmConfig.create({ data });
    }

    this.logger.log(`FCM config updated for project: ${projectId}`);

    return { projectId, configured: true };
  }

  /** Test Firebase connection by initializing a temporary app. */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const config = await this.prisma.platformFcmConfig.findFirst();
    if (!config) {
      return { ok: false, error: 'No hay configuración FCM guardada.' };
    }

    let testApp: admin.app.App | null = null;
    try {
      const { decrypt: dec } = await import('../lib/crypto.js');
      const serviceAccountJson = dec(config.serviceAccountJson);
      const serviceAccount = JSON.parse(serviceAccountJson);

      const appName = `fcm-test-${Date.now()}`;
      testApp = admin.initializeApp(
        { credential: admin.credential.cert(serviceAccount) },
        appName,
      );

      // Verify we can access messaging
      const projectId = testApp.options.projectId;
      if (!projectId) {
        return { ok: false, error: 'No se pudo obtener el project ID.' };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: `Error de conexión FCM: ${err.message}` };
    } finally {
      if (testApp) {
        testApp.delete().catch(() => {});
      }
    }
  }
}
