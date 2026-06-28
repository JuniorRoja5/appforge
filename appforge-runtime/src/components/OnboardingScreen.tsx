import React, { useRef, useState } from 'react';
import type { AppManifest } from '../lib/manifest';
import { resolveAssetUrl } from '../lib/resolve-asset-url';

interface Props {
  config: NonNullable<AppManifest['appConfig']['onboarding']>;
  onFinish: () => void;
}

/**
 * Onboarding fullscreen estilo Airbnb/Duolingo:
 *   - Imagen del slide a pantalla completa (object-cover, recorta si
 *     hace falta para llenar viewport sin barras blancas).
 *   - Texto (título + descripción) superpuesto en la parte inferior
 *     con gradient overlay vertical para legibilidad sobre cualquier
 *     foto (clara u oscura).
 *   - Skip arriba a la derecha con mini-gradient top para que se vea
 *     también sobre fotos claras.
 *   - Dots + botón "Siguiente" fixed bottom, encima de la track.
 *
 * Transición entre slides:
 *   - Track horizontal con N slides ancho `N * 100vw` desplazado por
 *     translateX. Cambio de slide = re-render del transform con
 *     transition `300ms cubic-bezier(0.4, 0, 0.2, 1)` (estándar
 *     material easing).
 *   - Swipe táctil con threshold 50px: izquierda → siguiente, derecha
 *     → anterior. Por debajo del threshold se considera tap y se
 *     ignora (no interfiere con clicks en dots/botón).
 *   - useState (no useRef) para el currentSlide porque la transición
 *     necesita re-render para que el transform cambie suave; useRef
 *     no triggers render.
 *
 * Defensive: si el slide no tiene imageUrl, fallback al layout
 * centrado clásico con texto tokenizado del cliente. El gradient y
 * el forced-white solo aplican cuando hay imagen real.
 */
export const OnboardingScreen: React.FC<Props> = ({ config, onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Copy before sorting — Array.prototype.sort mutates in place, y el
  // array fuente es parte del prop tree (y del appConfig de Zustand).
  // Mutarlo re-triggerea renders y persiste un orden distinto al
  // guardar el manifest.
  const slides = [...config.slides].sort((a, b) => a.order - b.order);

  // Touch swipe state — refs porque no necesitan re-render.
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const SWIPE_THRESHOLD = 50;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      localStorage.setItem('appforge_onboarding_seen', 'true');
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('appforge_onboarding_seen', 'true');
    onFinish();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaXRef.current;
    if (delta < -SWIPE_THRESHOLD) {
      handleNext();
    } else if (delta > SWIPE_THRESHOLD) {
      handlePrev();
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  if (slides.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-bg, #000)' }}
    >
      {/* Track horizontal — todos los slides en fila, desplazado por
          translateX para mostrar el actual. transition + cubic-bezier
          dan el slide animado al cambiar currentSlide. */}
      <div
        className="flex h-full"
        style={{
          width: `${slides.length * 100}vw`,
          transform: `translateX(-${currentSlide * 100}vw)`,
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative flex-shrink-0 h-full"
            style={{ width: '100vw' }}
          >
            {slide.imageUrl ? (
              <>
                {/* Imagen full-screen */}
                <img
                  src={resolveAssetUrl(slide.imageUrl)}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
                {/* Gradient bottom para legibilidad del texto */}
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{
                    height: '70%',
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0) 100%)',
                  }}
                />
                {/* Gradient top para legibilidad del Skip sobre fotos claras */}
                <div
                  className="absolute inset-x-0 top-0"
                  style={{
                    height: '20%',
                    background:
                      'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)',
                  }}
                />
                {/* Texto superpuesto, blanco forzado (no toma tokens
                    del cliente porque va sobre la imagen) */}
                <div
                  className="absolute inset-x-0 px-8 text-white"
                  style={{
                    // Deja espacio abajo para los dots + botón fixed
                    bottom: 'calc(var(--safe-area-bottom, 0px) + 180px)',
                  }}
                >
                  <h2
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: 'var(--font-heading, Inter)' }}
                  >
                    {slide.title}
                  </h2>
                  <p className="text-base leading-relaxed text-white/90">
                    {slide.description}
                  </p>
                </div>
              </>
            ) : (
              // Fallback sin imagen — layout centrado clásico con texto
              // tokenizado del cliente.
              <div
                className="h-full flex flex-col items-center justify-center px-8"
                style={{ backgroundColor: 'var(--color-surface-bg, #fff)' }}
              >
                <h2
                  className="text-2xl font-bold text-center mb-3"
                  style={{
                    color: 'var(--color-text-primary, #111827)',
                    fontFamily: 'var(--font-heading, Inter)',
                  }}
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
            )}
          </div>
        ))}
      </div>

      {/* Skip — fixed top-right, encima del track y de los gradients */}
      <div
        className="absolute right-0 top-0 p-4"
        style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 16px)' }}
      >
        <button
          onClick={handleSkip}
          className="text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          Saltar
        </button>
      </div>

      {/* Dots + Next button — fixed bottom, encima del track */}
      <div
        className="absolute inset-x-0 bottom-0 px-8"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 32px)' }}
      >
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => {
            const isActive = i === currentSlide;
            // Sobre imagen el dot inactivo gris se pierde — usamos
            // blanco con alpha cuando hay imagen en el slide actual.
            const hasImage = !!slides[currentSlide]?.imageUrl;
            return (
              <div
                key={i}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 24 : 8,
                  backgroundColor: hasImage
                    ? isActive
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.4)'
                    : isActive
                      ? 'var(--color-primary, #4F46E5)'
                      : 'var(--color-divider, #E5E7EB)',
                }}
              />
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full py-4 text-base font-semibold transition-colors"
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
