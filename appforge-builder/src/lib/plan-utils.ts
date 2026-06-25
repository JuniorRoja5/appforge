/**
 * Deep-link de plan desde landing → checkout de Stripe.
 *
 * La landing (creatu.app) envía visitantes con URLs tipo
 * `app.creatu.app/register?plan=pro` o `app.creatu.app/login?plan=starter`.
 * Tras auth, RegisterPage/LoginPage redirigen a `/pricing?checkout=<plan>`
 * en lugar de `/dashboard`, y PricingPage detecta el param y dispara
 * `handleCheckout` automáticamente.
 *
 * Valores aceptados (case-insensitive, normalizados a minúsculas) —
 * alineados con el enum PlanType del backend (Prisma):
 *   free | starter | pro | reseller_starter | reseller_pro
 *
 * Cualquier otro valor (incluido vacío/null) → tratado como ausente
 * (sin error visible — el usuario va a /dashboard como flujo default).
 */

export const VALID_PLAN_PARAMS = [
  'free',
  'starter',
  'pro',
  'reseller_starter',
  'reseller_pro',
] as const;

export type ValidPlanParam = (typeof VALID_PLAN_PARAMS)[number];

/**
 * Normaliza el valor del query string `?plan=...` a un identificador
 * válido en minúsculas. Devuelve null si está ausente, vacío, o no
 * coincide (case-insensitive) con ningún valor del enum.
 */
export function normalizePlanParam(
  value: string | null | undefined,
): ValidPlanParam | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return (VALID_PLAN_PARAMS as readonly string[]).includes(lower)
    ? (lower as ValidPlanParam)
    : null;
}

/**
 * Destino post-auth dado un plan param + fallback (típicamente
 * `/dashboard`, o un `from` preservado por ProtectedRoute).
 *
 * Regla: si el plan es válido y NO es 'free' → `/pricing?checkout=<plan>`.
 * Si es null o 'free' → fallback. FREE no tiene checkout, así que va
 * directo al dashboard como cualquier registro normal.
 */
export function destinationForPlan(
  plan: ValidPlanParam | null,
  fallback: string,
): string {
  if (plan && plan !== 'free') {
    return `/pricing?checkout=${plan}`;
  }
  return fallback;
}
