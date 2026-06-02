import { BuildType } from '@prisma/client';

/**
 * Rasgos centralizados por tipo de build (TECH_DEBT #56).
 *
 * Este archivo es **utilidad compartida**, no privada del módulo `build`.
 * Lo consume también `subscription.service.ts` para enforcement de cuota.
 * Si en el futuro se mueve a un `common/` o `shared/`, actualizar los
 * imports cruzados. Hoy vive en `build/lib/` porque la mayoría de los
 * call sites están aquí; un movimiento por una sola excepción sería
 * sobre-ingeniería.
 *
 * **Principio de diseño**: cada rasgo se define por LISTA AFIRMATIVA, no
 * por negación. Una lista positiva deja fuera por defecto a cualquier
 * `BuildType` nuevo del enum, forzando una decisión consciente al
 * añadirlo. Una condicional `buildType !== X && buildType !== Y` te deja
 * un agujero invisible cuando aparece el siguiente valor — ese fue el bug
 * raíz del gate FCM (commit `f25ac51`).
 *
 * **Regla al añadir un nuevo `BuildType`**: revisar cada función de este
 * archivo y decidir explícitamente si el tipo pertenece o no al rasgo.
 * No hacerlo significa que el nuevo tipo queda fuera de todos los rasgos
 * por defecto (comportamiento seguro y verificable).
 */

// ─── Cuota mensual ────────────────────────────────────────────────────
//
// Tipos que descuentan del límite mensual del plan (`maxBuildsPerMonth`).
// Son las "entregas finales" — el artefacto que el cliente publica.
//
// Quedan fuera:
// - DEBUG: privilegio de pago, pero NO descuenta cuota — sirve para
//   probar el binario antes de gastar una entrega.
// - PWA: gratis para todos los planes (incluso FREE), no genera
//   artefacto físico ni toca el límite de storage.
//
// Doble export intencionado: la función booleana para los `if`,
// el array para el `buildType: { in: [...] }` de Prisma. Ambos derivan
// de la misma constante interna `QUOTA_COUNTING` — invariante: la
// función y el array NO pueden divergir (test de drift lo verifica).
const QUOTA_COUNTING: readonly BuildType[] = [
  BuildType.RELEASE,
  BuildType.AAB,
  BuildType.IOS_EXPORT,
] as const;

export function countsTowardQuota(t: BuildType): boolean {
  return QUOTA_COUNTING.includes(t);
}

export const QUOTA_COUNTING_BUILD_TYPES = QUOTA_COUNTING;

// ─── Configuración Android ────────────────────────────────────────────
//
// Tipos que requieren `App.appConfig.androidConfig.packageName` para
// poder construir. Son los tres targets que generan binario Android.
//
// Quedan fuera:
// - IOS_EXPORT: usa Bundle ID iOS, no packageName Android.
// - PWA: no es nativa, no usa packageName.
export function requiresAndroidConfig(t: BuildType): boolean {
  return t === BuildType.DEBUG
    || t === BuildType.RELEASE
    || t === BuildType.AAB;
}

// ─── FCM cuando el schema tiene módulo push ───────────────────────────
//
// Tipos que requieren `PlatformFcmConfig` cuando la app tiene el módulo
// `push_notification` en su schema. Sin FCM, instalar el binario nativo
// crashea en runtime al inicializar Capacitor push.
//
// Quedan fuera:
// - DEBUG: corre con el stub de push.ts (sin @capacitor/push-notifications
//   instalado), así que no crashea aunque falte FCM.
// - PWA: no usa Capacitor push (Web Push API es otra historia, no
//   gestionada por este pipeline).
export function requiresFcmIfPushModulePresent(t: BuildType): boolean {
  return t === BuildType.RELEASE
    || t === BuildType.AAB
    || t === BuildType.IOS_EXPORT;
}

// ─── Reservado ────────────────────────────────────────────────────────
//
// `isNativeBuild(t)` — NO se exporta hoy (YAGNI: ningún call site lo
// consume). Cuando aparezca un consumidor real (e.g. lógica de keystore
// que distinga nativo vs web, métricas, gating de slot de app), añadir
// aquí siguiendo el mismo patrón afirmativo:
//
//   export function isNativeBuild(t: BuildType): boolean {
//     return t === BuildType.DEBUG
//       || t === BuildType.RELEASE
//       || t === BuildType.AAB
//       || t === BuildType.IOS_EXPORT;
//   }
