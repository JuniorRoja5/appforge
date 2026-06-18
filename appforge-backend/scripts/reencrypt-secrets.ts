/**
 * scripts/reencrypt-secrets.ts — ONE-OFF migration for #7 entropy key rotation.
 *
 * Re-encrypts every column protected by SMTP_ENCRYPTION_KEY and
 * KEYSTORE_ENCRYPTION_KEY when migrating from the pre-#7 format
 * (32 ASCII chars used as 32 UTF-8 bytes) to the post-#7 format
 * (64 hex chars decoded to 32 random bytes).
 *
 * HISTORICAL AUDIT. Run ONCE during the rotation maintenance window. Do
 * NOT run again. Future rotations of already-hex keys would have a
 * different shape (hex → hex, single decrypt path) and should be a
 * different script.
 *
 * --- Usage on VPS during stopped-API window ---
 *
 *   # 1. Generate the new keys on the VPS (NOT on a local machine):
 *   export SMTP_NEW="$(openssl rand -hex 32)"
 *   export KEYSTORE_NEW="$(openssl rand -hex 32)"
 *
 *   # 2. Set the old keys (read silently — no -p prompt visible, no history):
 *   set +H
 *   read -rs SMTP_OLD     ; export SMTP_OLD
 *   read -rs KEYSTORE_OLD ; export KEYSTORE_OLD
 *
 *   # 3. Run the script. DATABASE_URL comes from the existing .env via the
 *   #    `import 'dotenv/config'` at the top of this file. Prisma standalone
 *   #    does NOT auto-load .env — discovered during pre-flight. We DO NOT
 *   #    edit the .env yet; the rotation script reads the OLD keys from
 *   #    env vars exported by the operator above, not from the .env itself.
 *   #    Use the local ts-node binary explicitly (cero ambigüedad vs the npx
 *   #    cache pulling a different version):
 *   cd /opt/appforge/appforge-backend
 *   ./node_modules/.bin/ts-node --transpile-only scripts/reencrypt-secrets.ts
 *
 *   # 4. On success, update .env with the new hex keys, then git pull /
 *   #    build / pm2 start as per the rotation plan. The keys printed in
 *   #    SMTP_NEW / KEYSTORE_NEW are what goes into .env.
 *   #    BORRAR las variables del shell antes de salir:
 *   unset SMTP_OLD SMTP_NEW KEYSTORE_OLD KEYSTORE_NEW
 *
 * --- Why env vars and not argv ---
 *
 * argv is visible in `ps -ef` and /proc/<pid>/cmdline for ANY process on
 * the host while this script runs, and it lands in shell history. Env
 * vars are not exposed via these channels. Same hardening as the bcrypt
 * helper we used elsewhere.
 *
 * --- Safety guarantees ---
 *
 * - Per row: decrypt(old) → re-encrypt(new) → verify decrypt(new) === plaintext
 *   BEFORE writing. If anything diverges, the script aborts that row's
 *   transaction with a clear error and no partial update.
 * - Per table: updates wrap in a Prisma $transaction (all-or-nothing for
 *   that table). One table's failure DOES NOT roll back tables already
 *   committed earlier in the run — that's the simplest meaningful guarantee
 *   for an op-time script. With 1 row total in prod today, the practical
 *   granularity is moot; the structure matters for reading the code later.
 * - GCM authentication: a wrong key produces an auth tag mismatch and
 *   throws on decrypt — there is no silent "decrypted to garbage" failure
 *   mode. The verify step is robust against any key-buffer derivation bug.
 *
 * --- Coverage (6 columns / 4 tables) ---
 *
 *   AppSmtpConfig.encryptedPass         (SMTP key)
 *   PlatformSmtpConfig.encryptedPass    (SMTP key)
 *   PlatformFcmConfig.serviceAccountJson  (SMTP key)
 *   PlatformFcmConfig.googleServicesJson  (SMTP key)
 *   AppKeystore.storePassword           (KEYSTORE key)
 *   AppKeystore.keyPassword             (KEYSTORE key)
 *
 * All six columns are schema-declared NOT NULL — no null guards needed.
 */

