import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import stableStringify from 'json-stable-stringify';
import { encrypt, decrypt } from '../lib/crypto';
import * as nodemailer from 'nodemailer';
import type { UpdateAppConfigDto, UpdateSmtpConfigDto } from './dto/update-app-config.dto';

interface CanvasElement {
  moduleId: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Extracts the structural subset of the schema that affects builds,
 * ignoring live-data fields like _refreshKey and appId.
 * Returns a deterministic SHA-256 hash.
 */
function computeBuildableHash(
  schema: unknown,
  designTokens: unknown,
): string {
  const elements = Array.isArray(schema) ? schema : [];
  const structural = elements.map((el: CanvasElement) => {
    const { _refreshKey, appId, ...rest } = el.config ?? {};
    return { moduleId: el.moduleId, config: rest };
  });
  const payload = { elements: structural, designTokens: designTokens ?? null };
  const serialized = stableStringify(payload) ?? '';
  return createHash('sha256').update(serialized).digest('hex');
}

@Injectable()
export class AppsService {
  constructor(private prisma: PrismaService) {}

  /** Verify that a CLIENT user owns the app via tenantId (rejects soft-deleted) */
  private async ensureOwnership(id: string, tenantId?: string, role?: string) {
    const app = await this.prisma.app.findFirst({ where: { id, deletedAt: null } });
    if (!app) throw new NotFoundException('App not found');
    if (role === 'CLIENT' && app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app');
    }
    return app;
  }

  async create(data: Prisma.AppCreateInput) {
    return this.prisma.app.create({ data });
  }

