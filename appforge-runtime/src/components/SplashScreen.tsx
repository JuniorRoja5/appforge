import React, { useEffect, useState } from 'react';
import type { AppManifest } from '../lib/manifest';
import { resolveAssetUrl } from '../lib/resolve-asset-url';

interface Props {
  config: AppManifest['appConfig']['splash'];
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ config, onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const duration = config?.duration ?? 2000;

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), duration);
    const endTimer = setTimeout(onFinish, duration + 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [duration, onFinish]);

  const bgStyle: React.CSSProperties =
    config?.type === 'image' && config.backgroundImageUrl
      ? { backgroundImage: `url(${resolveAssetUrl(config.backgroundImageUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: config?.backgroundColor ?? 'var(--color-primary, #4F46E5)' };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={bgStyle}
    >
      {config?.logoUrl && (
        <img
          src={resolveAssetUrl(config.logoUrl)}
          alt="Logo"
          className="w-32 h-32 object-contain mb-6 animate-pulse"
        />
      )}
      <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
};
