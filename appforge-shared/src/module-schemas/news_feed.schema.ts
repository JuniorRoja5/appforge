import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — news_feed schema.
 *
 * Builder source: appforge-builder/src/modules/news_feed/news-feed.module.tsx
 * Runtime source: appforge-runtime/src/modules/news-feed/NewsFeedRuntime.tsx
 *
 * Architectural note (Plano 1 vs Plano 2): news articles themselves live
 * in the backend (`GET /news`) — they are NOT part of the module config.
 * The schema below only describes the VISUAL configuration the client
 * controls in the builder. Article CRUD (create/update/delete from the
 * SettingsPanel) is Plano 1 and not migrated here.
 *
 * Schema verification (3b checklist):
 *   - 7 top-level fields: layout, itemsToShow, showImage, showDate,
 *     showExcerpt, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - 1 numeric constraint preserved: itemsToShow z.number().min(1).max(50) ✓
 *
 * Legacy fields NOT in schema: none detected as real renames.
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.title` — the runtime reads `(data.title as string) ?? 'Noticias'`
 *     and feeds it to ModuleHeader. The builder does NOT currently
 *     declare or edit a module-level `title`, so the cast falls through
 *     to the literal 'Noticias' for every present-day manifest. The
 *     read is intentionally preserved because the post-B3 "editable
 *     header" epic will declare `title` in the schema and let the
 *     client edit it (empty string = collapse the header). This is
 *     contract that does not exist yet, not a zombie. Do NOT remove
 *     the defensive read during a schema migration.
 */
export const NewsFeedConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  itemsToShow: z.number().min(1).max(50),
  showImage: z.boolean(),
  showDate: z.boolean(),
  showExcerpt: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type NewsFeedConfig = z.infer<typeof NewsFeedConfigSchema>;
