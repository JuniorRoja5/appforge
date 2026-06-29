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
  // appName: añadido para el flujo preview-as-runtime (Fase 0).
  // El runtime en modo preview no tiene manifest baked (no hay PWA
  // horneada per-app aquí — el iframe sirve el runtime standalone
  // contra runtime-config). Sin appName, el header del AppShell no
  // tiene qué pintar. Para el runtime en producción (PWA/AAB) este
  // campo es informativo extra; el shape baked sigue mandando.
  appName: string;
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

  /**
   * @param appId UUID de la app.
   * @param isPreview true cuando el cliente llega desde el iframe del
   *   builder (preview.creatu.app/?appId=...&preview=true). Hoy NO altera
   *   el response — todos los filtros aplican igual. Preventivo para
   *   futuras divergencias (p.ej. omitir filtros de plan que hagan que
   *   un módulo deshabilitado por billing no se vea en preview; el
   *   cliente que está diseñando debe ver TODO lo que ha configurado).
   */
  async getRuntimeConfig(appId: string, _isPreview = false): Promise<RuntimeConfigResponse> {
    // findFirst + deletedAt:null en una sola query — apps soft-deleted no se
    // sirven al runtime (devolvemos 404, igual que ensureOwnership en
    // apps.service:41). select explícito como defensa en profundidad: si
    // mañana alguien añade columnas sensibles al modelo App, este endpoint
    // no las arrastra por arrastre.
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: {
        id: true,
        name: true,
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
      appName: app.name,
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
