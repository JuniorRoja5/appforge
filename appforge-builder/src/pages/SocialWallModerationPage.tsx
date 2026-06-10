import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Heart, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getSocialPosts,
  getSocialWallStats,
  getSocialReports,
  resolveSocialReport,
  deleteSocialPost,
  moderateDeleteSocialComment,
  type SocialPostItem,
  type ContentReportItem,
} from '../lib/api';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import {
  ModerationQueue,
  type PostActions,
} from '../components/admin/ModerationQueue';

interface SocialStats {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  pendingReports: number;
}

/**
 * Copy humano por targetType (gate #5). Tras el filtro server-side
 * targetType=social_post,social_comment no debería llegar fan_post a esta
 * página; el default ofrece copy razonable por si un nuevo tipo se añade en
 * el futuro sin que esta página lo conozca aún.
 */
const getReportTypeLabel = (r: ContentReportItem): string => {
  if (r.targetType === 'social_post') return 'Publicación reportada';
  if (r.targetType === 'social_comment') return 'Comentario reportado';
  return 'Contenido reportado';
};

const StatCardCell: FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div
    className={`rounded-lg p-3 flex items-center gap-2 ${
      highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}
  >
    <span className={highlight ? 'text-red-500' : 'text-gray-400'}>{icon}</span>
    <div>
      <p className={`text-xs ${highlight ? 'text-red-600' : 'text-gray-500'}`}>
        {label}
      </p>
      <p
        className={`text-base font-bold ${
          highlight ? 'text-red-700' : 'text-gray-800'
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

const SocialStatsCards: FC<{ stats: SocialStats }> = ({ stats }) => (
  <div className="grid grid-cols-4 gap-3">
    <StatCardCell
      icon={<MessageSquare size={14} />}
      label="Posts"
      value={stats.totalPosts}
    />
    <StatCardCell
      icon={<MessageSquare size={14} />}
      label="Comentarios"
      value={stats.totalComments}
    />
    <StatCardCell
      icon={<Heart size={14} />}
      label="Likes"
      value={stats.totalLikes}
    />
    <StatCardCell
      icon={<AlertTriangle size={14} />}
      label="Reportes"
      value={stats.pendingReports}
      highlight={stats.pendingReports > 0}
    />
  </div>
);

const SocialPostCard: FC<{
  post: SocialPostItem;
  actions: PostActions;
}> = ({ post, actions }) => (
  <div className="border border-gray-200 rounded-lg p-3 bg-white">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">
          {post.author.email}
        </p>
        <p className="text-sm text-gray-800 mt-1 line-clamp-3">{post.content}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5">
            <Heart size={10} /> {post.likesCount}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageSquare size={10} /> {post.commentCount}
          </span>
          <span>{new Date(post.createdAt).toLocaleDateString('es-ES')}</span>
        </div>
      </div>
      <div className="shrink-0">{actions.deleteButton}</div>
    </div>
  </div>
);

export const SocialWallModerationPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (page: number) => {
      if (!appId || !token) return;
      const res = await getSocialPosts(appId, token, page);
      if (page === 1) setPosts(res.data);
      else setPosts((prev) => [...prev, ...res.data]);
      setPostsTotal(res.total);
      setPostsPage(page);
    },
    [appId, token],
  );

  const fetchReports = useCallback(async () => {
    if (!appId || !token) return;
    // Filtro server-side de Fase 1.3a: solo social_post + social_comment.
    // Cierra el gate #6 — esta página NO ve reports de fan_post.
    const r = await getSocialReports(appId, token, [
      'social_post',
      'social_comment',
    ]);
    setReports(r);
  }, [appId, token]);

  const fetchStats = useCallback(async () => {
    if (!appId || !token) return;
    try {
      setStats(await getSocialWallStats(appId, token));
    } catch (err) {
      // Stats secundarias: si fallan las stats cards no se renderizan pero
      // la página sobrevive. No silencioso: deja rastro en consola.
      // eslint-disable-next-line no-console
      console.error('[SocialWallModerationPage] stats fetch failed:', err);
    }
  }, [appId, token]);

  // Carga inicial: posts(1) + reports + stats en paralelo. Solo bloquea al
  // Shell la primera vez (gate #2).
  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    setError(null);
    Promise.all([fetchPosts(1), fetchReports(), fetchStats()])
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los datos.',
        );
      })
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  const handleLoadMore = useCallback(async () => {
    if (postsLoading) return;
    setPostsLoading(true);
    try {
      await fetchPosts(postsPage + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar más posts.');
    } finally {
      setPostsLoading(false);
    }
  }, [fetchPosts, postsPage, postsLoading]);

  // Tras resolver un reporte: refetch reports + stats. La cascada de Fase 1.3a
  // resuelve los reports en backend cuando se borra contenido, así que para
  // el resto de acciones tampoco hace falta llamar resolveSocialReport desde
  // aquí (el backend lo hace solo).
  const refetchAfterAction = useCallback(async () => {
    await Promise.all([fetchReports(), fetchStats()]);
  }, [fetchReports, fetchStats]);

  const refetchAfterPostDelete = useCallback(async () => {
    // Tras borrar un post el listado de posts también cambia.
    await Promise.all([fetchPosts(1), fetchReports(), fetchStats()]);
  }, [fetchPosts, fetchReports, fetchStats]);

  const handleDeleteReportedContent = useCallback(
    async (report: ContentReportItem) => {
      if (!appId || !token) return;
      // Ramificado por targetType. La firma de Fase 0 recibe el report entero,
      // así que el ramificado vive aquí, no en ModerationQueue.
      if (report.targetType === 'social_post') {
        await deleteSocialPost(appId, report.targetId, token);
      } else if (report.targetType === 'social_comment') {
        await moderateDeleteSocialComment(appId, report.targetId, token);
      } else {
        // Defensa: no debería llegar tras el filtro server-side. Throw para
        // que onActionError lo capture y muestre en el banner del Shell.
        throw new Error(
          `Tipo de contenido reportado no soportado: ${report.targetType}`,
        );
      }
      // Backend (commit 4088b79) hace updateMany de reports en su
      // $transaction. Solo refetchamos para reflejar el nuevo estado.
      await refetchAfterPostDelete();
    },
    [appId, token, refetchAfterPostDelete],
  );

  return (
    <DataAdminShell
      title="Moderación del muro"
      description="Modera publicaciones, comentarios y atiende los reportes de los usuarios."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
      statsCards={stats && <SocialStatsCards stats={stats} />}
    >
      <ModerationQueue<SocialPostItem, ContentReportItem>
        reports={reports}
        getReportId={(r) => r.id}
        getReportTypeLabel={getReportTypeLabel}
        posts={posts}
        postsTotal={postsTotal}
        getPostId={(p) => p.id}
        renderPostCell={(post, actions) => (
          <SocialPostCard post={post} actions={actions} />
        )}
        postsLayout="list"
        postsLoading={postsLoading}
        loadMore={handleLoadMore}
        onDeletePost={async (post) => {
          if (!appId || !token) return;
          await deleteSocialPost(appId, post.id, token);
          await refetchAfterPostDelete();
        }}
        onResolveReport={async (report) => {
          if (!appId || !token) return;
          await resolveSocialReport(appId, report.id, token);
          await refetchAfterAction();
        }}
        onDeleteReportedContent={handleDeleteReportedContent}
        onActionError={(err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al procesar la acción.',
          );
        }}
      />
    </DataAdminShell>
  );
};
