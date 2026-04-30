# Tech debt — pending refactors

Items below are not blocking. Address them in calm windows, not during active feature work.

## 1. nginx.conf structure mismatch — RESOLVED 2026-04-29

The repo previously had a single `nginx.conf` at the root that mixed main-config
directives (`user`, `events`, `http`) with site directives (`server` blocks),
which made it impossible to deploy correctly via `cp` to either location.

**Resolution:** Split into `infra/nginx/nginx.conf` (main) and
`infra/nginx/sites-available/appforge.conf` (site), with deploy instructions in
`infra/nginx/README.md`.

---

## 2. Image upload field — duplicated UX across modules

**Problem:** At least 4 modules implement "image with upload + URL fallback" with slightly different markup, styles, and bugs:
- `events.module.tsx` — was missing the URL input until 2026-04-29
- `news_feed.module.tsx`
- `hero_profile.module.tsx`
- `custom_page/image.module.tsx`

Other modules will need it: `menu_restaurant` (per-item image), `catalog` (per-product), `photo_gallery`, `discount_coupon`, `loyalty_card`...

Each implementation is ~40 duplicated lines with subtle inconsistencies (different button colors, different aspect ratios, different "Subiendo..." copy).

**Fix:** Extract a shared component:

```
appforge-builder/src/components/shared/ImageUploadField.tsx

interface Props {
  value: string;                   // current imageUrl
  onChange: (url: string) => void;
  accentColor?: string;            // Tailwind color name, e.g. 'teal' | 'indigo'
  aspectRatio?: 'video' | 'square' | 'auto';
  label?: string;                  // default: "Imagen (opcional)"
  placeholder?: string;            // URL input placeholder
}
```

Internally encapsulates: preview with X button, URL input, file upload via `uploadImage()` from api.ts, "Subiendo..." state.

Migrate the 4 existing modules one by one. Reduces ~160 lines of duplication and prevents inconsistencies like the events bug.

**When to do this:** After current QA round is done, before adding new modules that need image upload.

---

## 3. CORS env var naming inconsistency — RESOLVED 2026-04-29

`appforge-backend/src/main.ts` previously read `process.env.BUILDER_URL` and
`process.env.ADMIN_URL` for its CORS allowlist, while the rest of the project
(including `env.production.example` and `/opt/appforge/appforge-backend/.env`)
used the `PUBLIC_*` naming convention (`PUBLIC_BUILDER_URL`, `PUBLIC_ADMIN_URL`).

This caused a silent CORS failure that surfaced after the 14:18 UTC reboot on
2026-04-29: `pm2 start` from a clean shell did not have the legacy
`BUILDER_URL`/`ADMIN_URL` exports it had been relying on, so `allowedOrigins`
became `[]` and all browser requests from `https://app.creatu.app` were
rejected at the CORS preflight stage.

**Resolution:** Updated `main.ts` to read `process.env.PUBLIC_BUILDER_URL` and
`process.env.PUBLIC_ADMIN_URL`, matching the project-wide naming convention.
Removed the temporary `BUILDER_URL` and `ADMIN_URL` entries from the
production `.env` (they were added as a hotfix earlier the same day).

---

## 4. Merchant PIN duplicated between Loyalty and Coupons — OPEN

`LoyaltyCard.businessPin` and `CouponMerchantConfig.businessPin` are
independent bcrypt hashes. A business that uses both modules must
configure two separate PINs and keep them in sync manually.

**Future refactor:** unify both into a single `App.merchantPin` (or a
dedicated `MerchantConfig` 1:1 with App). Migrate both models to
reference it, with a one-time data migration that copies whichever PIN
exists into the new column.

Detected: 2026-04-30 while implementing `feat(coupons): merchant PIN flow`.
Not blocking — both modules work correctly in isolation. Address when a
third "merchant validation" module is added (would force the abstraction).

---

## 5. Residual TypeScript errors in runtime — OPEN