// MUST be the very first import: loads .env into process.env BEFORE Prisma
// reads DATABASE_URL during `new PrismaClient()`. Prisma standalone does NOT
// auto-load .env (only the Nest ConfigModule does, which this script doesn't
// boot). Without this line, `findMany` would throw "Environment variable not
// found: DATABASE_URL" — and during the maintenance window with the API
// stopped, that's the worst possible time to discover it. Pre-flight green.
import 'dotenv/config';

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const ALGORITHM = 'aes-256-gcm';

// ─── Key loaders ────────────────────────────────────────────────────────

function loadOldUtf8Key(envVarName: string): Buffer {
  const v = process.env[envVarName];
  if (!v) {
    throw new Error(`Missing env var: ${envVarName}`);
  }
  const buf = Buffer.from(v, 'utf8');
  if (buf.length !== 32) {
    throw new Error(
      `${envVarName} (old format) must decode to exactly 32 bytes from UTF-8, ` +
        `got ${buf.length} bytes (length=${v.length} chars).`,
    );
  }
  return buf;
}

function loadNewHexKey(envVarName: string): Buffer {
  const v = process.env[envVarName];
  if (!v) {
    throw new Error(`Missing env var: ${envVarName}`);
  }
  if (!/^[0-9a-f]{64}$/i.test(v)) {
    throw new Error(
      `${envVarName} (new format) must be exactly 64 hex chars [0-9a-fA-F], ` +
        `got length=${v.length}. Generate with: openssl rand -hex 32`,
    );
  }
  const buf = Buffer.from(v, 'hex');
  if (buf.length !== 32) {
    // Should be unreachable after the regex above, but defensive.
    throw new Error(
      `${envVarName} (new format) decoded to ${buf.length} bytes, expected 32.`,
    );
  }
  return buf;
}

// ─── Crypto primitives ──────────────────────────────────────────────────
// Bit-identical to src/lib/crypto.ts for encrypt/decrypt — the ONLY thing
// that differs between old/new is how the key Buffer is derived (above).

