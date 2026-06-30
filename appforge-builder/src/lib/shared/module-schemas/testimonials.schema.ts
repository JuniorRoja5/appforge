import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — testimonials schema.
 *
 * Builder source: appforge-builder/src/modules/testimonials/testimonials.module.tsx
 * Runtime source: appforge-runtime/src/modules/testimonials/TestimonialsRuntime.tsx
 *
 * Architectural note: testimonials are stored in the manifest itself
 * (NOT in a separate backend table like news/events/gallery). The whole
 * array travels in the config — that's why TestimonialItemSchema exists
 * at this level rather than as a backend-shaped type.
 *
 * Schema verification (3b checklist):
 *   - 5 top-level fields: title, testimonials, showRating, showImage,
 *     layout ✓
 *   - Zero refinements
 *   - 1 subschema (TestimonialItemSchema) — EXPORTED separately so the
 *     runtime can reference the item shape without drilling into
 *     `.shape.testimonials.element` ✓
 *   - Zero defaults inside Zod
 *   - Zero optionals
 *   - 1 numeric constraint preserved INSIDE the subschema:
 *     `rating: z.number().min(1).max(5)` ✓
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - At root: `data.items` → mapped to `testimonials` (old runtime naming)
 *   - Inside each item: `raw.name` → `authorName`, `raw.avatarUrl` →
 *     `authorImageUrl`, `raw.role` → `authorRole`. The runtime's
 *     `normalizeTestimonial()` does the mapping; we keep it intact.
 *     Adding the legacy names to the schema would declare phantom fields
 *     the builder no longer emits.
 *
 * Zombie fields removed: none. The runtime's `(data.title as string) ??
 * 'Testimonios'` is legitimate because the builder DOES declare `title`
 * in TestimonialsConfigSchema and edits it in the SettingsPanel.
 */
export const TestimonialItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  authorImageUrl: z.string(),
  rating: z.number().min(1).max(5),
});

export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsConfigSchema = z.object({
  title: z.string(),
  testimonials: z.array(TestimonialItemSchema),
  showRating: z.boolean(),
  showImage: z.boolean(),
  layout: z.enum(['carousel', 'list', 'cards']),
});

export type TestimonialsConfig = z.infer<typeof TestimonialsConfigSchema>;
