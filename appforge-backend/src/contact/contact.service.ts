import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { decrypt } from '../lib/crypto';

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'appforge-captcha-default-secret';
const CAPTCHA_TTL_MS = 10 * 60 * 1000; // 10 minutos

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  generateCaptcha(appId: string): { token: string; expiresAt: string } {
    const timestamp = Date.now().toString();
    const hmac = createHmac('sha256', CAPTCHA_SECRET)
      .update(appId + timestamp)
      .digest('base64');

    const token = `${Buffer.from(timestamp).toString('base64')}:${hmac}`;
    const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MS).toISOString();

    return { token, expiresAt };
  }

  verifyCaptcha(appId: string, token: string): boolean {
    const parts = token.split(':');
    if (parts.length !== 2) return false;

    const [timestampB64, receivedHmac] = parts;
    const timestamp = Buffer.from(timestampB64, 'base64').toString('utf-8');
    const ts = parseInt(timestamp, 10);

    if (isNaN(ts) || Date.now() - ts > CAPTCHA_TTL_MS) return false;

    const expectedHmac = createHmac('sha256', CAPTCHA_SECRET)
      .update(appId + timestamp)
      .digest('base64');

    return expectedHmac === receivedHmac;
  }

  async submit(appId: string, dto: SubmitContactDto, ip?: string) {
    // Honeypot check
    if (dto.honeypot) {
      throw new BadRequestException('Spam detected');
    }

    // Captcha check
    if (!dto.captchaToken || !this.verifyCaptcha(appId, dto.captchaToken)) {
      throw new BadRequestException('Invalid or expired captcha token');
    }

    // Verificar que la app existe (y no está soft-deleted)
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null } });
    if (!app) {
      throw new NotFoundException('App not found');
    }

    const submission = await this.prisma.contactSubmission.create({
      data: {
        data: dto.data as Prisma.InputJsonValue,
        fileUrls: dto.fileUrls ?? [],
        ip: ip ?? null,
        app: { connect: { id: appId } },
      },
    });

    // Send email notification if SMTP is configured (fire-and-forget)
    this.sendContactNotification(appId, app.name, dto.data).catch((err) => {
      this.logger.warn(`SMTP notification failed for app ${appId}: ${err.message}`);
    });

    return submission;
  }

  private async sendContactNotification(
    appId: string,
    appName: string,
    formData: Record<string, any>,
  ) {
    const smtpConfig = await this.prisma.appSmtpConfig.findUnique({
      where: { appId },
    });
    if (!smtpConfig) return;

    const password = decrypt(smtpConfig.encryptedPass);
    const transport = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.username, pass: password },
    });

    const rows = Object.entries(formData)
      .map(([key, value]) => `<tr><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #eee">${key}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${value}</td></tr>`)
      .join('');

    await transport.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: smtpConfig.fromEmail,
      subject: `Nuevo contacto desde ${appName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#333">Nuevo mensaje de contacto</h2>
          <p style="color:#666">Se ha recibido un nuevo formulario de contacto en <strong>${appName}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
          <p style="color:#999;font-size:12px">Este email fue enviado automáticamente por AppForge.</p>
        </div>
      `,
    });
  }

  async findAll(appId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    return this.prisma.contactSubmission.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(appId: string, id: string) {
    const submission = await this.prisma.contactSubmission.findFirst({
      where: { id, appId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  async remove(appId: string, id: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);
    return this.prisma.contactSubmission.delete({ where: { id } });
  }
}
