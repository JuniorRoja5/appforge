import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Heart, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { resolveAssetUrl } from '../lib/resolve-asset-url';
import {
  getFanPosts,
  getFanWallStats,
  getSocialReports,
  resolveSocialReport,
  deleteFanPost,
  type FanPostItem,
  type ContentReportItem,
} from '../lib/api';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import {
  ModerationQueue,
  type PostActions,
} from '../components/admin/ModerationQueue';
import { StatCardCell } from '../components/admin/StatCardCell';

interface FanStats {
  totalPosts: number;
  totalLikes: number;
  pendingReports: number;
}

/**
 * Copy humano por targetType (gate #5). Tras el filtro server-side
 * targetType=fan_post no debería llegar otro tipo a esta página; el default
 * ofrece copy razonable por si un nuevo tipo se añade en el futuro sin que
 * esta página lo conozca aún.
 */
const getReportTypeLabel = (r: ContentReportItem): string => {
  if (r.targetType === 'fan_post') return 'Foto reportada';
  return 'Contenido reportado';
};

const FanStatsCards: FC<{ stats: FanStats }> = ({ stats }) => (
  <div className="grid grid-cols-3 gap-3">
    <StatCardCell
      icon={<Camera size={14} />}
      label="Fotos"
      value={stats.totalPosts}
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

const FanPostCell: FC<{
  post: FanPostItem;
  actions: PostActions;
}> = ({ post, actions }) => (
  <div className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100">
    <img
      src={resolveAssetUrl(post.imageUrl)}
      alt=""
      className="w-full h-full object-cover"
    />
    {/* Overlay hover con el botón delete que ModerationQueue construye y
        nos pasa. Patrón clonado del fan-wall.module.tsx residual (sección
        Moderación original) para que la transición a página dedicada
        preserve la familiaridad visual. */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
      {actions.deleteButton}
    </div>
    {/* Badge likes inferior izquierda siempre visible — sin él, cada foto
        es solo un cuadrado sin contexto. */}
    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/50 rounded px-1 py-0.5">
      <Heart size={8} className="text-white" />
      <span className="text-[9px] text-white">{post.likesCount}</span>
    </div>
  </div>
);

export const FanWallModerationPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [posts, setPosts] = useState<FanPostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [stats, setStats] = useState<FanStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (page: number) => {
      if (!appId || !token) return;
      const res = await getFanPosts(appId, token, page);
      if (page === 1) setPosts(res.data);
      else setPosts((prev) => [...prev, ...res.data]);
      setPostsTotal(res.total);
      setPostsPage(page);
    },
    [appId, token],
  );

  const fetchReports = useCallback(async () => {
    if (!appId || !token) return;
    // Filtro server-side de Fase 1.3a: solo fan_post. Reemplaza el filter
    // client-side del fan-wall.module.tsx original (L126):
    //   setReports(r.filter((rep) => rep.targetType === 'fan_post'))
    // El backend ya hace el trabajo.
    const r = await getSocialReports(appId, token, ['fan_post']);
    setReports(r);
  }, [appId, token]);

  const fetchStats = useCallback(async () => {
    if (!appId || !token) return;
    try {
      setStats(await getFanWallStats(appId, token));
    } catch (err) {
      // Stats secundarias: si fallan las cards no se renderizan pero la
      // página sobrevive. No silencioso: deja rastro en consola.
      // eslint-disable-next-line no-console
      console.error('[FanWallModerationPage] stats fetch failed:', err);
    }
  }, [appId, token]);

  // Carga inicial paralelo. Gate #2: loading={initialLoading} solo aquí.
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
      setError(err instanceof Error ? err.message : 'Error al cargar más fotos.');
    } finally {
      setPostsLoading(false);
    }
  }, [fetchPosts, postsPage, postsLoading]);

  const refetchAfterAction = useCallback(async () => {
    await Promise.all([fetchReports(), fetchStats()]);
  }, [fetchReports, fetchStats]);

  const refetchAfterPostDelete = useCallback(async () => {
    await Promise.all([fetchPosts(1), fetchReports(), fetchStats()]);
  }, [fetchPosts, fetchReports, fetchStats]);

  const handleDeleteReportedContent = useCallback(
    async (report: ContentReportItem) => {
      if (!appId || !token) return;
      // Defensa: tras el filtro server-side ['fan_post'] no debería llegar
      // otro tipo. NO hay ramificado como en social (que ramificaba entre
      // social_post y social_comment) — fan solo tiene un tipo reportable.
      if (report.targetType !== 'fan_post') {
        throw new Error(
          `Tipo de contenido reportado no soportado: ${report.targetType}`,
        );
      }
      await deleteFanPost(appId, report.targetId, token);
      // Backend (commit 42c216c moderateDeletePost de fan-wall, validado en
      // smoke de 1.4a) hace cascada $transaction(delete + updateMany
      // resolved:true). Solo refetchamos para reflejar.
      await refetchAfterPostDelete();
    },
    [appId, token, refetchAfterPostDelete],
  );

  return (
    <DataAdminShell
      title="Moderación del fan wall"
      description="Modera las fotos subidas por los usuarios y atiende los reportes."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
      statsCards={stats && <FanStatsCards stats={stats} />}
    >
      <ModerationQueue<FanPostItem, ContentReportItem>
        reports={reports}
        getReportId={(r) => r.id}
        getReportTypeLabel={getReportTypeLabel}
        posts={posts}
        postsTotal={postsTotal}
        getPostId={(p) => p.id}
        renderPostCell={(post, actions) => (
          <FanPostCell post={post} actions={actions} />
        )}
        postsLayout="grid"
        postsLoading={postsLoading}
        loadMore={handleLoadMore}
        onDeletePost={async (post) => {
          if (!appId || !token) return;
          await deleteFanPost(appId, post.id, token);
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
