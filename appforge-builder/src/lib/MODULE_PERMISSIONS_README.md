# module-permissions.json

This file is a **synced copy** of `appforge-backend/src/build/module-permissions.json`.
The single source of truth lives in the backend; the builder consumes it for
the "Auto-detectar permisos según módulos" UI in
`features/builder/app-config/tabs/AndroidConfigTab.tsx` and
`IosPermissionsTab.tsx`.

## How it stays in sync

`appforge-builder/scripts/copy-shared.mjs` runs on three triggers:

- `npm install`  → `postinstall` hook
- `npm run dev`  → `predev` hook
- `npm run build` → `prebuild` hook

The script copies the backend file into this directory only if the contents
differ (idempotent). The copy is checked into git so a fresh clone works
out of the box without running `npm install` first.

## What if I edit one file but forget the other?

The Jest spec at
`appforge-backend/src/build/__tests__/module-permissions.spec.ts` reads both
files and asserts they are byte-for-byte identical. If you only edit the
backend copy, the next `npm run build` in the builder regenerates the local
copy automatically. If you only edit the builder copy, the test fails on
the next backend test run.

## Why a copy and not a symlink?

Git defaults to `core.symlinks=false` on Windows, which would serialize
symlinks as plain text files containing the target path — breaking the
`import json from './module-permissions.json'` in Vite. A copy script works
the same on every OS without per-developer configuration.

## Schema

```typescript
type ModulePermissionsJSON = {
  android: Record<ModuleId, AndroidPermission[]>;     // Permission constants from android.permission.*
  ios: Record<ModuleId, IosPermissionKey[]>;          // NSDescription keys (no descriptions)
  iosDescriptions: Record<IosPermissionKey, string>;  // Default description text per key, with #APP_NAME placeholder
};
```

The `#APP_NAME` placeholder in `iosDescriptions` is resolved at build time by
`appforge-backend/src/build/build.processor.ts` `injectIosPermissions` (substitutes
`app.name` before writing to `Info.plist`).
