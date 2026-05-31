import React from 'react';

interface Props {
  children: React.ReactNode;
}

// Horizontal scroll-snap rail for content lists. Used by NewsFeedRuntime and
// EventsRuntime cards layouts (F1). Native CSS scroll-snap, no dependencies.
//
// Edge-to-edge behaviour: the rail bleeds out of the parent's screen-horizontal
// padding so the next card peeks past the visible edge — the "there's more,
// swipe to see" affordance. The negative margin + matching internal padding
// trick is the standard way to escape a constrained parent without prop drilling.
//
// Each child must apply `carouselItemStyle()` to its outermost element to
// participate in the snap. Spreading carouselItemStyle BEFORE the card's own
// style preserves the card's borderRadius / backgroundColor / etc. while the
// carousel contributes flex sizing + scroll-snap-align.
//
// Why not iterate inside this component and wrap each child in a flex item:
// breaks reconciliation when the caller has a stable `key` on each card (the
// inner wrapper would steal index-based keys and remount on every change).
// Letting the caller spread the helper keeps their keys intact.
export const HorizontalCarousel: React.FC<Props> = ({ children }) => (
  <div
    style={{
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      marginLeft: 'calc(var(--spacing-screen-h, 16px) * -1)',
      marginRight: 'calc(var(--spacing-screen-h, 16px) * -1)',
      paddingLeft: 'var(--spacing-screen-h, 16px)',
      paddingRight: 'var(--spacing-screen-h, 16px)',
      scrollbarWidth: 'none',
    }}
  >
    {children}
  </div>
);

// Style helper for each direct child of <HorizontalCarousel>. Default basis is
// 85% so the next card peeks ~15% past the right edge. Spread into the child's
// style prop alongside the card's own style.
export const carouselItemStyle = (basis: string = '85%'): React.CSSProperties => ({
  flex: `0 0 ${basis}`,
  scrollSnapAlign: 'start',
  // minWidth: 0 lets the flex item shrink to its basis instead of fighting the
  // intrinsic content width (long titles, etc.).
  minWidth: 0,
});
