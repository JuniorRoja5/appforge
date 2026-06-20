import { create } from 'zustand';
import { getMyBranding, type TenantBranding } from '../lib/api';

/**
 * Estado del branding del tenant del usuario logueado.
 *
 * No usa `persist` middleware a propósito:
 *   - El branding cambia cuando el reseller lo edita; un cache persistido
 *     mostraría el valor viejo hasta que el TTL expire o el usuario fuerce
 *     refresh.
 *   - La carga fresca en mount de PlatformLayout es ~50ms (un GET cacheable
 *     por HTTP si se quisiera). Ese flash inicial indigo→brand es aceptable
 *     para MVP, y si molesta más tarde se mitiga con cache HTTP en nginx o
 *     SWR-style stale-while-revalidate (no MVP).
 *
 * Mount de carga: PlatformLayout.tsx (Phase 2). Razón medida: en un refresh
 * F5, useAuthStore.setAuth NO se vuelve a llamar (el token se rehidrata de
 * storage); un hook sobre setAuth perdería la carga tras refresh y el chrome
 * volvería al indigo default hasta navegar. PlatformLayout monta en los dos
 * caminos (login fresco + refresh).
 */
interface TenantState {
  branding: TenantBranding | null;
  isWhiteLabel: boolean;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadBranding: (token: string) => Promise<void>;
  setBranding: (branding: TenantBranding) => void;
  reset: () => void;
}

const initial = {
  branding: null,
  isWhiteLabel: false,
  loaded: false,
  loading: false,
  error: null,
};

export const useTenantStore = create<TenantState>((set, get) => ({
  ...initial,

  loadBranding: async (token) => {
    // Evita doble fetch si ya cargó (PlatformLayout puede montar más de una
    // vez en navegación interna; el flag `loaded` lo idempotentiza).
    if (get().loaded || get().loading) return;

    set({ loading: true, error: null });
    try {
      const branding = await getMyBranding(token);
      set({
        branding,
        isWhiteLabel: branding.isWhiteLabel,
        loaded: true,
        loading: false,
      });
    } catch (err) {
      // Fallo silencioso: el chrome queda con el default indigo de Creatu.
      // No bloquea al usuario, solo loguea + expone el error para futura UI.
      const message = err instanceof Error ? err.message : 'Error desconocido';
      set({ error: message, loading: false });
    }
  },

  setBranding: (branding) =>
    set({ branding, isWhiteLabel: branding.isWhiteLabel, loaded: true }),

  reset: () => set(initial),
}));
