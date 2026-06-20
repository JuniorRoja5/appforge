import { useEffect } from 'react';
import { hexToHsl } from '../lib/color';
import { useTenantStore } from '../store/useTenantStore';

/**
 * Aplica el `--primary` del reseller al :root cuando el tenant tiene
 * plan white-label y un color primario configurado. No-op en cualquier
 * otro caso — el chrome se queda con el default indigo de index.css:17.
 *
 * Cleanup pattern: al desmontar O al cambiar las condiciones
 * (isWhiteLabel pasa a false, color nuevo, color borrado), `removeProperty`
 * quita el override y la regla original del `:root` vuelve a aplicar. No
 * hay que guardar y restaurar el valor manualmente.
 *
 * Deps escalares (boolean + string) para que React compare por valor y
 * el effect NO re-corra cuando solo cambia la referencia del objeto
 * branding (caso típico tras un `setBranding` con el mismo primary).
 */
export function useResellerBranding(): void {
  const isWhiteLabel = useTenantStore((s) => s.isWhiteLabel);
  const primary = useTenantStore((s) => s.branding?.brandColors?.primary);

  useEffect(() => {
    if (!isWhiteLabel || !primary) return;

    document.documentElement.style.setProperty('--primary', hexToHsl(primary));

    return () => {
      document.documentElement.style.removeProperty('--primary');
    };
  }, [isWhiteLabel, primary]);
}
