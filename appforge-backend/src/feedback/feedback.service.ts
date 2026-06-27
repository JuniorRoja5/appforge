import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
}

/**
 * Metadatos asociados a cada nivel de rating. Single source of truth
 * compartida entre el formato del email (este service) y, conceptualmente,
 * con la cara animada del frontend. NO duplicar emoji/label en otros
 * archivos del backend — si en algún futuro se quiere persistir o
 * exponer estos labels via API, mover a un módulo lib/.
 */
const RATING_META: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😢', label: 'Muy mala', color: '#ef4444' },
  2: { emoji: '😕', label: 'Mala', color: '#f97316' },
  3: { emoji: '😐', label: 'Regular', color: '#eab308' },
  4: { emoji: '😊', label: 'Buena', color: '#22c55e' },
  5: { emoji: '🤩', label: 'Excelente', color: '#6366f1' },
};

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: PlatformEmailService,
  ) {}

  /**
   * Procesa el feedback del cliente: enriquece con metadatos del tenant
   * y el plan, formatea HTML con estrellas + emoji y envía al mismo
   * destino que soporte (SUPPORT_EMAIL, default hello@creatu.app).
   *
   * Reutiliza SUPPORT_EMAIL a propósito — feedback y soporte van al
   * mismo inbox del equipo. Si en el futuro se quieren separar (p. ej.
   * FEEDBACK_EMAIL distinto), añadir env var nueva sin tocar este flujo
   * más allá de la lectura del default.
   *
   * Lanza InternalServerErrorException si el envío falla; el controller
   * traduce a 500 con mensaje en español plano para el cliente.
   */
  async createFeedback(dto: CreateFeedbackDto, user: AuthUser, requestIp?: string): Promise<void> {
    let brandName: string | null = null;
    let planName: string | null = null;

    if (user.tenantId) {
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: {
            brandName: true,
            subscription: {
              select: {
                plan: { select: { name: true, planType: true } },
              },
            },
          },
        });
        brandName = tenant?.brandName ?? null;
        planName = tenant?.subscription?.plan?.name
          ?? tenant?.subscription?.plan?.planType
          ?? null;
      } catch (err: any) {
        this.logger.warn(`No se pudieron leer metadatos del tenant ${user.tenantId}: ${err.message}`);
      }
    }

    const supportEmail = process.env.SUPPORT_EMAIL ?? 'hello@creatu.app';
    const meta = RATING_META[dto.rating] ?? RATING_META[3];

    const html = this.formatFeedbackHtml({
      rating: dto.rating,
      ratingEmoji: meta.emoji,
      ratingLabel: meta.label,
      ratingColor: meta.color,
      message: dto.message,
      name: dto.name,
      email: dto.email,
      company: dto.company,
      userId: user.userId,
      userRole: user.role,
      tenantId: user.tenantId,
      brandName,
      planName,
      requestIp,
      timestamp: new Date(),
    });

    // Asunto corto: rating + emoji + label. Permite ordenar/filtrar el
    // inbox por sentimiento sin abrir el email.
    const emailSubject = `[Feedback] ${dto.rating}★ ${meta.emoji} ${meta.label}`.slice(0, 250);

    try {
      await this.emailService.sendEmail({
        to: supportEmail,
        subject: emailSubject,
        html,
        replyTo: dto.email,
      });
    } catch (err: any) {
      this.logger.error(`Error enviando feedback: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        'No pudimos enviar tu feedback en este momento. Por favor inténtalo de nuevo en unos minutos.',
      );
    }

    this.logger.log(
      `Feedback enviado a ${supportEmail} (de: ${dto.email}, rating: ${dto.rating}★, hasMessage: ${!!dto.message})`,
    );
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatFeedbackHtml(data: {
    rating: number;
    ratingEmoji: string;
    ratingLabel: string;
    ratingColor: string;
    message?: string;
    name: string;
    email: string;
    company?: string;
    userId: string;
    userRole: string;
    tenantId: string | null;
    brandName: string | null;
    planName: string | null;
    requestIp?: string;
    timestamp: Date;
  }): string {
    const e = (s: string | null | undefined) => this.escapeHtml(s ?? '—');
    const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
    const messageHtml = data.message
      ? this.escapeHtml(data.message).replace(/\n/g, '<br>')
      : '<em style="color: #9ca3af;">(El cliente no añadió comentario)</em>';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: ${data.ratingColor}; border-bottom: 2px solid ${data.ratingColor}; padding-bottom: 8px;">
          Nuevo feedback de la plataforma
        </h2>

        <div style="text-align: center; padding: 24px; background: ${data.ratingColor}11; border-radius: 12px; margin: 16px 0;">
          <div style="font-size: 64px; line-height: 1; margin-bottom: 8px;">${data.ratingEmoji}</div>
          <div style="font-size: 24px; color: ${data.ratingColor}; letter-spacing: 4px; font-weight: 700;">${stars}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${e(data.ratingLabel)} (${data.rating}/5)</div>
        </div>

        <h3 style="margin-top: 24px; color: #374151;">Comentario</h3>
        <div style="padding: 12px; background: #f9fafb; border-left: 4px solid ${data.ratingColor}; border-radius: 4px; white-space: pre-wrap; word-break: break-word;">
          ${messageHtml}
        </div>

        <h3 style="margin-top: 24px; color: #374151;">Datos del cliente</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600; width: 140px;">Nombre</td>
            <td style="padding: 6px 12px;">${e(data.name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600;">Email</td>
            <td style="padding: 6px 12px;"><a href="mailto:${e(data.email)}" style="color: #4f46e5;">${e(data.email)}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600;">Empresa</td>
            <td style="padding: 6px 12px;">${e(data.company)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600;">Marca (tenant)</td>
            <td style="padding: 6px 12px;">${e(data.brandName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600;">Plan</td>
            <td style="padding: 6px 12px;">${e(data.planName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; background: #f3f4f6; font-weight: 600;">Rol</td>
            <td style="padding: 6px 12px;">${e(data.userRole)}</td>
          </tr>
        </table>

        <h3 style="margin-top: 24px; color: #374151;">Metadatos técnicos</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #6b7280;">
          <tr>
            <td style="padding: 4px 12px; background: #f3f4f6; font-weight: 600; width: 140px;">User ID</td>
            <td style="padding: 4px 12px; font-family: monospace;">${e(data.userId)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; background: #f3f4f6; font-weight: 600;">Tenant ID</td>
            <td style="padding: 4px 12px; font-family: monospace;">${e(data.tenantId)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; background: #f3f4f6; font-weight: 600;">IP</td>
            <td style="padding: 4px 12px; font-family: monospace;">${e(data.requestIp)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; background: #f3f4f6; font-weight: 600;">Fecha</td>
            <td style="padding: 4px 12px; font-family: monospace;">${data.timestamp.toISOString()}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #888; font-size: 12px;">
          Email generado automáticamente desde el formulario de Feedback de CreaTuApp.
          Responde directamente a este email — el "Reply" llega al cliente.
        </p>
      </div>
    `;
  }
}
