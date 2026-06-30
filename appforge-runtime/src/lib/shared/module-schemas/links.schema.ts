import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — links schema.
 *
 * Builder source: appforge-builder/src/modules/links/links.module.tsx
 * Runtime source: appforge-runtime/src/modules/links/LinksRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 3 top-level fields: title, links, style ✓
 *   - Zero refinements
 *   - 1 subschema (LinkItemSchema) — EXPORTED separately so consumers can
 *     reference the item shape directly without drilling into the parent's
 *     `.shape.links.element` ✓
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - Zero numeric constraints
 *
 * Notes:
 *   - The icon enum has 12 values (globe, facebook, instagram, twitter,
 *     youtube, tiktok, whatsapp, telegram, email, phone, linkedin, custom).
 *     The runtime currently only renders 6 (globe, instagram, facebook,
 *     whatsapp, youtube, twitter) and falls back to a generic external-link
 *     icon for the remaining 6. That's a runtime UX gap (TECH_DEBT), not a
 *     schema problem — the contract correctly enumerates what the builder
 *     allows, and the runtime is permissive on rendering.
 *
 * Legacy fields NOT in schema: none detected in the runtime.
 */
export const LinkItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  icon: z.enum([
    'globe', 'facebook', 'instagram', 'twitter', 'youtube',
    'tiktok', 'whatsapp', 'telegram', 'email', 'phone', 'linkedin', 'custom',
  ]),
});

export type LinkItem = z.infer<typeof LinkItemSchema>;

export const LinksConfigSchema = z.object({
  title: z.string(),
  links: z.array(LinkItemSchema),
  style: z.enum(['list', 'buttons', 'cards']),
});

export type LinksConfig = z.infer<typeof LinksConfigSchema>;
