/** Types matching the builder's schema exactly */

export interface CanvasElement {
  id: string;
  moduleId: string;
  config: Record<string, unknown>;
  tabIndex?: number;
  tabLabel?: string;
  tabIcon?: string;
}

export interface DesignTokens {
  colors: {
    primary: { main: string; dark: string; light: string };
    secondary: { main: string; dark: string; light: string };
    accent: { main: string; dark: string; light: string };
    surface: { background: string; card: string; variant: string };
    text: { primary: string; secondary: string; on_primary: string };
    feedback: { success: string; warning: string; error: string };
    navigation: { background: string; active: string; inactive: string; indicator: string };
    extras: { divider: string; overlay: string; shimmer_base: string; shimmer_highlight: string };
  };
  typography: {
    families: { display: string; heading: string; body: string; mono: string };
    scale: Record<string, string>;
    weight: Record<string, string>;
    line_height: Record<string, string>;
    letter_spacing: Record<string, string>;
  };
  shape: {
    radius: Record<string, string>;
    components: Record<string, string>;
    shadow: Record<string, string>;
    shadow_color: string;
  };
  spacing: {
    screen_padding_h: string;
    screen_padding_v: string;
    card_padding: string;
    section_gap: string;
    item_gap: string;
    icon_size: Record<string, string>;
  };
  navigation: {
    style: string;
    tab_count: number;
    show_labels: boolean;
    label_size: string;
    icon_style: string;
    active_indicator: string;
  };
  imagery: Record<string, string>;
}

export interface AppManifest {
  appId: string;
  appName: string;
  apiUrl: string;
  schema: CanvasElement[];
  designTokens: DesignTokens;
  appConfig: {
    icon?: { url: string };
    // Texto que el backend inyecta en los OG meta tags del PWA deployed.
    // El runtime nativo no lo renderiza; declarado aquí solo para mantener
    // el shape coherente con AppConfig del builder (evita drift #57).
    description?: string;
    splash?: {
      enabled: boolean;
      type: 'color' | 'image';
      backgroundColor?: string;
      backgroundImageUrl?: string;
      logoUrl?: string;
      duration: number;
    };
    onboarding?: {
      enabled: boolean;
      slides: Array<{
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        order: number;
      }>;
    };
    // Términos y privacidad — shape simétrico { content?, url? }:
    //   - content: rich-HTML para renderizar inline (TermsScreen lo consume).
    //   - url: URL externa a documento legal del cliente (Commit C habilita
    //     que TermsScreen abra esa URL con Browser.open si está presente).
    // privacy.url se hornea como `privacyUrlResolved` por build.processor:
    // su valor o, si vacío, la URL de la página generada en el builder SPA.
    // Esa URL resuelta es la declarable en Play Console.
    terms?: { content?: string; url?: string };
    privacy?: { content?: string; url?: string };
    // G2 Pieza 2: URL resuelta y horneada por build.processor para el link
    // "Política de privacidad" del UserProfileRuntime. Es privacy.url si el
    // cliente la configuró, si no la página pública generada
    // (<builder-host>/app-user/privacy/<appId>), si no null. El runtime no
    // re-implementa la regla — lee el string final. Resolver compartido en
    // tracking-urls.resolvePrivacyUrl() para garantizar paridad entre los
    // dos manifest sites (Capacitor + PWA dist).
    privacyUrlResolved?: string | null;
    pushEnabled?: boolean;
  };
}

let _manifest: AppManifest | null = null;

export async function loadManifest(): Promise<AppManifest> {
  if (_manifest) return _manifest;
  const base = import.meta.env.BASE_URL ?? '/';
  const response = await fetch(`${base}app-manifest.json`);
  if (!response.ok) throw new Error('Failed to load app manifest');
  _manifest = await response.json();
  return _manifest!;
}

export function getManifest(): AppManifest | null {
  return _manifest;
}