`tsc --noEmit` in `appforge-runtime` reports 3 errors that Vite ignores
(the build still succeeds):

- `src/lib/manifest.ts:90` and `src/lib/platform/index.ts:9` — `Property
  'env' does not exist on type 'ImportMeta'`. Missing
  `/// <reference types="vite/client" />` in a global `.d.ts` so TS picks
  up the Vite-injected `import.meta.env` types.
- `src/modules/booking/BookingRuntime.tsx:104` — `createBooking` is called
  with a `duration` field that does not exist in its DTO. Either add
  `duration` to `CreateBookingDto` on the backend (and propagate through
  the runtime API client), or remove it from the runtime call.

**Why it matters:** `npm run build` passes because Vite uses esbuild
under the hood (no full TS type-check). But CI that runs
`npx tsc --noEmit` would flag these — meaning today we have no type-check
gate on runtime code. A regression in types could ship to production
without anyone noticing.

**Effort:** ~30 min. Add `appforge-runtime/src/vite-env.d.ts` with the
reference, decide on the booking duration field, fix the call site.

Detected: 2026-04-30 during deploy of `feat(orders): notifications`.

---

## 6. Boot-time validation of secrets — OPEN, HIGH PRIORITY

The backend silently boots with placeholder values from `env.production.example`
(strings like `tu_jwt_secret_aqui_64_caracteres_minimo`). The error only surfaces
later when a code path tries to use the secret — for SMTP this means the first
write attempt to `AppSmtpConfig` throws 500 in production.

Worse: `JWT_SECRET` and `APP_USER_JWT_SECRET` placeholders are valid string
values, so JWT signing works silently with publicly-known secrets (the
placeholders are visible in the public GitHub repo via env.production.example).
This means anyone could forge tokens for any user, including SUPER_ADMIN, until
secrets are rotated.

**Fix:** in `main.ts`, before `NestFactory.create`, validate that:
- `SMTP_ENCRYPTION_KEY` and `KEYSTORE_ENCRYPTION_KEY` are exactly 32 chars
- `JWT_SECRET` and `APP_USER_JWT_SECRET` are >= 64 chars
- None of them match a known list of placeholder strings (`tu_*`, `CHANGEME*`,
  `<*>`, etc.)
- `DATABASE_URL` doesn't contain `CHANGEME` in the password

Hard-fail with a clear stderr message and `process.exit(1)` if any check fails.

Detected: 2026-04-30 during post-deploy SMTP config attempt in production.
Effort: ~1 hour. **Must ship before first real customer signs up.**

---

## 7. SECURITY.md instructs wrong openssl flag for AES keys — OPEN

`SECURITY.md` and `env.production.example` instruct:

```bash
openssl rand -hex 32   # produces 64 hex characters
```

But `crypto.ts:8` enforces exactly 32 characters (16 bytes hex-encoded), because
AES-256-GCM uses a 32-byte raw key and the code does `Buffer.from(key, 'hex')`
internally — so a 64-char hex string would decode to 32 bytes (valid) but the
length check rejects it.

The correct command is:

```bash
openssl rand -hex 16   # produces 32 hex characters = 16 bytes hex-encoded
```

Wait — that gives only a 16-byte key, not 32. There's an actual bug here:
either crypto.ts validation is wrong (should accept 64 chars) or the
documentation is wrong (should be `-hex 16`). The current implementation has
been running with `-hex 16`-generated keys and they work, so either:
- AES-128 is being used effectively (security regression vs. the AES-256
  intent), OR
- The Node crypto API tolerates 16-byte keys for `aes-256-gcm` somehow

**Action:** investigate which is actually happening, fix code to use a true
32-byte key, update docs accordingly.

Detected: 2026-04-30. Effort: 30 min investigation + 15 min docs.

---

## 8. env.production.example uses placeholders that look like real values — OPEN

Strings like `tu_jwt_secret_aqui_64_caracteres_minimo` look like plausible
default values rather than obvious "fill me in" markers. This contributed to
all 4 critical secrets surviving placeholder-state into production for over
one month (deploy was 2026-03-XX, incident detected 2026-04-30).

