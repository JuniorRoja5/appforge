import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/**
 * Módulo de documentos legales públicos (G2 Commit B).
 *
 * Hospeda endpoints PÚBLICOS (sin auth) para servir contenido legal de
 * las apps a usuarios finales sin login. Hoy: política de privacidad
 * (GET /apps/:appId/legal/privacy). Si en el futuro se quiere también
 * términos públicos (D1 expandido), o cualquier otra superficie legal
 * pública, vive aquí.
 *
 * Separado de AppsModule porque AppsController tiene @UseGuards a nivel
 * de clase (JwtAuthGuard, RolesGuard) y mezclar endpoints públicos
 * exigiría un @Public decorator que no existe en el repo. Sigue el patrón
 * de AppUsersController: guards per-método, ThrottlerGuard para rate-limit.
 *
 * PrismaService disponible sin importar (PrismaModule es @Global).
 */
@Module({
  controllers: [LegalController],
  providers: [LegalService],
})
export class LegalModule {}
