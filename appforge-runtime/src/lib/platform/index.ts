/**
 * Platform compatibility layer.
 *
 * When VITE_PLATFORM === 'pwa', Vite evaluates isPwa() as a constant `true`
 * at build time, so tree-shaking removes all Capacitor imports from the PWA bundle.
 * When building for native (default), isPwa() is `false` and Capacitor plugins load normally.
 */

const isPwa = () => import.meta.env.VITE_PLATFORM === 'pwa';

// ── Preferences shim ──
// Native: @capacitor/preferences (persistent key-value store)
// PWA: localStorage
export const Prefs = {
  async get(opts: { key: string }): Promise<{ value: string | null }> {
    if (isPwa()) {
      return { value: localStorage.getItem(opts.key) };
    }
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences.get(opts);
  },
  async set(opts: { key: string; value: string }): Promise<void> {
    if (isPwa()) {
      localStorage.setItem(opts.key, opts.value);
      return;
    }
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences.set(opts);
  },
  async remove(opts: { key: string }): Promise<void> {
    if (isPwa()) {
      localStorage.removeItem(opts.key);
      return;
    }
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences.remove(opts);
  },
};

// ── SplashScreen shim ──
// Native: hide Capacitor native splash
// PWA: no-op
export const Splash = {
  async hide(): Promise<void> {
    if (isPwa()) return;
    const { SplashScreen } = await import('@capacitor/splash-screen');
    return SplashScreen.hide();
  },
};

// ── Browser shim ──
// Native: open in system browser via Capacitor
// PWA: window.open
export const BrowserShim = {
  async open(opts: { url: string }): Promise<void> {
    if (isPwa()) {
      window.open(opts.url, '_blank');
      return;
    }
    try {
      const { Browser } = await import('@capacitor/browser');
      return Browser.open(opts);
    } catch {
      window.open(opts.url, '_blank');
    }
  },
};
