import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../push/fcm.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { decrypt } from '../lib/crypto';
import * as nodemailer from 'nodemailer';

const ORDER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1
const ORDER_CODE_LENGTH = 6;

const STATUS_PUSH_MAP: Record<string, { title: string; body: string } | undefined> = {
  CONFIRMED: {
    title: 'Pedido confirmado',
    body: 'Tu pedido {code} ha sido confirmado. Te avisamos cuando esté listo.',
  },
  READY: {
    title: 'Pedido listo',
    body: 'Tu pedido {code} está listo para recoger.',
  },
  CANCELLED: {
    title: 'Pedido cancelado',
    body: 'Tu pedido {code} ha sido cancelado. Contacta con el negocio para más información.',
  },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private fcmService: FcmService,
  ) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId)
      throw new ForbiddenException('No tienes acceso a esta app');
  }

  /**
   * Genera un shortCode único por app (ORD-XXXXXX).
   * Reintenta hasta 10 veces si hay colisión.
   */
  private async generateShortCode(appId: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = 'ORD-';
      for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
        code += ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)];
      }
      const existing = await this.prisma.order.findUnique({
        where: { appId_shortCode: { appId, shortCode: code } },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('No se pudo generar un código único para el pedido');
  }

  // ─────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────

  async create(appId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    // Validar productos y calcular total server-side
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds } },
      include: { collection: { select: { name: true, appId: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const itemsSnapshot: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      collectionName: string;
    }> = [];
    let total = new Decimal(0);

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Producto no encontrado: ${item.productId}`);
      if (product.collection.appId !== appId)
        throw new BadRequestException('Producto no pertenece a esta app');
      if (!product.inStock)
        throw new BadRequestException(`Producto agotado: ${product.name}`);

      const lineTotal = product.price.mul(item.quantity);
      total = total.add(lineTotal);

      itemsSnapshot.push({
        productId: product.id,
        name: product.name,
        price: product.price.toNumber(),
        quantity: item.quantity,
        collectionName: product.collection.name,
      });
    }

    // Validar appUserId si se proporcionó (viene del JWT del runtime via controller)
    let validatedAppUserId: string | null = null;
    if (dto.appUserId) {
      const appUser = await this.prisma.appUser.findFirst({
        where: { id: dto.appUserId, appId },
        select: { id: true },
      });
      if (appUser) validatedAppUserId = appUser.id;
      // Si no encuentra el AppUser, ignora el campo silenciosamente (no romper el pedido)
    }

    // Generar shortCode único
    const shortCode = await this.generateShortCode(appId);

    // Crear el pedido
    const order = await this.prisma.order.create({
      data: {
        appId,
        shortCode,
        appUserId: validatedAppUserId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone ?? null,
        customerEmail: dto.customerEmail ?? null,
        customerNotes: dto.customerNotes ?? null,
        items: itemsSnapshot,
        total,
      },
    });

    // Disparar emails fire-and-forget (no bloquear la creación si SMTP falla)
    this.sendOrderEmails(order.id, appId).catch((err) =>
      this.logger.warn(`Order email failed for ${order.id}: ${err.message}`),
    );

    return order;
  }

  // ─────────────────────────────────────────────────────
  // EMAIL NOTIFICATIONS
  // ─────────────────────────────────────────────────────

  private async sendOrderEmails(orderId: string, appId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const smtpConfig = await this.prisma.appSmtpConfig.findUnique({ where: { appId } });
    if (!smtpConfig) {
      this.logger.warn(
        `Order ${order.id} (${order.shortCode}) created but SMTP not configured for app ${appId} — no emails sent`,
      );
      return;
    }

    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, clientEmail: true, clientName: true },
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

    const builderUrl = process.env.PUBLIC_BUILDER_URL || 'http://localhost:5173';
    const trackingUrl = `${builderUrl}/order/${appId}/${order.id}?t=${order.trackingToken}`;

    const items = order.items as Array<{ name: string; quantity: number; price: number }>;
    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${item.price.toFixed(2)}€</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${(item.price * item.quantity).toFixed(2)}€</td>
      </tr>`,
      )
      .join('');

    const totalFormatted = Number(order.total).toFixed(2);

    // Email 1: al cliente final (si tiene customerEmail)
    const customerEmailPromise = order.customerEmail
      ? transport
          .sendMail({
            from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
            to: order.customerEmail,
            subject: `Pedido confirmado — ${order.shortCode}`,
            html: this.renderCustomerEmail({
              shortCode: order.shortCode,
              customerName: order.customerName,
              appName: app.name,
              itemsHtml,
              totalFormatted,
              trackingUrl,
            }),
          })
          .catch((err) =>
            this.logger.warn(`Customer email failed for ${order.id}: ${err.message}`),
          )
      : Promise.resolve();

    // Email 2: al comerciante
    const merchantEmail = app.clientEmail || smtpConfig.fromEmail;
    const merchantEmailPromise = transport
      .sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: merchantEmail,
        subject: `Nuevo pedido recibido — ${order.shortCode}`,
        html: this.renderMerchantEmail({
          shortCode: order.shortCode,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          customerNotes: order.customerNotes,
          appName: app.name,
          itemsHtml,
          totalFormatted,
          trackingUrl,
        }),
      })
      .catch((err) =>
        this.logger.warn(`Merchant email failed for ${order.id}: ${err.message}`),
      );

    await Promise.all([customerEmailPromise, merchantEmailPromise]);
  }

  private renderCustomerEmail(data: {
    shortCode: string;
    customerName: string;
    appName: string;
    itemsHtml: string;
    totalFormatted: string;
    trackingUrl: string;
  }): string {
    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:linear-gradient(to right,#f59e0b,#f97316);color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:24px">¡Gracias por tu pedido!</h1>
    <p style="margin:8px 0 0;opacity:0.9">${data.appName}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Hola ${data.customerName.split(' ')[0]},</p>
    <p>Hemos recibido tu pedido <strong>${data.shortCode}</strong> correctamente. Te avisaremos cuando esté listo.</p>

    <table style="width:100%;border-collapse:collapse;margin:24px 0">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
          <th style="padding:8px 12px;text-align:left">Producto</th>
          <th style="padding:8px 12px;text-align:center">Cant.</th>
          <th style="padding:8px 12px;text-align:right">Precio</th>
          <th style="padding:8px 12px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${data.itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:600">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#f59e0b">${data.totalFormatted}€</td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align:center;margin:32px 0">
      <a href="${data.trackingUrl}" style="display:inline-block;background:#f59e0b;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
        Ver estado del pedido
      </a>
    </div>

    <p style="color:#6b7280;font-size:12px;margin-top:24px">
      Este email fue enviado automáticamente por ${data.appName}.<br>
      Si tienes alguna duda sobre tu pedido, contacta directamente con el negocio.
    </p>
  </div>
</div>`;
  }

  private renderMerchantEmail(data: {
    shortCode: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    customerNotes: string | null;
    appName: string;
    itemsHtml: string;
    totalFormatted: string;
    trackingUrl: string;
  }): string {
    const contactRows = [
      ['Cliente', data.customerName],
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
  <div style="background:#10b981;color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">📦 Nuevo pedido recibido</h1>
    <p style="margin:8px 0 0;opacity:0.9">${data.shortCode} · ${data.appName}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Datos del cliente</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${contactRows}</table>

    <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Productos</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
          <th style="padding:8px 12px;text-align:left">Producto</th>
          <th style="padding:8px 12px;text-align:center">Cant.</th>
          <th style="padding:8px 12px;text-align:right">Precio</th>
          <th style="padding:8px 12px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${data.itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:600">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#10b981">${data.totalFormatted}€</td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align:center;margin:32px 0">
      <a href="${data.trackingUrl}" style="display:inline-block;background:#10b981;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
        Ver pedido
      </a>
    </div>

    <p style="color:#6b7280;font-size:12px;margin-top:24px">
      Recuerda actualizar el estado del pedido desde tu panel para que el cliente reciba notificaciones.
    </p>
  </div>
</div>`;
  }

  // ─────────────────────────────────────────────────────
  // GET / LIST / STATS
  // ─────────────────────────────────────────────────────

  async findOne(appId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, appId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async findAll(
    appId: string,
    tenantId: string,
    params: { status?: string; page?: number },
  ) {
    await this.ensureAppOwnership(appId, tenantId);

    const page = params.page || 1;
    const limit = 20;
    const where: any = { appId };
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getStats(appId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, todayOrders, allOrders] = await Promise.all([
      this.prisma.order.count({ where: { appId, status: 'PENDING' } }),
      this.prisma.order.count({ where: { appId, createdAt: { gte: today } } }),
      this.prisma.order.findMany({
        where: { appId, status: { not: 'CANCELLED' } },
        select: { total: true },
      }),
    ]);

    const totalRevenue = allOrders.reduce((acc, o) => acc + Number(o.total), 0);

    return {
      pendingCount,
      todayCount: todayOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    };
  }

  // ─────────────────────────────────────────────────────
  // PUBLIC TRACKING (con tracking token)
  // ─────────────────────────────────────────────────────

  async findPublicByToken(appId: string, orderId: string, token: string) {
    if (!token) throw new NotFoundException('Pedido no encontrado');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, appId, trackingToken: token },
      select: {
        id: true,
        shortCode: true,
        status: true,
        items: true,
        total: true,
        customerName: true,
        createdAt: true,
        updatedAt: true,
        app: { select: { name: true } },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    return {
      ...order,
      // Solo primer nombre — protege la privacidad del cliente
      customerName: order.customerName.split(' ')[0],
    };
  }

  // ─────────────────────────────────────────────────────
  // UPDATE STATUS (con push idempotente)
  // ─────────────────────────────────────────────────────

  async updateStatus(
    appId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
    tenantId: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId);
    const order = await this.findOne(appId, orderId);

    const previousStatus = order.status;

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: dto.status },
    });

    // Idempotencia: solo disparar push si el status REALMENTE cambió
    if (
      previousStatus !== dto.status &&
      order.appUserId &&
      STATUS_PUSH_MAP[dto.status]
    ) {
      const pushConfig = STATUS_PUSH_MAP[dto.status]!;
      const body = pushConfig.body.replace('{code}', order.shortCode);

      this.fcmService
        .sendToAppUser(appId, order.appUserId, pushConfig.title, body, {
          orderId: order.id,
          shortCode: order.shortCode,
          status: dto.status,
        })
        .catch((err) =>
          this.logger.warn(
            `Push failed for order ${order.id} (${order.shortCode}): ${err.message}`,
          ),
        );
    }

    return updated;
  }
}
