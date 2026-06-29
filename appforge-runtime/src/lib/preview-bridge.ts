import { isPreviewMode } from './manifest';

/**
 * Preview-as-Runtime Phase 2.2 — outgoing postMessage bridge.
 *
 * Single source of truth for messages emitted by the runtime towards
 * the builder parent window (click selection, hover selection,
 * element bounds for selection/hover outlines).
 *
 * Messages WITH payload (element-click, element-hover, element-bounds)
 * use a strict targetOrigin obtained from the `?parentOrigin=` query
 * param of the iframe URL, validated against an allowlist. If the
 * parent origin is unknown or not allowlisted, the messages are NOT
 * emitted (silent no-op). In production PWA / AAB the iframe is not
 * opened by the builder, so parentOrigin is absent and the runtime
 * stays silent — zero overhead for end-users.
 *
 * Out-of-scope here: the benign `preview-ready` handshake, which is
 * sent in App.tsx with targetOrigin='*' because it carries no data
 * and the parent origin isn't known yet at handshake time (the
 * runtime sends it before any inbound message arrives).
 */

const ALLOWED_PARENT_ORIGINS = [
  'https://app.creatu.app',
  'https://builder.creatu.app',
];

function isLocalhostOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/**
 * Read `?parentOrigin=` from the iframe URL and validate it against
 * the allowlist + localhost. Returns null if absent or invalid —
 * the caller should skip the postMessage in that case.
 */
let _cachedParentOrigin: string | null | undefined = undefined;
export function getParentOrigin(): string | null {
  if (_cachedParentOrigin !== undefined) return _cachedParentOrigin;
  if (typeof window === 'undefined' || !isPreviewMode()) {
    _cachedParentOrigin = null;
    return null;
  }
  const param = new URLSearchParams(window.location.search).get('parentOrigin');
  if (!param) {
    _cachedParentOrigin = null;
    return null;
  }
  if (ALLOWED_PARENT_ORIGINS.includes(param) || isLocalhostOrigin(param)) {
    _cachedParentOrigin = param;
    return param;
  }
  _cachedParentOrigin = null;
  return null;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function sendToParent(message: unknown): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  const target = getParentOrigin();
  if (!target) return;
  try {
    window.parent.postMessage(message, target);
  } catch {
    // postMessage throws if the parent window was closed; ignore.
  }
}

export function sendElementClick(elementId: string): void {
  sendToParent({ type: 'element-click', elementId });
}

/**
 * elementId === null when the cursor leaves all elements. The builder
 * uses this to clear the hover outline.
 */
export function sendElementHover(elementId: string | null): void {
  sendToParent({ type: 'element-hover', elementId });
}

export function sendElementBounds(elementId: string, bounds: ElementBounds): void {
  sendToParent({ type: 'element-bounds', elementId, bounds });
}

/**
 * Notifies the builder that a module is being unmounted from the
 * DOM (tab change, app remount, etc) — distinct from "deleted from
 * the schema". The builder uses this to remove the element's
 * bounds entry so the selection outline does not linger over the
 * tab that no longer renders the module. Complementary to the
 * schema-driven prune in RuntimePreviewIframe: prune handles real
 * deletions, this handles transient unmounts (multi-tab apps).
 */
export function sendElementUnmounted(elementId: string): void {
  sendToParent({ type: 'element-unmounted', elementId });
}
