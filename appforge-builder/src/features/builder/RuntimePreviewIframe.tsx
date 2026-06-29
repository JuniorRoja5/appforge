import React, { useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { SelectionOverlay, type ElementBounds } from './SelectionOverlay';

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
  // parentOrigin: passed to the iframe so the runtime knows where to
  // send outgoing postMessages (element-click, element-hover,
  // element-bounds) with a strict targetOrigin. See preview-bridge.ts
  // in the runtime — the param is validated against an allowlist
  // before being used, so injecting an arbitrary origin in the URL
  // cannot escape the validation.
  const src = `${PREVIEW_ORIGIN}/?appId=${encodeURIComponent(appId)}&parentOrigin=${encodeURIComponent(window.location.origin)}`;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingPayloadRef = useRef<{ schema: unknown; designTokens: unknown } | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  // Phase 2.2 state — bounds reported by the runtime per element,
  // and the currently hovered element id (null when the cursor is
  // outside any module). The SelectionOverlay reads
  // selectedElementId from the store directly; only these two
  // pieces live here as local state.
  const [bounds, setBounds] = useState<Record<string, ElementBounds>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const elements = useBuilderStore((s) => s.elements);
  const designTokens = useBuilderStore((s) => s.designTokens);
  const selectElement = useBuilderStore((s) => s.selectElement);

  // Listener for all incoming postMessages from the iframe. Handles:
  //   - preview-ready: the original handshake (Phase 2.1).
  //   - element-click: user clicked a module in the preview →
  //     selectElement so the RightSidebar opens its SettingsPanel +
  //     TabAssignment (Phase 2.2).
  //   - element-bounds: runtime reports geometry of a module; we
  //     store it so the SelectionOverlay can draw the outline at
  //     the right position (Phase 2.2).
  //   - element-hover: runtime reports cursor enter/leave; the
  //     overlay draws a soft hover outline (Phase 2.2).
  // Origin verified strictly against PREVIEW_ORIGIN — anything else
  // is silently ignored.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== PREVIEW_ORIGIN) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'preview-ready') {
        setPreviewReady(true);
        const pending = pendingPayloadRef.current;
        if (pending && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'manifest-update', payload: pending },
            PREVIEW_ORIGIN,
          );
          pendingPayloadRef.current = null;
        }
        return;
      }

      if (data.type === 'element-click' && typeof data.elementId === 'string') {
        selectElement(data.elementId);
        return;
      }

      if (data.type === 'element-bounds'
        && typeof data.elementId === 'string'
        && data.bounds
        && typeof data.bounds === 'object'
      ) {
        const b = data.bounds as Partial<ElementBounds>;
        if (typeof b.x === 'number' && typeof b.y === 'number'
          && typeof b.width === 'number' && typeof b.height === 'number'
        ) {
          setBounds((prev) => ({
            ...prev,
            [data.elementId]: { x: b.x!, y: b.y!, width: b.width!, height: b.height! },
          }));
        }
        return;
      }

      if (data.type === 'element-hover') {
        // elementId may be string OR null (null = cursor left all modules).
        const id = data.elementId;
        setHoveredId(typeof id === 'string' ? id : null);
        return;
      }

      if (data.type === 'element-unmounted' && typeof data.elementId === 'string') {
        // Module unmounted from the DOM (tab change, etc) but still
        // in the schema — drop its bounds so the selection outline
        // does not linger as a ghost over the next tab. On remount
        // the wrapper will re-emit fresh bounds. Complementary to
        // the schema-driven prune below: this handles transient
        // unmounts; the prune handles real deletions.
        setBounds((prev) => {
          if (!(data.elementId in prev)) return prev;
          const { [data.elementId]: _removed, ...rest } = prev;
          return rest;
        });
        // Also clear hover if the unmounted element was hovered —
        // mouseleave never fires when the host element disappears
        // from the DOM directly.
        setHoveredId((prev) => (prev === data.elementId ? null : prev));
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectElement]);

  // Bounds cleanup on schema change: if the user deletes a module,
  // its entry stays in `bounds` forever. Prune entries for ids that
  // no longer exist in the schema. Cheap (≤ N entries, N ~ 5-20).
  useEffect(() => {
    const liveIds = new Set(elements.map((el) => el.id));
    setBounds((prev) => {
      const next: Record<string, ElementBounds> = {};
      let pruned = false;
      for (const [id, b] of Object.entries(prev)) {
        if (liveIds.has(id)) next[id] = b;
        else pruned = true;
      }
      return pruned ? next : prev;
    });
  }, [elements]);

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
    <>
      <iframe
        ref={iframeRef}
        src={src}
        title="Preview de la app"
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        allow=""
      />
      {/* SelectionOverlay sibling to the iframe inside the
          smartphone mockup. Same containing block, so iframe and
          overlay share the (0,0) origin — bounds reported in
          iframe-viewport coordinates land pixel-for-pixel under the
          modules. `pointer-events: none` (inside the overlay) means
          clicks pass through to the iframe and reach the
          PreviewSelectableWrapper, which handles selection. */}
      <SelectionOverlay bounds={bounds} hoveredId={hoveredId} />
    </>
  );
};
