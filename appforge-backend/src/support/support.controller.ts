import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * POST /support/tickets
   *
   * Envía un ticket de soporte a SUPPORT_EMAIL (default: hello@creatu.app).
   *
   * Guards en orden:
   *   - JwtAuthGuard: solo usuarios autenticados.
   *   - RolesGuard: CLIENT y SUPER_ADMIN. Anónimos y otros roles rechazados.
   *   - ThrottlerGuard: 5 tickets por hora por usuario autenticado — evita
   *     que una cuenta comprometida convierta hello@creatu.app en spam.
   *
   * El controller solo pasa el dto + datos del usuario autenticado al
   * service; toda la lógica vive ahí.
   */
  @Post('tickets')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  async createTicket(
    @Body() dto: CreateSupportTicketDto,
    @Req() req: any,
  ): Promise<{ ok: true }> {
    // req.user lo inyecta JwtAuthGuard. Shape: { userId, email, role, tenantId }
    // (ver appforge-backend/src/auth/jwt.strategy.ts).
    const requestIp =
      (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.ip
      ?? req.connection?.remoteAddress
      ?? undefined;

    await this.supportService.createTicket(dto, req.user, requestIp);
    return { ok: true };
  }
}
