import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Shape devuelto al cliente público de la página de privacidad.
 *
 * Cada respuesta tendrá `externalUrl` O `content`, no los dos (la página
 * usa externalUrl si está presente para redirigir; si no, renderiza content
 * sanitizado). Ambos pueden estar undefined si el reseller no configuró
 * nada — la página muestra mensaje "App aún no configurada".
 */
export interface PrivacyPublicResponse {
  appName: string;
  externalUrl?: string;
  content?: string;
}

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve los datos de privacidad para la página pública
   * /app-user/privacy/:appId.
   *
   * - Si `privacy.url` está presente y no vacío → externalUrl (página
   *   redirige con window.location.href, no Browser.open: la página vive
   *   en builder SPA navegador, no en Capacitor).
   * - Si solo `privacy.content` → content (página renderiza con sanitize).
   * - Si ninguno → ambos undefined (página muestra "App aún no configurada").
   *
   * 404 si el app no existe (importante: no exponer si el id era válido o
   * no por algún side-channel — el handler devuelve solo el mensaje
   * genérico).
   */
  async getPrivacyForPublicPage(appId: string): Promise<PrivacyPublicResponse> {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, appConfig: true },
    });

    if (!app) {
      throw new NotFoundException('App no encontrada');
    }

    // appConfig es Json column; Prisma lo tipa como JsonValue. Cast con
    // shape esperado — la escritura va por DTO con @ValidateNested así
    // que el shape está garantizado en write-time. Reads defensivos con
    // ?. por si una fila viejísima tuviera algo raro.
    const appConfig = (app.appConfig ?? {}) as {
      privacy?: { content?: string; url?: string };
    };
    const privacy = appConfig.privacy ?? {};

    return {
      appName: app.name,
      // `|| undefined` colapsa strings vacíos a undefined — si el cliente
      // limpió el campo, no propagamos un "" engañoso al frontend.
      externalUrl: privacy.url || undefined,
      content: privacy.content || undefined,
    };
  }
}