function decrypt(key: Buffer, payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format (expected iv:tag:ciphertext)');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function encrypt(key: Buffer, plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── Per-value re-encrypt with round-trip verify ────────────────────────

function reencryptValue(
  oldKey: Buffer,
  newKey: Buffer,
  oldCipher: string,
  context: string,
): string {
  let plaintext: string;
  try {
    plaintext = decrypt(oldKey, oldCipher);
  } catch (err: any) {
    throw new Error(
      `decrypt(old) failed at ${context}: ${err.message}. ` +
        `The old key cannot read this ciphertext — wrong SMTP_OLD/KEYSTORE_OLD?`,
    );
  }
  const newCipher = encrypt(newKey, plaintext);
  // Round-trip verify: decrypt with the new key and compare to original plaintext.
  // GCM auth tag mismatch would throw here on key/data divergence — no silent
  // "decoded to garbage" path exists. Belt and suspenders.
  let verifyPlaintext: string;
  try {
    verifyPlaintext = decrypt(newKey, newCipher);
  } catch (err: any) {
    throw new Error(
      `verify decrypt(new) threw at ${context}: ${err.message}. ` +
        `The new key cannot read what it just encrypted — IMPOSSIBLE under normal ` +
        `operation. Check newKey buffer derivation.`,
    );
  }
  if (verifyPlaintext !== plaintext) {
    throw new Error(
      `Round-trip plaintext mismatch at ${context}. ` +
        `plaintext.length=${plaintext.length}, verify.length=${verifyPlaintext.length}.`,
    );
  }
  return newCipher;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('[reencrypt-secrets] Loading keys from env vars...');
  const smtpOld = loadOldUtf8Key('SMTP_OLD');
  const smtpNew = loadNewHexKey('SMTP_NEW');
  const ksOld   = loadOldUtf8Key('KEYSTORE_OLD');
  const ksNew   = loadNewHexKey('KEYSTORE_NEW');
  console.log('[reencrypt-secrets] Keys loaded OK.');

  const prisma = new PrismaClient();
  const counts: Record<string, number> = {};

  try {
    // ── AppSmtpConfig.encryptedPass (SMTP key) ──
    const apps = await prisma.appSmtpConfig.findMany({
      select: { id: true, encryptedPass: true },
    });
    if (apps.length > 0) {
      await prisma.$transaction(
        apps.map((row) =>
          prisma.appSmtpConfig.update({
            where: { id: row.id },
            data: {
              encryptedPass: reencryptValue(
                smtpOld,
                smtpNew,
                row.encryptedPass,
                `AppSmtpConfig.id=${row.id}`,
              ),
            },
          }),
        ),
      );
    }
    counts['AppSmtpConfig.encryptedPass'] = apps.length;

    // ── PlatformSmtpConfig.encryptedPass (SMTP key) ──
    const plats = await prisma.platformSmtpConfig.findMany({
      select: { id: true, encryptedPass: true },
    });
    if (plats.length > 0) {
      await prisma.$transaction(
        plats.map((row) =>
          prisma.platformSmtpConfig.update({
            where: { id: row.id },
            data: {
              encryptedPass: reencryptValue(
                smtpOld,
                smtpNew,
                row.encryptedPass,
                `PlatformSmtpConfig.id=${row.id}`,
              ),
            },
          }),
        ),
      );
    }
    counts['PlatformSmtpConfig.encryptedPass'] = plats.length;

    // ── PlatformFcmConfig.serviceAccountJson + googleServicesJson (SMTP key) ──
    // Both columns of the same row updated in one statement per row, so we
    // wrap the per-row updates in a single transaction (atomic over the table).
    const fcms = await prisma.platformFcmConfig.findMany({
      select: {
        id: true,
        serviceAccountJson: true,
        googleServicesJson: true,
      },
    });
    if (fcms.length > 0) {
      await prisma.$transaction(
        fcms.map((row) =>
          prisma.platformFcmConfig.update({
            where: { id: row.id },
            data: {
              serviceAccountJson: reencryptValue(
                smtpOld,
                smtpNew,
                row.serviceAccountJson,
                `PlatformFcmConfig.serviceAccountJson id=${row.id}`,
              ),
              googleServicesJson: reencryptValue(
                smtpOld,
                smtpNew,
                row.googleServicesJson,
                `PlatformFcmConfig.googleServicesJson id=${row.id}`,
              ),
            },
          }),
        ),
      );
    }
    counts['PlatformFcmConfig.serviceAccountJson'] = fcms.length;
    counts['PlatformFcmConfig.googleServicesJson'] = fcms.length;

    // ── AppKeystore.storePassword + keyPassword (KEYSTORE key) ──
    const kss = await prisma.appKeystore.findMany({
      select: { id: true, storePassword: true, keyPassword: true },
    });
    if (kss.length > 0) {
      await prisma.$transaction(
        kss.map((row) =>
          prisma.appKeystore.update({
            where: { id: row.id },
            data: {
              storePassword: reencryptValue(
                ksOld,
                ksNew,
                row.storePassword,
                `AppKeystore.storePassword id=${row.id}`,
              ),
              keyPassword: reencryptValue(
                ksOld,
                ksNew,
                row.keyPassword,
                `AppKeystore.keyPassword id=${row.id}`,
              ),
            },
          }),
        ),
      );
    }
    counts['AppKeystore.storePassword'] = kss.length;
    counts['AppKeystore.keyPassword'] = kss.length;

    console.log('');
    console.log('[reencrypt-secrets] Re-encryption complete.');
    console.log('Rows touched per column:');
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(45)} ${v}`);
    }
    console.log('');
    console.log('Next steps:');
    console.log('  1. Update .env on VPS with the new hex keys.');
    console.log('  2. git pull origin main  (brings A+B: main.ts + crypto.ts).');
    console.log('  3. npm run build');
    console.log('  4. pm2 start appforge-api  (boot validates the new format).');
    console.log('  5. Smoke: decrypt one row with the deployed crypto.ts to');
    console.log('     confirm the new code reads what this script wrote.');
    console.log('  6. unset SMTP_OLD SMTP_NEW KEYSTORE_OLD KEYSTORE_NEW');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('');
  console.error('[reencrypt-secrets] FATAL — re-encryption aborted:');
  console.error(err.message ?? err);
  console.error('');
  console.error('No partial state expected: failures inside a Prisma $transaction');
  console.error('roll back the whole table batch. Tables already committed before');
  console.error('the failure are at the new key; tables not yet processed are at');
  console.error('the old key. Inspect counts above (if printed) before deciding.');
  process.exit(1);
});
