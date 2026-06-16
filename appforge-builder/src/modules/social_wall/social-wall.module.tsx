import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  MessageSquare, Heart,
  ChevronDown, ChevronUp,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocialWallStats } from '../../lib/api';

// --- Zod schema ---
const displayModes = ['default', 'fullwidth'] as const;
const postLayouts = ['list', 'cards', 'compact'] as const;

const SocialWallConfigSchema = z.object({
  enabled: z.boolean(),
  allowImages: z.boolean(),
  title: z.string().default('Social Wall'),
  backgroundColor: z.string().default('#f9fafb'),
  headerColor: z.string().default(''),
  textColor: z.string().default('#1f2937'),
  displayMode: z.enum(displayModes).default('default'),
  postLayout: z.enum(postLayouts).default('list'),
  showHeader: z.boolean().default(true),
  postsPerPage: z.number().min(3).max(50).default(10),
  allowComments: z.boolean().default(true),
  allowLikes: z.boolean().default(true),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type SocialWallConfig = z.infer<typeof SocialWallConfigSchema>;

// --- Preview Component ---
const MOCK_POSTS = [
  { author: 'Ana García', avatar: '👩', content: '¡Me encantó el evento de hoy! La pasé genial 🎉', likes: 12, comments: 3, hasImage: false },
  { author: 'Carlos López', avatar: '👨', content: 'Increíble experiencia, volvería sin dudarlo', likes: 8, comments: 1, hasImage: true },
  { author: 'María Torres', avatar: '👩‍🦰', content: '¡Gracias por la atención! Todo perfecto', likes: 5, comments: 0, hasImage: false },
];

const PreviewComponent: React.FC<{ data: SocialWallConfig; isSelected: boolean }> = ({
  data,
  isSelected,
}) => {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<{ totalPosts: number; totalComments: number; totalLikes: number } | null>(null);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getSocialWallStats(data.appId!, token);
        if (!cancelled) setStats(s);
      } catch { /* fallback to mock */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const isFullWidth = data.displayMode === 'fullwidth';
  const layout = data.postLayout || 'list';
  const showHeader = data.showHeader !== false;
  const showLikes = data.allowLikes !== false;
  const showComments = data.allowComments !== false;

  const wrapperCls = [
    'h-full flex flex-col',
    isSelected ? 'ring-2 ring-indigo-400 ring-inset rounded-lg' : '',
  ].filter(Boolean).join(' ');

  const renderPost = (post: typeof MOCK_POSTS[0], i: number) => {
    if (layout === 'compact') {
      return (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span className="text-sm shrink-0">{post.avatar}</span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium" style={{ color: data.textColor || '#1f2937' }}>{post.author}: </span>
            <span className="text-[9px]" style={{ color: data.textColor || '#1f2937', opacity: 0.8 }}>{post.content}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400 shrink-0">
            {showLikes && <span className="flex items-center gap-0.5"><Heart size={8} /> {post.likes}</span>}
            {showComments && <span className="flex items-center gap-0.5"><MessageSquare size={8} /> {post.comments}</span>}
          </div>
        </div>
      );
    }

    if (layout === 'cards') {
      return (
        <div key={i} className={`bg-white shadow-sm overflow-hidden ${isFullWidth ? 'border-b border-gray-100' : 'rounded-xl border border-gray-100 mx-0'}`}>
          {post.hasImage && (
            <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-20 flex items-center justify-center">
              <span className="text-[10px] text-gray-400">📷 Imagen</span>
            </div>
          )}
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{post.avatar}</span>
              <span className="text-[10px] font-semibold" style={{ color: data.textColor || '#1f2937' }}>{post.author}</span>
            </div>
            <p className="text-[9px] leading-relaxed mb-2" style={{ color: data.textColor || '#1f2937', opacity: 0.8 }}>{post.content}</p>
            <div className="flex items-center gap-3 text-[9px] text-gray-400 pt-1.5 border-t border-gray-100">
              {showLikes && <span className="flex items-center gap-0.5"><Heart size={9} /> {post.likes}</span>}
              {showComments && <span className="flex items-center gap-0.5"><MessageSquare size={9} /> {post.comments}</span>}
            </div>
          </div>
        </div>
      );
    }

    // Default: list layout
    return (
      <div key={i} className={`bg-white p-2.5 shadow-sm ${isFullWidth ? 'border-b border-gray-100' : 'rounded-lg mx-0'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{post.avatar}</span>
          <span className="text-[10px] font-medium" style={{ color: data.textColor || '#1f2937' }}>{post.author}</span>
        </div>
        <p className="text-[9px] leading-tight mb-1.5" style={{ color: data.textColor || '#1f2937', opacity: 0.8 }}>{post.content}</p>
        {post.hasImage && (
          <div className={`bg-gray-200 h-12 mb-1.5 flex items-center justify-center ${isFullWidth ? '' : 'rounded'}`}>
            <span className="text-[8px] text-gray-400">📷 Imagen</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[9px] text-gray-400">
          {showLikes && <span className="flex items-center gap-0.5"><Heart size={8} /> {post.likes}</span>}
          {showComments && <span className="flex items-center gap-0.5"><MessageSquare size={8} /> {post.comments}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className={wrapperCls}>
      {showHeader && (
        <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: data.headerColor || 'linear-gradient(to right, var(--af-color-primary, #3b82f6), var(--af-color-secondary, #0891b2))' }}>
          <MessageSquare size={16} className="text-white" />
          <span className="text-white text-xs font-semibold">{data.title || 'Social Wall'}</span>
          {stats && (
            <span className="ml-auto text-white/80 text-[10px]">{stats.totalPosts} posts</span>
          )}
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto relative ${
          layout === 'compact' ? '' : isFullWidth ? 'px-0 py-1' : 'p-2'
        } ${layout === 'cards' ? 'space-y-3' : layout === 'compact' ? '' : 'space-y-2'}`}
        style={{ backgroundColor: data.backgroundColor || '#f9fafb' }}
      >
        {/* Banda informativa: aclara que el contenido es generado por end-users */}
        <div className="sticky top-1.5 mx-1.5 z-10 bg-white/85 backdrop-blur-[2px] border border-gray-200 rounded-md px-2 py-1.5 shadow-sm mb-1.5">
          <p className="text-[9px] text-gray-700 leading-tight text-center">
            <span className="font-semibold">Vista previa.</span> Los usuarios de tu app publicarán aquí.
          </p>
        </div>

        {MOCK_POSTS.map(renderPost)}
      </div>
    </div>
  );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: SocialWallConfig; onChange: (d: SocialWallConfig) => void }> = ({
  data,
  onChange,
}) => {
  const token = useAuthStore((s) => s.token);
  // stats reducido — solo se usa para el badge del botón "Administrar muro".
  // La página dedicada (SocialWallModerationPage) fetcha sus propias stats
  // completas. Aquí solo necesitamos pendingReports.
  const [stats, setStats] = useState<{
    pendingReports: number;
  } | null>(null);
  const [configOpen, setConfigOpen] = useState(true);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    getSocialWallStats(data.appId, token)
      .then((s) => {
        if (!cancelled) setStats({ pendingReports: s.pendingReports });
      })
      .catch((err) => {
        // No silencioso: deja rastro en consola. El badge no aparece si stats
        // falla (stats queda null), la configuración del muro sigue funcionando.
        // eslint-disable-next-line no-console
        console.error('[SocialWallSettingsPanel] stats fetch failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [data.appId, token, data._refreshKey]);

  return (
    <div className="space-y-4">
      {/* Administrar muro — página dedicada */}
      {data.appId && (
        <Link
          to={`/apps/${data.appId}/social`}
          className="flex items-center justify-between gap-2 w-full bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors rounded-lg px-3 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2 text-primary font-medium">
            <Shield size={16} />
            Administrar muro
          </span>
          {stats && stats.pendingReports > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {stats.pendingReports}
            </span>
          )}
        </Link>
      )}

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
              <input type="checkbox" checked={data.enabled} onChange={(e) => onChange({ ...data, enabled: e.target.checked })} className="w-4 h-4 rounded text-primary" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permitir imágenes</span>
              <input type="checkbox" checked={data.allowImages} onChange={(e) => onChange({ ...data, allowImages: e.target.checked })} className="w-4 h-4 rounded text-primary" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permitir likes</span>
              <input type="checkbox" checked={data.allowLikes !== false} onChange={(e) => onChange({ ...data, allowLikes: e.target.checked })} className="w-4 h-4 rounded text-primary" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permitir comentarios</span>
              <input type="checkbox" checked={data.allowComments !== false} onChange={(e) => onChange({ ...data, allowComments: e.target.checked })} className="w-4 h-4 rounded text-primary" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mostrar encabezado</span>
              <input type="checkbox" checked={data.showHeader !== false} onChange={(e) => onChange({ ...data, showHeader: e.target.checked })} className="w-4 h-4 rounded text-primary" />
            </label>

            <hr className="border-gray-100" />

            {/* Display Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Tamaño de visualización</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'default', label: 'Por defecto', desc: 'Con márgenes' },
                  { value: 'fullwidth', label: 'Ancho completo', desc: 'Borde a borde' },
                ] .map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, displayMode: opt.value as 'default' | 'fullwidth' })}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      (data.displayMode || 'default') === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-semibold text-gray-700 block">{opt.label}</span>
                    <span className="text-[10px] text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Post Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Diseño de posts</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'list', label: 'Lista', icon: '☰' },
                  { value: 'cards', label: 'Tarjetas', icon: '▢' },
                  { value: 'compact', label: 'Compacto', icon: '≡' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, postLayout: opt.value as 'list' | 'cards' | 'compact' })}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${
                      (data.postLayout || 'list') === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg block">{opt.icon}</span>
                    <span className="text-[10px] font-medium text-gray-600">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Posts per page */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Posts por página</label>
              <input
                type="number"
                min={3}
                max={50}
                value={data.postsPerPage ?? 10}
                onChange={(e) => onChange({ ...data, postsPerPage: parseInt(e.target.value) || 10 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
            </div>

            <hr className="border-gray-100" />

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Título</label>
              <input
                type="text"
                value={data.title ?? 'Social Wall'}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
                placeholder="Social Wall"
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
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-primary focus:border-primary"
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
                  value={data.headerColor || '#3b82f6'}
                  onChange={(e) => onChange({ ...data, headerColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.headerColor ?? ''}
                  onChange={(e) => onChange({ ...data, headerColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-primary focus:border-primary"
                  placeholder="Vacío = gradiente del tema"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Dejar vacío para usar el gradiente del tema</p>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Color de texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.textColor || '#1f2937'}
                  onChange={(e) => onChange({ ...data, textColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.textColor ?? '#1f2937'}
                  onChange={(e) => onChange({ ...data, textColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-primary focus:border-primary"
                  placeholder="#1f2937"
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

// --- Runtime Component (placeholder) ---
const RuntimeComponent: React.FC<{ data: SocialWallConfig }> = () => (
  <div className="p-4 text-center text-gray-500 text-sm">Social Wall se renderiza en la app generada</div>
);

// --- Module Definition ---
export const SocialWallModule: ModuleDefinition<SocialWallConfig> = {
  id: 'social_wall',
  name: 'Social Wall',
  icon: <MessageSquare size={20} />,
  description: 'Muro de publicaciones con likes y comentarios',
  schema: SocialWallConfigSchema,
  defaultConfig: {
    enabled: true,
    allowImages: true,
    title: 'Social Wall',
    backgroundColor: '#f9fafb',
    headerColor: '',
    textColor: '#1f2937',
    displayMode: 'default',
    postLayout: 'list',
    showHeader: true,
    postsPerPage: 10,
    allowComments: true,
    allowLikes: true,
  },
  PreviewComponent,
  SettingsPanel,
  RuntimeComponent,
};
