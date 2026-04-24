import type { DesignTokens } from './manifest';

/**
 * Applies DesignTokens as CSS custom properties on :root,
 * so Tailwind and inline styles can reference them.
 */
export function applyDesignTokens(tokens: DesignTokens): void {
  const root = document.documentElement;

  // Colors
  const c = tokens.colors;
  root.style.setProperty('--color-primary', c.primary.main);
  root.style.setProperty('--color-primary-dark', c.primary.dark);
  root.style.setProperty('--color-primary-light', c.primary.light);
  root.style.setProperty('--color-secondary', c.secondary.main);
  root.style.setProperty('--color-secondary-dark', c.secondary.dark);
  root.style.setProperty('--color-secondary-light', c.secondary.light);
  root.style.setProperty('--color-accent', c.accent.main);
  root.style.setProperty('--color-accent-dark', c.accent.dark);
  root.style.setProperty('--color-accent-light', c.accent.light);
  root.style.setProperty('--color-surface-bg', c.surface.background);
  root.style.setProperty('--color-surface-card', c.surface.card);
  root.style.setProperty('--color-surface-variant', c.surface.variant);
  root.style.setProperty('--color-text-primary', c.text.primary);
  root.style.setProperty('--color-text-secondary', c.text.secondary);
  root.style.setProperty('--color-text-on-primary', c.text.on_primary);
  root.style.setProperty('--color-feedback-success', c.feedback.success);
  root.style.setProperty('--color-feedback-warning', c.feedback.warning);
  root.style.setProperty('--color-feedback-error', c.feedback.error);
  root.style.setProperty('--color-nav-bg', c.navigation.background);
  root.style.setProperty('--color-nav-active', c.navigation.active);
  root.style.setProperty('--color-nav-inactive', c.navigation.inactive);
  root.style.setProperty('--color-nav-indicator', c.navigation.indicator);
  root.style.setProperty('--color-divider', c.extras.divider);

  // Typography
  const t = tokens.typography;
  root.style.setProperty('--font-display', t.families.display);
  root.style.setProperty('--font-heading', t.families.heading);
  root.style.setProperty('--font-body', t.families.body);
  root.style.setProperty('--font-mono', t.families.mono);

  // Shape
  const s = tokens.shape;
  root.style.setProperty('--radius-card', s.components.card);
  root.style.setProperty('--radius-button', s.components.button);
  root.style.setProperty('--radius-input', s.components.input);
  root.style.setProperty('--radius-badge', s.components.badge);
  root.style.setProperty('--shadow-sm', s.shadow.sm);
  root.style.setProperty('--shadow-md', s.shadow.md);
  root.style.setProperty('--shadow-lg', s.shadow.lg);

  // Spacing
  const sp = tokens.spacing;
  root.style.setProperty('--spacing-screen-h', sp.screen_padding_h);
  root.style.setProperty('--spacing-screen-v', sp.screen_padding_v);
  root.style.setProperty('--spacing-card', sp.card_padding);
  root.style.setProperty('--spacing-section', sp.section_gap);
  root.style.setProperty('--spacing-item', sp.item_gap);

  // Apply background
  document.body.style.backgroundColor = c.surface.background;
  document.body.style.color = c.text.primary;
}
