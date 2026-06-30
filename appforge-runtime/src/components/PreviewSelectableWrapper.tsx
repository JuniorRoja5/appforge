import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { isPreviewMode } from '../lib/manifest';
import {
  getParentOrigin,
  sendDragEnd,
  sendDragMove,
  sendDragStart,
  sendElementBounds,
  sendElementClick,
  sendElementHover,
  sendElementUnmounted,
} from '../lib/preview-bridge';

interface Props {
  elementId: string;
  /**
   * Stable signal that changes whenever the surrounding schema is
   * restructured (add/remove/reorder). When it changes, the wrapper
   * re-measures its bounds — necessary because reorder keeps the
   * React subtree mounted (same key) but moves it within the DOM,
   * and ResizeObserver does NOT fire on position-only changes.
   */
  schemaSignal: string;
  children: React.ReactNode;
}

// Phase 2.4a — 8px is dnd-kit's default drag activation threshold.
// Smaller (e.g. 3px) misfires on natural micro-jitter of mouse /
// touch; larger (e.g. 16px) feels unresponsive. Module-level
// constant so it's not recreated each render.
const DRAG_THRESHOLD_PX = 8;

/**
 * Preview-as-Runtime Phase 2.2 — selectable wrapper around each
 * module rendered by TabScreen.
 *
 * In preview mode (iframe served from preview.creatu.app):
 *   - Click on the wrapper → posts `element-click` to the builder
 *     so it can call selectElement(elementId) and open the
 *     SettingsPanel + TabAssignment in the RightSidebar.
 *   - Mouse enter/leave → posts `element-hover` so the builder
 *     can paint a soft hover outline.
 *   - The wrapper measures its bounding rect and posts
 *     `element-bounds` whenever:
 *       · It mounts.
 *       · Its size changes (ResizeObserver — covers internal layout
 *         changes like an accordion expanding).
 *       · The viewport scrolls in any container (window scroll with
 *         capture:true — covers AppShell scroll, TabScreen scroll,
 *         nested scrolls).
 *       · The window resizes.
 *       · The surrounding schema changes (schemaSignal prop) —
 *         covers reorder/add/remove where ResizeObserver wouldn't
 *         fire.
 *   - All bounds emissions are throttled via requestAnimationFrame
 *     (one emission per frame max, ~16ms at 60fps). Without
 *     throttle, fast scroll saturates the postMessage channel and
 *     the builder repaint stutters.
 *
 * In production (PWA / AAB end-user) `isPreviewMode()` is false
 * and the wrapper is fully transparent — returns <>{children}</>
 * directly, no DOM addition, no listeners, no overhead.
 *
 * NO module's Component is touched. The wrapper sits BETWEEN
 * TabScreen and RuntimeErrorBoundary, which already exists. All 23
 * modules continue rendering exactly as they did in the user's
 * deployed PWA / AAB.
 */
