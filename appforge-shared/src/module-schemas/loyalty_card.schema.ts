import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — loyalty_card schema.
 *
 * Builder source: appforge-builder/src/modules/loyalty_card/loyalty-card.module.tsx
 * Runtime source: appforge-runtime/src/modules/loyalty-card/LoyaltyCardRuntime.tsx
 *
 * Architectural note: the loyalty engine (stamp accumulation, reward
 * redemption, per-customer state) lives in the backend. The schema
 * describes only the visual customization of the card widget.
 *
 * Naming note: the builder originally called this `LoyaltyCardSchema`
 * (non-canonical — omits the `Config` suffix). The shared package
 * uses the uniform `LoyaltyCardConfigSchema` name; the builder
 * imports with `as LoyaltyCardSchema` alias to keep the internal
 * `schema:` reference stable and avoid a ripple through the rest of
 * the module.
 *
 * Schema verification (3b checklist):
 *   - 11 top-level fields: title, description, totalStamps, reward,
 *     rewardDescription, cardColor, stampIcon, logoUrl, termsText,
 *     appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod (defaults live in defaultConfig at the
 *     ModuleDefinition level) ✓
 *   - 2 optionals preserved: appId, _refreshKey ✓
 *   - 1 numeric constraint preserved: totalStamps.min(4).max(20) ✓
 *
 * Value export — `stampIcons`:
 *   The `stampIcons` const array (5 values: 'star' | 'coffee' |
 *   'heart' | 'check' | 'gift') is exported from this file as a
 *   VALUE, not just as the enum source. Reason: the builder's
 *   loyalty-card.module.tsx has 4 real consumers of `stampIcons`
 *   (the `z.enum(stampIcons)`, the type `typeof stampIcons[number]`
 *   in `StampIconSvg`, the same type in `stampIconLabels`, and the
 *   `.map` of the icon picker in the SettingsPanel). Re-exporting
 *   avoids duplicating the source of truth for the 5 icon literals.
 *
 *   This is the deliberate exception to the "only re-export XxxConfig
 *   type" rule fixed in B2. The rule refined: re-export a value from
 *   shared ONLY when there is a real consumer that would otherwise
 *   duplicate the literal. B2 rejected `FieldSchema` because it had
 *   zero consumers; loyalty's `stampIcons` has 4.
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Zombie fields removed: none. title is a legit editable field, not
 * a latent hook.
 */
export const stampIcons = ['star', 'coffee', 'heart', 'check', 'gift'] as const;

export const LoyaltyCardConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  totalStamps: z.number().min(4).max(20),
  reward: z.string(),
  rewardDescription: z.string(),
  cardColor: z.string(),
  stampIcon: z.enum(stampIcons),
  logoUrl: z.string(),
  termsText: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type LoyaltyCardConfig = z.infer<typeof LoyaltyCardConfigSchema>;
