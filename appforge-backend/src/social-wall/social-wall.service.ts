import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { CreateSocialCommentDto } from './dto/create-social-comment.dto';
import { ReportContentDto } from './dto/report-content.dto';

@Injectable()
export class SocialWallService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────── Public (runtime) ────────────────────

  async getPosts(appId: string, page: number, limit: number, appUserId?: string) {
    await this.ensureAppExists(appId);

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.socialPost.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
          _count: { select: { comments: true } },
          ...(appUserId
            ? { likes: { where: { appUserId }, select: { id: true } } }
            : {}),
        },
      }),
      this.prisma.socialPost.count({ where: { appId } }),
    ]);

    return {
      data: data.map((post) => this.toPostResponse(post, appUserId)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async createPost(appId: string, appUserId: string, dto: CreateSocialPostDto) {
    await this.ensureAppExists(appId);

    const post = await this.prisma.socialPost.create({
      data: {
        appId,
        appUserId,
        content: dto.content,
        imageUrl: dto.imageUrl,
      },
      include: {
        appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    return this.toPostResponse(post);
  }

  async toggleLike(postId: string, appUserId: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.socialLike.findUnique({
        where: { postId_appUserId: { postId, appUserId } },
      });

      if (existing) {
        await tx.socialLike.delete({ where: { id: existing.id } });
        const updated = await tx.socialPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        });
        return { liked: false, likesCount: updated.likesCount };
      } else {
        await tx.socialLike.create({ data: { postId, appUserId } });
        const updated = await tx.socialPost.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        });
        return { liked: true, likesCount: updated.likesCount };
      }
    });
  }

  async getComments(postId: string, page: number, limit: number) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.socialComment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: safeLimit,
        include: {
          appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
        },
      }),
      this.prisma.socialComment.count({ where: { postId } }),
    ]);

    return {
      data: data.map(this.toCommentResponse),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async createComment(postId: string, appUserId: string, dto: CreateSocialCommentDto) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');

    const comment = await this.prisma.socialComment.create({
      data: {
        postId,
        appUserId,
        content: dto.content,
      },
      include: {
        appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
    });

    return this.toCommentResponse(comment);
  }

  async deleteOwnPost(postId: string, appUserId: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado.');
    if (post.appUserId !== appUserId) throw new ForbiddenException('Solo puedes eliminar tus propios posts.');

    await this.prisma.socialPost.delete({ where: { id: postId } });
  }

  async deleteOwnComment(commentId: string, appUserId: string) {
    const comment = await this.prisma.socialComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentario no encontrado.');
    if (comment.appUserId !== appUserId) throw new ForbiddenException('Solo puedes eliminar tus propios comentarios.');

    await this.prisma.socialComment.delete({ where: { id: commentId } });
  }

  // ──────────────────── Reports ────────────────────

  async reportContent(appId: string, appUserId: string, dto: ReportContentDto) {
    const validTypes = ['social_post', 'social_comment', 'fan_post'];
    if (!validTypes.includes(dto.targetType)) {
      throw new ForbiddenException('Tipo de contenido no válido.');
    }

    try {
      await this.prisma.contentReport.create({
        data: {
          appId,
          appUserId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
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

  async getReports(appId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    return this.prisma.contentReport.findMany({
      where: { appId, resolved: false },
      orderBy: { createdAt: 'desc' },
      include: {
        appUser: { select: { email: true, firstName: true } },
      },
    });
  }

  async resolveReport(appId: string, reportId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const report = await this.prisma.contentReport.findUnique({ where: { id: reportId } });
    if (!report || report.appId !== appId) throw new NotFoundException('Reporte no encontrado.');

    await this.prisma.contentReport.update({
      where: { id: reportId },
      data: { resolved: true },
    });
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  async moderateDeletePost(appId: string, postId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post || post.appId !== appId) throw new NotFoundException('Post no encontrado.');

    await this.prisma.socialPost.delete({ where: { id: postId } });
  }

  async getStats(appId: string, tenantId?: string, role?: string) {
    await this.ensureAppOwnership(appId, tenantId, role);

    const [totalPosts, totalComments, totalLikes, pendingReports] = await Promise.all([
      this.prisma.socialPost.count({ where: { appId } }),
      this.prisma.socialComment.count({
        where: { post: { appId } },
      }),
      this.prisma.socialLike.count({
        where: { post: { appId } },
      }),
      this.prisma.contentReport.count({
        where: { appId, resolved: false, targetType: { in: ['social_post', 'social_comment'] } },
      }),
    ]);

    return { totalPosts, totalComments, totalLikes, pendingReports };
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
      content: post.content,
      imageUrl: post.imageUrl,
      likesCount: post.likesCount,
      commentCount: post._count?.comments ?? 0,
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

  private toCommentResponse(comment: any) {
    return {
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      author: {
        id: comment.appUser.id,
        firstName: comment.appUser.firstName,
        lastName: comment.appUser.lastName,
        avatarUrl: comment.appUser.avatarUrl,
        email: comment.appUser.email,
      },
      createdAt: comment.createdAt,
    };
  }
}
