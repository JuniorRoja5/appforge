import React, { useState } from 'react';
import type { AppManifest } from '../lib/manifest';
import { resolveAssetUrl } from '../lib/resolve-asset-url';

interface Props {
  config: NonNullable<AppManifest['appConfig']['onboarding']>;
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ config, onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = config.slides.sort((a, b) => a.order - b.order);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      localStorage.setItem('appforge_onboarding_seen', 'true');
      onFinish();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('appforge_onboarding_seen', 'true');
    onFinish();
  };

  const slide = slides[currentSlide];
  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-surface-bg, #fff)' }}>
      {/* Skip */}
      <div className="flex justify-end p-4 pt-[calc(var(--safe-area-top)+16px)]">
        <button
          onClick={handleSkip}
          className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-secondary, #6B7280)' }}
        >
          Saltar
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {slide.imageUrl && (
          <img
            src={resolveAssetUrl(slide.imageUrl)}
            alt={slide.title}
            className="w-64 h-64 object-contain mb-8"
          />
        )}
        <h2
          className="text-2xl font-bold text-center mb-3"
          style={{ color: 'var(--color-text-primary, #111827)', fontFamily: 'var(--font-heading, Inter)' }}
        >
          {slide.title}
        </h2>
        <p
          className="text-base text-center max-w-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary, #6B7280)' }}
        >
          {slide.description}
        </p>
      </div>

      {/* Dots + Next button */}
      <div className="px-8 pb-[calc(var(--safe-area-bottom)+32px)]">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === currentSlide ? 24 : 8,
                backgroundColor: i === currentSlide
                  ? 'var(--color-primary, #4F46E5)'
                  : 'var(--color-divider, #E5E7EB)',
              }}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl text-base font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--color-primary, #4F46E5)',
            color: 'var(--color-text-on-primary, #fff)',
            borderRadius: 'var(--radius-button, 12px)',
          }}
        >
          {currentSlide < slides.length - 1 ? 'Siguiente' : 'Comenzar'}
        </button>
      </div>
    </div>
  );
};
