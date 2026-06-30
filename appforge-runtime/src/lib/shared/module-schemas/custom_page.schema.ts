import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — custom_page schema (parent module).
 *
 * Builder source: appforge-builder/src/modules/custom_page/custom-page.module.tsx
 * Runtime source: appforge-runtime/src/modules/custom-page/CustomPageRuntime.tsx
 *
 * Note: the `custom_page` directory in the builder ALSO hosts three
 * sub-modules (text, image, button) which are independent modules with
 * their own ids and their own schemas. This file covers ONLY the
 * `custom_page` parent module (rich HTML content via Quill editor).
 *
 * Schema verification (3b checklist):
 *   - 4 top-level fields: htmlContent, backgroundColor, padding, maxWidth ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - Zero numeric constraints (padding is z.number() without min/max — the
 *     builder picks from a discrete set [8, 16, 24, 32] but the contract
 *     accepts any number; preserved as-is) ✓
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.content` → mapped to `htmlContent` (old runtime naming)
 * Backwards-compat with apps saved before the rename.
 */
export const CustomPageConfigSchema = z.object({
  htmlContent: z.string(),
  backgroundColor: z.string(),
  padding: z.number(),
  maxWidth: z.enum(['full', 'narrow', 'medium']),
});

export type CustomPageConfig = z.infer<typeof CustomPageConfigSchema>;
