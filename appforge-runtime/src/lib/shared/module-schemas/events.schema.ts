import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — events schema.
 *
 * Builder source: appforge-builder/src/modules/events/events.module.tsx
 * Runtime source: appforge-runtime/src/modules/events/EventsRuntime.tsx
 *
 * Architectural note: event records themselves live in the backend
 * (`GET /events`). The schema describes the VISUAL configuration; event
 * CRUD lives in Plano 1 and is not migrated here.
 *
 * Schema verification (3b checklist):
 *   - 7 top-level fields: layout, itemsToShow, showImage, showLocation,
 *     showDescription, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - 1 numeric constraint preserved: itemsToShow z.number().min(1).max(50) ✓
 *
 * Legacy fields NOT in schema: none detected as real renames.
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.title` — the runtime reads `(data.title as string) ?? 'Eventos'`
 *     and feeds it to ModuleHeader. The builder does NOT currently
 *     declare or edit a module-level `title`, so the cast falls through
 *     to the literal 'Eventos' for every present-day manifest. The
 *     read is intentionally preserved because the post-B3 "editable
 *     header" epic will declare `title` in the schema and let the
 *     client edit it (empty string = collapse the header). This is
 *     contract that does not exist yet, not a zombie. Do NOT remove
 *     the defensive read during a schema migration.
 */
export const EventsConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  itemsToShow: z.number().min(1).max(50),
  showImage: z.boolean(),
  showLocation: z.boolean(),
  showDescription: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type EventsConfig = z.infer<typeof EventsConfigSchema>;
