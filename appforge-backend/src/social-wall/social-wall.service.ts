import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { CreateSocialCommentDto } from './dto/create-social-comment.dto';
import { ReportContentDto } from './dto/report-content.dto';
import {
  REPORTABLE_TARGET_TYPES,
  type ReportableTargetType,
} from './social-wall.constants';

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
    if (!REPORTABLE_TARGET_TYPES.includes(dto.targetType as ReportableTargetType)) {
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

  async getReports(
    appId: string,
    tenantId: string | undefined,
    role: string | undefined,
    targetTypes?: string[],
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);

    // Validar contra la lista canónica. Si el cliente pasa un valor
    // desconocido, devolver 400 con detalle (no degradar silenciosamente
    // a "sin filtro" — ese sería el patrón que ocultaría bugs de cliente).
    if (targetTypes && targetTypes.length > 0) {
      const invalid = targetTypes.filter(
        (t) => !REPORTABLE_TARGET_TYPES.includes(t as ReportableTargetType),
      );
      if (invalid.length > 0) {
        throw new BadRequestException(
          `targetType inválido: ${invalid.join(', ')}. Valores permitidos: ${REPORTABLE_TARGET_TYPES.join(', ')}.`,
        );
      }
    }

    const reports = await this.prisma.contentReport.findMany({
      where: {
        appId,
        resolved: false,
        ...(targetTypes && targetTypes.length > 0
          ? { targetType: { in: targetTypes } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        appUser: { select: { email: true, firstName: true } },
      },
    });

    // ────────────────── Enriquecimiento polimórfico del contenido reportado.
    //
    // El cliente del builder muestra el contenido del item reportado junto al
    // report (gate #5 + UX moderación). Sin esto, ve "Publicación reportada
    // por X — 'razón'" sin saber qué publicación.
    //
    // Estrategia anti-N+1: agrupar los targetId por targetType y disparar
    // como mucho 3 queries batch (SocialPost / SocialComment / FanPost).
    // O(reports) en cliente para construir Maps de lookup O(1).
    //
    // Anti-fuga por appId: cada query filtra por pertenencia al app.
    //   - SocialPost / FanPost: appId directo en el modelo.
    //   - SocialComment: no tiene appId propio → filtro vía post: { appId }.
    // Un targetId que apunte a contenido de otro tenant simplemente NO
    // aparece en el map → reportedContent quedará null.
    //
    // Casos null: cierran el coletazo de TECH_DEBT #61. Si el contenido
    // ya fue borrado (e.g. SocialComment huérfano tras moderateDeletePost
    // del post padre que disparó cascade DB de comments), el findMany
    // simplemente no lo devuelve, el map no lo contiene, y el frontend
    // pinta "Contenido eliminado" en vez de fila confusa.

    const socialPostIds: string[] = [];
    const socialCommentIds: string[] = [];
    const fanPostIds: string[] = [];

    for (const r of reports) {
      if (r.targetType === 'social_post') socialPostIds.push(r.targetId);
      else if (r.targetType === 'social_comment') socialCommentIds.push(r.targetId);
      else if (r.targetType === 'fan_post') fanPostIds.push(r.targetId);
    }

    // Short-circuit de cada batch cuando el grupo está vacío: optimización
    // (ahorra una query que devolvería [] limpio de todas formas). No es
    // corrección — Prisma con `id: { in: [] }` se comporta correctamente.
    const [socialPosts, socialComments, fanPosts] = await Promise.all([
      socialPostIds.length > 0
        ? this.prisma.socialPost.findMany({
            where: { id: { in: socialPostIds }, appId },
            select: {
              id: true,
              content: true,
              imageUrl: true,
              appUser: { select: { email: true } },
            },
          })
        : Promise.resolve([] as Array<{
            id: string;
            content: string;
            imageUrl: string | null;
            appUser: { email: string };
          }>),
      socialCommentIds.length > 0
        ? this.prisma.socialComment.findMany({
            where: { id: { in: socialCommentIds }, post: { appId } },
            select: {
              id: true,
              content: true,
              appUser: { select: { email: true } },
            },
          })
        : Promise.resolve([] as Array<{
            id: string;
            content: string;
            appUser: { email: string };
          }>),
      fanPostIds.length > 0
        ? this.prisma.fanPost.findMany({
            where: { id: { in: fanPostIds }, appId },
            select: {
              id: true,
              caption: true,
              imageUrl: true,
              appUser: { select: { email: true } },
            },
          })
        : Promise.resolve([] as Array<{
            id: string;
            caption: string | null;
            imageUrl: string;
            appUser: { email: string };
          }>),
    ]);

    const socialPostMap = new Map(socialPosts.map((p) => [p.id, p]));
    const socialCommentMap = new Map(socialComments.map((c) => [c.id, c]));
    const fanPostMap = new Map(fanPosts.map((p) => [p.id, p]));

    return reports.map((r) => {
      let reportedContent:
        | { text?: string; imageUrl?: string; authorEmail: string }
        | null = null;

      if (r.targetType === 'social_post') {
        const p = socialPostMap.get(r.targetId);
        if (p) {
          reportedContent = {
            text: p.content,
            imageUrl: p.imageUrl ?? undefined,
            authorEmail: p.appUser.email,
          };
        }
      } else if (r.targetType === 'social_comment') {
        const c = socialCommentMap.get(r.targetId);
        if (c) {
          reportedContent = {
            text: c.content,
            authorEmail: c.appUser.email,
          };
        }
      } else if (r.targetType === 'fan_post') {
        const p = fanPostMap.get(r.targetId);
        if (p) {
          reportedContent = {
            text: p.caption ?? undefined,
            imageUrl: p.imageUrl,
            authorEmail: p.appUser.email,
          };
        }
      }

      return { ...r, reportedContent };
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

    // Cascada: borrar el post Y marcar como resueltos todos los reports que
    // apuntaban a este post. Sin esto los reports quedarían huérfanos —
    // apuntando a un targetId que ya no existe — y el moderador los seguiría
    // viendo en la cola. Atómico via $transaction: si la delete falla, el
    // updateMany no se ejecuta. Cubre también el caso de varios reports sobre
    // el mismo post (el @@unique de ContentReport es [appUserId, targetType,
    // targetId], así que distintos usuarios pueden reportar el mismo post).
    await this.prisma.$transaction([
      this.prisma.socialPost.delete({ where: { id: postId } }),
      this.prisma.contentReport.updateMany({
        where: { appId, targetType: 'social_post', targetId: postId, resolved: false },
        data: { resolved: true },
      }),
    ]);
  }

  async moderateDeleteComment(
    appId: string,
    commentId: string,
    tenantId?: string,
    role?: string,
  ) {
    await this.ensureAppOwnership(appId, tenantId, role);

    // include post.appId para confirmar que el comentario pertenece al app
    // del cliente que modera (anti-IDOR: sin esta comprobación, un cliente
    // con acceso a un commentId de otro tenant podría borrarlo).
    const comment = await this.prisma.socialComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { appId: true } } },
    });
    if (!comment || comment.post.appId !== appId) {
      throw new NotFoundException('Comentario no encontrado.');
    }

    // Misma cascada que moderateDeletePost pero para 'social_comment'.
    await this.prisma.$transaction([
      this.prisma.socialComment.delete({ where: { id: commentId } }),
      this.prisma.contentReport.updateMany({
        where: { appId, targetType: 'social_comment', targetId: commentId, resolved: false },
        data: { resolved: true },
      }),
    ]);
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
