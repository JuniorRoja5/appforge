import React from 'react';
import { registerRuntimeModule } from '../registry';

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

interface VideoItem {
  id?: string;
  url: string;
  title?: string;
}

const VideoRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? '';
  const videos = (data.videos as VideoItem[]) ?? [];
  const layout = (data.layout as string) ?? 'grid';
  const columns = (data.columns as number) ?? 1;
  const bgColor = (data.backgroundColor as string) || '';
  const titleColor = (data.titleColor as string) || '';
  const descriptionColor = (data.descriptionColor as string) || '';

  // Backwards compat: if builder saved single url instead of videos array
  const singleUrl = (data.url as string) ?? '';
  const videoList = videos.length > 0 ? videos : singleUrl ? [{ url: singleUrl, title: '' }] : [];

  if (videoList.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        No hay videos configurados.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor || undefined }}>
      {title && (
        <h3 className="text-lg font-semibold mb-3" style={{ color: titleColor || 'var(--color-text-primary)' }}>{title}</h3>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: layout === 'list' ? '1fr' : `repeat(${columns}, 1fr)`,
          gap: 12,
        }}
      >
        {videoList.map((vid, i) => {
          const embedUrl = getEmbedUrl(vid.url);
          return (
            <div key={vid.id ?? i} style={{ borderRadius: 'var(--radius-card, 12px)', overflow: 'hidden' }}>
              {vid.title && (
                <p className="text-sm font-medium mb-1" style={{ color: descriptionColor || 'var(--color-text-primary)' }}>{vid.title}</p>
              )}
              {embedUrl ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none', borderRadius: 'var(--radius-card, 12px)' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video src={vid.url} controls className="w-full" style={{ borderRadius: 'var(--radius-card, 12px)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

registerRuntimeModule({ id: 'video', Component: VideoRuntime });
