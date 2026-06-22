import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { LegalService } from './legal.service';

/**
 * Endpoints públicos de documentos legales de apps.
 *
 * SIN @UseGuards de auth a nivel de clase — endpoints opt-in a su propio
 * guard. Mismo patrón que AppUsersController (líneas 30-74), no AppsController
 * que tiene class-level JwtAuthGuard.
 *
 * @Throttle 30/min: la página pública es lectura solamente, no mutación,
 * así que el rate-limit es más permisivo que el 5/min de reset-password.
 * Un usuario abre la página 1 vez, refresca quizá; 30/min cubre eso y
 * bloquea scraping/abuso sin estorbar.
 */
@Controller('apps/:appId/legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('privacy')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  getPrivacy(@Param('appId') appId: string) {
    return this.legalService.getPrivacyForPublicPage(appId);
  }
}
