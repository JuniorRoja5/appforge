import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { isPreviewMode } from '../lib/manifest';
import {
  getParentOrigin,
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

  if (!isPreviewMode() || !getParentOrigin()) {
    return <>{children}</>;
  }

  return (
    <div
      ref={ref}
      data-element-id={elementId}
      onClick={(e) => {
        e.stopPropagation();
        sendElementClick(elementId);
      }}
      onMouseEnter={() => sendElementHover(elementId)}
      onMouseLeave={() => sendElementHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};
