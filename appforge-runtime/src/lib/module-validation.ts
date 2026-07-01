import type { ZodType, ZodError } from 'zod';

/**
 * Phase 3c — Module config validation helper.
 *
 * Diagnostic layer, NOT a rewrite of behavior. Each *Runtime.tsx wraps
 * its component in an Outer that calls validateConfig and short-circuits
 * to InvalidConfigPlaceholder when preview + invalid; the Inner (the
 * actual module logic) keeps its per-field defensive reads
 * `(data.X as T) ?? default` byte-for-byte from before 3c. safeParse is
 * observational — it fires the placeholder in preview and logs a warn
 * in production; it does NOT rewrite the read pattern.
 *
 * Design rationale — the 4 pitfalls that shape this helper:
 *
 * 1. STRIP MODE (Zod default) drops UNKNOWN FIELDS from the parsed
 *    result. Latent hooks (data.title in catalog/menu/discount,
 *    data.titleAlignment in contact, data.title in news_feed/events)
 *    and legacy renames (data.formFields in booking, data.src +
 *    data.borderRadius in image, data.businessName/tagline/avatarUrl/
 *    coverUrl in hero_profile, data.content in custom_page, data.variant
 *    in button, data.items + author* in testimonials, data.url single-URL
 *    in video, data.formTitle→title in contact) are NOT declared in the
 *    schema. If runtimes read from parsed.data, all vanish silently. The
 *    helper therefore never surfaces `parsed` for reads — the Inner
 *    keeps reading `data` directly, and latent hooks + legacy survive.
 *
 * 2. WHOLESALE FAILURE — safeParse is all-or-nothing per module. A
 *    single invalid field would fail the parse. If the runtime then
 *    dropped to a synthetic DEFAULT_XXX_CONFIG, ALL other valid fields
 *    of a real client's config would be lost. This helper avoids that
 *    regression: on ok=false, the Inner never mounts in preview
 *    (placeholder shown) and in production the Outer passes the raw
 *    `data` through to the Inner unchanged (per-field defensive reads
 *    keep the app alive).
 *
 * 3. WRAPPER PATTERN — the Outer runs validateConfig (a pure function,
 *    not a hook) and conditionally returns either the placeholder or
 *    the Inner. The Outer MUST be pure (no useState / useEffect /
 *    useMemo / useCallback / useRef / useBackButton) — otherwise the
 *    conditional return violates the React hooks-order rule (error
 *    #310). Any hooks that the module needs live in the Inner, which
 *    is a plain child component that only mounts once the gate has
 *    passed. This guarantees that a config-invalid module in preview
 *    NEVER runs its useEffect [] mount fetches, NEVER runs its
 *    normalizeFields() on garbage, and NEVER crashes into the
 *    RuntimeErrorBoundary — the placeholder always wins.
 *
 * 4. NO INVENTED DEFAULTS — the helper does NOT ask for a
 *    DEFAULT_XXX_CONFIG. The per-field `?? default` reads that
 *    already exist in each Inner ARE the fallback. Duplicating the
 *    builder's defaultConfig in the runtime would create drift; not
 *    duplicating it and leaving `?? default` inline preserves current
 *    behavior byte-for-byte.
 *
 * Dedup granularity: the `_warnedModules` Set is keyed by moduleId
 * (module TYPE, e.g. 'catalog'), NOT by instance. An app with two
 * catalog instances both misconfigured with different errors emits
 * ONE warn — for whichever renders first. This is intentional:
 * production console is a diagnostic surface, not per-instance
 * telemetry. Instance-level identification lives in the preview
 * placeholder, which is the right channel for that granularity. Do
 * NOT over-engineer this to be per-instance.
 */
const _warnedModules = new Set<string>();

export interface ValidationResult<T> {
  /** True if the raw data conformed to the schema. */
  readonly ok: boolean;
  /** The raw data object as received. Reserved for callers that want to
   *  read directly from the parsed slice — the 3c runtimes deliberately
   *  do NOT use this; the Inner reads from `data` (which the Outer passes
   *  through unchanged) so latent hooks and legacy renames survive. */
  readonly raw: Record<string, unknown>;
  /** Type-safe declared-only slice, populated only when ok=true. Strip
   *  mode drops latent hooks + legacy renames. RESERVED — the 3c
   *  runtimes MUST NOT read from here. Grep asserts no `cfg.parsed` in
   *  any runtime. */
  readonly parsed?: T;
  /** ZodError, populated only when ok=false — used by the Outer to feed
   *  the preview placeholder. */
  readonly error?: ZodError;
}

export function validateConfig<T>(
  schema: ZodType<T>,
  data: unknown,
  moduleId: string,
): ValidationResult<T> {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, raw, parsed: result.data };
  }
  if (!_warnedModules.has(moduleId)) {
    _warnedModules.add(moduleId);
    // warn, not error — the app keeps rendering with the Inner's
    // per-field defensive reads; safeParse is diagnostic, not a
    // runtime failure. Monitoring wrappers that hook console.error
    // stay quiet by design.
    console.warn(
      `[module-validation] ${moduleId}: config does not match schema`,
      result.error.issues,
    );
  }
  return { ok: false, raw, error: result.error };
}
