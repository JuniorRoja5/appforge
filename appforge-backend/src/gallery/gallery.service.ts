import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  async findAll(appId: string) {
    return this.prisma.galleryItem.findMany({
      where: { appId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(appId: string, id: string) {
    const item = await this.prisma.galleryItem.findFirst({
      where: { id, appId },
    });
    if (!item) {
      throw new NotFoundException('Gallery item not found');
    }
    return item;
  }

  async create(appId: string, dto: CreateGalleryItemDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    if (!dto.imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    // Auto-calculate order: max existing + 1
    const maxOrder = await this.prisma.galleryItem.aggregate({
      where: { appId },
      _max: { order: true },
    });
    const nextOrder = dto.order ?? (maxOrder._max.order ?? -1) + 1;

    return this.prisma.galleryItem.create({
      data: {
        imageUrl: dto.imageUrl,
        title: dto.title ?? null,
        description: dto.description ?? null,
        order: nextOrder,
        app: { connect: { id: appId } },
      },
    });
  }

  async update(appId: string, id: string, dto: UpdateGalleryItemDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);

    return this.prisma.galleryItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async remove(appId: string, id: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);
    return this.prisma.galleryItem.delete({ where: { id } });
  }

  async reorder(appId: string, items: { id: string; order: number }[], tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.galleryItem.updateMany({
          where: { id: item.id, appId },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
