import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFanPostDto } from './dto/create-fan-post.dto';

@Injectable()
export class FanWallService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────── Public (runtime) ────────────────────

  async getPosts(appId: string, page: number, limit: number, appUserId?: string) {
    await this.ensureAppExists(appId);

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.fanPost.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
          ...(appUserId
            ? { likes: { where: { appUserId }, select: { id: true } } }
            : {}),
        },
      }),
      this.prisma.fanPost.count({ where: { appId } }),
    ]);

    return {
      data: data.map((post) => this.toPostResponse(post, appUserId)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async createPost(appId: string, appUserId: string, dto: CreateFanPostDto) {
    await this.ensureAppExists(appId);

    const post = await this.prisma.fanPost.create({
      data: {
        appId,
        appUserId,
        imageUrl: dto.imageUrl,
        caption: dto.caption,
      },
      include: {
        appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
    });

    return this.toPostResponse(post);
  }

  async toggleLike(postId: string, appUserId: string) {
    const post = await this.prisma.fanPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.fanLike.findUnique({
        where: { postId_appUserId: { postId, appUserId } },
      });

      if (existing) {
        await tx.fanLike.delete({ where: { id: existing.id } });
        const updated = await tx.fanPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        });
        return { liked: false, likesCount: updated.likesCount };
      } else {
        await tx.fanLike.create({ data: { postId, appUserId } });
        const updated = await tx.fanPost.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        });
        return { liked: true, likesCount: updated.likesCount };
      }
    });
  }

  async deleteOwnPost(postId: string, appUserId: string) {
    const post = await this.prisma.fanPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');
    if (post.appUserId !== appUserId) throw new ForbiddenException('Solo puedes eliminar tus propias fotos.');

    await this.prisma.fanPost.delete({ where: { id: postId } });
  }

  // ──────────────────── Reports ────────────────────

  async reportPost(appId: string, appUserId: string, postId: string, reason?: string) {
    const post = await this.prisma.fanPost.findUnique({ where: { id: postId } });
    if (!post || post.appId !== appId) throw new NotFoundException('Post no encontrado.');

    try {
      await this.prisma.contentReport.create({
        data: {
          appId,
          appUserId,
          targetType: 'fan_post',
          targetId: postId,
          reason,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Ya reportaste este contenido.');
      }
      throw err;
    }

    return { message: 'Reporte enviado.' };
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  async moderateDeletePost(appId: string, postId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const post = await this.prisma.fanPost.findUnique({ where: { id: postId } });
    if (!post || post.appId !== appId) throw new NotFoundException('Post no encontrado.');

    await this.prisma.fanPost.delete({ where: { id: postId } });
  }

  async getStats(appId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const [totalPosts, totalLikes, pendingReports] = await Promise.all([
      this.prisma.fanPost.count({ where: { appId } }),
      this.prisma.fanLike.count({
        where: { post: { appId } },
      }),
      this.prisma.contentReport.count({
        where: { appId, resolved: false, targetType: 'fan_post' },
      }),
    ]);

    return { totalPosts, totalLikes, pendingReports };
  }

  // ──────────────────── Private helpers ────────────────────

  private async ensureAppExists(appId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null } });
    if (!app) throw new NotFoundException('App no encontrada.');
    return app;
  }

  private async ensureAppOwnership(appId: string, tenantId?: string, role?: string) {
    const app = await this.ensureAppExists(appId);
    if (role === 'CLIENT' && app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app.');
    }
    return app;
  }

  private toPostResponse(post: any, appUserId?: string) {
    return {
      id: post.id,
      appId: post.appId,
      imageUrl: post.imageUrl,
      caption: post.caption,
      likesCount: post.likesCount,
      isLiked: appUserId ? (post.likes?.length > 0) : undefined,
      author: {
        id: post.appUser.id,
        firstName: post.appUser.firstName,
        lastName: post.appUser.lastName,
        avatarUrl: post.appUser.avatarUrl,
        email: post.appUser.email,
      },
      createdAt: post.createdAt,
    };
  }
}
