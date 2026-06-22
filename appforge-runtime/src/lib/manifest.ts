/** Types matching the builder's schema exactly */

import { Prefs } from './platform';

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

// G2 live-config Pieza B: caché en Preferences (localStorage en PWA,
// @capacitor/preferences en nativo via lib/platform). Key SCOPED por
// appId — el webmanifest de cada PWA generada usa `scope: '/${slug}/'`
// path-based (build.processor:1156), así que todas las PWAs servidas
// desde el mismo host comparten un único origen y por tanto el mismo
// localStorage (que es per-origin, NO per-path). Una key fija
// colisionaría: abrir app A y luego app B haría que B leyera la cache
// de A (manifest válido pero del appId equivocado) y se renderizara
// como A. Por eso construimos la key como `${PREFIX}_${appId}` y el
// appId sale del baked (per-app, siempre presente). Si algún día se
// sirven apps por subdominio (orígenes aislados) la key scoped seguirá
// siendo correcta, solo redundante — nunca dañina. Shape atómico: etag
// y manifest en el mismo JSON, una sola operación de set; si la app se
// mata a mitad del write, el parse del próximo arranque falla →
// fallback a baked. Versión 'v1' en el prefix para reservar slot a
// migraciones futuras (si el shape de AppManifest cambia, prefix nuevo
// = ignora cache vieja).
const PREFS_KEY_PREFIX = 'appforge_runtime_config_v1';

let _manifest: AppManifest | null = null;
let _etag: string | null = null;
const _listeners: Array<(m: AppManifest) => void> = [];

// loadManifest contrato preservado (Promise<AppManifest>) — los 14
// consumidores existentes que hacen `await loadManifest()` no se enteran
// del cambio. Internamente:
//   1) Lee el baked (per-app, siempre presente, ~ms de fetch local). De
//      ahí sacamos appId — necesario para construir la key de Prefs
//      scoped a esta app (ver comentario del PREFS_KEY_PREFIX).
//   2) Intenta la cache de Prefs con key `${prefix}_${appId}`. Si existe
//      y es válida, sobrescribe al baked (freshest-wins).
//   3) Dispara refreshManifest() en background.
//   4) Retorna lo inmediato.
export async function loadManifest(): Promise<AppManifest> {
  if (_manifest) return _manifest;

  // 1) Baked siempre primero — per-app empaquetado por build.processor,
  // garantiza appId/apiUrl + snapshot offline para arranque sin red.
  const base = import.meta.env.BASE_URL ?? '/';
  const response = await fetch(`${base}app-manifest.json`);
  if (!response.ok) throw new Error('Failed to load app manifest');
  const baked: AppManifest = await response.json();
  _manifest = baked;

  // 2) Cache scoped por appId (defensa contra colisión inter-app). Si la
  // cache es válida y del MISMO appId que el baked, sobrescribe.
  const cacheKey = `${PREFS_KEY_PREFIX}_${baked.appId}`;
  try {
    const { value } = await Prefs.get({ key: cacheKey });
    if (value) {
      const parsed = JSON.parse(value) as { etag?: string; manifest?: AppManifest };
      if (
        parsed.manifest
        && parsed.manifest.appId === baked.appId
        && parsed.manifest.apiUrl
      ) {
        _manifest = parsed.manifest;
        _etag = parsed.etag ?? null;
      }
    }
  } catch {
    // Cache corrupto, ausente, o appId distinto — seguimos con baked
  }

  // 3) Live refresh en background — no bloquea el arranque. Si falla, el
  // usuario sigue con cache/baked y reintentamos en el próximo cold start.
  refreshManifest().catch(() => { /* silent, ya tenemos algo que pintar */ });

  return _manifest!;
}

// refreshManifest privada — fire-and-forget desde loadManifest. Si llega
// 304, no-op (el caché ya estaba fresco, cero bytes). Si llega 200, merge,
// persiste y notifica. Si error/red caída, no-op (la sesión viva sigue con
// lo que tenga).
//
// MERGE: schema/designTokens/appConfig vienen del live (fuente de verdad
// para todo lo soft). appId/apiUrl/appName se preservan del bootstrap (el
// endpoint NO los emite — son del baked). Reemplazo TOTAL de appConfig,
// no spread: si el cliente desactivó splash, el live lo omite y debe
// quedar omitido (un spread mantendría el splash zombie del baked).
//
// INVARIANTE ACOPLADO con Pieza A (runtime-config.service.ts whitelist):
// los subcampos de appConfig emitidos por el endpoint deben coincidir
// con los que el runtime consume. Hoy son exactamente
// {splash, onboarding, terms, privacyUrlResolved} en ambos lados, medido.
// Si en el futuro se añade un quinto subcampo consumido, hay que tocarlo
// en LOS DOS sitios o desaparece en silencio tras el primer refresh.
async function refreshManifest(): Promise<void> {
  if (!_manifest) return;

  const url = `${_manifest.apiUrl}/apps/${_manifest.appId}/runtime-config`;
  const headers: Record<string, string> = {};
  if (_etag) headers['If-None-Match'] = _etag;

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: 'no-store' });
  } catch {
    return; // red caída, sigue con cached/baked
  }

  if (response.status === 304) return; // sin cambios respecto al ETag guardado
  if (!response.ok) return; // server error, no tocamos la sesión

  let live: {
    schema: CanvasElement[];
    designTokens: DesignTokens;
    appConfig: AppManifest['appConfig'];
  };
  try {
    live = await response.json();
  } catch {
    return; // body malformado, mantener cached
  }

  const newEtag = response.headers.get('ETag');

  const merged: AppManifest = {
    appId: _manifest.appId,
    apiUrl: _manifest.apiUrl,
    appName: _manifest.appName,
    schema: live.schema,
    designTokens: live.designTokens,
    appConfig: live.appConfig,
  };

  _manifest = merged;
  _etag = newEtag;

  // Persist para el próximo cold start (atómico: etag + manifest en una
  // key scoped por appId, ver comentario de PREFS_KEY_PREFIX para el porqué)
  try {
    await Prefs.set({
      key: `${PREFS_KEY_PREFIX}_${_manifest.appId}`,
      value: JSON.stringify({ etag: _etag, manifest: _manifest }),
    });
  } catch {
    // Persist falló — la sesión viva sigue OK, próximo arranque pedirá fresh
  }

  // Notificar listeners (App.tsx decide si aplica a la sesión viva según
  // phase, por (a) firmado: live NO toca la sesión si phase!=='ready')
  _listeners.forEach((fn) => {
    try {
      fn(_manifest!);
    } catch {
      // Listener throw no debe afectar a los demás listeners
    }
  });
}

export function getManifest(): AppManifest | null {
  return _manifest;
}

// G2 live-config Pieza B: suscripción a refresh exitosos. Patrón copiado
// de auth.ts:_listeners. App.tsx se suscribe SOLO cuando phase==='ready'
// y unsubscribe al cambiar de fase — eso implementa el patrón (a): si el
// usuario está en splash/onboarding/terms cuando aterriza un refresh, no
// hay listener activo, el live solo va a Prefs para el próximo arranque
// y NO toca la sesión viva (no le cambia el documento legal bajo los pies
// al usuario, no le resetea el splash, etc).
export function onManifestUpdate(fn: (m: AppManifest) => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}
