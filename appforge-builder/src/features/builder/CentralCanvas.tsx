import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppConfigStore } from '../../store/useAppConfigStore';
import { RuntimePreviewIframe, type PreviewPhase } from './RuntimePreviewIframe';

/**
 * CentralCanvas (Fase 1 cierre, Preview-as-Runtime):
 *
 * El canvas pasa a ser el runtime real cargado como iframe desde
 * `preview.creatu.app/?appId=X`. Se eliminan los PreviewComponent
 * del builder (SortableContext + SortableCanvasElement + helpers
 * TabBar/DrawerOverlay + computeTabs). La fidelidad visual entre
 * preview y app generada queda garantizada por construcción: el
 * mismo bundle de runtime que se hornea para PWA/AAB es el que se
 * sirve al iframe.
 *
 * Chrome físico del teléfono (borde + sombra + notch / Dynamic
 * Island) vive aquí en el builder. El resto del chrome (header,
 * tabs, drawer, módulos) viene del runtime real dentro del iframe.
 *
 * Inserción de módulos: se hace desde LeftSidebar (botón "+" en
 * hover). El drag-drop cross-origin sobre el iframe lo bloquea el
 * browser por seguridad — out of scope hoy, llega en Fase 2.4.
 *
 * Sin `appId` no hay iframe (caso edge: routing roto / dev manual).
 * El smartphone se ve vacío con solo el notch. Mejor que un iframe
 * a `?appId=undefined` que daría 400 en backend.
 *
 * Phase 2.2b Pieza A — selector segmented "App / Bienvenida /
 * Splash" sobre el mockup. Por defecto en "App" (modo editor de
 * módulos, sin fricción). Cuando el cliente quiere inspeccionar
 * sus pantallas de bienvenida, elige "Bienvenida" y el iframe
 * entra en phase='onboarding' con sus slides reales. "Splash"
 * idem para la pantalla splash. Terms NO es un fase seleccionable
 * — es un gate de aceptación, no contenido visual.
 */
export const CentralCanvas: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>('app');
  const config = useAppConfigStore((s) => s.config);

  // Phase 2.2c — a phase is "available" in the selector only if the
  // constructor has actually configured it. Showing 'splash' / 'onboarding'
  // when they are disabled would let the constructor inspect content the
  // real app never renders — confusing and inconsistent. Disabled options
  // stay visible (the constructor knows the feature exists) but cannot be
  // selected.
  const splashAvailable = config?.splash?.enabled === true;
  const onboardingAvailable = config?.onboarding?.enabled === true
    && (config?.onboarding?.slides?.length ?? 0) > 0;

  const phaseOptions: { value: PreviewPhase; label: string; available: boolean; disabledHint: string }[] = [
    { value: 'app', label: 'App', available: true, disabledHint: '' },
    {
      value: 'onboarding',
      label: 'Bienvenida',
      available: onboardingAvailable,
      disabledHint: 'Actívala y añade diapositivas en Configuración › Bienvenida',
    },
    {
      value: 'splash',
      label: 'Splash',
      available: splashAvailable,
      disabledHint: 'Actívalo en Configuración › Splash',
    },
  ];

  // If the constructor disables a phase while the preview is showing it,
  // revert to 'app' automatically. Without this, the segmented control
  // and the runtime get out of sync — the runtime keeps rendering the
  // (now empty) phase and the constructor sees a phantom selection.
  useEffect(() => {
    if (previewPhase === 'onboarding' && !onboardingAvailable) setPreviewPhase('app');
    if (previewPhase === 'splash' && !splashAvailable) setPreviewPhase('app');
  }, [previewPhase, onboardingAvailable, splashAvailable]);

  return (
    <main
      className="flex-1 flex flex-col items-center overflow-y-auto p-8 gap-4"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Segmented control: phase of the preview. Compact pill
          group above the mockup, centered, low visual weight so
          it doesn't compete with the canvas content. */}
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full p-0.5 shadow-sm shrink-0">
        {phaseOptions.map((opt) => {
          const isActive = previewPhase === opt.value;
          const isDisabled = !opt.available;
          let className = 'px-3 py-1 text-[12px] font-semibold rounded-full transition-colors ';
          if (isDisabled) className += 'text-gray-300 cursor-not-allowed';
          else if (isActive) className += 'bg-primary text-white';
          else className += 'text-gray-600 hover:text-gray-900';
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { if (!isDisabled) setPreviewPhase(opt.value); }}
              disabled={isDisabled}
              className={className}
              aria-pressed={isActive}
              title={isDisabled ? opt.disabledHint : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Mobile Device Simulator Frame */}
      <div className="w-[390px] h-[844px] bg-white rounded-[44px] shadow-[0_24px_60px_rgba(0,0,0,0.1),0_0_0_12px_#0f172a,0_0_0_13px_#334155] relative overflow-hidden">
        {/* Notch simulation (Dynamic Island Style) — chrome físico
            del teléfono, queda por encima del iframe (z-50). */}
        <div className="absolute top-3 inset-x-0 h-7 bg-[#0f172a] rounded-full w-[120px] mx-auto z-50 shadow-[0_2px_15px_rgba(0,0,0,0.1)]" />

        {/* key={appId}: si el cliente navega entre apps en el builder,
            React desmonta + remonta este componente con state limpio
            (iframe nuevo, previewReady=false, queue vacía). Sin el key,
            la sesión vieja podría enviar postMessages al iframe nuevo
            durante su primer paint. */}
        {appId && <RuntimePreviewIframe key={appId} appId={appId} previewPhase={previewPhase} />}
      </div>
    </main>
  );
};
