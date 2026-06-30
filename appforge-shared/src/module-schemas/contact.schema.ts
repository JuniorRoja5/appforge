import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — contact schema.
 *
 * Builder source: appforge-builder/src/modules/contact/contact.module.tsx
 * Runtime source: appforge-runtime/src/modules/contact/ContactRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 11 top-level fields: formTitle, submitButtonText, successMessage,
 *     fields, enableHoneypot, enableCaptcha, titleColor, labelColor,
 *     placeholderColor, appId, _refreshKey ✓
 *   - Zero refinements
 *   - 1 subschema (ContactFieldSchema) — EXPORTED separately ✓
 *     Originally named `FieldSchema` in the builder (too generic for a
 *     shared package — would collide with other future modules that
 *     need a "field" type). Renamed here to ContactFieldSchema +
 *     ContactField. The builder imports with `as FieldSchema` /
 *     `as FormField` aliases to keep its internal code stable.
 *   - Zero defaults inside Zod (at this level — see optionals)
 *   - 4 optionals preserved: appId, _refreshKey at top level (both
 *     part of the dynamic-CRUD-module pattern); placeholder, options
 *     inside ContactFieldSchema ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.title` → mapped to `formTitle` (old runtime naming, real rename)
 *
 * Latent hook NOT in schema (preserved in runtime for upcoming feature):
 *   - `data.titleAlignment` — the runtime reads `(data.titleAlignment
 *     as string) ?? 'left'` and applies it to the form title's textAlign.
 *     The builder does NOT currently declare or edit this field, so the
 *     cast falls through to 'left' for every present-day manifest.
 *     The read is intentionally preserved because the post-B3 "editable
 *     header" epic will declare `titleAlignment` in the schema and
 *     expose it in the SettingsPanel. This is contract that does not
 *     exist yet — not a fontWeight-style zombie. Do NOT remove the
 *     defensive read during a schema migration.
 */
export const ContactFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'file', 'select']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type ContactField = z.infer<typeof ContactFieldSchema>;

export const ContactConfigSchema = z.object({
  formTitle: z.string(),
  submitButtonText: z.string(),
  successMessage: z.string(),
  fields: z.array(ContactFieldSchema),
  enableHoneypot: z.boolean(),
  enableCaptcha: z.boolean(),
  titleColor: z.string(),
  labelColor: z.string(),
  placeholderColor: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type ContactConfig = z.infer<typeof ContactConfigSchema>;
