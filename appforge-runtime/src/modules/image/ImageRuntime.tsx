import React from 'react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

const ImageRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  // Builder uses 'url', old runtime used 'src' — accept both
  const src = (data.url as string) ?? (data.src as string) ?? '';
  const alt = (data.alt as string) ?? '';
  const objectFit = (data.objectFit as string) ?? 'cover';
  // Builder uses 'radius', old runtime used 'borderRadius' — accept both
  const borderRadius = (data.radius as string) ?? (data.borderRadius as string) ?? 'var(--radius-card, 12px)';
  const height = (data.height as string) ?? '';

  if (!src) return null;

  return (
    <img
      src={resolveAssetUrl(src)}
      alt={alt}
      className="w-full"
      style={{
        borderRadius,
        objectFit: objectFit as React.CSSProperties['objectFit'],
        height: height || undefined,
      }}
      onError={imgFallback}
    />
  );
};

registerRuntimeModule({ id: 'image_module', Component: ImageRuntime });
