import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded, raw } from 'express';

async function bootstrap() {
  // SECURITY: Fail-fast validation of critical secrets at boot.
  //
  // Why this lives here (not in crypto.ts / strategy modules):
  //   - main.ts boot is the only place where ALL failures can be reported in
  //     a single arranque. Lazy validation in crypto.ts fires at first
  //     encrypt/decrypt — broken keys crash at runtime (first SMTP send /
  //     first APK build), not at deploy time.
  //   - For SMTP_ENCRYPTION_KEY / KEYSTORE_ENCRYPTION_KEY the regex enforces
  //     64 hex chars (= 32 random bytes when decoded) in a SINGLE expression.
  //     This is load-bearing: Buffer.from(key, 'hex') SILENTLY drops non-hex
  //     characters and returns a shorter buffer — a string like "abZdef…"
  //     would pass naive length checks and crash createCipheriv with a
  //     cryptic OpenSSL error. The strict regex makes that class of bug
  //     unrepresentable. Generate with: openssl rand -hex 32.
  //   - PLACEHOLDER_PATTERNS uses normalized substring match (lowercase +
  //     strip -_) so a single canonical pattern catches multiple spellings
  //     ("CHANGE_ME", "change-me", "ChangeMe" all match "changeme"). Hex
  //     keys ([0-9a-f]) trivially pass — no pattern is composed of hex chars.
  //   - All secrets are validated; we accumulate errors instead of bailing on
  //     the first so a single boot reports every fix needed.
  //
  // Historic JWT_SECRET leak is NOT in PLACEHOLDER_PATTERNS by design: that
  // would write the secret into git history. Rotation already happened; the
  // entropy floor + length minimum + placeholder list cover the failure modes
  // that matter without storing past compromised values.
  //
  // Pre-#7 the encryption key regex was /^[\x21-\x7E]{32}$/ (32 ASCII chars
  // used as 32 UTF-8 bytes). Migrated to hex64 in #7 to guarantee 256 bits
  // of real entropy regardless of human passphrase quality. crypto.ts changed
  // in lockstep — this regex and Buffer.from(key, 'hex') there MUST agree,
  // or boot would pass and runtime would crash.

  // 'test' and 'todo' deliberately excluded: their false-positive surface
  // exceeds their signal. A 32-char high-entropy key embedding "latest" or a
  // Spanish "TodoSeguro…" would boot-fail despite being secure. The real
  // dummies those would catch ("test", "testtesttest", "todoXXX") already
  // fail the length floor (< 32) or the entropy floor (uniq <= 4). Long
  // patterns below have negligible collision with real passphrases.
  const PLACEHOLDER_PATTERNS = [
    'changeme', 'yoursecret', 'yourapikey', 'pleasechange', 'replaceme',
    'changeit', 'changethis', 'secret', 'password', 'default', 'example',
    'placeholder', 'fixme', 'dummy',
  ];

  // 64 hex chars = 32 bytes when decoded via Buffer.from(key, 'hex'). The
  // case-insensitive flag accepts both 'a3b1…' and 'A3B1…' (openssl outputs
  // lowercase; some KMS systems use uppercase — neither is fighty). Anchors
  // are strict: leading/trailing whitespace from env files silently produces
  // a wrong-length decoded buffer and we want a clear boot-time rejection.
  // The literal 'key32' in SecretSpec refers to 32 BYTES, not 32 chars.
  const KEY_HEX64_REGEX = /^[0-9a-f]{64}$/i;

  type SecretSpec =
    | { name: string; kind: 'key32'; format: RegExp }
    | { name: string; kind: 'minLength'; min: number };

  const REQUIRED_SECRETS: SecretSpec[] = [
    { name: 'JWT_SECRET',              kind: 'minLength', min: 32 },
    { name: 'APP_USER_JWT_SECRET',     kind: 'minLength', min: 32 },
    { name: 'SMTP_ENCRYPTION_KEY',     kind: 'key32',     format: KEY_HEX64_REGEX },
    { name: 'KEYSTORE_ENCRYPTION_KEY', kind: 'key32',     format: KEY_HEX64_REGEX },
  ];

  const normalizeForPlaceholderMatch = (value: string): string =>
    value.toLowerCase().replace(/[-_]/g, '');

  const validateSecret = (
    spec: SecretSpec,
    value: string | undefined,
  ): string | null => {
    if (!value) return 'is missing or empty';

    if (spec.kind === 'key32') {
      // Single regex covers: 64 hex chars (= 32 bytes when decoded), no spaces,
      // no non-hex char that would silently shorten the Buffer.from(...,'hex')
      // result and crash createCipheriv. Generate with: openssl rand -hex 32.
      if (!spec.format.test(value)) {
        const decodedBytes = Buffer.from(value, 'hex').length;
        return (
          'must be exactly 64 hex chars encoding 32 bytes. ' +
          'Generate with: openssl rand -hex 32. ' +
          `Got length=${value.length}, decoded bytes=${decodedBytes}.`
        );
      }
    } else if (value.length < spec.min) {
      return `must be at least ${spec.min} chars (got ${value.length})`;
    }

    const normalized = normalizeForPlaceholderMatch(value);
    const matched = PLACEHOLDER_PATTERNS.find((p) => normalized.includes(p));
    if (matched) {
      return `matches a known insecure placeholder pattern ("${matched}")`;
    }

    const uniqueChars = new Set(value).size;
    if (uniqueChars <= 4) {
      return `has too few unique characters (${uniqueChars}) — looks like dummy input (e.g. "aaaa..." or "1234123412341234")`;
    }

    return null;
  };

  const secretErrors: string[] = [];
  for (const spec of REQUIRED_SECRETS) {
    const reason = validateSecret(spec, process.env[spec.name]);
    if (reason) secretErrors.push(`  - ${spec.name}: ${reason}`);
  }
  if (secretErrors.length > 0) {
    console.error('[FATAL] Secret validation failed:');
    for (const e of secretErrors) console.error(e);
    console.error(
      '\nFix all of the above and restart. See SECURITY.md for guidance on generating strong secrets.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // SECURITY: validate request bodies against DTOs.
  // - whitelist: strip props not declared on the DTO (silent — does not reject).
  // - forbidNonWhitelisted: false until every controller in the backend has been
  //   audited and migrated to a real DTO (today some still use Record<string, unknown>
  //   or inline interface types). Tracked in TECH_DEBT.
  // - transform: cast primitives ("8080" → 8080) and instantiate DTO classes so
  //   class-validator decorators run.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const isProduction = process.env.NODE_ENV === 'production';

  const allowedOrigins = [
    process.env.PUBLIC_BUILDER_URL,
    process.env.PUBLIC_ADMIN_URL,
    process.env.PUBLIC_PWA_URL,
  ].filter(Boolean) as string[];

  // SECURITY NOTE (C4): CORS allows !origin (null Origin) intentionally.
  // Capacitor WebViews do not send an Origin header, so blocking null origins
  // would break all generated mobile apps. CSRF is not a concern because:
  // 1. All sensitive endpoints require a Bearer token (not cookies).
  // 2. Without cookie-based auth, classic CSRF attacks don't apply.
  // 3. Null origin also allows curl/Postman, but those still need a valid token.
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Allow Capacitor WebView origin (uses https://localhost with androidScheme: 'https')
      if (origin === 'https://localhost' || origin === 'capacitor://localhost') {
        return callback(null, true);
      }

      // In development, allow any localhost or local network origin (Vite may pick different ports)
      if (!isProduction && /^https?:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // In production, only allow explicitly configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
  });
  // Security headers for uploaded files (public by design but prevent sniffing/indexing)
  app.use('/uploads', (req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // PWA serving migrated to apps.creatu.app (nginx static, /var/www/apps).
  // El middleware /pwa anterior + mkdir de public/pwa retirados — la API ya
  // no participa del servido de PWAs.

  // Raw body for Stripe webhook signature verification (MUST be before json middleware)
  app.use('/stripe/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
