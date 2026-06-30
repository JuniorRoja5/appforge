# appforge-shared

Single source of truth for Zod schemas and type definitions shared across
the appforge monorepo (`appforge-builder`, `appforge-runtime`, and
potentially `appforge-backend` in the future).

## What lives here

- `src/module-schemas/` — One Zod schema file per module (`{module_id}.schema.ts`).
  Each file exports the schema (`XXXConfigSchema`) and the inferred type
  (`XXXConfig`). Both builder and runtime import these to keep the config
  shape of every module aligned.

## Why a copy, not an import

The monorepo is flat (no npm workspaces, no Lerna). Cross-package imports
via relative paths would work in dev but break Vite's bundling and produce
brittle path traversals in production builds. Instead, the canonical files
in `appforge-shared/src/` are COPIED into each consuming package by
`scripts/copy-shared.mjs` (at the repo root):

```
appforge-shared/src/module-schemas/text_module.schema.ts
  → appforge-builder/src/lib/shared/module-schemas/text_module.schema.ts
  → appforge-runtime/src/lib/shared/module-schemas/text_module.schema.ts
```

The copies ARE checked into git so a fresh `git clone` works without
running install first. The `predev/prebuild/postinstall` hooks of each
package run `copy-shared` so any edit in `appforge-shared/` propagates
automatically on the next dev/build/install cycle.

## Single-edit rule

NEVER edit the copies in `appforge-builder/src/lib/shared/` or
`appforge-runtime/src/lib/shared/` directly. The next `copy-shared` run
will overwrite your edit silently. Always change the source in
`appforge-shared/src/`, then run `copy-shared` (or rely on the next build
to do it for you).

## Adding a new module schema

1. Create `appforge-shared/src/module-schemas/{id}.schema.ts`.
2. Export `{Module}ConfigSchema` (the Zod schema) and `{Module}Config`
   (`z.infer<typeof ...>`).
3. From the builder's `{id}.module.tsx`, import the schema and use it
   in `ModuleDefinition.schema`.
4. From the runtime's `{Id}Runtime.tsx`, import the schema and run
   `safeParse(data)` before reading fields.
5. The next `npm run dev` / `npm run build` propagates the file to both
   consuming packages via `copy-shared`.

## Versions

Zod `^4.4.3` (aligned across `appforge-shared`, `appforge-builder` and
`appforge-runtime` package.json — verified in 3a). When upgrading Zod,
upgrade in all three places at the same time to keep validation
behavior consistent: a `z.infer<typeof Schema>` resolving to different
TypeScript shapes between builder and runtime would silently
reintroduce the drift this package exists to prevent.
