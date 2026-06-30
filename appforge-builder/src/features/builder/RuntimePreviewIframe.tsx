import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { SelectionOverlay, type ElementBounds } from './SelectionOverlay';
import type { PreviewErrorCode } from './PreviewErrorBanner';

export type PreviewPhase = 'app' | 'onboarding' | 'splash';

interface Props {
  appId: string;
  /**
   * Phase 2.2b Pieza A — current selected preview phase from the
   * segmented control in CentralCanvas. The iframe receives a
   * `preview-phase` postMessage every time this changes (after
   * the handshake), so the runtime can switch between 'ready' /
   * 'onboarding' / 'splash'. Default 'app' = the editing mode.
   */
  previewPhase: PreviewPhase;
  /**
   * Phase 2.3 — monotonic key controlled by the parent
   * (CentralCanvas). Used as the `key` of the inner <iframe>
   * element: bumping it forces React to unmount + remount the
   * iframe with a clean state tree. The parent's retry button
   * increments this; we don't bump it ourselves.
   */
  iframeKey: number;
  /**
   * Phase 2.3 — called when the runtime emits preview-error OR
   * the handshake doesn't complete within HANDSHAKE_TIMEOUT_MS
   * after mount. The parent owns the error state + the banner UI;
   * we only detect and report.
   */
  onPreviewError: (error: { code: PreviewErrorCode; message: string }) => void;
  /**
   * Phase 2.3 — true once the runtime has sent preview-ready for
   * the current iframe instance. Parent reads this to suppress
   * the handshake timeout when it already fired (and to know if
   * the connection is healthy after a retry).
   */
  onPreviewReady?: () => void;
}

