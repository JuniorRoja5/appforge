import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: PlatformEmailService,
  ) {}

  /**
   * Procesa un ticket de soporte: enriquece con metadatos del tenant +
   * plan, formatea el HTML del email, y lo envía al destino configurado
   * en SUPPORT_EMAIL (con fallback a hello@creatu.app).
   *
   * El email lleva `replyTo` con el email del cliente para que el equipo
   * de soporte responda directamente desde su inbox sin rebote.
   *
   * Lanza InternalServerErrorException SOLO si el envío del email falla.
   * El controller traduce a 500 con mensaje plano para el usuario.
   */
  async createTicket(dto: CreateSupportTicketDto, user: AuthUser, requestIp?: string): Promise<void> {
    // Enriquecer con datos del tenant + plan. Si el usuario no tiene
    // tenant (caso raro, p. ej. SUPER_ADMIN sin tenant asociado), seguimos
    // adelante con campos vacíos — el ticket sigue siendo útil.
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
        // No queremos bloquear el envío del ticket por un fallo de lectura
        // de metadatos. Logueamos y seguimos con campos vacíos.
        this.logger.warn(`No se pudieron leer metadatos del tenant ${user.tenantId}: ${err.message}`);
      }
    }

    const supportEmail = process.env.SUPPORT_EMAIL ?? 'hello@creatu.app';

    const html = this.formatTicketHtml({
      scenario: dto.scenario,
      subject: dto.subject,
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

    const emailSubject = `[Soporte] ${dto.scenario} — ${dto.subject}`.slice(0, 250);

    try {
      await this.emailService.sendEmail({
        to: supportEmail,
        subject: emailSubject,
        html,
        replyTo: dto.email,
      });
    } catch (err: any) {
      this.logger.error(`Error enviando ticket de soporte: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        'No pudimos enviar tu mensaje en este momento. Por favor inténtalo de nuevo en unos minutos.',
      );
    }

    this.logger.log(
      `Ticket de soporte enviado a ${supportEmail} (de: ${dto.email}, escenario: ${dto.scenario})`,
    );
  }

  /**
   * Escapa caracteres HTML básicos para evitar inyección en el cuerpo
   * del email. El cliente escribe texto plano; al renderizarlo dentro de
   * un <td> conviene neutralizar <, >, &, " y '.
   */
  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatTicketHtml(data: {
    scenario: string;
    subject: string;
    message: string;
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
    const messageHtml = this.escapeHtml(data.message).replace(/\n/g, '<br>');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">
          Nuevo ticket de soporte
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; width: 140px;">Escenario</td>
            <td style="padding: 8px 12px;">${e(data.scenario)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Asunto</td>
            <td style="padding: 8px 12px;">${e(data.subject)}</td>
          </tr>
        </table>

        <h3 style="margin-top: 24px; color: #374151;">Mensaje</h3>
        <div style="padding: 12px; background: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px; white-space: pre-wrap; word-break: break-word;">
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
          Email generado automáticamente desde el formulario de Soporte de CreaTuApp.
          Responde directamente a este email — el "Reply" llega al cliente.
        </p>
      </div>
    `;
  }
}
