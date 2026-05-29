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
