import React from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  bounds: Record<string, ElementBounds>;
  hoveredId: string | null;
}

/**
 * Preview-as-Runtime Phase 2.2 — selection + hover outline overlay.
 *
 * Same-origin absolute layer sibling to the iframe inside the
 * smartphone mockup. `pointer-events: none` so the overlay never
 * steals clicks — they go through to the iframe, which handles the
 * selection logic via element-click postMessage.
 *
 * Two rectangles, both reading their geometry from the `bounds`
 * map sent by the runtime via element-bounds messages:
 *
 *   1. Selection outline (strong, 2px solid `var(--primary)`):
 *      drawn around the module whose id matches selectedElementId
 *      in the builder store. This is the "what am I editing" cue.
 *
 *   2. Hover outline (soft, 2px dashed primary at 40% alpha):
 *      drawn around the module whose id is in `hoveredId`,
 *      provided it isn't the same as the selection (no double
 *      outlines on the same element). This is the "what would I
 *      select if I clicked" cue — half of the "feels like Canva"
 *      sensation, per architect.
 *
 * The overlay sits ABOVE the iframe (z-index implicit via DOM
 * order — call site puts the overlay after the iframe). Note that
 * `pointer-events: none` on the container is critical: without it,
 * the colored borders would absorb the user's clicks before they
 * reach the iframe.
 *
 * Bounds are in iframe-viewport coordinates (getBoundingClientRect
 * inside the iframe). The overlay shares the same containing block
 * as the iframe (`absolute inset-0` on both, inside the smartphone
 * mockup), so the iframe origin (0,0) coincides with the overlay
 * origin pixel-for-pixel — no coordinate translation needed.
 */
export const SelectionOverlay: React.FC<Props> = ({ bounds, hoveredId }) => {
  const selectedId = useBuilderStore((s) => s.selectedElementId);

  const selectedRect = selectedId ? bounds[selectedId] : null;
  const hoverRect = hoveredId && hoveredId !== selectedId ? bounds[hoveredId] : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* NO `transition-all` here — the outlines update their
          left/top/width/height every animation frame while the
          preview scrolls. A geometry transition would animate each
          intermediate frame towards its target, never reaching it
          before the next frame arrives, producing a constant ~Xms
          lag visible as the outline "chasing" the module instead of
          tracking it. Convention in Webflow/Framer/Canva: selection
          and hover outlines are pixel-instant, never animated in
          position. */}
      {hoverRect && (
        <div
          className="absolute"
          style={{
            left: hoverRect.x,
            top: hoverRect.y,
            width: hoverRect.width,
            height: hoverRect.height,
            border: '2px dashed rgba(79, 70, 229, 0.4)',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      )}
      {selectedRect && (
        <div
          className="absolute"
          style={{
            left: selectedRect.x,
            top: selectedRect.y,
            width: selectedRect.width,
            height: selectedRect.height,
            border: '2px solid var(--primary, #4F46E5)',
            borderRadius: '6px',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.12)',
          }}
        />
      )}
    </div>
  );
};
