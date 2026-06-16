import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Camera, Heart,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { getFanWallStats } from '../../lib/api';

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
  // stats reducido — solo se usa para el badge del botón "Administrar fan
  // wall". La página dedicada (FanWallModerationPage) fetcha sus propias
  // stats completas (totalPosts + totalLikes + pendingReports). Aquí solo
  // necesitamos pendingReports.
  const [stats, setStats] = useState<{
    pendingReports: number;
  } | null>(null);
  const [configOpen, setConfigOpen] = useState(true);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    getFanWallStats(data.appId, token)
      .then((s) => {
        if (!cancelled) setStats({ pendingReports: s.pendingReports });
      })
      .catch((err) => {
        // No silencioso: deja rastro en consola. El badge no aparece si stats
        // falla (stats queda null), la configuración del fan wall sigue
        // funcionando.
        // eslint-disable-next-line no-console
        console.error('[FanWallSettingsPanel] stats fetch failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [data.appId, token, data._refreshKey]);

  return (
    <div className="space-y-4">
      {/* Administrar fan wall — página dedicada */}
      {data.appId && (
        <Link
          to={`/apps/${data.appId}/fan-wall`}
          className="flex items-center justify-between gap-2 w-full bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors rounded-lg px-3 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2 text-primary font-medium">
            <Camera size={16} />
            Administrar fan wall
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
