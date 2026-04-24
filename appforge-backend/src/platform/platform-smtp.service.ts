import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../lib/crypto';
import * as nodemailer from 'nodemailer';
import type { UpdatePlatformSmtpDto } from './dto/update-platform-smtp.dto';

@Injectable()
export class PlatformSmtpService {
  constructor(private prisma: PrismaService) {}

  /** Public config — no password exposed */
  async getConfig() {
    const config = await this.prisma.platformSmtpConfig.findFirst();
    if (!config) return null;
    return {
      id: config.id,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      hasPassword: !!config.encryptedPass,
    };
  }

  /** Internal — returns full config including encrypted password */
  async getConfigRaw() {
    return this.prisma.platformSmtpConfig.findFirst();
  }

  async upsertConfig(dto: UpdatePlatformSmtpDto) {
    const existing = await this.prisma.platformSmtpConfig.findFirst();

    let encryptedPass: string;
    if (!dto.password) {
      if (!existing) {
        throw new BadRequestException('Debes proporcionar una contraseña para la configuración inicial.');
      }
      encryptedPass = existing.encryptedPass;
    } else {
      encryptedPass = encrypt(dto.password);
    }

    const data = {
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      username: dto.username,
      encryptedPass,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName,
    };

    if (existing) {
      return this.prisma.platformSmtpConfig.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.platformSmtpConfig.create({ data });
  }

  async testConnection(
    dto: { host?: string; port?: number; secure?: boolean; username?: string; password?: string; fromEmail?: string; fromName?: string },
    targetEmail: string,
  ) {
    let host: string, port: number, secure: boolean, username: string, password: string, fromEmail: string, fromName: string;

    if (dto.host && dto.username && dto.fromEmail) {
      host = dto.host;
      port = dto.port ?? 587;
      secure = dto.secure ?? false;
      username = dto.username;
      fromEmail = dto.fromEmail;
      fromName = dto.fromName ?? '';

      if (dto.password) {
        password = dto.password;
      } else {
        const existing = await this.prisma.platformSmtpConfig.findFirst();
        if (!existing) {
          return { connectionOk: false, emailSent: false, error: 'Debes proporcionar una contraseña para probar la conexión.' };
        }
        try {
          password = decrypt(existing.encryptedPass);
        } catch {
          return { connectionOk: false, emailSent: false, error: 'Error al descifrar la contraseña SMTP guardada.' };
        }
      }
    } else {
      const config = await this.prisma.platformSmtpConfig.findFirst();
      if (!config) {
        return { connectionOk: false, emailSent: false, error: 'No hay configuración SMTP de plataforma guardada.' };
      }
      host = config.host;
      port = config.port;
      secure = config.secure;
      username = config.username;
      fromEmail = config.fromEmail;
      fromName = config.fromName;
      try {
        password = decrypt(config.encryptedPass);
      } catch {
        return { connectionOk: false, emailSent: false, error: 'Error al descifrar la contraseña SMTP.' };
      }
    }

    const transport = nodemailer.createTransport({
      host, port, secure,
      auth: { user: username, pass: password },
    });

    try {
      await transport.verify();
    } catch (err: any) {
      return { connectionOk: false, emailSent: false, error: `Error de conexión: ${err.message}` };
    }

    try {
      await transport.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: targetEmail,
        subject: 'AppForge — Email de prueba SMTP de plataforma',
        html: `<p>¡Tu configuración SMTP de plataforma funciona correctamente!</p><p>Este email fue enviado desde AppForge para verificar tu configuración.</p>`,
      });
    } catch (err: any) {
      return { connectionOk: true, emailSent: false, error: `Conexión OK, pero error al enviar: ${err.message}` };
    }

    return { connectionOk: true, emailSent: true };
  }
}
