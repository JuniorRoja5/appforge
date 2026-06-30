import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — photo_gallery schema.
 *
 * Builder source: appforge-builder/src/modules/photo_gallery/photo-gallery.module.tsx
 * Runtime source: appforge-runtime/src/modules/photo-gallery/PhotoGalleryRuntime.tsx
 *
 * Architectural note: gallery items themselves live in the backend
 * (`GET /gallery`). The schema describes the VISUAL configuration; item
 * CRUD lives in Plano 1 and is not migrated here.
 *
 * Schema verification (3b checklist):
 *   - 7 top-level fields: title, columns, gap, showTitles, enableLightbox,
 *     appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - 1 default inside Zod preserved: `title: z.string().default('Galería')` ✓
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - 1 numeric constraint preserved: `columns: z.number().min(1).max(4)` ✓
 *     (Note: `gap: z.number()` has NO min/max constraint — preserved as-is;
 *     the builder picks from a discrete set in the SettingsPanel UI, the
 *     contract accepts any number.)
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Zombie fields removed: none. The runtime correctly reads `data.title`
 * — the builder DOES declare it (with the default 'Galería'), so the
 * defensive read `(data.title as string) ?? 'Galería'` is legitimate.
 */
export const PhotoGalleryConfigSchema = z.object({
  title: z.string().default('Galería'),
  columns: z.number().min(1).max(4),
  gap: z.number(),
  showTitles: z.boolean(),
  enableLightbox: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type PhotoGalleryConfig = z.infer<typeof PhotoGalleryConfigSchema>;
