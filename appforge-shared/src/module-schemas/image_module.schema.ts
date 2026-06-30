import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — image_module schema.
 *
 * Builder source: appforge-builder/src/modules/custom_page/image.module.tsx
 * Runtime source: appforge-runtime/src/modules/image/ImageRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 5 top-level fields: url, alt, objectFit, radius, height ✓
 *   - 1 refinement on url (preserved byte-by-byte) ✓
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.src` → mapped to `url` (old runtime naming)
 *   - `data.borderRadius` → mapped to `radius` (old runtime naming)
 * These are backwards-compat with manifests saved before the rename. The
 * runtime keeps the fallbacks until we can confirm no live manifest still
 * carries them. Adding them to the schema would declare phantom fields the
 * builder no longer emits; removing them from the runtime would break legacy
 * apps. Both routes are out of scope for 3b.
 */
export const ImageModuleConfigSchema = z.object({
  url: z.string().refine(
    (v) => v === '' || v.startsWith('http') || v.startsWith('/'),
    'URL inválida (debe ser http(s) o ruta relativa)',
  ),
  alt: z.string(),
  objectFit: z.enum(['cover', 'contain', 'fill']),
  radius: z.string(),
  height: z.string(),
});

export type ImageModuleConfig = z.infer<typeof ImageModuleConfigSchema>;
