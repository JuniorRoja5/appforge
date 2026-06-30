#!/usr/bin/env node
// Copies shared assets across the appforge monorepo. Lives at the repo
// root so it can serve any package (builder, runtime, backend) without
// belonging to one of them in particular.
//
// Two kinds of sources today:
//   1. Single files — e.g. module-permissions.json from backend → builder.
//   2. Directories — e.g. appforge-shared/src/module-schemas/ → builder
//      and runtime. The whole directory is mirrored, with `.ts` files
//      copied (subdirectories are NOT recursed today — flat directories
//      only, which is what module-schemas needs).
//
// Why a copy instead of a symlink: git in Windows defaults to
// core.symlinks=false, which would serialize the symlink as a plain text
// file containing the target path — breaking the import. A copy script
// works the same on Windows, Linux, and macOS without per-OS config.
//
// The copies are checked into git so a fresh `git clone` works out of the
// box without running install first. Hooks (predev/prebuild/postinstall
// in builder and runtime package.json) run this script so any edit in
// the source files propagates to copies on the next dev/build/install.
//
// Hardcoded rule: never edit the COPIES; always edit the SOURCE and let
// this script regenerate. The output of this script is deterministic,
// idempotent, and only writes when content actually differs (preserves
// mtime for unchanged files — avoids editor file-watcher noise).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Single-file copies. Each entry is (absolute from, absolute to).
const SHARED_FILES = [
  {
    from: resolve(root, 'appforge-backend', 'src', 'build', 'module-permissions.json'),
    to:   resolve(root, 'appforge-builder', 'src', 'lib', 'module-permissions.json'),
  },
];

// Directory copies. Each entry mirrors the FLAT contents of `from` into
// each destination in `tos`. Files are filtered by extension (`exts`)
// to avoid copying unrelated artifacts (e.g. README.md from the source).
const SHARED_DIRS = [
  {
    from: resolve(root, 'appforge-shared', 'src', 'module-schemas'),
    tos: [
      resolve(root, 'appforge-builder', 'src', 'lib', 'shared', 'module-schemas'),
      resolve(root, 'appforge-runtime', 'src', 'lib', 'shared', 'module-schemas'),
    ],
    exts: ['.ts'],
  },
];

let copied = 0;
let skipped = 0;

function copyIfChanged(from, to) {
  if (!existsSync(from)) {
    console.warn(`[copy-shared] source missing, skipping: ${from}`);
    skipped += 1;
    return;
  }
  const content = readFileSync(from, 'utf-8');
  mkdirSync(dirname(to), { recursive: true });
  if (existsSync(to) && readFileSync(to, 'utf-8') === content) {
    skipped += 1;
    return;
  }
  writeFileSync(to, content);
  console.log(`[copy-shared] ${from} → ${to}`);
  copied += 1;
}

// --- single files ---
for (const { from, to } of SHARED_FILES) {
  copyIfChanged(from, to);
}

// --- directories (flat, ext-filtered) ---
for (const { from, tos, exts } of SHARED_DIRS) {
  if (!existsSync(from)) {
    console.warn(`[copy-shared] source dir missing, skipping: ${from}`);
    skipped += 1;
    continue;
  }
  const entries = readdirSync(from);
  for (const name of entries) {
    const srcPath = resolve(from, name);
    const st = statSync(srcPath);
    if (!st.isFile()) continue;
    if (exts && !exts.some((e) => name.endsWith(e))) continue;
    for (const toDir of tos) {
      copyIfChanged(srcPath, resolve(toDir, basename(srcPath)));
    }
  }
}

console.log(`[copy-shared] ${copied} copied, ${skipped} unchanged`);
