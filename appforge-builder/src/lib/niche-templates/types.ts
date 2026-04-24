// ── Color Tokens ──────────────────────────────────────────

export interface ColorVariant {
  main: string;
  dark: string;
  light: string;
}

export interface ColorTokens {
  primary: ColorVariant;
  secondary: ColorVariant;
  accent: ColorVariant;
  surface: {
    background: string;
    card: string;
    variant: string;
  };
  text: {
    primary: string;
    secondary: string;
    on_primary: string;
  };
  feedback: {
    success: string;
    warning: string;
    error: string;
  };
  navigation: {
    background: string;
    active: string;
    inactive: string;
    indicator: string;
  };
  extras: {
    divider: string;
    overlay: string;
    shimmer_base: string;
    shimmer_highlight: string;
  };
}

// ── Typography Tokens ─────────────────────────────────────

export interface TypographyTokens {
  families: {
    display: string;
    heading: string;
    body: string;
    mono: string;
  };
  scale: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    xxxl: string;
  };
  weight: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
  };
  line_height: {
    tight: string;
    normal: string;
    relaxed: string;
  };
  letter_spacing: {
    tight: string;
    normal: string;
    wide: string;
    wider: string;
  };
}

// ── Shape Tokens ──────────────────────────────────────────

export interface ShapeTokens {
  radius: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  components: {
    card: string;
    button: string;
    input: string;
    badge: string;
    image: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  shadow_color: string;
}

// ── Spacing Tokens ────────────────────────────────────────

export interface SpacingTokens {
  screen_padding_h: string;
  screen_padding_v: string;
  card_padding: string;
  section_gap: string;
  item_gap: string;
  icon_size: {
    sm: string;
    md: string;
    lg: string;
  };
}

// ── Navigation Tokens ─────────────────────────────────────

export type NavigationStyle = 'bottom_tabs' | 'side_drawer' | 'top_tabs';
export type IconStyle = 'outline' | 'filled' | 'duotone';
export type ActiveIndicator = 'pill' | 'dot' | 'underline' | 'none';

export interface NavigationTokens {
  style: NavigationStyle;
  tab_count: number;
  show_labels: boolean;
  label_size: string;
  icon_style: IconStyle;
  active_indicator: ActiveIndicator;
}

// ── Imagery Tokens ────────────────────────────────────────

export type HeroAspectRatio = '16:9' | '4:3' | '1:1' | '3:2' | '21:9';
export type CardImageStyle = 'cover' | 'contain' | 'portrait';
export type PlaceholderStyle = 'gradient' | 'blur' | 'icon' | 'solid';
export type OverlayStyle = 'gradient_bottom' | 'gradient_dark' | 'solid' | 'none';
export type IconTheme = 'minimal' | 'bold' | 'rounded' | 'duotone';

export interface ImageryTokens {
  hero_aspect_ratio: HeroAspectRatio;
  card_image_style: CardImageStyle;
  placeholder_style: PlaceholderStyle;
  overlay_style: OverlayStyle;
  icon_theme: IconTheme;
}

// ── Main DesignTokens ─────────────────────────────────────

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  shape: ShapeTokens;
  spacing: SpacingTokens;
  navigation: NavigationTokens;
  imagery: ImageryTokens;
}

// ── Template Types ────────────────────────────────────────

export type TemplateCategory =
  | 'food'
  | 'health'
  | 'beauty'
  | 'fitness'
  | 'sports'
  | 'retail'
  | 'education'
  | 'lifestyle'
  | 'professional';

export interface TemplateModuleEntry {
  module_id: string;
  order: number;
  tab_position: number | null;
  tab_label: string | null;
  tab_icon: string | null;
  is_home: boolean;
  default_config: Record<string, unknown>;
}

export interface TemplateScreen {
  name: string;
  module_id: string;
  layout_description: string;
  key_ui_elements: string[];
}

export interface NicheTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: TemplateCategory;
  preview_emoji: string;
  target_audience: string;
  design_tokens: DesignTokens;
  default_modules: TemplateModuleEntry[];
  screens: TemplateScreen[];
  onboarding_hint: string;
  suggested_app_name: string;
  suggested_icon_concept: string;
}
