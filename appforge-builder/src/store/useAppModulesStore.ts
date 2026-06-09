import { create } from 'zustand';
import { getApp } from '../lib/api';

/**
 * Store dedicado a los moduleIds del app activo.
 *
 * Tres estados explícitos:
 *   - moduleIds === null  →  no cargado todavía (o fallo de fetch, o reset)
 *   - moduleIds === []    →  cargado correctamente, app sin módulos
 *   - moduleIds === [...] →  cargado correctamente, app con módulos
 *
 * El consumidor (SideNav) distingue null de [] por `moduleIds !== null` para
 * decidir si mostrar entradas de datos. Mientras es null, no aparecen.
 */
interface AppModulesState {
  appId: string | null;
  moduleIds: string[] | null;
  loading: boolean;

  loadModules: (appId: string, token: string) => Promise<void>;
  reset: () => void;
}

export const useAppModulesStore = create<AppModulesState>((set, get) => ({
  appId: null,
  moduleIds: null,
  loading: false,

  /**
   * Toda la decisión "¿debo recargar?" vive aquí. El loader del effect solo
   * declara intención llamando a loadModules(appId, token); este método
   * decide si refetcha, descarta la llamada como redundante, o limpia y
   * recarga porque el app cambió.
   *
   * Reglas:
   *   1. Si ya estoy cargando este mismo appId  →  return (no duplicar fetch).
   *   2. Si ya tengo moduleIds del mismo appId  →  return (no refetchar).
   *      Esta es la regla que evita el parpadeo cuando navegas entre rutas
   *      del mismo app (e.g. /apps/A/orders → /apps/A/settings).
   *   3. Si appId difiere (o nunca cargué)      →  set interno con appId
   *      nuevo + moduleIds=null + loading=true, y fetch. El set interno
   *      es la "limpieza al cambiar de app": las entradas del app anterior
   *      desaparecen instantáneamente antes de que llegue el fetch del nuevo.
   *
   * Race-condition guard: tras await getApp, comprobamos que el appId del
   * store sigue siendo el que pedimos. Si el usuario navegó a otro app
   * mientras estábamos fetchando, descartamos el resultado para no pisar
   * el estado del app nuevo con datos del viejo.
   */
  loadModules: async (appId, token) => {
    const state = get();
    if (state.loading && state.appId === appId) return;
    if (state.appId === appId && state.moduleIds !== null) return;

    set({ appId, moduleIds: null, loading: true });

    try {
      const app = await getApp(appId, token);
      if (get().appId !== appId) return;

      const elements = Array.isArray(app.schema)
        ? (app.schema as Array<{ moduleId?: string }>)
        : [];
      const moduleIds = elements
        .map((e) => e?.moduleId)
        .filter((id): id is string => typeof id === 'string');
      set({ moduleIds: Array.from(new Set(moduleIds)), loading: false });
    } catch (err) {
      if (get().appId !== appId) return;
      // Patrón de Fase 0: error visible en consola con prefijo explícito,
      // no catch silencioso. La barra cae al estado "sin moduleIds cargados"
      // (entradas de datos no aparecen) pero el resto de la app sigue.
      // eslint-disable-next-line no-console
      console.error(
        `[useAppModulesStore] Failed to load modules for app ${appId}:`,
        err,
      );
      set({ moduleIds: null, loading: false });
    }
  },

  /**
   * Limpia el store por completo. Lo llama el effect de PlatformLayout solo
   * cuando se sale a una ruta sin appId (e.g. /dashboard) — para no mostrar
   * entradas residuales de un app que el usuario ya no está viendo.
   * Cuando se cambia de app a app, la limpieza la hace loadModules internamente.
   */
  reset: () => set({ appId: null, moduleIds: null, loading: false }),
}));
