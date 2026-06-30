import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — fan_wall schema.
 *
 * Builder source: appforge-builder/src/modules/fan_wall/fan-wall.module.tsx
 * Runtime source: appforge-runtime/src/modules/fan-wall/FanWallRuntime.tsx
 *
 * Architectural note: fan posts live in the backend (`FanPostItem` type
 * from the API). The schema describes only the VISUAL+gate configuration
 * (enabled flag, header colors, title). Post CRUD is Plano 1.
 *
 * Schema verification (3b checklist):
 *   - 6 top-level fields: enabled, title, backgroundColor, headerColor,
 *     appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - 3 defaults inside Zod preserved byte-by-byte:
 *       title='Fan Wall', backgroundColor='#f9fafb',
 *       headerColor='' (empty string) ✓
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Zombie fields removed: none.
 */
export const FanWallConfigSchema = z.object({
  enabled: z.boolean(),
  title: z.string().default('Fan Wall'),
  backgroundColor: z.string().default('#f9fafb'),
  headerColor: z.string().default(''),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type FanWallConfig = z.infer<typeof FanWallConfigSchema>;
