import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
import { sanitizeHtmlContent } from '../lib/sanitize-html';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  async findAll(appId: string) {
    return this.prisma.newsArticle.findMany({
      where: { appId },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findOne(appId: string, id: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { id, appId },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async create(appId: string, dto: CreateNewsArticleDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    if (!dto.title || !dto.content) {
      throw new BadRequestException('title and content are required');
    }

    return this.prisma.newsArticle.create({
      data: {
        title: dto.title,
        content: sanitizeHtmlContent(dto.content),
        imageUrl: dto.imageUrl ?? null,
        videoUrl: dto.videoUrl ?? null,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        app: { connect: { id: appId } },
      },
    });
  }

  async update(appId: string, id: string, dto: UpdateNewsArticleDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);

    return this.prisma.newsArticle.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: sanitizeHtmlContent(dto.content) }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
      },
    });
  }

  async remove(appId: string, id: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);

    return this.prisma.newsArticle.delete({ where: { id } });
  }
}
