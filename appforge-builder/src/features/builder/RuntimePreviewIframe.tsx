import React, { useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';

interface Props {
  appId: string;
}

const PREVIEW_ORIGIN = 'https://preview.creatu.app';
const DEBOUNCE_MS = 200;

/**
 * Preview-as-Runtime, Fase 2.1 — sync builder → iframe.
 *
 * Sobre Fase 1 (read-only iframe), Fase 2.1 añade:
 *
 * 1. **Handshake `preview-ready`**: el runtime envía un postMessage
 *    cuando entra en phase='ready' (manifest cargado, AppShell montado).
 *    Hasta recibir ese mensaje, NO se envían manifest-update — el
 *    listener del runtime aún no existe y los primeros edits del
 *    cliente se perderían.
 *
 * 2. **Cola de 1 slot (last-wins)**: si el cliente edita ANTES del
 *    handshake, el último payload se guarda en `pendingPayloadRef` y
 *    se envía al recibir `preview-ready`. Single slot, no event queue:
 *    el manifest es state-based; solo importa el último snapshot.
 *
 * 3. **Debounce 200ms**: estándar Webflow (Framer 150ms). <250ms el
 *    cerebro humano percibe el cambio como instantáneo. Sin debounce,
 *    cada keystroke en SettingsPanel enviaría un postMessage → re-render
 *    completo del runtime → janky.
 *
 * 4. **`targetOrigin` estricto** (`https://preview.creatu.app`) en cada
 *    postMessage — evita que un script ajeno cargado en el builder
 *    capture el payload del schema.
 *
 * 5. **Verificación de origin del `preview-ready`**: el listener solo
 *    acepta mensajes provenientes de preview.creatu.app — defensa
 *    contra ventanas hermanas o injects que intenten falsificar el
 *    handshake para conseguir que el builder mande datos al destino
 *    equivocado.
 *
 * El componente debe remontar limpio si cambia el `appId` (cambio de
 * app dentro del builder). Eso se garantiza con `key={appId}` en el
 * call site (CentralCanvas) — al cambiar appId, React desmonta este
 * componente y monta otro nuevo: state inicial, queue vacía,
 * previewReady=false. Sin esto, una sesión de edición de App A se
 * quedaría enviando manifest-update al iframe de App B durante el
 * primer paint.
 */
export const RuntimePreviewIframe: React.FC<Props> = ({ appId }) => {
  const src = `${PREVIEW_ORIGIN}/?appId=${encodeURIComponent(appId)}`;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingPayloadRef = useRef<{ schema: unknown; designTokens: unknown } | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  const elements = useBuilderStore((s) => s.elements);
  const designTokens = useBuilderStore((s) => s.designTokens);

  // Listener del handshake `preview-ready`. Se monta una sola vez.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== PREVIEW_ORIGIN) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'preview-ready') return;

      setPreviewReady(true);

      // Flush del pending — si el cliente editó antes del handshake.
      const pending = pendingPayloadRef.current;
      if (pending && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'manifest-update', payload: pending },
          PREVIEW_ORIGIN,
        );
        pendingPayloadRef.current = null;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Suscripción a cambios del store + debounce 200ms + envío al iframe.
  // Reactivo a (elements, designTokens, previewReady): si previewReady
  // pasa de false a true (handshake llega tarde), también re-evalúa
  // — aunque el flush del handler de arriba ya cubre ese caso, esta
  // dependencia garantiza que si el cliente editó en el ms exacto
  // del handshake no se pierde el ultimo payload.
  useEffect(() => {
    const payload = { schema: elements, designTokens };
    const timer = setTimeout(() => {
      if (previewReady && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'manifest-update', payload },
          PREVIEW_ORIGIN,
        );
      } else {
        pendingPayloadRef.current = payload;
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [elements, designTokens, previewReady]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Preview de la app"
      className="absolute inset-0 w-full h-full border-0"
      loading="lazy"
      allow=""
    />
  );
};
