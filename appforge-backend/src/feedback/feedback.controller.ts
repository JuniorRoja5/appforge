import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /feedback
   *
   * Envía un feedback (rating 1-5 + mensaje opcional) al mismo destino
   * que los tickets de soporte (SUPPORT_EMAIL, default hello@creatu.app).
   *
   * Guards en orden:
   *   - JwtAuthGuard: solo usuarios autenticados.
   *   - RolesGuard: CLIENT y SUPER_ADMIN.
   *   - ThrottlerGuard: 3 feedbacks por hora por usuario — más estricto
   *     que soporte (5/hora) porque el feedback es opinión, no problema
   *     urgente, y un usuario que envía 3+ en una hora probablemente
   *     está spameando o jugando con el form.
   */
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  async createFeedback(
    @Body() dto: CreateFeedbackDto,
    @Req() req: any,
  ): Promise<{ ok: true }> {
    const requestIp =
      (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.ip
      ?? req.connection?.remoteAddress
      ?? undefined;

    await this.feedbackService.createFeedback(dto, req.user, requestIp);
    return { ok: true };
  }
}
