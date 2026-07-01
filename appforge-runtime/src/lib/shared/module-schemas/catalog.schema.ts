import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — catalog schema.
 *
 * Builder source: appforge-builder/src/modules/catalog/catalog.module.tsx
 * Runtime source: appforge-runtime/src/modules/catalog/CatalogRuntime.tsx
 *
 * Architectural note: catalog products live in the backend (products
 * CRUD, cart engine, checkout). The schema below describes only the
 * VISUAL configuration the client controls (layout, columns, which
 * item metadata to show, currency, cart toggle). Product/cart shapes
 * are Plano 1.
 *
 * Schema verification (3b checklist):
 *   - 9 top-level fields: layout, columns, showPrices, showComparePrice,
 *     showTags, enableCart, currency, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod (defaults live in defaultConfig at the
 *     ModuleDefinition level, not inside z.object — coherent with the
 *     rest of B3 modules) ✓
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - 1 numeric constraint preserved: columns.min(1).max(3) ✓
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.title` — the runtime reads `(data.title as string) ??
 *     'Catálogo'` and feeds it to the header. The builder does NOT
 *     currently declare or edit a module-level `title`, so the cast
 *     falls through to 'Catálogo' for every present-day manifest.
 *     Preserved for the post-B3 "editable header" epic (Phase 3.5).
 *     This is contract that does not exist yet, not a zombie. Do NOT
 *     remove the defensive read during a schema migration.
 */
export const CatalogConfigSchema = z.object({
  layout: z.enum(['grid', 'list']),
  columns: z.number().min(1).max(3),
  showPrices: z.boolean(),
  showComparePrice: z.boolean(),
  showTags: z.boolean(),
  enableCart: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type CatalogConfig = z.infer<typeof CatalogConfigSchema>;
