import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — video schema.
 *
 * Builder source: appforge-builder/src/modules/video/video.module.tsx
 * Runtime source: appforge-runtime/src/modules/video/VideoRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 7 top-level fields: title, videos, layout, columns, backgroundColor,
 *     titleColor, descriptionColor ✓
 *   - Zero refinements
 *   - 1 subschema (VideoItemSchema) — EXPORTED separately ✓
 *   - 3 defaults inside Zod (backgroundColor, titleColor, descriptionColor)
 *     preserved byte-by-byte ✓
 *   - Zero optionals
 *   - 1 numeric constraint: `columns: z.number().min(1).max(2)` preserved ✓
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.url` (single string) → mapped to a one-item videos array. Old
 *     manifests stored a single video URL at the top level before the array
 *     refactor. The runtime synthesizes `[{ url: data.url, title: '' }]` when
 *     it sees this shape. Adding `url` to the schema would create two ways to
 *     declare the same content (the array and the legacy field) and risk
 *     drift between them.
 */
export const VideoItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
});

export type VideoItem = z.infer<typeof VideoItemSchema>;

export const VideoConfigSchema = z.object({
  title: z.string(),
  videos: z.array(VideoItemSchema),
  layout: z.enum(['single', 'grid']),
  columns: z.number().min(1).max(2),
  backgroundColor: z.string().default('#ffffff'),
  titleColor: z.string().default('#1f2937'),
  descriptionColor: z.string().default('#6b7280'),
});

export type VideoConfig = z.infer<typeof VideoConfigSchema>;
