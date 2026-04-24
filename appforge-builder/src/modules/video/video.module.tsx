import React, { useState } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import { Play, Plus, Trash2, Video as VideoIcon, Grid } from 'lucide-react';

// --- Zod schema ---
const VideoItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
});

const VideoConfigSchema = z.object({
  title: z.string(),
  videos: z.array(VideoItemSchema),
  layout: z.enum(['single', 'grid']),
  columns: z.number().min(1).max(2),
  backgroundColor: z.string().default('#ffffff'),
  titleColor: z.string().default('#1f2937'),
  descriptionColor: z.string().default('#6b7280'),
});

export type VideoConfig = z.infer<typeof VideoConfigSchema>;
type VideoItem = z.infer<typeof VideoItemSchema>;

// --- Helpers ---
/**
 * Extract YouTube video ID from various URL formats.
 */
const extractYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
};

/**
 * Extract Vimeo video ID from URL.
 */
const extractVimeoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
};

/**
 * Returns thumbnail URL or null if not a recognized platform.
 */
const getThumbnailUrl = (url: string): string | null => {
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  // Vimeo requires an API call for thumbnails; we return null to show placeholder
  return null;
};

/**
 * Determines video platform from URL.
 */
const getVideoPlatform = (url: string): 'youtube' | 'vimeo' | 'direct' | 'unknown' => {
  if (extractYouTubeId(url)) return 'youtube';
  if (extractVimeoId(url)) return 'vimeo';
  if (isDirectVideoUrl(url)) return 'direct';
  return 'unknown';
};

/**
 * Check whether the URL points to a direct video file (.mp4, .webm, .ogg).
 */
const isDirectVideoUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|ogg)$/.test(pathname);
  } catch {
    return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  }
};

