import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — pdf_reader schema.
 *
 * Builder source: appforge-builder/src/modules/pdf_reader/pdf-reader.module.tsx
 * Runtime source: appforge-runtime/src/modules/pdf-reader/PdfReaderRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 4 top-level fields: pdfUrl, title, showTitle, fileName ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 1 optional field: `fileName` is `.optional()` — preserved exactly as
 *     in the builder, NOT promoted to required. The builder's defaultConfig
 *     happens to provide `fileName: ''`, but the schema must allow the
 *     field to be absent entirely (some legacy manifests omit it). Promoting
 *     to required would cause safeParse to fail on those manifests, dropping
 *     the entire valid config to defaults. ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema: none detected in the runtime — the runtime is
 * the cleanest of the B1 batch.
 */
export const PdfReaderConfigSchema = z.object({
  pdfUrl: z.string(),
  title: z.string(),
  showTitle: z.boolean(),
  fileName: z.string().optional(),
});

export type PdfReaderConfig = z.infer<typeof PdfReaderConfigSchema>;
