import { z } from 'zod';

/**
 * Phase 3b (Lote B2 — medianos) — social_wall schema.
 *
 * Builder source: appforge-builder/src/modules/social_wall/social-wall.module.tsx
 * Runtime source: appforge-runtime/src/modules/social-wall/SocialWallRuntime.tsx
 *
 * Architectural note: social posts and comments live in the backend
 * (`SocialPostItem`, `SocialCommentItem` types from the API). The schema
 * below describes only the VISUAL+behavioral configuration the client
 * controls (enabled, layout, colors, per-page limits, allowComments
 * flag, etc.) — the post/comment shapes are Plano 1.
 *
 * Schema verification (3b checklist):
 *   - 14 top-level fields: enabled, allowImages, title, backgroundColor,
 *     headerColor, textColor, displayMode, postLayout, showHeader,
 *     postsPerPage, allowComments, allowLikes, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - 10 defaults inside Zod preserved byte-by-byte:
 *       title='Social Wall', backgroundColor='#f9fafb',
 *       headerColor='' (empty string), textColor='#1f2937',
 *       displayMode='default', postLayout='list',
 *       showHeader=true, postsPerPage=10, allowComments=true,
 *       allowLikes=true ✓
 *   - 2 optionals preserved: appId, _refreshKey (dynamic-CRUD pattern) ✓
 *   - 1 numeric constraint preserved: postsPerPage.min(3).max(50) ✓
 *
 * Style preserved: `displayModes` and `postLayouts` are declared as
 * `as const` arrays outside the schema (original builder convention) so
 * Zod's enum and TypeScript both see the same literal source. Kept here
 * to mirror the builder's structure 1:1.
 *
 * Legacy fields NOT in schema: none detected.
 *
 * Zombie fields removed: none.
 */
const displayModes = ['default', 'fullwidth'] as const;
const postLayouts = ['list', 'cards', 'compact'] as const;

export const SocialWallConfigSchema = z.object({
  enabled: z.boolean(),
  allowImages: z.boolean(),
  title: z.string().default('Social Wall'),
  backgroundColor: z.string().default('#f9fafb'),
  headerColor: z.string().default(''),
  textColor: z.string().default('#1f2937'),
  displayMode: z.enum(displayModes).default('default'),
  postLayout: z.enum(postLayouts).default('list'),
  showHeader: z.boolean().default(true),
  postsPerPage: z.number().min(3).max(50).default(10),
  allowComments: z.boolean().default(true),
  allowLikes: z.boolean().default(true),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type SocialWallConfig = z.infer<typeof SocialWallConfigSchema>;
