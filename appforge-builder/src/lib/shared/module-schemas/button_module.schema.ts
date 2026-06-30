import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — button_module schema.
 *
 * Builder source: appforge-builder/src/modules/custom_page/button.module.tsx
 * Runtime source: appforge-runtime/src/modules/button/ButtonRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 6 top-level fields: label, url, style, color, textColor, radius ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.variant` → mapped to `style` (old runtime naming)
 *   - The runtime's STYLE_MAP also accepts legacy values `filled`, `outlined`,
 *     `ghost` from old manifests; the present enum is only `solid` | `outline`.
 * These are backwards-compat with apps saved before the rename. Adding them
 * to the schema would declare phantom fields the builder no longer emits.
 */
export const ButtonModuleConfigSchema = z.object({
  label: z.string(),
  url: z.string(),
  style: z.enum(['solid', 'outline']),
  color: z.string(),
  textColor: z.string(),
  radius: z.string(),
});

export type ButtonModuleConfig = z.infer<typeof ButtonModuleConfigSchema>;
