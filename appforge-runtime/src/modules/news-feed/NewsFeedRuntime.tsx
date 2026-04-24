import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getNews } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { sanitize } from '../../lib/sanitize';
import { registerRuntimeModule } from '../registry';
import { imgFallback } from '../../lib/img-fallback';

type Article = Awaited<ReturnType<typeof getNews>>[number];

const NewsFeedRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Noticias';
  const layout = (data.layout as string) ?? 'cards';
  const itemsToShow = (data.itemsToShow as number) ?? 50;
  const showImage = (data.showImage as boolean) ?? true;
  const showDate = (data.showDate as boolean) ?? true;
  const showExcerpt = (data.showExcerpt as boolean) ?? true;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Article | null>(null);

  useEffect(() => {
    getNews().then(setArticles).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCards />;

  const displayed = articles.slice(0, itemsToShow);

  // ── Article detail view ──
  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm font-medium mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
        {showImage && selected.imageUrl && (
          <img
            src={resolveAssetUrl(selected.imageUrl)}
            alt={selected.title}
            className="w-full h-48 object-cover mb-3"
            style={{ borderRadius: 'var(--radius-card, 16px)' }}
            onError={imgFallback}
          />
        )}
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {selected.title}
        </h3>
        {showDate && (
          <span className="text-xs block mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {new Date(selected.publishedAt).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        <div
          className="prose prose-sm max-w-none text-sm"
          style={{ color: 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: sanitize(selected.content) }}
        />
        {/* Video embed */}
        {(selected as any).videoUrl && <VideoEmbed url={(selected as any).videoUrl} />}
      </div>
    );
  }

  // ── List layout ──
  if (layout === 'list') {
    return (
      <div>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        {displayed.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No hay noticias disponibles.</p>
        ) : (
          <div className="space-y-1">
            {displayed.map((article) => (
              <div
                key={article.id}
                className="flex gap-3 py-2 cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-divider)' }}
                onClick={() => setSelected(article)}
              >
                {showImage && article.imageUrl && (
                  <img
                    src={resolveAssetUrl(article.imageUrl)}
                    alt={article.title}
                    className="w-14 h-14 object-cover shrink-0 rounded-lg"
                    onError={imgFallback}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>{article.title}</h4>
                  {showExcerpt && (
                    <div
                      className="text-xs line-clamp-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: sanitize(article.content) }}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {showDate && (
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(article.publishedAt).toLocaleDateString('es')}
                      </span>
                    )}
                    {(article as any).videoUrl && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>
                        Video
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Cards layout (default) ──
  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {displayed.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No hay noticias disponibles.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((article) => (
            <div
              key={article.id}
              className="overflow-hidden cursor-pointer"
              style={{ borderRadius: 'var(--radius-card, 16px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
              onClick={() => setSelected(article)}
            >
              {showImage && article.imageUrl && (
                <img src={resolveAssetUrl(article.imageUrl)} alt={article.title} className="w-full h-40 object-cover" onError={imgFallback} />
              )}
              <div style={{ padding: 'var(--spacing-card, 16px)' }}>
                <h4 className="font-semibold text-base mb-1" style={{ color: 'var(--color-text-primary)' }}>{article.title}</h4>
                {showExcerpt && (
                  <div
                    className="text-sm line-clamp-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                    dangerouslySetInnerHTML={{ __html: sanitize(article.content) }}
                  />
                )}
                <div className="flex items-center gap-2 mt-2">
                  {showDate && (
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(article.publishedAt).toLocaleDateString('es')}
                    </span>
                  )}
                  {(article as any).videoUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>
                      Video
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Video embed helper ──
const VideoEmbed: React.FC<{ url: string }> = ({ url }) => {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (youtubeMatch) {
    return (
      <div className="mt-3" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-card, 12px)', overflow: 'hidden' }}>
        <iframe src={`https://www.youtube.com/embed/${youtubeMatch[1]}`} className="w-full h-full" allowFullScreen style={{ border: 'none' }} />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="mt-3" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-card, 12px)', overflow: 'hidden' }}>
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen style={{ border: 'none' }} />
      </div>
    );
  }
  // Direct video URL
  return (
    <video controls className="w-full mt-3" style={{ borderRadius: 'var(--radius-card, 12px)' }}>
      <source src={url} />
    </video>
  );
};

const LoadingCards = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)', height: 120 }} />
    ))}
  </div>
);

registerRuntimeModule({ id: 'news_feed', Component: NewsFeedRuntime });