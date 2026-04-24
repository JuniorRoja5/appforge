import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  // ---- Collections ----

  async findAllCollections(appId: string) {
    return this.prisma.catalogCollection.findMany({
      where: { appId },
      orderBy: { order: 'asc' },
      include: { products: { orderBy: { order: 'asc' } } },
    });
  }

  async findOneCollection(appId: string, collectionId: string) {
    const col = await this.prisma.catalogCollection.findFirst({
      where: { id: collectionId, appId },
      include: { products: { orderBy: { order: 'asc' } } },
    });
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async createCollection(appId: string, dto: CreateCollectionDto, tenantId: string) {
    if (!dto.name) throw new BadRequestException('name is required');

    await this.ensureAppOwnership(appId, tenantId);

    const maxOrder = await this.prisma.catalogCollection.aggregate({
      where: { appId },
      _max: { order: true },
    });

    return this.prisma.catalogCollection.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
        app: { connect: { id: appId } },
      },
      include: { products: true },
    });
  }

  async updateCollection(appId: string, collectionId: string, dto: UpdateCollectionDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCollection(appId, collectionId);
    return this.prisma.catalogCollection.update({
      where: { id: collectionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
      },
      include: { products: { orderBy: { order: 'asc' } } },
    });
  }

  async removeCollection(appId: string, collectionId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCollection(appId, collectionId);
    return this.prisma.catalogCollection.delete({ where: { id: collectionId } });
  }

  async reorderCollections(appId: string, items: { id: string; order: number }[], tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.catalogCollection.updateMany({
          where: { id: item.id, appId },
          data: { order: item.order },
        }),
      ),
    );
  }

  // ---- Products ----

  async createProduct(appId: string, collectionId: string, dto: CreateProductDto, tenantId: string) {
    if (!dto.name || dto.price === undefined) {
      throw new BadRequestException('name and price are required');
    }
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCollection(appId, collectionId);

    const maxOrder = await this.prisma.catalogProduct.aggregate({
      where: { collectionId },
      _max: { order: true },
    });

    return this.prisma.catalogProduct.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        comparePrice: dto.comparePrice ?? null,
        imageUrls: dto.imageUrls ?? [],
        inStock: dto.inStock ?? true,
        tags: dto.tags ?? [],
        order: (maxOrder._max.order ?? -1) + 1,
        collection: { connect: { id: collectionId } },
      },
    });
  }

  async updateProduct(appId: string, collectionId: string, productId: string, dto: UpdateProductDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCollection(appId, collectionId);
    const product = await this.prisma.catalogProduct.findFirst({
      where: { id: productId, collectionId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.catalogProduct.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.comparePrice !== undefined && { comparePrice: dto.comparePrice }),
        ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
        ...(dto.inStock !== undefined && { inStock: dto.inStock }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async removeProduct(appId: string, collectionId: string, productId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCollection(appId, collectionId);
    const product = await this.prisma.catalogProduct.findFirst({
      where: { id: productId, collectionId },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.catalogProduct.delete({ where: { id: productId } });
  }

  async reorderProducts(appId: string, collectionId: string, items: { id: string; order: number }[], tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.catalogProduct.updateMany({
          where: { id: item.id, collectionId },
          data: { order: item.order },
        }),
      ),
    );
  }
}