// --- Video Thumbnail Card (kept for fallback when embedding isn't possible) ---
const VideoThumbnail: React.FC<{ video: VideoItem; compact?: boolean }> = ({ video, compact }) => {
  const thumbnail = getThumbnailUrl(video.url);
  const platform = getVideoPlatform(video.url);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Thumbnail or placeholder */}
      {thumbnail ? (
        <div className="relative w-full aspect-video">
          <img
            src={thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="relative w-full aspect-video flex items-center justify-center"
          style={{
            background: platform === 'vimeo'
              ? 'linear-gradient(135deg, #1ab7ea 0%, #0e71c8 100%)'
              : 'linear-gradient(135deg, #374151 0%, #111827 100%)',
          }}
        >
          <VideoIcon size={compact ? 20 : 28} className="text-white/40" />
        </div>
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full backdrop-blur-sm transition-transform group-hover:scale-110"
          style={{
            width: compact ? '32px' : '44px',
            height: compact ? '32px' : '44px',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            border: '2px solid rgba(255, 255, 255, 0.7)',
          }}
        >
          <Play
            size={compact ? 14 : 20}
            className="text-white ml-0.5"
            fill="white"
          />
        </div>
      </div>

      {/* Gradient scrim at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
        <p className={`text-white font-medium truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {video.title}
        </p>
        {!compact && (
          <p className="text-[8px] text-white/60 capitalize">{platform}</p>
        )}
      </div>
    </div>
  );
};

// --- Video Embed (actual playable player) ---
const VideoEmbed: React.FC<{ video: VideoItem; compact?: boolean }> = ({ video, compact }) => {
  const ytId = extractYouTubeId(video.url);
  const vimeoId = extractVimeoId(video.url);
  const isDirect = isDirectVideoUrl(video.url);

  const titleSize = compact ? 'text-[9px]' : 'text-[10px]';

  const renderPlayer = () => {
    if (ytId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title={video.title}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ border: 'none' }}
        />
      );
    }
    if (vimeoId) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={video.title}
          className="w-full aspect-video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ border: 'none' }}
        />
      );
    }
    if (isDirect) {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={video.url}
          controls
          className="w-full aspect-video bg-black"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      );
    }
    // Fallback: unrecognized URL - show thumbnail with link
    return null;
  };

  const player = renderPlayer();

  if (!player) {
    // Cannot embed; fall back to thumbnail that opens in new tab
    return <VideoThumbnail video={video} compact={compact} />;
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm">
      {player}
      <div
        className="px-2 py-1.5"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.04), transparent)' }}
      >
        <p className={`font-medium truncate text-gray-800 ${titleSize}`}>{video.title}</p>
        {!compact && (
          <p className="text-[8px] text-gray-400 capitalize">{getVideoPlatform(video.url)}</p>
        )}
      </div>
    </div>
  );
};

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: VideoConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const hasVideos = data.videos.length > 0;
  const isSingle = data.layout === 'single';
  const cols = isSingle ? 1 : data.columns;
  const bgColor = data.backgroundColor || '#ffffff';
  const titleColor = data.titleColor || '#1f2937';
  const descColor = data.descriptionColor || '#6b7280';

  // Clamp featured index if videos were removed
  const safeFeaturedIndex = Math.min(featuredIndex, data.videos.length - 1);
  const featuredVideo = hasVideos ? data.videos[Math.max(0, safeFeaturedIndex)] : null;
  const secondaryVideos = hasVideos
    ? data.videos.filter((_, i) => i !== Math.max(0, safeFeaturedIndex))
    : [];

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: bgColor }}>
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(to right, var(--af-color-primary, #7c3aed), var(--af-color-primary, #7c3aed)cc)',
          }}
        >
          <Play size={12} className="text-white" />
          <span className="text-white text-xs font-bold">{data.title || 'VIDEOS'}</span>
          {hasVideos && (
            <span className="ml-auto text-white/70 text-[9px]">
              {data.videos.length} video{data.videos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!hasVideos ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: descColor }}>
            <VideoIcon size={24} className="mb-1.5 opacity-40" />
            <p className="text-[10px]">Agrega videos en la configuracion</p>
          </div>
        ) : isSingle ? (
          /* Single layout: featured embed + clickable secondary list */
          <div className="p-2">
            {/* Featured video: actual playable embed */}
            {featuredVideo && <VideoEmbed video={featuredVideo} />}

            {/* Secondary videos: clickable list to switch featured */}
            {secondaryVideos.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {secondaryVideos.map(v => {
                  const originalIndex = data.videos.findIndex(dv => dv.id === v.id);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                      style={{ backgroundColor: bgColor === '#ffffff' ? '#f9fafb' : `${bgColor}ee` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex(originalIndex);
                      }}
                    >
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 relative">
                        {getThumbnailUrl(v.url) ? (
                          <img
                            src={getThumbnailUrl(v.url)!}
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              background: getVideoPlatform(v.url) === 'vimeo'
                                ? 'linear-gradient(135deg, #1ab7ea, #0e71c8)'
                                : 'linear-gradient(135deg, #374151, #111827)',
                            }}
                          >
                            <VideoIcon size={10} className="text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play size={8} className="text-white ml-px" fill="white" />
                        </div>
                      </div>
                      <span className="text-[10px] font-medium truncate" style={{ color: titleColor }}>{v.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Grid layout: embed all videos directly */
          <div
            className="p-2 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {data.videos.map(v => (
              <VideoEmbed key={v.id} video={v} compact={cols === 2} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: VideoConfig }> = ({ data }) => (
  <div style={{ padding: '16px', backgroundColor: data.backgroundColor || '#ffffff' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: data.titleColor || '#1f2937' }}>Videos</h2>
    <p style={{ color: data.descriptionColor || '#6b7280', fontSize: '14px' }}>
      {data.videos.length} video{data.videos.length !== 1 ? 's' : ''} configurados
      ({data.layout === 'single' ? 'vista individual' : `cuadricula de ${data.columns} columnas`}).
      Se renderizaran dinamicamente en la app generada.
    </p>
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: VideoConfig; onChange: (data: VideoConfig) => void }> = ({ data, onChange }) => {
  const [configOpen, setConfigOpen] = useState(true);

  const addVideo = () => {
    const newVideo: VideoItem = {
      id: Date.now().toString(),
      url: 'https://www.youtube.com/watch?v=',
      title: 'Nuevo video',
    };
    onChange({ ...data, videos: [...data.videos, newVideo] });
  };

  const updateVideo = (id: string, updates: Partial<VideoItem>) => {
    onChange({
      ...data,
      videos: data.videos.map(v => (v.id === id ? { ...v, ...updates } : v)),
    });
  };

  const removeVideo = (id: string) => {
    onChange({ ...data, videos: data.videos.filter(v => v.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Configuration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800">Configuracion</span>
          <Grid size={16} className={`transition-transform ${configOpen ? 'rotate-0' : 'rotate-45'}`} />
        </button>
        {configOpen && (
          <div className="p-3 space-y-3">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
              <input
                type="text"
                value={data.title}
                onChange={e => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                placeholder="Nuestros Videos"
              />
            </div>

            {/* Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disposicion</label>
              <div className="flex gap-1">
                {([
                  { value: 'single' as const, label: 'Individual' },
                  { value: 'grid' as const, label: 'Cuadricula' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, layout: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.layout === opt.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Columns (only for grid) */}
            {data.layout === 'grid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Columnas</label>
                <div className="flex gap-1">
                  {[1, 2].map(n => (
                    <button
                      key={n}
                      onClick={() => onChange({ ...data, columns: n })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        data.columns === n
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color pickers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de fondo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.backgroundColor || '#ffffff'}
                  onChange={e => onChange({ ...data, backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.backgroundColor || '#ffffff'}
                  onChange={e => onChange({ ...data, backgroundColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-xs font-mono focus:ring-purple-500 focus:border-purple-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color del titulo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.titleColor || '#1f2937'}
                  onChange={e => onChange({ ...data, titleColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.titleColor || '#1f2937'}
                  onChange={e => onChange({ ...data, titleColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-xs font-mono focus:ring-purple-500 focus:border-purple-500"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de descripcion</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.descriptionColor || '#6b7280'}
                  onChange={e => onChange({ ...data, descriptionColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={data.descriptionColor || '#6b7280'}
                  onChange={e => onChange({ ...data, descriptionColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-xs font-mono focus:ring-purple-500 focus:border-purple-500"
                  placeholder="#6b7280"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Video list */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Videos</h3>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {data.videos.map(video => (
            <div key={video.id} className="border border-gray-200 rounded-lg bg-white p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Play size={12} className="text-purple-500" />
                  <span className="text-[10px] font-medium text-gray-500 uppercase">
                    {getVideoPlatform(video.url)}
                  </span>
                </div>
                <button
                  onClick={() => removeVideo(video.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar video"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Title */}
              <input
                type="text"
                value={video.title}
                onChange={e => updateVideo(video.id, { title: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                placeholder="Titulo del video"
              />

              {/* URL */}
              <input
                type="text"
                value={video.url}
                onChange={e => updateVideo(video.id, { url: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          ))}
        </div>

        <button
          onClick={addVideo}
          className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} /> Agregar Video
        </button>

        {data.videos.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">
            {data.videos.length} video{data.videos.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const VideoModule: ModuleDefinition<VideoConfig> = {
  id: 'video',
  name: 'Videos',
  description: 'Embeds de videos de YouTube y Vimeo',
  icon: <VideoIcon size={20} />,
  schema: VideoConfigSchema,
  defaultConfig: {
    title: 'Nuestros Videos',
    videos: [
      { id: '1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Video destacado' },
      { id: '2', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Segundo video' },
    ],
    layout: 'grid',
    columns: 2,
    backgroundColor: '#ffffff',
    titleColor: '#1f2937',
    descriptionColor: '#6b7280',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
