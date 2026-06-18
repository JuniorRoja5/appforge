import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Defense-in-depth: the canonical secret validation lives in main.ts boot
// (fail-fast, structured, validates ALL secrets). These checks repeat the
// byte-count guarantee here because crypto.ts can be loaded via paths that
// bypass boot (CLI scripts, e2e tests). Byte-based — not key.length — because
// a 32-char string with multibyte chars produces >32 bytes and crashes
// createCipheriv with a cryptic OpenSSL error instead of a useful message.
function getKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY;
  const buf = key ? Buffer.from(key, 'utf8') : null;
  if (!buf || buf.length !== 32) {
    throw new Error(
      'SMTP_ENCRYPTION_KEY must encode to exactly 32 bytes (use 32 ASCII printable chars). ' +
        'Set it in your .env file.',
    );
  }
  return buf;
}

function getKeystoreKey(): Buffer {
  const key = process.env.KEYSTORE_ENCRYPTION_KEY;
  const buf = key ? Buffer.from(key, 'utf8') : null;
  if (!buf || buf.length !== 32) {
    throw new Error(
      'KEYSTORE_ENCRYPTION_KEY must encode to exactly 32 bytes (use 32 ASCII printable chars). ' +
        'Set it in your .env file.',
    );
  }
  return buf;
}

/** Encrypt a plaintext string with AES-256-GCM. Returns "iv:tag:ciphertext" in hex. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a payload produced by encrypt(). */
export function decrypt(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// --- Keystore encryption (separate key) ---

/** Encrypt a keystore password with KEYSTORE_ENCRYPTION_KEY. */
export function encryptKeystore(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKeystoreKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a keystore password. */
export function decryptKeystore(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted keystore payload format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = createDecipheriv(
    ALGORITHM,
    getKeystoreKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/** Generate a cryptographically random password string. */
export function generateRandomPassword(length = 32): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}
