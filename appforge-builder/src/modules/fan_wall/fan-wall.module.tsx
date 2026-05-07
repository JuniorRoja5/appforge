import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Camera, Heart, Trash2, Loader2,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Flag,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import {
  getFanPosts,
  getFanWallStats,
  getSocialReports,
  resolveSocialReport,
  deleteFanPost,
  type FanPostItem,
  type ContentReportItem,
} from '../../lib/api';

// --- Zod schema ---
const FanWallConfigSchema = z.object({
  enabled: z.boolean(),
  title: z.string().default('Fan Wall'),
  backgroundColor: z.string().default('#f9fafb'),
  headerColor: z.string().default(''),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type FanWallConfig = z.infer<typeof FanWallConfigSchema>;

// --- Preview Component ---
const MOCK_PHOTOS = [
  { likes: 24, color: 'bg-pink-200' },
  { likes: 18, color: 'bg-blue-200' },
  { likes: 31, color: 'bg-green-200' },
  { likes: 12, color: 'bg-yellow-200' },
];

const PreviewComponent: React.FC<{ data: FanWallConfig; isSelected: boolean }> = ({
  data,
  isSelected,
}) => {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<{ totalPosts: number; totalLikes: number } | null>(null);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getFanWallStats(data.appId!, token);
        if (!cancelled) setStats(s);
      } catch { /* fallback to mock */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  return (
    <div className={`h-full flex flex-col ${isSelected ? 'ring-2 ring-indigo-400 ring-inset rounded-lg' : ''}`}>
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: data.headerColor || 'linear-gradient(to right, var(--af-color-primary, #ec4899), var(--af-color-secondary, #e11d48))' }}>
        <Camera size={16} className="text-white" />
        <span className="text-white text-xs font-semibold">{data.title || 'Fan Wall'}</span>
        {stats && (
          <span className="ml-auto text-white/80 text-[10px]">{stats.totalPosts} fotos</span>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-1.5 relative" style={{ backgroundColor: data.backgroundColor || '#f9fafb' }}>
        {/* Banda informativa: aclara que el contenido es generado por end-users */}
        <div className="absolute inset-x-1.5 top-1.5 z-10 bg-white/85 backdrop-blur-[2px] border border-gray-200 rounded-md px-2 py-1.5 shadow-sm">
          <p className="text-[9px] text-gray-700 leading-tight text-center">
            <span className="font-semibold">Vista previa.</span> Los usuarios de tu app subirán fotos aquí.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 h-full">
          {MOCK_PHOTOS.map((photo, i) => (
            <div key={i} className={`${photo.color} rounded-lg relative flex items-end justify-start p-1.5`}>
              <div className="flex items-center gap-0.5 bg-black/30 rounded px-1 py-0.5">
                <Heart size={8} className="text-white fill-white" />
                <span className="text-[8px] text-white font-medium">{photo.likes}</span>
              </div>
              <Camera size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: FanWallConfig; onChange: (d: FanWallConfig) => void }> = ({
  data,
  onChange,
}) => {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<{ totalPosts: number; totalLikes: number; pendingReports: number } | null>(null);
  const [posts, setPosts] = useState<FanPostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const loadData = useCallback(async (page = 1) => {
    if (!data.appId || !token) return;
    setLoading(true);
    try {
      const [s, p, r] = await Promise.all([
        getFanWallStats(data.appId, token),
        getFanPosts(data.appId, token, page),
        getSocialReports(data.appId, token),
      ]);
      setStats(s);
      if (page === 1) {
        setPosts(p.data);
      } else {
        setPosts((prev) => [...prev, ...p.data]);
      }
      setPostsTotal(p.total);
      setPostsPage(page);
      setReports(r.filter((rep) => rep.targetType === 'fan_post'));
    } catch { /* ignore */ }
    setLoading(false);
  }, [data.appId, token]);

  useEffect(() => { loadData(1); }, [loadData, data._refreshKey]);

  const handleDeletePost = async (postId: string) => {
    if (!data.appId || !token || !confirm('¿Eliminar esta foto?')) return;
    try {
      await deleteFanPost(data.appId, postId, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPostsTotal((t) => t - 1);
      onChange({ ...data, _refreshKey: Date.now() });
    } catch { /* ignore */ }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!data.appId || !token) return;
    try {
      await resolveSocialReport(data.appId, reportId, token);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Configuración */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setConfigOpen(!configOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-sm font-semibold text-gray-700">Configuración</span>
          {configOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {configOpen && (
          <div className="p-4 space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Módulo activo</span>
              <input type="checkbox" checked={data.enabled} onChange={(e) => onChange({ ...data, enabled: e.target.checked })} className="w-4 h-4 rounded text-pink-500" />
            </label>

            <hr className="border-gray-100" />

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Título</label>
              <input
                type="text"
                value={data.title ?? 'Fan Wall'}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-pink-500 focus:border-pink-500"
                placeholder="Fan Wall"
              />
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Color de fondo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.backgroundColor || '#f9fafb'}
                  onChange={(e) => onChange({ ...data, backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.backgroundColor ?? '#f9fafb'}
                  onChange={(e) => onChange({ ...data, backgroundColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-pink-500 focus:border-pink-500"
                  placeholder="#f9fafb"
                />
              </div>
            </div>

            {/* Header Color */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Color de encabezado</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.headerColor || '#ec4899'}
                  onChange={(e) => onChange({ ...data, headerColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.headerColor ?? ''}
                  onChange={(e) => onChange({ ...data, headerColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Vacío = gradiente del tema"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Dejar vacío para usar el gradiente del tema</p>
            </div>
          </div>
        )}
      </div>

      {/* Moderación */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setModerationOpen(!moderationOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-sm font-semibold text-gray-700">Moderación</span>
          {moderationOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {moderationOpen && (
          <div className="p-4 space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Fotos', value: stats.totalPosts, icon: Camera },
                  { label: 'Likes', value: stats.totalLikes, icon: Heart },
                  { label: 'Reportes', value: stats.pendingReports, icon: AlertTriangle },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <Icon size={14} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Photo grid */}
            {!data.appId ? (
              <p className="text-xs text-gray-400 text-center py-4">Guarda la app para ver las fotos</p>
            ) : loading && posts.length === 0 ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : posts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin fotos aún</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {posts.map((post) => (
                    <div key={post.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={resolveAssetUrl(post.imageUrl)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button onClick={() => handleDeletePost(post.id)} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/50 rounded px-1 py-0.5">
                        <Heart size={8} className="text-white" />
                        <span className="text-[9px] text-white">{post.likesCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {posts.length < postsTotal && (
                  <button onClick={() => loadData(postsPage + 1)} disabled={loading} className="w-full py-2 text-xs text-pink-600 hover:text-pink-700 font-medium disabled:opacity-50">
                    {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Cargar más'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reportes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setReportsOpen(!reportsOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Reportes</span>
            {reports.length > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reports.length}</span>
            )}
          </div>
          {reportsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {reportsOpen && (
          <div className="p-4">
            {reports.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin reportes pendientes</p>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          <Flag size={10} className="inline text-orange-500 mr-1" />
                          Foto reportada
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Por: {report.appUser.email}</p>
                        {report.reason && <p className="text-[10px] text-gray-500 mt-0.5 italic">"{report.reason}"</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDeletePost(report.targetId)} className="p-1 text-red-400 hover:text-red-600" title="Eliminar foto">
                          <Trash2 size={12} />
                        </button>
                        <button onClick={() => handleResolveReport(report.id)} className="p-1 text-green-500 hover:text-green-700" title="Resolver">
                          <CheckCircle size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component (placeholder) ---
const RuntimeComponent: React.FC<{ data: FanWallConfig }> = () => (
  <div className="p-4 text-center text-gray-500 text-sm">Fan Wall se renderiza en la app generada</div>
);

// --- Module Definition ---
export const FanWallModule: ModuleDefinition<FanWallConfig> = {
  id: 'fan_wall',
  name: 'Fan Wall',
  icon: <Camera size={20} />,
  description: 'Muro de fotos estilo Instagram con likes',
  schema: FanWallConfigSchema,
  defaultConfig: {
    enabled: true,
    title: 'Fan Wall',
    backgroundColor: '#f9fafb',
    headerColor: '',
  },
  PreviewComponent,
  SettingsPanel,
  RuntimeComponent,
};
