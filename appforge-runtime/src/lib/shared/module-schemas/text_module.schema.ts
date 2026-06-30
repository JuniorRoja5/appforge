import { z } from 'zod';

/**
 * Phase 3a — pilot schema for the shared module-schemas package.
 *
 * The text_module is the simplest of the 22 module configs (3 fields:
 * content, align, fontSize) which makes it the right shape to validate
 * the copy-shared infrastructure end-to-end before migrating the rest
 * in Phase 3b.
 *
 * Naming convention for shared schemas: `{Module}ConfigSchema` for the
 * Zod schema, `{Module}Config` for the inferred TypeScript type. Both
 * exported. Consumers can rename via `import { ... as XXX }` if their
 * local naming differs.
 *
 * The shape mirrors what `appforge-builder/src/modules/custom_page/
 * text.module.tsx` defined locally before 3a. The runtime
 * (`appforge-runtime/src/modules/text/TextRuntime.tsx`) reads with
 * `safeParse` and falls back to defaults on invalid input (the full
 * placeholder UX in preview mode lands in 3c).
 *
 * PARSING MODE — strip (Zod default), deliberate.
 *   Zod 4 `z.object({...})` by default strips unknown fields from the
 *   output without raising an error. We intentionally do NOT use
 *   `.strict()` (which would fail on any unknown field) nor
 *   `.passthrough()` (which would keep unknown fields, destroying the
 *   type guarantee). Reasoning:
 *
 *     - `.strict()` would make migrations brittle: a single legacy
 *       manifest with a leftover field — or a config emitted by a
 *       module version that's one release ahead — fails validation
 *       wholesale, dropping to defaults and erasing the entire valid
 *       portion of the config. Catastrophic for resilience.
 *
 *     - `.passthrough()` would silently widen the type at runtime,
 *       leaking unknown fields into `parsed.data` and undermining
 *       the contract this package exists to enforce.
 *
 *     - strip is the middle ground: the declared shape is the
 *       contract, unknown fields are quietly discarded (forward and
 *       backwards compatible), and parse never fails on extras.
 *       Failures happen ONLY when a DECLARED field is missing or has
 *       the wrong type — which is the actual case we want to catch.
 *
 *   If a future module needs strict validation (e.g. for a security-
 *   sensitive config), override per-schema with `.strict()`. Don't
 *   change the project default without measuring impact on the other
 *   21 schemas.
 *
 * Module-level note: zombie field `fontWeight` that the runtime used
 * to read defensively has been removed from the runtime — it was
 * never declared by the builder, never edited in the SettingsPanel,
 * never set in defaultConfig, so no real manifest carried it. Adding
 * it to the schema would be declaring a phantom field. The runtime
 * no longer reads it.
 */
export const TextModuleConfigSchema = z.object({
  content: z.string(),
  align: z.enum(['left', 'center', 'right']),
  fontSize: z.string(),
});

export type TextModuleConfig = z.infer<typeof TextModuleConfigSchema>;
