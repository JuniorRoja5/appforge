import type { AppManifest } from './manifest';

/**
 * Preview-as-Runtime Phase 2.2d — version the onboarding by content,
 * not by a permanent "seen" flag.
 *
 * Why this matters:
 *   The original gate was `localStorage.getItem('appforge_onboarding_seen')`:
 *   a boolean that, once set, stuck forever. If the constructor
 *   updated their welcome slides — new pricing, new feature, new
 *   campaign — only fresh installs would ever see it. Existing
 *   end-users were locked out of marketing updates.
 *
 *   The replacement: hash the onboarding content; persist the hash
 *   the end-user last accepted; on every cold start, re-show the
 *   onboarding when the live hash differs from the stored one.
 *   New users: no stored hash → see it. Returning users with
 *   unchanged content: same hash → skip. Returning users on a
 *   refreshed campaign: hash changed → see the new version.
 *
 *   Works identically on PWA (localStorage via Prefs) and AAB
 *   (Capacitor Preferences via Prefs). Per-app key prevents
 *   cross-app collisions when the same browser hosts multiple
 *   tenants' PWAs.
 *
 * Algorithm: FNV-1a 32-bit. Sync, no Web Crypto API needed (which
 * would be async and overkill — we don't need cryptographic
 * resistance, just "did the bytes change?"). Returns an 8-char
 * hex string, plenty of bits to avoid collisions for the kind of
 * content involved (1-5 slides, short strings + image URLs).
 *
 * Input shape — what counts as "content" for versioning purposes:
 *   - enabled flag (so toggling on a previously-seen onboarding
 *     re-shows it, which the constructor would expect).
 *   - For each slide, in their natural order (post-sort by order):
 *     id, order, title, description, imageUrl.
 *   - NOT included: anything not visible to the end-user (any
 *     future internal field, timestamps, etc).
 *
 * Determinism: identical content → identical hash. The sort by
 * order matches what OnboardingScreen does before render, so a
 * pure re-order of slides also changes the hash (the user sees a
 * different sequence — that's a content change in marketing terms).
 *
 * Null safety: if config is null/undefined or has no slides, hash
 * returns a stable sentinel. Comparing the sentinel against any
 * non-sentinel hash naturally returns "different" — which is fine
 * because the App.tsx flow already gates on `enabled && slides.length`
 * before showing onboarding at all.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit multiplication — `Math.imul` keeps it within int32.
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Coerce to unsigned 32-bit and emit 8-char hex.
  return (hash >>> 0).toString(16).padStart(8, '0');
}

type OnboardingConfig = AppManifest['appConfig']['onboarding'];

export function computeOnboardingHash(config: OnboardingConfig | null | undefined): string {
  if (!config) return 'empty';
  const slides = [...(config.slides ?? [])].sort((a, b) => a.order - b.order);
  if (slides.length === 0) return 'empty';
  const payload = JSON.stringify({
    enabled: !!config.enabled,
    slides: slides.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title ?? '',
      description: s.description ?? '',
      imageUrl: s.imageUrl ?? '',
    })),
  });
  return fnv1a(payload);
}

const HASH_KEY_PREFIX = 'appforge_onboarding_hash';

export function getOnboardingHashKey(appId: string): string {
  return `${HASH_KEY_PREFIX}_${appId}`;
}
