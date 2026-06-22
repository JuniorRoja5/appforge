import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RuntimeConfigService } from './runtime-config.service';

// Endpoint público que sirve al runtime end-user su configuración (schema +
// designTokens + appConfig curado) en vivo, reemplazando el rol del manifest
// horneado para todo lo "soft" (editorial). El manifest baked queda como
// bootstrap mínimo + snapshot offline; la fuente de verdad es esta ruta.
//
// AUTH: pública por diseño. El threat model es idéntico al manifest horneado
// de hoy (mismo dato, ya descargable con la URL de la PWA). No hay secretos
// en esta superficie — SMTP y keystore son relaciones aparte. ThrottlerGuard
// explícito (NO global en NestJS aunque el módulo sí lo sea) limita scraping
// en bucle de appIds: 60 req/60s/IP del forRoot global. Sin @Throttle()
// override — el dimensionado es para arranques de end-users reales, no para
// acciones sensibles tipo login/reset.
//
// PATH: @Controller('apps/:appId') + @Get('runtime-config'). El segmento
// literal 'runtime-config' no colisiona con @Get(':id') de apps.controller
// (ese matchea un único segmento UUID; aquí hay dos segmentos: el id + el
// literal). ParseUUIDPipe rechaza appId malformado con 400 antes de tocar
// Prisma.
@Controller('apps/:appId')
export class RuntimeConfigController {
  constructor(private readonly service: RuntimeConfigService) {}

  @Get('runtime-config')
  @UseGuards(ThrottlerGuard)
  async getRuntimeConfig(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.getRuntimeConfig(appId);

    // ETag por updatedAt en ISO (precisión ms — evita el wart de
    // Last-Modified, que es segundo). Comilla obligatoria por RFC 7232:
    // el cliente recibe `ETag: "..."` y debe mandar `If-None-Match: "..."`
    // exactamente igual. Comparación textual estricta abajo.
    const etag = `"${result.version}"`;
    const clientEtag = req.headers['if-none-match'];

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');

    if (clientEtag === etag) {
      res.status(304);
      // Body vacío en 304 (RFC 7232 §4.1). passthrough:true + return
      // undefined deja Express terminar la respuesta sin payload.
      return;
    }

    return result;
  }
}
