import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../push/fcm.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';
import { decrypt } from '../lib/crypto';
import * as nodemailer from 'nodemailer';

const ORDER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1
const ORDER_CODE_LENGTH = 6;

const STATUS_PUSH_MAP: Record<string, { title: string; body: string } | undefined> = {
  CANCELLED: {
    title: 'Cita cancelada',
    body: 'Tu cita {shortCode} del {fecha} a las {hora} ha sido cancelada. Contacta con el negocio.',
  },
  // CONFIRMED, COMPLETED, NO_SHOW → no push
};

interface BookingField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea';
  label: string;
  required: boolean;
}

interface BookingModuleConfig {
  timeSlots?: string[];
  slotDuration?: number;
  fields?: BookingField[];
  cancellationDeadlineHours?: number;
  reminder24hEnabled?: boolean;
  reminder2hEnabled?: boolean;
  businessAddress?: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private fcmService: FcmService,
    @InjectQueue('booking-reminders') private remindersQueue: Queue,
  ) {}

  // ─────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app');
    }
    return app;
  }

  private async getBookingConfig(appId: string): Promise<BookingModuleConfig> {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { schema: true },
    });
    if (!app) throw new NotFoundException('App not found');

    const schema = app.schema as unknown as Array<{
      moduleId: string;
      config: BookingModuleConfig;
    }>;
    const bookingElement = Array.isArray(schema)
      ? schema.find((el) => el?.moduleId === 'booking')
      : undefined;
    if (!bookingElement) {
      throw new NotFoundException('No se encontró configuración de booking en esta app');
    }
    return bookingElement.config ?? {};
  }

  /**
   * Genera un shortCode único por app (BKG-XXXXXX).
   * Retry hasta 10 veces si hay colisión.
   */
  private async generateShortCode(appId: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = 'BKG-';
      for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
        code += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
      }
      const existing = await this.prisma.booking.findUnique({
        where: { appId_shortCode: { appId, shortCode: code } },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('No se pudo generar un código único para la reserva');
  }

  /**
   * Mapea formData → columnas. Primer match por field.type gana.
   */
  private extractCustomerFields(
    fields: BookingField[],
    formData: Record<string, any>,
  ): {
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerNotes: string | null;
  } {
    const byType = (type: BookingField['type']) => fields.find((f) => f.type === type);
    const valOf = (id: string | undefined): string | null => {
      if (!id) return null;
      const v = formData?.[id];
      if (v == null) return null;
      const s = String(v).trim();
      return s.length > 0 ? s : null;
    };
    return {
      customerName: valOf(byType('text')?.id),
      customerEmail: valOf(byType('email')?.id),
      customerPhone: valOf(byType('phone')?.id),
      customerNotes: valOf(byType('textarea')?.id),
    };
  }

  private combineDateTime(date: Date, timeSlot: string): Date {
    const [hh, mm] = timeSlot.split(':').map((n) => parseInt(n, 10));
    const d = new Date(date);
    d.setHours(hh ?? 0, mm ?? 0, 0, 0);
    return d;
  }

  // ─────────────────────────────────────────────────────
  // PUBLIC ENDPOINTS
  // ─────────────────────────────────────────────────────

  async getAvailableSlots(appId: string, date: string) {
    const config = await this.getBookingConfig(appId);
    const allSlots = config.timeSlots ?? [];

    const booked = await this.prisma.booking.findMany({
      where: {
        appId,
        date: new Date(date),
        status: BookingStatus.CONFIRMED,
      },
      select: { timeSlot: true },
    });

    const bookedSet = new Set(booked.map((b) => b.timeSlot));
    return allSlots.filter((slot) => !bookedSet.has(slot));
  }

  async createBooking(appId: string, dto: CreateBookingDto, appUserIdFromJwt?: string) {
    const config = await this.getBookingConfig(appId);
    const duration = config.slotDuration ?? 30;
    const fields = config.fields ?? [];

    // Extract customer fields from formData
    const customer = this.extractCustomerFields(fields, dto.formData as Record<string, any>);

    // Validate JWT-supplied appUserId belongs to this app
    let validatedAppUserId: string | null = null;
    if (appUserIdFromJwt) {
      const appUser = await this.prisma.appUser.findFirst({
        where: { id: appUserIdFromJwt, appId },
        select: { id: true },
      });
      if (appUser) validatedAppUserId = appUser.id;
    }

    const shortCode = await this.generateShortCode(appId);

    let booking;
    try {
      booking = await this.prisma.booking.create({
        data: {
          appId,
          date: new Date(dto.date),
          timeSlot: dto.timeSlot,
          duration,
          formData: dto.formData as Prisma.InputJsonValue,
          shortCode,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone,
          customerNotes: customer.customerNotes,
          appUserId: validatedAppUserId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Este horario ya está reservado.');
      }
      throw err;
    }

    // Fire-and-forget: emails + reminder scheduling
    this.sendBookingEmails(booking.id, appId).catch((e) =>
      this.logger.warn(`Booking emails failed for ${booking.id}: ${e.message}`),
    );
    this.scheduleReminders(booking, config).catch((e) =>
      this.logger.warn(`Reminder scheduling failed for ${booking.id}: ${e.message}`),
    );

    return booking;
  }

  // ─────────────────────────────────────────────────────
  // PROTECTED ENDPOINTS (panel del comerciante)
  // ─────────────────────────────────────────────────────

  async findAll(
    appId: string,
    tenantId: string,
    filters?: { date?: string; status?: BookingStatus },
  ) {
    await this.ensureAppOwnership(appId, tenantId);

    const where: Prisma.BookingWhereInput = { appId };
    if (filters?.date) where.date = new Date(filters.date);
    if (filters?.status) where.status = filters.status;

    return this.prisma.booking.findMany({
      where,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
  }

  async updateStatus(
    appId: string,
    bookingId: string,
    tenantId: string,
    status: BookingStatus,
  ) {
    await this.ensureAppOwnership(appId, tenantId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const previousStatus = booking.status;

    // Idempotency: no-op if status didn't actually change
    if (previousStatus === status) {
      return booking;
    }

    const updateData: Prisma.BookingUpdateInput = { status };
    if (status === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = 'MERCHANT';
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Cancel pending reminder jobs if booking is no longer active
    if (
      status === BookingStatus.CANCELLED ||
      status === BookingStatus.COMPLETED ||
      status === BookingStatus.NO_SHOW
    ) {
      this.cancelReminderJobs(bookingId).catch(() => {});
    }

    // Push to client (CANCELLED only — COMPLETED/NO_SHOW don't notify)
    if (booking.appUserId && STATUS_PUSH_MAP[status]) {
      const pushConfig = STATUS_PUSH_MAP[status]!;
      const fechaStr = booking.date.toISOString().slice(0, 10);
      const body = pushConfig.body
        .replace('{shortCode}', booking.shortCode)
        .replace('{fecha}', fechaStr)
        .replace('{hora}', booking.timeSlot);
      this.fcmService
        .sendToAppUser(appId, booking.appUserId, pushConfig.title, body, {
          bookingId: booking.id,
          shortCode: booking.shortCode,
          status,
        })
        .catch((err) =>
          this.logger.warn(`Push failed for booking ${booking.id}: ${err.message}`),
        );
    }

    return updated;
  }

  async remove(appId: string, bookingId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Cancel reminder jobs before deleting
    this.cancelReminderJobs(bookingId).catch(() => {});

    return this.prisma.booking.delete({ where: { id: bookingId } });
  }

  // ─────────────────────────────────────────────────────
  // PUBLIC TRACKING (con tracking token)
  // ─────────────────────────────────────────────────────

  async findPublicByToken(appId: string, bookingId: string, token: string) {
    if (!token) throw new NotFoundException('Reserva no encontrada');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId, trackingToken: token },
      select: {
        id: true,
        shortCode: true,
        date: true,
        timeSlot: true,
        duration: true,
        status: true,
        customerName: true,
        cancelledAt: true,
        cancelledBy: true,
        createdAt: true,
        updatedAt: true,
        app: { select: { name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Reserva no encontrada');

    // Read businessAddress from app schema config (so we don't have to add a column)
    let businessAddress: string | undefined;
    let cancellationDeadlineHours: number | undefined;
    try {
      const config = await this.getBookingConfig(appId);
      businessAddress = config.businessAddress;
      cancellationDeadlineHours = config.cancellationDeadlineHours ?? 4;
    } catch {
      cancellationDeadlineHours = 4;
    }

    return {
      ...booking,
      // Solo primer nombre — protege la privacidad del cliente
      customerName: booking.customerName ? booking.customerName.split(' ')[0] : null,
      businessAddress,
      cancellationDeadlineHours,
    };
  }

  async cancelByCustomer(appId: string, bookingId: string, token: string) {
    if (!token) throw new NotFoundException('Reserva no encontrada');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId, trackingToken: token },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('La reserva no se puede cancelar');
    }

    // Validate deadline against module config
    const config = await this.getBookingConfig(appId);
    const deadlineHours = Math.max(1, Math.min(72, config.cancellationDeadlineHours ?? 4));
    const apptDateTime = this.combineDateTime(booking.date, booking.timeSlot);
    const hoursUntil = (apptDateTime.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < deadlineHours) {
      throw new BadRequestException(
        `Las cancelaciones deben hacerse al menos ${deadlineHours}h antes de la cita.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'CUSTOMER',
      },
    });

    this.cancelReminderJobs(bookingId).catch(() => {});
    this.sendCustomerCancelledEmailToMerchant(updated, appId).catch((e) =>
      this.logger.warn(`Merchant cancel email failed for ${bookingId}: ${e.message}`),
    );
    // No push to customer — they cancelled themselves

    return { ok: true, status: updated.status };
  }

  // ─────────────────────────────────────────────────────
  // EMAIL NOTIFICATIONS
  // ─────────────────────────────────────────────────────

  private async sendBookingEmails(bookingId: string, appId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;

    const smtpConfig = await this.prisma.appSmtpConfig.findUnique({ where: { appId } });
    if (!smtpConfig) {
      this.logger.warn(
        `Booking ${booking.id} (${booking.shortCode}) created but SMTP not configured for app ${appId} — no emails sent`,
      );
      return;
    }

    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, clientEmail: true, schema: true },
    });
    if (!app) return;

    let password: string;
    try {
      password = decrypt(smtpConfig.encryptedPass);
    } catch (err) {
      this.logger.warn(`SMTP decrypt failed for app ${appId}: ${(err as Error).message}`);
      return;
    }

    const transport = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.username, pass: password },
    });

    // Read businessAddress from schema config
    let businessAddress: string | undefined;
    try {
      const cfg = await this.getBookingConfig(appId);
      businessAddress = cfg.businessAddress;
    } catch {}

    const builderUrl = process.env.PUBLIC_BUILDER_URL || 'http://localhost:5173';
    const trackingUrl = `${builderUrl}/booking/${appId}/${booking.id}?t=${booking.trackingToken}`;

    const fechaPretty = booking.date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Email to customer (only if customerEmail)
    const customerEmailPromise = booking.customerEmail
      ? transport
          .sendMail({
            from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
            to: booking.customerEmail,
            subject: `Cita confirmada — ${booking.shortCode}`,
            html: this.renderCustomerEmail({
              shortCode: booking.shortCode,
              customerName: booking.customerName ?? 'Cliente',
              appName: app.name,
              fechaPretty,
              hora: booking.timeSlot,
              duration: booking.duration,
              businessAddress,
              trackingUrl,
            }),
          })
          .catch((err) =>
            this.logger.warn(`Customer email failed for ${booking.id}: ${err.message}`),
          )
      : Promise.resolve();

    // Email to merchant
    const merchantEmail = app.clientEmail || smtpConfig.fromEmail;
    const merchantEmailPromise = transport
      .sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: merchantEmail,
        subject: `Nueva reserva — ${booking.shortCode} para el ${fechaPretty}`,
        html: this.renderMerchantEmail({
          shortCode: booking.shortCode,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          customerNotes: booking.customerNotes,
          appName: app.name,
          fechaPretty,
          hora: booking.timeSlot,
          duration: booking.duration,
          trackingUrl,
        }),
      })
      .catch((err) =>
        this.logger.warn(`Merchant email failed for ${booking.id}: ${err.message}`),
      );

    await Promise.all([customerEmailPromise, merchantEmailPromise]);
  }

  private async sendCustomerCancelledEmailToMerchant(booking: any, appId: string): Promise<void> {
    const smtpConfig = await this.prisma.appSmtpConfig.findUnique({ where: { appId } });
    if (!smtpConfig) return;

    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, clientEmail: true },
    });
    if (!app) return;

    let password: string;
    try {
      password = decrypt(smtpConfig.encryptedPass);
    } catch {
      return;
    }

    const transport = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.username, pass: password },
    });

    const fechaPretty = booking.date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const merchantEmail = app.clientEmail || smtpConfig.fromEmail;

    await transport.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: merchantEmail,
      subject: `Cita cancelada por el cliente — ${booking.shortCode}`,
      html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:#dc2626;color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Cita cancelada por el cliente</h1>
    <p style="margin:8px 0 0;opacity:0.9">${booking.shortCode} · ${app.name}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>El cliente <strong>${booking.customerName ?? 'sin nombre'}</strong> ha cancelado su cita:</p>
    <ul style="background:#fef2f2;padding:16px 24px;border-radius:6px;list-style:none;margin:16px 0">
      <li><strong>Fecha:</strong> ${fechaPretty}</li>
      <li><strong>Hora:</strong> ${booking.timeSlot}</li>
      ${booking.customerEmail ? `<li><strong>Email:</strong> ${booking.customerEmail}</li>` : ''}
      ${booking.customerPhone ? `<li><strong>Teléfono:</strong> ${booking.customerPhone}</li>` : ''}
    </ul>
    <p style="color:#6b7280;font-size:13px">Puedes liberar este horario para otros clientes.</p>
  </div>
</div>`,
    });
  }

  // ─────────────────────────────────────────────────────
  // EMAIL TEMPLATES
  // ─────────────────────────────────────────────────────

  private renderCustomerEmail(data: {
    shortCode: string;
    customerName: string;
    appName: string;
    fechaPretty: string;
    hora: string;
    duration: number;
    businessAddress?: string;
    trackingUrl: string;
  }): string {
    const firstName = data.customerName.split(' ')[0] || 'Cliente';
    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:linear-gradient(to right,#0d9488,#14b8a6);color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:24px">Cita confirmada</h1>
    <p style="margin:8px 0 0;opacity:0.9">${data.appName}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Hola ${firstName},</p>
    <p>Tu cita <strong>${data.shortCode}</strong> está confirmada.</p>

    <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:16px 20px;margin:24px 0;border-radius:4px">
      <p style="margin:0;font-size:18px;font-weight:600">${data.fechaPretty}</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:700;color:#0d9488">${data.hora}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Duración aproximada: ${data.duration} min</p>
      ${data.businessAddress ? `<p style="margin:12px 0 0;font-size:13px;color:#1f2937"><strong>Dirección:</strong> ${data.businessAddress}</p>` : ''}
    </div>

    <p>Te enviaremos un recordatorio antes de tu cita.</p>

    <div style="text-align:center;margin:32px 0">
      <a href="${data.trackingUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
        Ver mi reserva
      </a>
    </div>

    <p style="color:#6b7280;font-size:12px;margin-top:24px">
      Si necesitas cancelar tu cita, puedes hacerlo desde el enlace de arriba.
    </p>
  </div>
</div>`;
  }

  private renderMerchantEmail(data: {
    shortCode: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerNotes: string | null;
    appName: string;
    fechaPretty: string;
    hora: string;
    duration: number;
    trackingUrl: string;
  }): string {
    const contactRows = [
      ['Cliente', data.customerName || '—'],
      ['Email', data.customerEmail || '—'],
      ['Teléfono', data.customerPhone || '—'],
      ['Notas', data.customerNotes || '—'],
    ]
      .map(
        ([k, v]) => `
      <tr>
        <td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #eee;width:120px">${k}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${v}</td>
      </tr>`,
      )
      .join('');

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:#0d9488;color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">📅 Nueva reserva recibida</h1>
    <p style="margin:8px 0 0;opacity:0.9">${data.shortCode} · ${data.appName}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:16px 20px;margin:0 0 24px;border-radius:4px">
      <p style="margin:0;font-size:18px;font-weight:600">${data.fechaPretty}</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:700;color:#0d9488">${data.hora}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Duración: ${data.duration} min</p>
    </div>

    <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Datos del cliente</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${contactRows}</table>

    <p style="color:#6b7280;font-size:12px;margin-top:24px">
      Recuerda actualizar el estado de la reserva desde tu panel cuando proceda.
    </p>
  </div>
</div>`;
  }

  // ─────────────────────────────────────────────────────
  // BULLMQ REMINDERS
  // ─────────────────────────────────────────────────────

  private async scheduleReminders(
    booking: { id: string; date: Date; timeSlot: string },
    config: BookingModuleConfig,
  ): Promise<void> {
    const apptDateTime = this.combineDateTime(booking.date, booking.timeSlot);
    const now = Date.now();

    if (config.reminder24hEnabled !== false) {
      const delay = apptDateTime.getTime() - 24 * 3_600_000 - now;
      if (delay > 0) {
        await this.remindersQueue.add(
          'reminder',
          { bookingId: booking.id, type: '24h' },
          {
            jobId: `booking-${booking.id}-24h`,
            delay,
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
      }
    }

    if (config.reminder2hEnabled !== false) {
      const delay = apptDateTime.getTime() - 2 * 3_600_000 - now;
      if (delay > 0) {
        await this.remindersQueue.add(
          'reminder',
          { bookingId: booking.id, type: '2h' },
          {
            jobId: `booking-${booking.id}-2h`,
            delay,
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
      }
    }
  }

  private async cancelReminderJobs(bookingId: string): Promise<void> {
    for (const type of ['24h', '2h'] as const) {
      try {
        const job = await this.remindersQueue.getJob(`booking-${bookingId}-${type}`);
        if (job) await job.remove();
      } catch {
        /* ignore — best-effort cleanup */
      }
    }
  }

  /**
   * Called by BookingRemindersProcessor. Loads booking, validates state, sends
   * reminder via email + push, and marks the appropriate sentAt column.
   */
  async sendReminder(bookingId: string, type: '24h' | '2h'): Promise<void> {
    const sentField = type === '24h' ? 'reminder24hSentAt' : 'reminder2hSentAt';
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { app: { select: { name: true, clientEmail: true } } },
    });
    if (!booking) return; // deleted
    if (booking.status !== BookingStatus.CONFIRMED) return; // cancelled or completed
    if (booking[sentField] != null) return; // idempotency

    // Send email
    const smtpConfig = await this.prisma.appSmtpConfig.findUnique({
      where: { appId: booking.appId },
    });
    if (smtpConfig && booking.customerEmail) {
      try {
        const password = decrypt(smtpConfig.encryptedPass);
        const transport = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: { user: smtpConfig.username, pass: password },
        });
        const builderUrl = process.env.PUBLIC_BUILDER_URL || 'http://localhost:5173';
        const trackingUrl = `${builderUrl}/booking/${booking.appId}/${booking.id}?t=${booking.trackingToken}`;
        const fechaPretty = booking.date.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        const subject =
          type === '24h'
            ? `Tu cita es mañana — ${booking.shortCode}`
            : `Tu cita es en 2 horas — ${booking.shortCode}`;
        const intro =
          type === '24h'
            ? 'Te recordamos que tu cita es mañana:'
            : 'Tu cita es en 2 horas. Te esperamos:';

        await transport.sendMail({
          from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
          to: booking.customerEmail,
          subject,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:#0d9488;color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Recordatorio de cita</h1>
    <p style="margin:8px 0 0;opacity:0.9">${booking.app.name}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>${intro}</p>
    <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:16px 20px;margin:24px 0;border-radius:4px">
      <p style="margin:0;font-size:18px;font-weight:600">${fechaPretty}</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:700;color:#0d9488">${booking.timeSlot}</p>
    </div>
    <div style="text-align:center;margin:32px 0">
      <a href="${trackingUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
        Ver mi reserva
      </a>
    </div>
  </div>
</div>`,
        });
      } catch (err) {
        this.logger.warn(`Reminder email failed for ${booking.id}: ${(err as Error).message}`);
      }
    }

    // Send push if AppUser linked
    if (booking.appUserId) {
      const title = type === '24h' ? 'Tu cita es mañana' : 'Tu cita es en 2 horas';
      const body = `Tu cita ${booking.shortCode} a las ${booking.timeSlot}.`;
      await this.fcmService
        .sendToAppUser(booking.appId, booking.appUserId, title, body, {
          bookingId: booking.id,
          shortCode: booking.shortCode,
          reminderType: type,
        })
        .catch((err) =>
          this.logger.warn(`Reminder push failed for ${booking.id}: ${err.message}`),
        );
    }

    // Mark sent (idempotency guard)
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { [sentField]: new Date() },
    });
  }
}