export const PreviewSelectableWrapper: React.FC<Props> = ({
  elementId,
  schemaSignal,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const reportBounds = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      sendElementBounds(elementId, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    });
  }, [elementId]);

  useLayoutEffect(() => {
    if (!isPreviewMode() || !getParentOrigin()) return;
    reportBounds();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(reportBounds);
    ro.observe(el);
    window.addEventListener('scroll', reportBounds, true);
    window.addEventListener('resize', reportBounds);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      ro.disconnect();
      window.removeEventListener('scroll', reportBounds, true);
      window.removeEventListener('resize', reportBounds);
    };
  }, [reportBounds, schemaSignal]);

  // On unmount, notify the builder so it can:
  //   - Clear hover state (prevents a "ghost hover outline" left
  //     over after the user deletes the hovered module).
  //   - Drop this elementId from its bounds map. Critical for
  //     multi-tab apps: when the user switches tabs in the preview,
  //     the modules of the previous tab unmount from the DOM but
  //     stay in `elements` (still belong to the app, just hidden).
  //     Without this clear, the selection outline would linger
  //     over the new tab using the stale bounds of the unmounted
  //     module — a ghost rectangle floating on top of unrelated
  //     content. The schema-driven prune in RuntimePreviewIframe
  //     handles real deletions; this handles transient unmounts.
  // Only relevant in preview mode.
  useEffect(() => {
    return () => {
      if (!isPreviewMode()) return;
      sendElementHover(null);
      sendElementUnmounted(elementId);
    };
  }, [elementId]);

  // Phase 2.4a — drag-or-click discrimination ref. Persists across
  // renders without re-render churn. Shape:
  //   - startX/startY: pointer position at pointerdown (clientX/Y
  //     of the iframe viewport).
  //   - pointerId: passed to setPointerCapture so subsequent
  //     pointermove/up/cancel events keep targeting this element
  //     even if the cursor leaves it (or leaves the iframe).
  //   - isDragging: flipped true on the first pointermove beyond
  //     DRAG_THRESHOLD_PX. Discriminates "click that moved a
  //     micro-pixel" from "real drag intent".
  //   - safetyTimer: 30s timeout that force-cleans state if no
  //     pointerup arrives (e.g. cursor exited the OS window and
  //     the browser stopped emitting events). Prevents a stuck
  //     "isDragging=true" that would suppress selection forever.
  const dragRef = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
    isDragging: boolean;
    safetyTimer: number | null;
  } | null>(null);

  const cleanupDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.safetyTimer !== null) {
      clearTimeout(drag.safetyTimer);
    }
    if (ref.current?.hasPointerCapture(drag.pointerId)) {
      ref.current.releasePointerCapture(drag.pointerId);
    }
    dragRef.current = null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only left button / primary touch. Right-click context menus
    // and middle-click scrolls must not trigger drag.
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    // setPointerCapture guarantees the rest of the gesture
    // (pointermove/up/cancel) targets THIS element even if the
    // cursor exits its rect — critical for the builder to keep
    // receiving drag-move messages while the user drags toward
    // another module on the same tab.
    el.setPointerCapture(e.pointerId);
    const safetyTimer = window.setTimeout(() => {
      // 30s with no pointerup → assume stuck state, cancel drag.
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.isDragging) sendDragEnd(true);
      cleanupDrag();
    }, 30000);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      isDragging: false,
      safetyTimer,
    };
  }, [cleanupDrag]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    if (!drag.isDragging) {
      // Threshold check: only past 8px do we flip into drag mode.
      // 8px = dnd-kit default. Smaller threshold (e.g. 3px) would
      // misfire on natural finger / mouse micro-jitter; larger
      // (e.g. 16px) feels unresponsive.
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      drag.isDragging = true;
      sendDragStart(elementId);
    }
    sendDragMove(e.clientX, e.clientY);
  }, [elementId]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    if (drag.isDragging) {
      // Drop intent: builder will commit moveElement if it has
      // a valid overId distinct from activeId.
      sendDragEnd(false);
    } else {
      // Click intent: pointer never moved enough to qualify as
      // drag → treat as a normal select-click. Preserves 2.2
      // behavior for any non-dragging interaction.
      sendElementClick(elementId);
    }
    cleanupDrag();
  }, [elementId, cleanupDrag]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    if (drag.isDragging) sendDragEnd(true);
    cleanupDrag();
  }, [cleanupDrag]);

  // Defensive: if the wrapper unmounts mid-drag (rare — tab
  // switch while dragging), release the capture and tell the
  // builder we canceled. Without this the builder's dragState
  // would stay set with a dead activeId.
  useEffect(() => {
    return () => {
      const drag = dragRef.current;
      if (drag?.isDragging) sendDragEnd(true);
      cleanupDrag();
    };
  }, [cleanupDrag]);

  if (!isPreviewMode() || !getParentOrigin()) {
    return <>{children}</>;
  }

  return (
    <div
      ref={ref}
      data-element-id={elementId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={() => sendElementHover(elementId)}
      onMouseLeave={() => sendElementHover(null)}
      style={{ cursor: 'pointer', touchAction: 'none' }}
    >
      {children}
    </div>
  );
};
