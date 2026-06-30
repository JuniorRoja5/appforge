import { z } from 'zod';

/**
 * Phase 3b (Lote B1 — simples) — hero_profile schema.
 *
 * Builder source: appforge-builder/src/modules/hero_profile/hero-profile.module.tsx
 * Runtime source: appforge-runtime/src/modules/hero-profile/HeroProfileRuntime.tsx
 *
 * Schema verification (3b checklist):
 *   - 8 top-level fields: coverImageUrl, profileImageUrl, name, subtitle,
 *     description, quickLinks, layout, coverHeight ✓
 *   - Zero refinements
 *   - 1 subschema (QuickLinkSchema, enum of 7 types) — EXPORTED separately
 *     so consumers can reference the per-link shape directly ✓
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.businessName` → mapped to `name` (old runtime naming)
 *   - `data.tagline` → mapped to `subtitle` (old runtime naming)
 *   - `data.avatarUrl` → mapped to `profileImageUrl` (old runtime naming)
 *   - `data.coverUrl` → mapped to `coverImageUrl` (old runtime naming)
 * These are backwards-compat with apps saved before the rename to the more
 * descriptive present-day field names. Removing the fallbacks from the
 * runtime would break those legacy apps; adding the legacy names to the
 * schema would declare phantom fields. Both routes are out of scope for 3b.
 */
export const QuickLinkSchema = z.object({
  id: z.string(),
  type: z.enum(['phone', 'email', 'instagram', 'facebook', 'whatsapp', 'linkedin', 'web']),
  value: z.string(),
});

export type QuickLink = z.infer<typeof QuickLinkSchema>;

export const HeroProfileConfigSchema = z.object({
  coverImageUrl: z.string(),
  profileImageUrl: z.string(),
  name: z.string(),
  subtitle: z.string(),
  description: z.string(),
  quickLinks: z.array(QuickLinkSchema),
  layout: z.enum(['centered', 'left', 'overlap']),
  coverHeight: z.enum(['small', 'medium', 'large']),
});

export type HeroProfileConfig = z.infer<typeof HeroProfileConfigSchema>;
