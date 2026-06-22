import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePrivacyUrl } from '../lib/tracking-urls';

// Contrato que consume el runtime end-user (PWA + Capacitor APK). Whitelist
// curada: solo los 4 subcampos de appConfig que los consumidores medidos del
// manifest leen (splash, onboarding, terms, privacyUrlResolved). NO spread
// crudo de app.appConfig — eso filtraría androidConfig / packageName / etc.
// que viven en el mismo JSON pero son operacionales del build, no del runtime.
export interface RuntimeConfigResponse {
  version: string;
  schema: unknown;
  designTokens: unknown;
  appConfig: {
    splash?: unknown;
    onboarding?: unknown;
    terms?: unknown;
    privacyUrlResolved?: string | null;
  };
}

@Injectable()
export class RuntimeConfigService {
  constructor(private prisma: PrismaService) {}

  async getRuntimeConfig(appId: string): Promise<RuntimeConfigResponse> {
    // findFirst + deletedAt:null en una sola query — apps soft-deleted no se
    // sirven al runtime (devolvemos 404, igual que ensureOwnership en
    // apps.service:41). select explícito como defensa en profundidad: si
    // mañana alguien añade columnas sensibles al modelo App, este endpoint
    // no las arrastra por arrastre.
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: {
        id: true,
        schema: true,
        designTokens: true,
        appConfig: true,
        updatedAt: true,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const rawConfig = (app.appConfig as Record<string, unknown> | null) ?? {};

    return {
      version: app.updatedAt.toISOString(),
      schema: app.schema,
      designTokens: app.designTokens,
      appConfig: {
        splash: rawConfig.splash,
        onboarding: rawConfig.onboarding,
        terms: rawConfig.terms,
        privacyUrlResolved: resolvePrivacyUrl(rawConfig, app.id),
      },
    };
  }
}
