import { Injectable, Logger } from '@nestjs/common';
import { PlatformSmtpService } from './platform-smtp.service';
import { decrypt } from '../lib/crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PlatformEmailService {
  private readonly logger = new Logger(PlatformEmailService.name);

  constructor(private smtpService: PlatformSmtpService) {}

  private async createTransport(): Promise<nodemailer.Transporter | null> {
    const config = await this.smtpService.getConfigRaw();
    if (!config) {
      this.logger.warn('No hay SMTP de plataforma configurado. Email no enviado.');
      return null;
    }

    let password: string;
    try {
      password = decrypt(config.encryptedPass);
    } catch {
      this.logger.warn('Error al descifrar la contraseña SMTP de plataforma.');
      return null;
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: password },
    });
  }

  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    try {
      const transport = await this.createTransport();
      if (!transport) return;

      const config = await this.smtpService.getConfigRaw();
      if (!config) return;

      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: 'AppForge — Tu contraseña ha sido cambiada',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Contraseña actualizada</h2>
            <p>Hola ${name || 'usuario'},</p>
            <p>Te confirmamos que tu contraseña de AppForge ha sido cambiada exitosamente.</p>
            <p>Si no realizaste este cambio, contacta inmediatamente al administrador de la plataforma.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Este es un email automático de AppForge.</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.warn(`Error al enviar email de cambio de contraseña a ${email}: ${err.message}`);
    }
  }

  async sendDeletionRequestEmail(email: string, name: string): Promise<void> {
    try {
      const transport = await this.createTransport();
      if (!transport) return;

      const config = await this.smtpService.getConfigRaw();
      if (!config) return;

      // Email to the user
      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: 'AppForge — Solicitud de eliminación de cuenta recibida',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Solicitud de eliminación recibida</h2>
            <p>Hola ${name || 'usuario'},</p>
            <p>Hemos recibido tu solicitud de eliminación de cuenta. Tu cuenta ha sido desactivada y no podrás iniciar sesión.</p>
            <p>El administrador de la plataforma procesará la eliminación definitiva de tus datos.</p>
            <p>Si deseas cancelar esta solicitud, contacta al administrador.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Este es un email automático de AppForge.</p>
          </div>
        `,
      });

      // Email to SUPER_ADMIN (platform fromEmail)
      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: config.fromEmail,
        subject: `AppForge — Solicitud de eliminación de cuenta: ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Nueva solicitud de eliminación de cuenta</h2>
            <p>El usuario <strong>${email}</strong> (${name || 'sin nombre'}) ha solicitado la eliminación de su cuenta.</p>
            <p>La cuenta ha sido marcada como <code>PENDING_DELETION</code> y el usuario ya no puede iniciar sesión.</p>
            <p>Accede al panel de administración para procesar la eliminación definitiva cuando corresponda.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Email automático de AppForge — Gestión de plataforma.</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.warn(`Error al enviar email de solicitud de eliminación para ${email}: ${err.message}`);
    }
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    try {
      const transport = await this.createTransport();
      if (!transport) {
        this.logger.warn(`No SMTP configured. Reset token for ${email}: ${token}`);
        return;
      }

      const config = await this.smtpService.getConfigRaw();
      if (!config) return;

      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: 'AppForge — Código de recuperación de contraseña',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Recuperación de contraseña</h2>
            <p>Hola ${name || 'usuario'},</p>
            <p>Has solicitado restablecer tu contraseña de AppForge. Usa el siguiente código:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 16px 32px; border-radius: 12px; display: inline-block;">${token}</span>
            </div>
            <p>Este código expira en <strong>1 hora</strong>.</p>
            <p>Si no solicitaste este cambio, ignora este email.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Este es un email automático de AppForge.</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.warn(`Error al enviar email de reset a ${email}: ${err.message}`);
    }
  }

  async sendBuildCompletedEmail(
    email: string,
    name: string,
    appName: string,
    buildType: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const transport = await this.createTransport();
      if (!transport) return;

      const config = await this.smtpService.getConfigRaw();
      if (!config) return;

      const typeLabels: Record<string, string> = {
        debug: 'Debug APK',
        release: 'Release APK',
        aab: 'AAB (Play Store)',
        'ios-export': 'Proyecto Xcode',
      };
      const typeLabel = typeLabels[buildType] || buildType;

      const subject = success
        ? `AppForge — Tu build de "${appName}" está listo`
        : `AppForge — Error en el build de "${appName}"`;

      const body = success
        ? `
          <p>Hola ${name || 'usuario'},</p>
          <p>Tu build <strong>${typeLabel}</strong> de la app <strong>"${appName}"</strong> se ha completado exitosamente.</p>
          <p>Entra al constructor de AppForge para descargar tu archivo.</p>
        `
        : `
          <p>Hola ${name || 'usuario'},</p>
          <p>Tu build <strong>${typeLabel}</strong> de la app <strong>"${appName}"</strong> ha fallado.</p>
          ${errorMessage ? `<p style="color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px;">${errorMessage.slice(0, 500)}</p>` : ''}
          <p>Puedes ver los detalles y reintentar desde el constructor de AppForge.</p>
        `;

      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${success ? '#059669' : '#dc2626'};">${success ? 'Build completado' : 'Build fallido'}</h2>
            ${body}
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Este es un email automático de AppForge.</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.warn(`Error al enviar email de build a ${email}: ${err.message}`);
    }
  }

  async sendPaymentFailedEmail(email: string, name: string, amount: number, currency: string): Promise<void> {
    try {
      const transport = await this.createTransport();
      if (!transport) return;

      const config = await this.smtpService.getConfigRaw();
      if (!config) return;

      await transport.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: 'AppForge — Problema con tu pago',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Problema con tu pago</h2>
            <p>Hola ${name || 'usuario'},</p>
            <p>No pudimos procesar tu pago de <strong>${amount} ${currency}</strong> para tu suscripción de AppForge.</p>
            <p>Por favor verifica tu método de pago para evitar la interrupción de tu servicio. Stripe reintentará el cobro automáticamente en los próximos días.</p>
            <p>Si necesitas ayuda, contacta al administrador de la plataforma.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">Este es un email automático de AppForge.</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.warn(`Error al enviar email de pago fallido a ${email}: ${err.message}`);
    }
  }
}