  async findAll(tenantId?: string) {
    const where: Prisma.AppWhereInput = { deletedAt: null };
    if (tenantId) where.tenantId = tenantId;
    const apps = await this.prisma.app.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { keystore: { select: { id: true } } },
    });
    return apps.map(({ keystore, ...rest }) => ({
      ...rest,
      hasKeystore: !!keystore,
    }));
  }

  async findOne(id: string, tenantId?: string, role?: string) {
    await this.ensureOwnership(id, tenantId, role);
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { keystore: { select: { id: true } } },
    });
    if (!app) throw new NotFoundException('App not found');
    const { keystore, ...rest } = app;
    return { ...rest, hasKeystore: !!keystore };
  }

  async updateSchema(id: string, schema: unknown, designTokens?: unknown, tenantId?: string, role?: string) {
    const app = await this.ensureOwnership(id, tenantId, role);

    const data: Prisma.AppUpdateInput = {
      schema: schema as Prisma.InputJsonValue,
    };
    if (designTokens !== undefined) {
      data.designTokens = designTokens as Prisma.InputJsonValue;
    }

    // Detect structural changes → needsRebuild
    const newHash = computeBuildableHash(
      schema,
      designTokens !== undefined ? designTokens : app.designTokens,
    );
    const oldHash = app.lastBuiltSchema
      ? computeBuildableHash(app.lastBuiltSchema, app.designTokens)
      : null;

    if (oldHash === null || newHash !== oldHash) {
      data.needsRebuild = true;
    }

    return this.prisma.app.update({ where: { id }, data });
  }

  async remove(id: string, tenantId?: string, role?: string) {
    console.log(`[SOFT-DELETE] App ${id} by tenant ${tenantId} (role: ${role})`);
    const app = await this.ensureOwnership(id, tenantId, role);
    const result = await this.prisma.app.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        slug: `${app.slug}__deleted_${Date.now()}`,
      },
    });
    console.log(`[SOFT-DELETE] App ${id} soft-deleted successfully`);
    return result;
  }

  // ─── App Config ───────────────────────────────────────────────

  async getConfig(id: string, tenantId?: string, role?: string) {
    await this.ensureOwnership(id, tenantId, role);
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { smtpConfig: true },
    });
    if (!app) throw new NotFoundException('App not found');

    const smtp = app.smtpConfig
      ? {
          host: app.smtpConfig.host,
          port: app.smtpConfig.port,
          secure: app.smtpConfig.secure,
          username: app.smtpConfig.username,
          fromEmail: app.smtpConfig.fromEmail,
          fromName: app.smtpConfig.fromName,
          hasPassword: !!app.smtpConfig.encryptedPass,
        }
      : null;

    return {
      ...(app.appConfig as Record<string, unknown> ?? {}),
      smtp,
    };
  }

  async updateConfig(
    id: string,
    configPatch: UpdateAppConfigDto,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureOwnership(id, tenantId, role);
    const app = await this.prisma.app.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('App not found');

    // Deep-merge by section: incoming sections overwrite, missing sections preserved
    const existing = (app.appConfig as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...configPatch };

    return this.prisma.app.update({
      where: { id },
      data: { appConfig: merged as Prisma.InputJsonValue },
    });
  }

  async updateSmtp(
    id: string,
    dto: UpdateSmtpConfigDto,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureOwnership(id, tenantId, role);

    // If password is empty, preserve existing encrypted password
    let encryptedPass: string;
    if (!dto.password) {
      const existing = await this.prisma.appSmtpConfig.findUnique({
        where: { appId: id },
      });
      if (!existing) {
        throw new BadRequestException('No existe configuración SMTP previa. Debes proporcionar una contraseña.');
      }
      encryptedPass = existing.encryptedPass;
    } else {
      encryptedPass = encrypt(dto.password);
    }

    const result = await this.prisma.appSmtpConfig.upsert({
      where: { appId: id },
      create: {
        appId: id,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        encryptedPass,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName,
      },
      update: {
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        encryptedPass,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName,
      },
    });

    // Never expose encrypted password in response
    const { encryptedPass: _, ...safe } = result;
    return { ...safe, hasPassword: true };
  }

  async testSmtp(
    id: string,
    userEmail: string,
    bodyData?: { host?: string; port?: number; secure?: boolean; username?: string; password?: string; fromEmail?: string; fromName?: string },
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureOwnership(id, tenantId, role);

    // Resolve SMTP config: use body data if complete, otherwise fall back to DB
    let host: string, port: number, secure: boolean, username: string, password: string, fromEmail: string, fromName: string;

    if (bodyData?.host && bodyData?.username && bodyData?.fromEmail) {
      host = bodyData.host;
      port = bodyData.port ?? 587;
      secure = bodyData.secure ?? false;
      username = bodyData.username;
      fromEmail = bodyData.fromEmail;
      fromName = bodyData.fromName ?? '';

      // Password: use body if provided, otherwise try to get from DB
      if (bodyData.password) {
        password = bodyData.password;
      } else {
        const existing = await this.prisma.appSmtpConfig.findUnique({ where: { appId: id } });
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
      // Fall back to saved DB config
      const smtpConfig = await this.prisma.appSmtpConfig.findUnique({ where: { appId: id } });
      if (!smtpConfig) {
        return { connectionOk: false, emailSent: false, error: 'No hay configuración SMTP guardada ni datos proporcionados.' };
      }
      host = smtpConfig.host;
      port = smtpConfig.port;
      secure = smtpConfig.secure;
      username = smtpConfig.username;
      fromEmail = smtpConfig.fromEmail;
      fromName = smtpConfig.fromName;
      try {
        password = decrypt(smtpConfig.encryptedPass);
      } catch {
        return { connectionOk: false, emailSent: false, error: 'Error al descifrar la contraseña SMTP.' };
      }
    }

    const transport = nodemailer.createTransport({
      host, port, secure,
      auth: { user: username, pass: password },
    });

    // Step 1: Verify connection
    try {
      await transport.verify();
    } catch (err: any) {
      return { connectionOk: false, emailSent: false, error: `Error de conexión: ${err.message}` };
    }

    // Step 2: Send test email
    try {
      await transport.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: userEmail,
        subject: 'AppForge — Email de prueba SMTP',
        html: `<p>¡Tu configuración SMTP funciona correctamente!</p><p>Este email fue enviado desde AppForge para verificar tu configuración.</p>`,
      });
    } catch (err: any) {
      return { connectionOk: true, emailSent: false, error: `Conexión OK, pero error al enviar: ${err.message}` };
    }

    return { connectionOk: true, emailSent: true };
  }
}
