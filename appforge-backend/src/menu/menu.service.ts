import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  // ---- Categories ----

  async findAllCategories(appId: string) {
    return this.prisma.menuCategory.findMany({
      where: { appId },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async findOneCategory(appId: string, categoryId: string) {
    const cat = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, appId },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(appId: string, dto: CreateMenuCategoryDto, tenantId: string) {
    if (!dto.name) throw new BadRequestException('name is required');

    await this.ensureAppOwnership(appId, tenantId);

    const maxOrder = await this.prisma.menuCategory.aggregate({
      where: { appId },
      _max: { order: true },
    });

    return this.prisma.menuCategory.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
        app: { connect: { id: appId } },
      },
      include: { items: true },
    });
  }

  async updateCategory(appId: string, categoryId: string, dto: UpdateMenuCategoryDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCategory(appId, categoryId);

    return this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async removeCategory(appId: string, categoryId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCategory(appId, categoryId);
    return this.prisma.menuCategory.delete({ where: { id: categoryId } });
  }

  async reorderCategories(appId: string, items: { id: string; order: number }[], tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.menuCategory.updateMany({
          where: { id: item.id, appId },
          data: { order: item.order },
        }),
      ),
    );
  }

  // ---- Items ----

  async createItem(appId: string, categoryId: string, dto: CreateMenuItemDto, tenantId: string) {
    if (!dto.name || dto.price === undefined) {
      throw new BadRequestException('name and price are required');
    }

    await this.ensureAppOwnership(appId, tenantId);

    const category = await this.findOneCategory(appId, categoryId);
    if (!category) throw new NotFoundException('Category not found');

    const maxOrder = await this.prisma.menuItem.aggregate({
      where: { categoryId },
      _max: { order: true },
    });

    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        imageUrl: dto.imageUrl ?? null,
        allergens: dto.allergens ?? [],
        available: dto.available ?? true,
        order: (maxOrder._max.order ?? -1) + 1,
        category: { connect: { id: categoryId } },
      },
    });
  }

  async updateItem(appId: string, categoryId: string, itemId: string, dto: UpdateMenuItemDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const category = await this.findOneCategory(appId, categoryId);
    if (!category) throw new NotFoundException('Category not found');

    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, categoryId },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.allergens !== undefined && { allergens: dto.allergens }),
        ...(dto.available !== undefined && { available: dto.available }),
      },
    });
  }

  async removeItem(appId: string, categoryId: string, itemId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOneCategory(appId, categoryId);
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, categoryId },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return this.prisma.menuItem.delete({ where: { id: itemId } });
  }

  async reorderItems(appId: string, categoryId: string, items: { id: string; order: number }[], tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.menuItem.updateMany({
          where: { id: item.id, categoryId },
          data: { order: item.order },
        }),
      ),
    );
  }
}
