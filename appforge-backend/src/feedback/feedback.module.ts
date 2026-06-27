import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

/**
 * Módulo de Feedback — endpoint POST /feedback que envía un email con
 * rating + mensaje opcional al mismo destino que soporte (SUPPORT_EMAIL,
 * default hello@creatu.app).
 *
 * No declara imports porque sus dependencias son globales:
 *   - PrismaService viene de PrismaModule (global).
 *   - PlatformEmailService viene de PlatformModule (@Global, exporta
 *     PlatformEmailService).
 *
 * Mismo patrón que SupportModule (cf. support.module.ts).
 */
@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
