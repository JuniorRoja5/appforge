import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

/**
 * Módulo de Soporte — endpoint POST /support/tickets que envía un email
 * con los datos del cliente y el mensaje a SUPPORT_EMAIL (default:
 * hello@creatu.app).
 *
 * No declara imports porque sus dependencias son globales:
 *   - PrismaService viene de PrismaModule (global).
 *   - PlatformEmailService viene de PlatformModule (@Global, exporta
 *     PlatformEmailService).
 *
 * No exporta nada: el controller es el único punto de entrada y vive
 * dentro del propio módulo.
 */
@Module({
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
