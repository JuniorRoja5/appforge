import React, { useEffect, useState } from 'react';
import { X, Share, Plus } from 'lucide-react';

/**
 * Bug 2 — banner de instalación PWA.
 *
 * Android/Chrome/Edge: captura el evento `beforeinstallprompt` (estándar
 * web), guarda el prompt, muestra banner con botón "Instalar". Click
 * dispara el prompt nativo del navegador.
 *
 * iOS Safari: no soporta `beforeinstallprompt` (decisión de Apple). En
 * su lugar, detección por userAgent + check de `navigator.standalone`
 * y mostrar instrucciones manuales: "Toca Share y luego 'Añadir a
 * inicio'".
 *
 * Filtros para NO mostrar el banner:
 *   - Si la app YA está en standalone mode (matchMedia o
 *     navigator.standalone) — ya instalada.
 *   - Si el usuario lo descartó previamente (localStorage flag).
 *   - En iOS, si el navegador es Chrome (CriOS) o Firefox (FxiOS) —
 *     esos en iOS no soportan instalación PWA de ninguna forma.
 *
 * Delay de 3s antes de aparecer — UX best practice. No empujar la
 * instalación al primer paint; dar al usuario tiempo de orientarse.
 *
 * Posición: fixed bottom encima del safe-area + 64px (altura típica
 * de tab bar). Si la app usa top_tabs o side_drawer, el banner se ve
 * un poco más abajo de lo ideal pero no oculta contenido importante.
 */

interface Props {
  appName: string;
  iconUrl?: string;
}

type InstallState =
  | { type: 'idle' }
  | { type: 'android'; prompt: BeforeInstallPromptEvent }
  | { type: 'ios' }
  | { type: 'hidden' };

// BeforeInstallPromptEvent no está en el lib estándar de TS — lo
// declaramos localmente. Spec: https://wicg.github.io/manifest-incubations/
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'appforge_install_dismissed';
const SHOW_DELAY_MS = 3000;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  // Safari pero NO Chrome iOS (CriOS) ni Firefox iOS (FxiOS) — esos
  // browsers en iOS no soportan PWA install, no tiene sentido mostrar
  // el banner ahí.
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
}

export const PWAInstallBanner: React.FC<Props> = ({ appName, iconUrl }) => {
  const [state, setState] = useState<InstallState>({ type: 'idle' });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ya descartado o ya instalado → nunca mostrar.
    if (localStorage.getItem(DISMISSED_KEY) || isInStandaloneMode()) {
      setState({ type: 'hidden' });
      return;
    }

    // Android: capturar el prompt diferido. preventDefault evita que el
    // navegador muestre su propio mini-banner — controlamos la UI.
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setState({ type: 'android', prompt: e as BeforeInstallPromptEvent });
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari: mostrar instrucciones manuales (no hay evento equivalente).
    if (isIOS() && isSafariBrowser()) {
      setState({ type: 'ios' });
    }

    // Delay antes de mostrar — el banner no aparece al primer paint.
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setState({ type: 'hidden' });
  };

  const handleAndroidInstall = async () => {
    if (state.type !== 'android') return;
    await state.prompt.prompt();
    const { outcome } = await state.prompt.userChoice;
    if (outcome === 'accepted') {
      setState({ type: 'hidden' });
    } else {
      // El usuario rechazó el prompt nativo — tratamos como dismiss
      // para no insistir.
      dismiss();
    }
  };

  if (state.type === 'hidden' || state.type === 'idle') return null;
  if (!visible) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 rounded-2xl shadow-lg border overflow-hidden"
      style={{
        bottom: 'calc(var(--safe-area-bottom, 0px) + 64px)',
        backgroundColor: 'var(--color-nav-bg, #ffffff)',
        borderColor: 'var(--color-divider, #E5E7EB)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* App icon — usa el icono real si está, fallback a inicial con
            color de marca */}
        {iconUrl ? (
          <img src={iconUrl} alt={appName} className="w-10 h-10 rounded-xl shrink-0 object-cover" />
        ) : (
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: 'var(--color-primary, #4F46E5)' }}
          >
            {appName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Texto — distinto según plataforma */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {appName}
          </p>
          {state.type === 'android' && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
              Añadir a la pantalla de inicio
            </p>
          )}
          {state.type === 'ios' && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
              Toca <Share size={10} className="inline" /> y luego "Añadir a inicio"
            </p>
          )}
        </div>

        {/* Botón Instalar (solo Android — iOS no tiene API equivalente) */}
        {state.type === 'android' && (
          <button
            onClick={handleAndroidInstall}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary, #4F46E5)' }}
          >
            <Plus size={13} />
            Instalar
          </button>
        )}

        {/* Dismiss — persiste flag para no volver a mostrar */}
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-lg"
          style={{ color: 'var(--color-text-secondary, #6B7280)' }}
          aria-label="Descartar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
