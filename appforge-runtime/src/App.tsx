import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Splash, Prefs } from './lib/platform';
import { loadManifest, getManifest, onManifestUpdate, isPreviewMode, updateManifestFromMessage, PreviewManifestError, type AppManifest } from './lib/manifest';
import { applyDesignTokens } from './lib/design-tokens';
import { sendPreviewError } from './lib/preview-bridge';
import { computeOnboardingHash, getOnboardingHashKey } from './lib/onboarding-hash';
import { initPush } from './lib/push';
import { initAuth } from './lib/auth';
import { initAnalytics } from './lib/analytics';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { TermsScreen } from './components/TermsScreen';
import { AppShell } from './components/AppShell';
import { PWAInstallBanner } from './components/PWAInstallBanner';

// Register all modules
import './modules';

type AppPhase = 'loading' | 'splash' | 'onboarding' | 'terms' | 'ready';

// isPreviewMode importado de lib/manifest.ts — única fuente de verdad,
// usada también ahí para decidir si saltar el baked y fetchear
// runtime-config directo. Ver el JSDoc del helper en lib/manifest.ts.

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<AppManifest | null>(null);
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [error, setError] = useState('');
  // Phase 2.2b — forceTab as a single-shot command from the builder.
  // The nonce changes on every send, so AppShell's useEffect (with
  // forceTab as object dependency) fires once per command — never
  // again on internal activeTab changes. Without the nonce + with
  // activeTab in the deps, manual tab clicks would re-trigger the
  // effect and snap the user back to the last forced tab, trapping
  // them. The nonce makes navigate-to-tab a fire-once command, not
  // a sticky state.
  const [forceTab, setForceTab] = useState<{ tabIndex: number; nonce: number } | null>(null);
  // Tracks whether we've already sent the preview-ready handshake.
  // The handshake must fire exactly once — when phase reaches
  // 'ready' the first time. Without this ref, switching phase via
  // the preview-phase selector ('ready' → 'onboarding' → 'ready')
  // would re-send it on every return to 'ready'.
  const handshakeSentRef = useRef(false);
  // Phase 2.2d — onboarding versioned by content hash. `currentHash`
  // is the hash of the live onboarding config in this session;
  // `seenHash` is the hash the end-user previously accepted (loaded
  // from Prefs at boot). Re-show the onboarding when they differ —
  // marketing updates reach all users, not only fresh installs.
  // Both stored in refs (not state) because they don't drive the
  // visual render — they only gate the phase transitions inside
  // useCallback handlers that already have manifest as a dep.
  const currentOnboardingHashRef = useRef<string | null>(null);
  const seenOnboardingHashRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[AppForge] Loading manifest...');
    const previewMode = isPreviewMode();
    // Wrapper async to await Prefs.get for the onboarding hash —
    // the rest of the chain remains identical.
    (async () => {
      let m: AppManifest;
      try {
        m = await loadManifest();
      } catch (err) {
        console.error('[AppForge] Manifest load failed:', err);
        Splash.hide().catch(() => {});
        // Phase 2.3 — emit preview-error to the builder so the
        // PreviewErrorBanner can pick the right copy + show
        // "Reintentar". Only fires in preview mode (parentOrigin
        // is allowlisted) — production end-users with no
        // parentOrigin make this a silent no-op.
        if (isPreviewMode() && err instanceof PreviewManifestError) {
          sendPreviewError(err.code, err.message);
        } else if (isPreviewMode()) {
          // Generic error in preview mode (e.g. JSON parse failure)
          // — still inform the builder so the banner shows.
          sendPreviewError('manifest-unknown', (err as Error).message);
        }
        setError((err as Error).message);
        return;
      }

      console.log('[AppForge] Manifest loaded:', m.appName, 'schema elements:', m.schema?.length, previewMode ? '(preview mode)' : '');
      setManifest(m);
      if (m.designTokens) applyDesignTokens(m.designTokens);

      // Initialize app-user auth (restore session from Preferences).
      // Se inicializa también en preview — es no-op si no hay sesión,
      // cubre el caso de módulos que leen `getUser()` defensivamente.
      initAuth().catch((err) => console.warn('[Auth] Init failed:', err));

      if (!previewMode) {
        // Push notifications + analytics: skipped en preview-mode.
        initPush().catch((err) => console.warn('[Push] Init failed:', err));
        initAnalytics().catch((err) => console.warn('[Analytics] Init failed:', err));
      }

      // Phase 2.2d — pre-compute the onboarding content hash for
      // this session and load the previously-seen hash from Prefs.
      // Both go into refs that handleSplashFinish /
      // handleOnboardingFinish read when deciding the next phase.
      // In preview mode we skip the Prefs read entirely (the
      // constructor doesn't need the "seen" gate; preview is for
      // inspecting content).
      const currentHash = computeOnboardingHash(m.appConfig.onboarding);
      currentOnboardingHashRef.current = currentHash;
      if (!previewMode) {
        try {
          const { value } = await Prefs.get({ key: getOnboardingHashKey(m.appId) });
          seenOnboardingHashRef.current = value ?? null;
        } catch {
          seenOnboardingHashRef.current = null;
        }
      }
      const onboardingNeedsShow = !previewMode
        && !!m.appConfig.onboarding?.enabled
        && (m.appConfig.onboarding?.slides?.length ?? 0) > 0
        && currentHash !== seenOnboardingHashRef.current;

      if (previewMode) {
        // Preview-mode: directo a 'ready'.
        setPhase('ready');
        Splash.hide().catch(() => {});
      } else if (m.appConfig.splash?.enabled) {
        setPhase('splash');
        setTimeout(() => Splash.hide().catch(() => {}), 150);
      } else if (onboardingNeedsShow) {
        setPhase('onboarding');
      } else if (
        (m.appConfig.terms?.content || m.appConfig.terms?.url)
        && !localStorage.getItem('appforge_terms_accepted')
      ) {
        setPhase('terms');
      } else {
        setPhase('ready');
        Splash.hide().catch(() => {});
      }
    })();
  }, []);

  const needsTerms = useCallback((m: AppManifest | null) => {
    // G2 Commit C-fix: helper compartido por handleSplashFinish (línea ~70)
    // y handleOnboardingFinish (línea ~78). Sin el `|| terms?.url`, las dos
    // transiciones salen de splash/onboarding directo a 'ready' aunque el
    // cliente tenga URL externa configurada. Fijar este helper cubre los
    // dos caminos a la vez — sin tocar las transiciones individualmente.
    return (
      (m?.appConfig.terms?.content || m?.appConfig.terms?.url)
      && !localStorage.getItem('appforge_terms_accepted')
    );
  }, []);

  const handleSplashFinish = useCallback(() => {
    // Phase 2.2b — in preview mode, finishing splash returns to
    // 'ready' (the App view) instead of advancing to onboarding /
    // terms. The constructor is using a preview-phase selector to
    // INSPECT each phase visually; advancing through the natural
    // flow would hijack their navigation. Real PWA / AAB end-users
    // keep the original chain.
    if (isPreviewMode()) {
      setPhase('ready');
      return;
    }
    // Phase 2.2d — re-use the hash comparison cached at boot.
    const onboardingNeedsShow = !!manifest?.appConfig.onboarding?.enabled
      && (manifest?.appConfig.onboarding?.slides?.length ?? 0) > 0
      && currentOnboardingHashRef.current !== seenOnboardingHashRef.current;
    if (onboardingNeedsShow) {
      setPhase('onboarding');
    } else if (needsTerms(manifest)) {
      setPhase('terms');
    } else {
      setPhase('ready');
    }
  }, [manifest, needsTerms]);

  const handleOnboardingFinish = useCallback(() => {
    // Phase 2.2b — same reasoning as handleSplashFinish: in preview
    // we always return to 'ready' after viewing onboarding, never
    // advance to terms.
    if (isPreviewMode()) {
      setPhase('ready');
      return;
    }
    // Phase 2.2d — persist the hash the end-user just accepted. The
    // next cold start will read it back; if the constructor has
    // updated the onboarding content in the meantime, the live
    // hash differs and the new version shows. If unchanged, this
    // call is idempotent. Fire-and-forget: errors here shouldn't
    // block the user from entering the app.
    if (manifest?.appId && currentOnboardingHashRef.current) {
      const hash = currentOnboardingHashRef.current;
      Prefs.set({ key: getOnboardingHashKey(manifest.appId), value: hash })
        .then(() => { seenOnboardingHashRef.current = hash; })
        .catch((err) => console.warn('[Onboarding] hash persist failed:', err));
    }
    if (needsTerms(manifest)) {
      setPhase('terms');
    } else {
      setPhase('ready');
    }
  }, [manifest, needsTerms]);

  const handleTermsAccept = useCallback(() => {
    setPhase('ready');
  }, []);

  // G2 live-config Pieza B — patrón (a): suscribir al refresh live SOLO
  // cuando phase==='ready'. En splash/onboarding/terms, el live aterriza,
  // actualiza _manifest module-level + Prefs cache para el próximo arranque,
  // pero NO toca la sesión viva (no hay listener suscrito = no setManifest).
  // Eso honra §5 literal: no se le cambia el documento legal a un usuario
  // que aún no aceptó, no se resetea splash a media animación, etc.
  //
  // Al entrar en 'ready' hacemos un SYNC de React state al _manifest más
  // fresco antes de suscribir: si refresh aterrizó durante splash/onboarding/
  // terms, _manifest module-level ya está actualizado pero React state quedó
  // stale; sin este sync el usuario vería el manifest viejo TODA la sesión
  // (el refresh es uno por arranque, no vuelve a dispararse). Este sync
  // tampoco viola §5: en 'ready' las fases gateadas ya pasaron y AppShell
  // no lee appConfig.terms/onboarding/splash — solo schema/designTokens y
  // appConfig.privacyUrlResolved. Si nada cambió, setManifest con valor
  // igual no causa re-render (inocuo).
  //
  // El listener cubre los refreshes que aterricen DESPUÉS de suscribir —
  // AppShell reacciona a schema vía useMemo([schema]) y a designTokens vía
  // las CSS variables reescritas. applyDesignTokens es idempotente — re-
  // llamar es seguro.
  // Phase 2.2b — in PREVIEW mode the subscriber lives in ALL phases
  // (app / onboarding / splash), so edits in the SettingsPanel
  // repaint live regardless of which phase the constructor is
  // inspecting. The original gate (phase === 'ready' only) was
  // correct for production — it honored §5: don't change the legal
  // doc / onboarding under the end-user's feet at runtime — but it
  // made the preview-phase selector silently broken: editing a
  // welcome slide while in 'onboarding' phase did not repaint.
  // In production (NOT preview), the gate stays as before.
  useEffect(() => {
    if (!isPreviewMode() && phase !== 'ready') return;

    const current = getManifest();
    if (current) {
      setManifest(current);
      if (current.designTokens) applyDesignTokens(current.designTokens);
    }
    const unsubscribe = onManifestUpdate((live) => {
      setManifest(live);
      if (live.designTokens) applyDesignTokens(live.designTokens);
    });

    // Preview-as-Runtime Phase 2.1 — handshake fires ONCE, when
    // phase first reaches 'ready' AND we are in preview mode AND
    // we have a parent window. Guard with handshakeSentRef so
    // phase changes via preview-phase selector don't re-send it.
    if (
      !handshakeSentRef.current
      && phase === 'ready'
      && isPreviewMode()
      && window.parent !== window
    ) {
      handshakeSentRef.current = true;
      window.parent.postMessage({ type: 'preview-ready' }, '*');
    }

    return unsubscribe;
  }, [phase]);

  // Preview-as-Runtime Fase 2.1 — listener cross-frame para
  // manifest-update enviado por el builder con debounce 200ms.
  // Verificación estricta de origin: SOLO mensajes provenientes de
  // app.creatu.app son procesados. Cualquier otro origin se ignora
  // en silencio (no log, no toast — no queremos dar señal a un
  // attacker de que el listener existe).
  //
  // En PWA real (no preview), el useEffect retorna early sin montar
  // listener — coste cero en producción del end-user.
  //
  // Listener montado en mount, no en phase==='ready', porque
  // updateManifestFromMessage ya defiende contra _manifest === null
  // (guard interno). Mantenerlo siempre activo evita race: si por
  // algún motivo el preview-ready se envía pero el listener aún no
  // está montado al recibir el primer manifest-update, lo perdemos.
  useEffect(() => {
    if (!isPreviewMode()) return;

    const ALLOWED_ORIGINS = new Set([
      'https://app.creatu.app',
      'https://builder.creatu.app',
    ]);

    const handler = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.has(event.origin)) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'manifest-update' && data.payload) {
        updateManifestFromMessage(data.payload);
        return;
      }

      // Phase 2.2b — navigate-to-tab: single-shot command from the
      // builder. The nonce makes every command a fresh object so
      // AppShell's useEffect (with forceTab in deps, but NOT
      // activeTab) fires exactly once per send. End-user clicks on
      // the runtime's TabBar update activeTab without re-triggering
      // the override — they don't get snapped back to the last
      // forced tab. Two consecutive selects of modules on the same
      // tab still work because the nonce changes both times even
      // if tabIndex repeats.
      if (
        data.type === 'navigate-to-tab'
        && typeof data.tabIndex === 'number'
        && typeof data.nonce === 'number'
      ) {
        setForceTab({ tabIndex: data.tabIndex, nonce: data.nonce });
        return;
      }

      // Phase 2.2b Pieza A — preview-phase: the builder offers a
      // segmented control "App / Bienvenida / Splash". Each option
      // forces the runtime into a phase so the constructor can see
      // what they are designing. Terms is intentionally NOT a
      // selectable phase — it is a gate, not visual content.
      if (data.type === 'preview-phase' && typeof data.phase === 'string') {
        if (data.phase === 'app') setPhase('ready');
        else if (data.phase === 'onboarding') setPhase('onboarding');
        else if (data.phase === 'splash') setPhase('splash');
        // Any other value is ignored silently.
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600 mb-2">Error al cargar la app</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          {/* Phase 2.3 — Reintentar button ONLY in production
              (PWA / AAB end-user). In preview the builder's
              PreviewErrorBanner already shows a "Reintentar" CTA;
              duplicating the button inside the iframe would be
              redundant and confuse (two CTAs that do the same in
              the same viewport). */}
          {!isPreviewMode() && (
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-primary, #4F46E5)',
                color: 'var(--color-text-on-primary, #fff)',
                borderRadius: 'var(--radius-button, 8px)',
              }}
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'loading' || !manifest) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {phase === 'splash' && (
        <SplashScreen config={manifest.appConfig.splash} onFinish={handleSplashFinish} />
      )}
      {phase === 'onboarding' && manifest.appConfig.onboarding && (
        <OnboardingScreen config={manifest.appConfig.onboarding} onFinish={handleOnboardingFinish} />
      )}
      {phase === 'terms' && manifest.appConfig.terms
        && (manifest.appConfig.terms.content || manifest.appConfig.terms.url) && (
        // Guard amplio (content || url): G2 Commit C — un cliente que solo
        // configuró terms.url (sin content inline) también debe ver la
        // pantalla de aceptación. El guard viejo `terms?.content` la dejaba
        // fuera y el cliente se preguntaba por qué su URL no aparecía.
        <TermsScreen
          content={manifest.appConfig.terms.content}
          url={manifest.appConfig.terms.url}
          onAccept={handleTermsAccept}
        />
      )}
      {phase === 'ready' && <AppShell manifest={manifest} forceTab={forceTab} />}
      {/* Bug 2: install banner. Solo cuando phase==='ready' — sin esto
          aparecería sobre splash/onboarding/terms y romperia el flujo
          de bienvenida. Internamente el componente decide visibilidad
          (Android beforeinstallprompt / iOS Safari userAgent / dismiss
          localStorage / standalone mode). */}
      {phase === 'ready' && (
        <PWAInstallBanner
          appName={manifest.appName}
          iconUrl={manifest.appConfig?.icon?.url}
        />
      )}
    </>
  );
};
