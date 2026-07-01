import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — menu_restaurant schema.
 *
 * Builder source: appforge-builder/src/modules/menu_restaurant/menu-restaurant.module.tsx
 * Runtime source: appforge-runtime/src/modules/menu-restaurant/MenuRestaurantRuntime.tsx
 *
 * Architectural note: menu items, categories and allergen mappings
 * live in the backend. The schema describes only the client-editable
 * visual configuration (layout, which metadata to show, currency).
 * Plano 1 untouched.
 *
 * Schema verification (3b checklist):
 *   - 8 top-level fields: layout, showImages, showPrices, showAllergens,
 *     showDescription, currency, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.title` — the runtime reads `(data.title as string) ??
 *     'Menú'` and feeds it to the header. The builder does NOT
 *     currently declare or edit a module-level `title`, so the cast
 *     falls through to 'Menú' for every present-day manifest.
 *     Preserved for the post-B3 "editable header" epic (Phase 3.5).
 *     This is contract that does not exist yet, not a zombie. Do NOT
 *     remove the defensive read during a schema migration.
 */
export const MenuRestaurantConfigSchema = z.object({
  layout: z.enum(['accordion', 'tabs', 'scroll']),
  showImages: z.boolean(),
  showPrices: z.boolean(),
  showAllergens: z.boolean(),
  showDescription: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type MenuRestaurantConfig = z.infer<typeof MenuRestaurantConfigSchema>;
