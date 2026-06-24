import type { AppInfo, AppBuild } from './api';

/**
 * G3-A — checklist de activación. Lógica compartida entre el badge del
 * TopBar del builder (ActivationBadge) y la card del Dashboard
 * (ActivationChecklistCard). Sin estado interno; pura derivación del
 * shape de AppInfo + lista de builds.
 */

/**
 * Color primary por defecto del sistema AppForge. Cualquier app cuyo
 * designTokens.colors.primary.main sea distinto se considera "branding
 * personalizado" → Step 1 verde. Los usuarios que crean desde plantilla
 * salen con Step 1 verde desde el primer render porque la plantilla ya
 * trae su propio primary (legítimamente — usar una plantilla ES tener
 * branding propio). Solo los usuarios que crean app en blanco necesitan
 * cambiar el color manualmente para completar el paso.
 */
export const APPFORGE_DEFAULT_PRIMARY = '#4F46E5';

export interface ActivationSteps {
  branding: boolean; // primary !== default AppForge global
  icon: boolean;     // appConfig.icon?.url truthy
  pwa: boolean;      // pwaEnabled && pwaLastDeployedAt no null
  apk: boolean;      // existe AppBuild COMPLETED de tipo APK/AAB (no PWA/iOS)
}

/**
 * Calcula el estado de los 4 pasos contra los datos actuales del backend.
 * No persiste nada — se vuelve a llamar en cada render. Reactivo a cambios
 * cuando los stores del builder se actualizan (designTokens / appConfig).
 *
 * Para Step 4 (APK): `buildType` viene como string libre en AppBuild
 * (api.ts:1227). Los valores conocidos del enum son 'debug' | 'release'
 * | 'aab' | 'ios-export' | 'pwa' (api.ts:1241). Excluimos 'pwa' (el Step
 * 3 ya cubre eso) y 'ios-export' (es exportación de zip para Xcode, no
 * un binario instalable). Cualquier otro tipo COMPLETED cuenta como APK.
 */
export function computeActivationSteps(
  app: Pick<AppInfo, 'designTokens' | 'appConfig' | 'pwaEnabled' | 'pwaLastDeployedAt'>,
  builds: AppBuild[],
): ActivationSteps {
  const tokens = app.designTokens as { colors?: { primary?: { main?: string } } } | null;
  const primary = tokens?.colors?.primary?.main ?? APPFORGE_DEFAULT_PRIMARY;

  return {
    branding: primary !== APPFORGE_DEFAULT_PRIMARY,
    icon: Boolean(app.appConfig?.icon?.url),
    pwa: app.pwaEnabled === true && app.pwaLastDeployedAt !== null,
    apk: builds.some(
      (b) =>
        b.status === 'COMPLETED' &&
        b.buildType !== 'pwa' &&
        b.buildType !== 'ios-export',
    ),
  };
}

export function countCompleted(steps: ActivationSteps): number {
  return Object.values(steps).filter(Boolean).length;
}

export const STEP_COUNT = 4;

/**
 * Etiquetas de display de los 4 pasos. Centralizadas para que ambos
 * componentes (badge popover + card) muestren exactamente el mismo
 * texto sin riesgo de divergencia.
 */
export const STEP_LABELS: Record<keyof ActivationSteps, string> = {
  branding: 'Personaliza el color principal',
  icon: 'Sube el logo o icono de la app',
  pwa: 'Habilita y previsualiza tu PWA',
  apk: 'Genera tu primera APK',
};

// ── localStorage keys ──────────────────────────────────────────────────
// Centralizadas para evitar typos cross-componente. Por-appId para
// dismiss (banner final) y por-tenantId para colapso (preferencia
// global del usuario sobre cuánto espacio ocupa la card).

export const checklistDismissKey = (appId: string): string =>
  `appforge_checklist_dismissed_${appId}`;

export const checklistCollapsedKey = (tenantId: string): string =>
  `appforge_checklist_collapsed_${tenantId}`;