const PREVIEW_ORIGIN = 'https://preview.creatu.app';
const DEBOUNCE_MS = 200;
const HANDSHAKE_TIMEOUT_MS = 5000;

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
export const RuntimePreviewIframe: React.FC<Props> = ({ appId, previewPhase, iframeKey, onPreviewError, onPreviewReady }) => {
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
  // Phase 2.2b — monotonic nonce for navigate-to-tab commands.
  // The runtime treats each (tabIndex, nonce) pair as a single-shot
  // command — two consecutive sends with the same tabIndex still
  // fire because the nonce changes, even though tabIndex repeats.
  const navTabNonceRef = useRef(0);
  // Phase 2.3 — error state lives in the parent (CentralCanvas).
  // We only own the detection logic (postMessage listener,
  // handshake timeout) and report via onPreviewError. iframeKey
  // is a prop the parent controls — bumping it remounts the
  // iframe via React's key reconciliation.

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
  const selectedElementId = useBuilderStore((s) => s.selectedElementId);
  const moveElement = useBuilderStore((s) => s.moveElement);

  // Phase 2.4a — drag-to-reorder. dragRef tracks active drag without
  // re-rendering on every drag-move (60Hz updates would otherwise
  // re-render the whole iframe wrapper). overId is recomputed on
  // each pointermove via findElementAtPoint against the bounds map
  // (same coordinate system as the pointer, verified by architect).
  // 30s safety timer is a defense against a stuck drag-state if
  // the runtime never sends drag-end (e.g. iframe killed by browser
  // during drag, parent never gets the pointerup).
  const dragRef = useRef<{ activeId: string; overId: string | null; safetyTimer: number | null } | null>(null);

  // Phase 2.4a — boundsRef mirrors the bounds state and is read by
  // the drag-move handler instead of the closure-captured `bounds`.
  // Two reasons:
  //   1. If the message listener's useEffect had `bounds` in its
  //      deps, every element-bounds emission from the runtime
  //      (which happens on every scroll inside the iframe — touchable
  //      with mouse wheel during a drag) would tear down and rebuild
  //      the listener. Beyond being wasteful, it opens a one-tick
  //      window between cleanup and setup where postMessages can
  //      be lost.
  //   2. Without that, the listener's closure freezes the bounds at
  //      its mount time. drag-move would compute overId against a
  //      stale snapshot, mislabeling the drop target whenever the
  //      preview has scrolled since drag-start.
  // Sync via a tiny useEffect — ref always reflects the latest
  // state, and `bounds` can leave the listener's dep array.
  const boundsRef = useRef<Record<string, ElementBounds>>({});
  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  const cleanupDragState = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    if (d.safetyTimer !== null) clearTimeout(d.safetyTimer);
    dragRef.current = null;
  }, []);

  /**
   * findElementAtPoint — given pointer coordinates in iframe-viewport
   * space and the bounds map, return the elementId whose rectangle
   * contains the point, or null if none. Iterative O(N), fine for
   * N typically 5-20 modules per tab.
   *
   * Why not find the bounds with smallest area in case of overlap?
   * The runtime renders modules in a flex column with gaps — they
   * don't overlap in normal layout. If a future module style does
   * overlap (z-index stack), the first match wins; acceptable for
   * 2.4a, can revisit if real apps exhibit the pattern.
   */
  const findElementAtPoint = useCallback((x: number, y: number, boundsMap: Record<string, ElementBounds>): string | null => {
    for (const [id, b] of Object.entries(boundsMap)) {
      if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) return id;
    }
    return null;
  }, []);

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
        // Phase 2.3 — notify parent so it can dismiss any stale
        // error banner (e.g. retry succeeded, handshake arrived).
        onPreviewReady?.();
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

      if (data.type === 'element-click'
        && (typeof data.elementId === 'string' || data.elementId === null)
      ) {
        // null = user clicked empty area inside the preview →
        // deselect (RightSidebar returns to "Tema y Diseño").
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

      // Phase 2.3 — runtime emits preview-error when its manifest
      // load fails. Report to the parent so it can show the banner
      // with the right copy. Message goes to console only — never
      // shown raw to the user.
      if (data.type === 'preview-error' && typeof data.code === 'string') {
        const msg = typeof data.message === 'string' ? data.message : '';
        console.warn('[Preview] runtime error:', data.code, msg);
        onPreviewError({ code: data.code as PreviewErrorCode, message: msg });
        return;
      }

      // Phase 2.4a — drag-and-drop reorder. The runtime detects the
      // gesture (pointerdown + threshold) and emits drag-start; the
      // builder tracks state and computes overId against bounds on
      // each move; on drag-end (if not canceled and overId is valid
      // and distinct from activeId) we commit moveElement.
      if (data.type === 'drag-start' && typeof data.elementId === 'string') {
        // Defensive: if a previous drag is still tracked (shouldn't
        // happen — runtime always emits drag-end), clean it up.
        cleanupDragState();
        const safetyTimer = window.setTimeout(() => {
          // 30s with no drag-end → assume runtime stopped responding.
          // Drop the drag silently without commit.
          console.warn('[Preview] drag-end never arrived; cleaning up after 30s.');
          cleanupDragState();
        }, 30000);
        dragRef.current = { activeId: data.elementId, overId: null, safetyTimer };
        return;
      }

      if (data.type === 'drag-move'
        && typeof data.x === 'number'
        && typeof data.y === 'number'
      ) {
        const d = dragRef.current;
        if (!d) return;
        // Use boundsRef (always fresh) — NOT the closure-captured
        // `bounds`. See the boundsRef comment above for why this
        // matters when the preview scrolls during a drag.
        d.overId = findElementAtPoint(data.x, data.y, boundsRef.current);
        return;
      }

      if (data.type === 'drag-end') {
        const d = dragRef.current;
        if (!d) return;
        const canceled = data.canceled === true;
        // Three guards to commit a reorder:
        //   1. The drag wasn't canceled (pointerup, not pointercancel).
        //   2. The cursor was over a valid module at drop time.
        //   3. The drop target is distinct from the active module
        //      (dropping a module on itself is a no-op).
        if (!canceled && d.overId !== null && d.overId !== d.activeId) {
          moveElement(d.activeId, d.overId);
        }
        cleanupDragState();
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // bounds NOT in deps — see boundsRef comment above. Other
    // branches that read bounds use the functional setBounds(prev
    // => ...) form so they don't capture from the closure either.
  }, [selectElement, onPreviewError, onPreviewReady, moveElement, cleanupDragState, findElementAtPoint]);

  // Phase 2.3 — handshake timeout. If the runtime hasn't sent
  // preview-ready within HANDSHAKE_TIMEOUT_MS (5s), report
  // 'handshake-timeout' to the parent so it shows the banner.
  // Re-runs when iframeKey changes (the parent's retry bumps it
  // → fresh iframe instance → fresh timer).
  useEffect(() => {
    if (previewReady) return;
    const timer = setTimeout(() => {
      onPreviewError({ code: 'handshake-timeout', message: 'Handshake timeout' });
    }, HANDSHAKE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [previewReady, iframeKey, onPreviewError]);

  // Phase 2.3 — when the parent bumps iframeKey (retry), the
  // <iframe key={iframeKey}> below remounts. We reset our local
  // state so we don't keep stale flags/queue from the previous
  // instance. previewReady is the most important: a stale `true`
  // would suppress the timeout and let a broken iframe pass.
  // Phase 2.4a: also clean up any in-flight drag — a stuck
  // dragRef would block future drags from initiating.
  useEffect(() => {
    setPreviewReady(false);
    pendingPayloadRef.current = null;
    setBounds({});
    setHoveredId(null);
    cleanupDragState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeKey]);

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

  // Phase 2.2b — navigate-to-tab: when the selection changes (from
  // any source: panel click, mockup click, popover auto-select),
  // tell the iframe to switch to the selected module's tab so the
  // outline becomes visible. Skip if the module has tabIndex null
  // (visible on all tabs — no navigation needed) or if the iframe
  // is not ready yet (the handshake hasn't completed).
  // Each send carries a monotonic nonce — the runtime treats every
  // command as one-shot, so the end-user can still click other
  // tabs in the preview without being snapped back.
  useEffect(() => {
    if (!previewReady || !selectedElementId) return;
    const sel = elements.find((el) => el.id === selectedElementId);
    if (!sel || sel.tabIndex == null) return;
    navTabNonceRef.current += 1;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'navigate-to-tab', tabIndex: sel.tabIndex, nonce: navTabNonceRef.current },
      PREVIEW_ORIGIN,
    );
  }, [selectedElementId, elements, previewReady]);

  // Phase 2.2b Pieza A — preview-phase: send the current phase to
  // the iframe whenever it changes (after handshake). The runtime
  // listener maps 'app' → 'ready', 'onboarding' → 'onboarding',
  // 'splash' → 'splash'.
  useEffect(() => {
    if (!previewReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'preview-phase', phase: previewPhase },
      PREVIEW_ORIGIN,
    );
  }, [previewPhase, previewReady]);

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
      {/* Phase 2.3 — key={iframeKey} drives the retry mechanism.
          Parent (CentralCanvas) bumps the key; React unmounts +
          remounts a fresh iframe with a clean state tree. The
          surrounding RuntimePreviewIframe component stays mounted
          (its key in CentralCanvas is appId), so its post-message
          listener, store subscriptions, and our state-reset
          useEffect above all stay alive across retries. */}
      <iframe
        key={iframeKey}
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
