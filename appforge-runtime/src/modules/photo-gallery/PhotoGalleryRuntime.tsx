import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getGallery } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

type GalleryImage = Awaited<ReturnType<typeof getGallery>>[number];

const PhotoGalleryRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Galería';
  const columns = (data.columns as number) ?? 2;
  const gap = (data.gap as number) ?? 4;
  const showTitles = (data.showTitles as boolean) ?? true;
  const enableLightbox = (data.enableLightbox as boolean) ?? true;

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getGallery()
      .then(setImages)
      .catch((err) => setError(err?.message || 'Error al cargar galería'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (error) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>;

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < images.length) setSelectedIndex(idx);
  };

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
        {images.map((img, i) => (
          <div
            key={img.id}
            className="overflow-hidden"
            style={{
              borderRadius: 'var(--radius-card, 12px)',
              cursor: enableLightbox ? 'pointer' : 'default',
            }}
            onClick={() => enableLightbox && setSelectedIndex(i)}
          >
            <div style={{ aspectRatio: '1' }}>
              <img src={resolveAssetUrl(img.imageUrl)} alt={img.title ?? ''} className="w-full h-full object-cover" onError={imgFallback} />
            </div>
            {showTitles && img.title && (
              <p className="text-[10px] font-medium px-1 py-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{img.title}</p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {enableLightbox && selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <X size={18} color="#fff" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-xs text-white/70">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Image */}
          <img
            src={resolveAssetUrl(selectedImage.imageUrl)}
            alt={selectedImage.title ?? ''}
            className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg"
            onError={imgFallback}
          />

          {/* Caption */}
          {(selectedImage.title || (selectedImage as any).description) && (
            <div className="mt-3 text-center px-4">
              {selectedImage.title && <p className="text-sm font-medium text-white">{selectedImage.title}</p>}
              {(selectedImage as any).description && <p className="text-xs text-white/60 mt-0.5">{(selectedImage as any).description}</p>}
            </div>
          )}

          {/* Navigation */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(selectedIndex - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={20} color="#fff" />
            </button>
          )}
          {selectedIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(selectedIndex + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronRight size={20} color="#fff" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'photo_gallery', Component: PhotoGalleryRuntime });
