import React, { useEffect, useState, useCallback } from 'react';
import { Splash } from './lib/platform';
import { loadManifest, getManifest, onManifestUpdate, type AppManifest } from './lib/manifest';
import { applyDesignTokens } from './lib/design-tokens';
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

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<AppManifest | null>(null);
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[AppForge] Loading manifest...');
    loadManifest()
      .then((m) => {
        console.log('[AppForge] Manifest loaded:', m.appName, 'schema elements:', m.schema?.length);
        setManifest(m);
        if (m.designTokens) applyDesignTokens(m.designTokens);

        // Initialize push notifications (no-op on web or if module not present)
        initPush().catch((err) => console.warn('[Push] Init failed:', err));

        // Initialize app-user auth (restore session from Preferences)
        initAuth().catch((err) => console.warn('[Auth] Init failed:', err));

        // Initialize analytics tracking (device info, session, flush timer)
        initAnalytics().catch((err) => console.warn('[Analytics] Init failed:', err));

        // Determine initial phase
        if (m.appConfig.splash?.enabled) {
          setPhase('splash');
          // Delay hiding native splash so the JS splash screen paints first
          setTimeout(() => Splash.hide().catch(() => {}), 150);
        } else if (m.appConfig.onboarding?.enabled && !localStorage.getItem('appforge_onboarding_seen')) {
          setPhase('onboarding');
        } else if (
          // G2 Commit C-fix: sincroniza el guard de entrada de fase con el
          // guard del render (línea 115). Sin el `|| terms?.url`, un cliente
          // con solo URL externa nunca entra en 'terms' y la app salta de
          // splash a 'ready' sin pasar por TermsScreen. El JSX corregido
          // quedaba como código muerto para ese caso. Build verde no caza
          // dos condiciones que deben coincidir pero no lo hacen.
          (m.appConfig.terms?.content || m.appConfig.terms?.url)
          && !localStorage.getItem('appforge_terms_accepted')
        ) {
          setPhase('terms');
        } else {
          setPhase('ready');
          // No JS splash — hide native splash immediately
          Splash.hide().catch(() => {});
        }
      })
      .catch((err) => {
        console.error('[AppForge] Manifest load failed:', err);
        Splash.hide().catch(() => {});
        setError(err.message);
      });
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
    if (manifest?.appConfig.onboarding?.enabled && !localStorage.getItem('appforge_onboarding_seen')) {
      setPhase('onboarding');
    } else if (needsTerms(manifest)) {
      setPhase('terms');
    } else {
      setPhase('ready');
    }
  }, [manifest, needsTerms]);

  const handleOnboardingFinish = useCallback(() => {
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
  useEffect(() => {
    if (phase !== 'ready') return;
    const current = getManifest();
    if (current) {
      setManifest(current);
      if (current.designTokens) applyDesignTokens(current.designTokens);
    }
    const unsubscribe = onManifestUpdate((live) => {
      setManifest(live);
      if (live.designTokens) applyDesignTokens(live.designTokens);
    });
    return unsubscribe;
  }, [phase]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600 mb-2">Error al cargar la app</p>
          <p className="text-sm text-gray-500">{error}</p>
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
      {phase === 'ready' && <AppShell manifest={manifest} />}
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
