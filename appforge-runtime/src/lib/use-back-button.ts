import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Register a Capacitor back-button handler scoped to the calling component.
 *
 * - Native only — on PWA this is a no-op and the browser handles back.
 * - When `enabled` is false the handler is unregistered, so the calling
 *   component's root view falls back to Capacitor's default (exit the app).
 *   Pass `enabled = <subViewIsOpen>` so back closes the sub-view when one
 *   is open, and exits the module/app when the root is showing.
 * - Handler identity does NOT need to be stable across renders. The hook
 *   keeps the latest reference in a ref, so the underlying Capacitor
 *   listener is registered once per (enabled = true) lifecycle.
 */
export function useBackButton(handler: () => void, enabled: boolean = true): void {
  // Always-fresh handler. Without this, a non-memoised handler from the
  // caller would re-register the listener on every render — and combined
  // with the async addListener, that produces zombie listeners. Callers
  // do NOT need to wrap their handler in useCallback.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    // Race-condition guard. CapApp.addListener is async. If the effect
    // cleans up (unmount / enabled flip) before the Promise resolves,
    // `handle` would still be undefined and `handle?.remove()` would be
    // a no-op — leaving a permanently-registered zombie listener.
    // The `removed` flag closes that window: when the Promise eventually
    // resolves we check and remove the handle if cleanup already ran.
    let removed = false;
    let handle: { remove: () => Promise<void> } | undefined;

    CapApp.addListener('backButton', () => handlerRef.current()).then((h) => {
      if (removed) {
        // Cleanup beat us to it — discard the listener immediately.
        void h.remove();
      } else {
        handle = h;
      }
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [enabled]);
}
