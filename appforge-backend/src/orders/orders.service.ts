import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId)
      throw new ForbiddenException('No tienes acceso a esta app');
  }

  // --- Create order (public, server-side price calculation) ---
  async create(appId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    // Fetch all products from DB
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds } },
      include: { collection: { select: { name: true, appId: true } } },
    });

    // Validate all products exist and belong to this app
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
      if (!product) {
        throw new BadRequestException(`Producto no encontrado: ${item.productId}`);
      }
      if (product.collection.appId !== appId) {
        throw new BadRequestException(`Producto no pertenece a esta app`);
      }
      if (!product.inStock) {
        throw new BadRequestException(`Producto agotado: ${product.name}`);
      }

      const price = product.price;
      const lineTotal = price.mul(item.quantity);
      total = total.add(lineTotal);

      itemsSnapshot.push({
        productId: product.id,
        name: product.name,
        price: price.toNumber(),
        quantity: item.quantity,
        collectionName: product.collection.name,
      });
    }

    return this.prisma.order.create({
      data: {
        appId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone ?? null,
        customerEmail: dto.customerEmail ?? null,
        customerNotes: dto.customerNotes ?? null,
        items: itemsSnapshot,
        total,
      },
    });
  }

  // --- Get single order (public, for confirmation page) ---
  async findOne(appId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, appId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  // --- List orders (builder client) ---
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

  // --- Update status (builder client) ---
  async updateStatus(
    appId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
    tenantId: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId);
    const order = await this.findOne(appId, orderId);

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: dto.status },
    });
  }

  // --- Stats (builder client) ---
  async getStats(appId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, todayOrders, allOrders] = await Promise.all([
      this.prisma.order.count({
        where: { appId, status: 'PENDING' },
      }),
      this.prisma.order.count({
        where: { appId, createdAt: { gte: today } },
      }),
      this.prisma.order.findMany({
        where: {
          appId,
          status: { not: 'CANCELLED' },
        },
        select: { total: true },
      }),
    ]);

    const totalRevenue = allOrders.reduce(
      (acc, o) => acc + Number(o.total),
      0,
    );

    return {
      pendingCount,
      todayCount: todayOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    };
  }
}
