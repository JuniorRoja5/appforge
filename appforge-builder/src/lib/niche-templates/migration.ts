import type { DesignTokens } from './types';

/**
 * The old flat DesignTokens format (11 fields).
 * Used by apps created before the template overhaul.
 */
export interface LegacyDesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
  fontFamily: string;
  fontFamilyHeading: string;
  borderRadius: string;
  spacing: string;
}

/** Type guard: returns true if tokens match the old flat format */
export function isLegacyDesignTokens(tokens: unknown): tokens is LegacyDesignTokens {
  if (!tokens || typeof tokens !== 'object') return false;
  const t = tokens as Record<string, unknown>;
  return typeof t.primaryColor === 'string' && typeof t.fontFamily === 'string' && !('colors' in t);
}

// ── HSL helpers for deriving dark/light variants ──────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = h / 360;
  const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hNorm) * 255);
  const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function darken(hex: string, amount = 0.15): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

export function lighten(hex: string, amount = 0.2): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.min(1, l + amount));
}

/**
 * Converts old flat tokens to the new nested DesignTokens format.
 * Derives missing values with sensible defaults.
 */
export function migrateDesignTokens(legacy: LegacyDesignTokens): DesignTokens {
  const radiusNum = parseInt(legacy.borderRadius) || 8;
  const spacingNum = parseInt(legacy.spacing) || 16;

  return {
    colors: {
      primary: { main: legacy.primaryColor, dark: darken(legacy.primaryColor), light: lighten(legacy.primaryColor) },
      secondary: { main: legacy.secondaryColor, dark: darken(legacy.secondaryColor), light: lighten(legacy.secondaryColor) },
      accent: { main: legacy.accentColor, dark: darken(legacy.accentColor), light: lighten(legacy.accentColor) },
      surface: { background: legacy.backgroundColor, card: legacy.surfaceColor, variant: lighten(legacy.surfaceColor, 0.03) },
      text: { primary: legacy.textColor, secondary: legacy.textSecondary, on_primary: '#FFFFFF' },
      feedback: { success: '#22C55E', warning: '#F59E0B', error: '#EF4444' },
      navigation: { background: legacy.surfaceColor, active: legacy.primaryColor, inactive: legacy.textSecondary, indicator: lighten(legacy.primaryColor, 0.3) },
      extras: { divider: '#E5E7EB', overlay: 'rgba(0,0,0,0.45)', shimmer_base: '#E5E7EB', shimmer_highlight: '#F3F4F6' },
    },
    typography: {
      families: { display: legacy.fontFamilyHeading, heading: legacy.fontFamilyHeading, body: legacy.fontFamily, mono: legacy.fontFamily },
      scale: { xs: '11px', sm: '13px', base: '15px', md: '17px', lg: '20px', xl: '24px', xxl: '32px', xxxl: '42px' },
      weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
      line_height: { tight: '1.15', normal: '1.5', relaxed: '1.75' },
      letter_spacing: { tight: '-0.02em', normal: '0em', wide: '0.04em', wider: '0.08em' },
    },
    shape: {
      radius: {
        none: '0px',
        xs: `${Math.max(2, radiusNum - 6)}px`,
        sm: `${Math.max(4, radiusNum - 4)}px`,
        md: `${radiusNum}px`,
        lg: `${radiusNum + 4}px`,
        xl: `${radiusNum + 12}px`,
        full: '9999px',
      },
      components: {
        card: `${radiusNum}px`,
        button: `${radiusNum}px`,
        input: `${Math.max(4, radiusNum - 4)}px`,
        badge: '9999px',
        image: `${radiusNum}px`,
      },
      shadow: {
        sm: '0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 12px 32px rgba(0,0,0,0.12)',
      },
      shadow_color: 'rgba(0,0,0,0.1)',
    },
    spacing: {
      screen_padding_h: `${spacingNum + 4}px`,
      screen_padding_v: `${spacingNum}px`,
      card_padding: `${spacingNum}px`,
      section_gap: `${spacingNum + 8}px`,
      item_gap: `${spacingNum - 4}px`,
      icon_size: { sm: '20px', md: '24px', lg: '32px' },
    },
    navigation: {
      style: 'bottom_tabs',
      tab_count: 4,
      show_labels: true,
      label_size: '10px',
      icon_style: 'outline',
      active_indicator: 'pill',
    },
    imagery: {
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
      overlay_style: 'gradient_bottom',
      icon_theme: 'minimal',
    },
  };
}
