import React, { useEffect, useState, useCallback } from 'react';
import { Splash } from './lib/platform';
import { loadManifest, type AppManifest } from './lib/manifest';
import { applyDesignTokens } from './lib/design-tokens';
import { initPush } from './lib/push';
import { initAuth } from './lib/auth';
import { initAnalytics } from './lib/analytics';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { TermsScreen } from './components/TermsScreen';
import { AppShell } from './components/AppShell';

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
        } else if (m.appConfig.terms?.content && !localStorage.getItem('appforge_terms_accepted')) {
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
    return m?.appConfig.terms?.content && !localStorage.getItem('appforge_terms_accepted');
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
      {phase === 'terms' && manifest.appConfig.terms?.content && (
        <TermsScreen content={manifest.appConfig.terms.content} onAccept={handleTermsAccept} />
      )}
      {phase === 'ready' && <AppShell manifest={manifest} />}
    </>
  );
};