**Fix:** rewrite `env.production.example` so every secret has a placeholder that
is impossible to mistake for a real value:

```
JWT_SECRET=<RUN: openssl rand -base64 64>
APP_USER_JWT_SECRET=<RUN: openssl rand -base64 64>
SMTP_ENCRYPTION_KEY=<RUN: openssl rand -hex 16>
KEYSTORE_ENCRYPTION_KEY=<RUN: openssl rand -hex 16>
DB_PASSWORD=<RUN: openssl rand -base64 32>
SESSION_SECRET=<RUN: openssl rand -base64 32>
MINIO_SECRET_KEY=<RUN: openssl rand -base64 32>
```

The `<RUN: ...>` syntax is visually obvious and the literal `<` would break
any client trying to use the value, forcing replacement.

Combined with #6 (boot-time validation that rejects `<RUN:*>` patterns), this
makes it impossible to accidentally deploy with placeholders.

Detected: 2026-04-30. Effort: 15 min.

---

## 9. Production .env audit — RESOLVED 2026-04-30

Triggered by the SMTP_ENCRYPTION_KEY incident. Audited all variables in
`/opt/appforge/appforge-backend/.env` for placeholders, CHANGEME strings,
example values, and empty values. Result: 4 critical secrets were
placeholders, 0 others affected.

Rotated:
- `SMTP_ENCRYPTION_KEY` (was 24-char placeholder, now 32-char hex)
- `KEYSTORE_ENCRYPTION_KEY` (was 28-char placeholder, now 32-char hex)
- `JWT_SECRET` (was placeholder string, now 87-char base64)
- `APP_USER_JWT_SECRET` (was placeholder string, now 88-char base64)

Impact: 0 affected users (only 2 admin/test accounts existed, 0 AppUsers,
0 cipher-text records — `AppKeystore`, `AppSmtpConfig`, `PlatformSmtpConfig`
all empty at rotation time). Old JWTs invalidated by rotation, only the
operator's session was disrupted (single re-login required).

Backups created:
- `.env.backup-pre-jwt-rotation-<timestamp>`
- `.env.backup-<timestamp>` (initial)

Marked RESOLVED — but follow-ups #6, #7, #8 remain OPEN to prevent recurrence.

Detected and resolved: 2026-04-30.

---

## 10. Copy Fail (CVE-2026-31431) mitigated and patched — RESOLVED 2026-04-30

Linux kernel privilege escalation vulnerability disclosed 2026-04-29.
Affected all kernels 4.14+ via algif_aead AEAD template logic flaw.
Allowed unprivileged local users to gain root via 732-byte Python script.
Container escape primitive — relevant for any future containerized
client workloads.

Action taken on both production VPS (srv1616198 AppForge, srv564100):
1. Module blocked: `/etc/modprobe.d/disable-algif.conf` with
   `install algif_aead /bin/false`
2. Verified non-loadable: modprobe returns Invalid argument
3. `apt upgrade -y` to kernel 6.8.0-110-generic (package 6.8.0-110.110)
4. Reboot — PM2 auto-recovered both services without manual intervention

Detected via Hostinger security advisory. Resolved same day.
No customer-facing downtime (only ~60s reboot in non-traffic window).

---

## 11. No automated security patch monitoring — OPEN

Both VPS rely on manual responses to provider advisories
(Hostinger in this case). For a production SaaS, consider:
- `unattended-upgrades` for security-only patches (auto-apply)
- vulnerability scanner like Lynis or Trivy run weekly via cron
- subscription to Ubuntu Security Notice mailing list
- automated reboot scheduler for kernel updates with PM2 graceful restart

Detected: 2026-04-30 during Copy Fail incident response.
Effort: 2-3 hours initial setup + ongoing monitoring of alerts.
**Priority: medium** — not bloqueante but reduces incident response time
from hours to minutes.
