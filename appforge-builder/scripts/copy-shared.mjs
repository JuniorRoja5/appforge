#!/usr/bin/env node
// Copies shared assets from appforge-backend into appforge-builder before
// dev/build/install. Single source of truth lives in the backend; this script
// keeps the builder's working copy in sync.
//
// Why a copy instead of a symlink: git in Windows defaults to core.symlinks=false,
// which would serialize the symlink as a plain text file containing the target
// path — breaking the JSON import in Vite. A copy script works the same on
// Windows, Linux, and macOS without per-OS configuration.
//
// The copy is checked into git so a fresh `git clone` works out of the box
// without running install first. The parity test in
// appforge-backend/src/build/__tests__/module-permissions.spec.ts catches
// divergence if anyone edits one file and forgets the other.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SHARED_FILES = [
  {
    from: resolve(root, '..', 'appforge-backend', 'src', 'build', 'module-permissions.json'),
    to:   resolve(root, 'src', 'lib', 'module-permissions.json'),
  },
];

let copied = 0;
let skipped = 0;
for (const { from, to } of SHARED_FILES) {
  if (!existsSync(from)) {
    console.warn(`[copy-shared] source missing, skipping: ${from}`);
    skipped += 1;
    continue;
  }
  const content = readFileSync(from, 'utf-8');
  mkdirSync(dirname(to), { recursive: true });
  // Only write if content differs — avoids touching mtime on every install
  if (existsSync(to) && readFileSync(to, 'utf-8') === content) {
    skipped += 1;
    continue;
  }
  writeFileSync(to, content);
  console.log(`[copy-shared] ${from} → ${to}`);
  copied += 1;
}

console.log(`[copy-shared] ${copied} copied, ${skipped} unchanged`);
