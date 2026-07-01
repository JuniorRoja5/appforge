import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — discount_coupon schema.
 *
 * Builder source: appforge-builder/src/modules/discount_coupon/discount-coupon.module.tsx
 * Runtime source: appforge-runtime/src/modules/discount-coupon/DiscountCouponRuntime.tsx
 *
 * Architectural note: the coupon engine (validation, redemption,
 * usage tracking, expiry) lives in the backend. The schema describes
 * only the client-editable visual configuration.
 *
 * Schema verification (3b checklist):
 *   - 7 top-level fields: layout, showExpiry, showConditions,
 *     showUsageCount, currency, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 2 optionals preserved: appId, _refreshKey ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.title` — the runtime reads `(data.title as string) ??
 *     'Cupones'` and feeds it to the header. The builder does NOT
 *     currently declare or edit a module-level `title`, so the cast
 *     falls through to 'Cupones' for every present-day manifest.
 *     Preserved for the post-B3 "editable header" epic (Phase 3.5).
 *     This is contract that does not exist yet, not a zombie. Do NOT
 *     remove the defensive read during a schema migration.
 */
export const DiscountCouponConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  showExpiry: z.boolean(),
  showConditions: z.boolean(),
  showUsageCount: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type DiscountCouponConfig = z.infer<typeof DiscountCouponConfigSchema>;
