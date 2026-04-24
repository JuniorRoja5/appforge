import type { DesignTokens } from './types';
import { isLegacyDesignTokens, migrateDesignTokens } from './migration';

const loadedFonts = new Set<string>();

function loadGoogleFont(fontFamily: string): void {
  if (!fontFamily || loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

function loadAllFonts(tokens: DesignTokens): void {
  const families = new Set([
    tokens.typography.families.display,
    tokens.typography.families.heading,
    tokens.typography.families.body,
    tokens.typography.families.mono,
  ]);
  families.forEach(loadGoogleFont);
}

function fontStack(family: string): string {
  return `'${family}', sans-serif`;
}

/**
 * Resolves raw tokens (could be legacy or new format) into a normalized DesignTokens.
 */
export function resolveDesignTokens(raw: unknown): DesignTokens | null {
  if (!raw || typeof raw !== 'object') return null;
  if (isLegacyDesignTokens(raw)) return migrateDesignTokens(raw);
  return raw as DesignTokens;
}

/**
 * Generates a Record<string, string> of CSS custom properties from DesignTokens.
 * Apply these as inline `style` on the canvas preview container.
 * Also loads Google Fonts as a side effect.
 */
export function getDesignTokenStyles(rawTokens: unknown): Record<string, string> {
  const tokens = resolveDesignTokens(rawTokens);
  if (!tokens) return {};

  loadAllFonts(tokens);

  const { colors, typography, shape, spacing } = tokens;

  return {
    // ── Colors: Primary ──
    '--af-color-primary': colors.primary.main,
    '--af-color-primary-dark': colors.primary.dark,
    '--af-color-primary-light': colors.primary.light,
    // ── Colors: Secondary ──
    '--af-color-secondary': colors.secondary.main,
    '--af-color-secondary-dark': colors.secondary.dark,
    '--af-color-secondary-light': colors.secondary.light,
    // ── Colors: Accent ──
    '--af-color-accent': colors.accent.main,
    '--af-color-accent-dark': colors.accent.dark,
    '--af-color-accent-light': colors.accent.light,
    // ── Colors: Surfaces ──
    '--af-surface-bg': colors.surface.background,
    '--af-surface-card': colors.surface.card,
    '--af-surface-variant': colors.surface.variant,
    // ── Colors: Text ──
    '--af-text-primary': colors.text.primary,
    '--af-text-secondary': colors.text.secondary,
    '--af-text-on-primary': colors.text.on_primary,
    // ── Colors: Feedback ──
    '--af-feedback-success': colors.feedback.success,
    '--af-feedback-warning': colors.feedback.warning,
    '--af-feedback-error': colors.feedback.error,
    // ── Colors: Navigation ──
    '--af-nav-bg': colors.navigation.background,
    '--af-nav-active': colors.navigation.active,
    '--af-nav-inactive': colors.navigation.inactive,
    '--af-nav-indicator': colors.navigation.indicator,
    // ── Colors: Extras ──
    '--af-divider': colors.extras.divider,
    '--af-overlay': colors.extras.overlay,
    '--af-shimmer-base': colors.extras.shimmer_base,
    '--af-shimmer-highlight': colors.extras.shimmer_highlight,

    // ── Typography: Families ──
    '--af-font-display': fontStack(typography.families.display),
    '--af-font-heading': fontStack(typography.families.heading),
    '--af-font-body': fontStack(typography.families.body),
    '--af-font-mono': fontStack(typography.families.mono),
    // ── Typography: Scale ──
    '--af-text-xs': typography.scale.xs,
    '--af-text-sm': typography.scale.sm,
    '--af-text-base': typography.scale.base,
    '--af-text-md': typography.scale.md,
    '--af-text-lg': typography.scale.lg,
    '--af-text-xl': typography.scale.xl,
    '--af-text-xxl': typography.scale.xxl,
    '--af-text-xxxl': typography.scale.xxxl,
    // ── Typography: Weight ──
    '--af-weight-regular': typography.weight.regular,
    '--af-weight-medium': typography.weight.medium,
    '--af-weight-semibold': typography.weight.semibold,
    '--af-weight-bold': typography.weight.bold,
    '--af-weight-extrabold': typography.weight.extrabold,
    // ── Typography: Line Height ──
    '--af-lh-tight': typography.line_height.tight,
    '--af-lh-normal': typography.line_height.normal,
    '--af-lh-relaxed': typography.line_height.relaxed,
    // ── Typography: Letter Spacing ──
    '--af-ls-tight': typography.letter_spacing.tight,
    '--af-ls-normal': typography.letter_spacing.normal,
    '--af-ls-wide': typography.letter_spacing.wide,
    '--af-ls-wider': typography.letter_spacing.wider,

    // ── Shape: Radius ──
    '--af-radius-none': shape.radius.none,
    '--af-radius-xs': shape.radius.xs,
    '--af-radius-sm': shape.radius.sm,
    '--af-radius-md': shape.radius.md,
    '--af-radius-lg': shape.radius.lg,
    '--af-radius-xl': shape.radius.xl,
    '--af-radius-full': shape.radius.full,
    // ── Shape: Component Radii ──
    '--af-radius-card': shape.components.card,
    '--af-radius-button': shape.components.button,
    '--af-radius-input': shape.components.input,
    '--af-radius-badge': shape.components.badge,
    '--af-radius-image': shape.components.image,
    // ── Shape: Shadows ──
    '--af-shadow-sm': shape.shadow.sm,
    '--af-shadow-md': shape.shadow.md,
    '--af-shadow-lg': shape.shadow.lg,
    '--af-shadow-color': shape.shadow_color,

    // ── Spacing ──
    '--af-spacing-screen-h': spacing.screen_padding_h,
    '--af-spacing-screen-v': spacing.screen_padding_v,
    '--af-spacing-card': spacing.card_padding,
    '--af-spacing-section': spacing.section_gap,
    '--af-spacing-item': spacing.item_gap,
    '--af-icon-sm': spacing.icon_size.sm,
    '--af-icon-md': spacing.icon_size.md,
    '--af-icon-lg': spacing.icon_size.lg,

    // ── Legacy aliases (backward compat with old --af-* consumers) ──
    '--af-primary': colors.primary.main,
    '--af-secondary': colors.secondary.main,
    '--af-accent': colors.accent.main,
    '--af-bg': colors.surface.background,
    '--af-surface': colors.surface.card,
    '--af-text': colors.text.primary,
    '--af-text-secondary-legacy': colors.text.secondary,
    '--af-font': fontStack(typography.families.body),
    '--af-font-heading-legacy': fontStack(typography.families.heading),
    '--af-radius': shape.components.card,
    '--af-spacing': spacing.card_padding,
  };
}
