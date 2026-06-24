// Builders for the public tracking URLs that get embedded in transactional
// emails, push notifications, and (since commit-of-this-file) the API
// responses for booking and order creation.
//
// The URLs point at the public builder web app, where dedicated tracking
// pages render the per-booking/order detail keyed by a per-row tracking
// token (so the URL is unguessable without the token).
//
// PUBLIC_BUILDER_URL must be set in production .env. The localhost fallback
// exists only for local dev where you can reasonably reach the Vite dev
// server from a device/emulator.
//
// Why these live in lib/ instead of being inline in each service: the same
// URL is needed in (a) booking email + reminder, (b) order email, (c) the
// booking/order create HTTP response so the mobile runtime can open it via
// Capacitor Browser instead of trying window.location.origin (which is
// `https://localhost` inside Capacitor and produces "connection refused"
// when the system browser opens it). Three call sites already; the helper
// keeps them in sync.

const builderUrl = (): string =>
  process.env.PUBLIC_BUILDER_URL || 'http://localhost:5173';

export function bookingTrackingUrl(
  appId: string,
  bookingId: string,
  trackingToken: string,
): string {
  return `${builderUrl()}/booking/${appId}/${bookingId}?t=${trackingToken}`;
}

export function orderTrackingUrl(
  appId: string,
  orderId: string,
  trackingToken: string,
): string {
  return `${builderUrl()}/order/${appId}/${orderId}?t=${trackingToken}`;
}

// App-user password reset page hosted on the public builder URL. The reset
// page reads `email` and `t` from the query string and submits both to
// POST /apps/:appId/users/reset-password (the existing redeem endpoint),
// which looks up the user by appId+email and verifies the token's SHA256
// hash. Email is intentionally in the URL: it isn't a secret (the recipient
// already knows their own email) and including it lets the redeem endpoint
// use its existing { email, token, newPassword } DTO without changes.
export function passwordResetUrl(
  appId: string,
  email: string,
  token: string,
): string {
  const params = new URLSearchParams({ email, t: token });
  return `${builderUrl()}/app-user/reset-password/${appId}?${params}`;
}

// Public privacy page (G2 Pieza 4 — server-rendered fallback). URL pattern
// idéntica al de reset-password: vive en el builder SPA. Esta es la URL
// que el reseller declara en Play Console si NO pegó una URL externa
// propia, y la que el runtime abre desde el link "Política de privacidad"
// de UserProfileRuntime.
export function privacyPageUrl(appId: string): string {
  return `${builderUrl()}/app-user/privacy/${appId}`;
}

// Regla de resolución compartida del privacyUrlResolved horneado en el
// manifest. Centralizada aquí para que los DOS sitios de manifest del
// build.processor (curado #1, PWA dist #2) deriven el mismo string —
// si divergieran, el link in-app funcionaría en una superficie y no en
// otra (Capacitor sí / PWA no, por ejemplo). Reglas:
//   - privacy.url presente  → esa URL externa del cliente.
//   - solo privacy.content  → la URL de la página pública generada.
//   - nada                  → null (el runtime esconde el link).
//
// Tipo del primer parámetro a propósito laxo (Record<string, unknown>) —
// los callers en build.processor reciben app.appConfig como JSON crudo de
// Prisma, tipado como Record<string, unknown> tras el cast inicial. El
// narrowing al shape esperado (privacy: {url?, content?}) vive aquí, en
// un solo sitio. Aceptar un tipo más estricto obligaría a cada caller a
// añadir su propio cast, multiplicando el footgun de asimetría.
export function resolvePrivacyUrl(
  appConfig: Record<string, unknown> | null | undefined,
  appId: string,
): string | null {
  const privacy = appConfig?.privacy as
    | { url?: string; content?: string }
    | undefined;
  if (privacy?.url) return privacy.url;
  if (privacy?.content) return privacyPageUrl(appId);
  return null;
}

// G2 Pieza 3 — public account deletion page. La URL pública del enlace
// que viaja en el email. El token raw se incluye como query string `t`;
// el server compara su SHA256 contra deleteToken en BD. Email NO en la
// URL (a diferencia de passwordResetUrl): no hace falta — la query del
// token ya identifica al usuario por findFirst(deleteToken+expiry).
export function deleteAccountUrl(appId: string, token: string): string {
  const params = new URLSearchParams({ t: token });
  return `${builderUrl()}/app-user/delete-account/${appId}?${params}`;
}
