import React from 'react';
import { useParams } from 'react-router-dom';
import { RuntimePreviewIframe } from './RuntimePreviewIframe';

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
 * browser por seguridad — out of scope hoy, TECH_DEBT futuro.
 *
 * Sin `appId` no hay iframe (caso edge: routing roto / dev manual).
 * El smartphone se ve vacío con solo el notch. Mejor que un iframe
 * a `?appId=undefined` que daría 400 en backend.
 */
export const CentralCanvas: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();

  return (
    <main
      className="flex-1 flex justify-center items-center overflow-y-auto p-12"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
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
        {appId && <RuntimePreviewIframe key={appId} appId={appId} />}
      </div>
    </main>
  );
};
