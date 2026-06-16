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

---

## 12. E2E cleanup pattern applied to orders/coupons — RESOLVED 2026-04-30

Bookings E2E got defensive cleanup at start in commit 085b934. Orders
and coupons followed the same day:

- **Orders** (`scripts/e2e/orders/notifications-flow.mjs`): Prisma
  `deleteMany` of test orders, push devices (token starting with
  `fake-fcm-token-`), and the test app user. `APP_USER_EMAIL` fixed
  to `e2e-orders@test.com`.
- **Coupons** (`scripts/e2e/coupons/merchant-flow.mjs`): Prisma
  `deleteMany` of test coupons (`code` starting with `TEST`) plus
  Redis `DEL coupon:lockout:<appId> coupon:fails:<appId>` to clear
  the brute-force lockout left by step 15. Without the Redis cleanup,
  immediate re-runs would 429 on subsequent merchant-redeem calls
  for ~15 min.

All three E2Es verified idempotent across consecutive runs.

---

## 13. discount_coupon: imageUrl declared but no upload UI in builder — OPEN

The `discount_coupon` module declares `imageUrl` in its schema, DTO,
mock data, and runtime, but the builder's `SettingsPanel` does not
expose any control for the merchant to upload or paste a URL. The
field is reachable only by manually editing the canvas JSON.

Detected during the image-upload audit on 2026-04-30 that produced
the `<ImageInputField>` shared component. Now that the component
exists, this is a ~5-line fix:

```tsx
import { ImageInputField } from '../../components/shared/ImageInputField';

<ImageInputField
  value={data.imageUrl ?? ''}
  onChange={(url) => onChange({ ...data, imageUrl: url })}
  accentColor="rose"
  shape="video"
  previewSize="lg"
  label="Imagen del cupón (opcional)"
  maxSizeMB={10}
/>
```

Effort: 15 min (find the right place in the SettingsPanel, paste,
verify in the builder canvas).
**Priority: medium** — feature gap, not a bug. Customers cannot
attach images to their coupons until this lands.

---

## Sesión 2026-05-07 — Auditoría Configuración → Ajustes (cierre H1-H7+H14)

PR principal `c626fef` (críticos H1-H5) y PR-2 `025c9b3` (triviales H6/H7/H14)
mergeados y desplegados. De los 21 hallazgos de la auditoría, 8 quedan resueltos
y los 13 siguientes pasan a esta sección como TECH_DEBT trackable.

### #14 — Splash native Android customizado (~100-200ms flash blanco)
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H18.
**Descripción**: Capacitor muestra su splash blanco nativo durante 100-200ms
antes de que el JS pinte el `<SplashScreen>` configurado por el cliente.
Aceptado en sesiones previas como comportamiento inherente al WebView.
**Impacto**: cosmético; el cliente ve un flash blanco brevísimo entre el icono
del launcher y el splash configurado.
**Esfuerzo**: medio. Requiere generar el splash native desde el icono/imagen
configurada y configurar `colors.xml`/`styles.xml` Android. Capacitor tiene
plugin `@capacitor/splash-screen` con configuración `androidSplashResourceName`.
**Prioridad**: baja.

### #15 — Backend valida `slides.length <= 10`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H19.
**Descripción**: El frontend (`OnboardingTab.tsx`) limita a 5 slides máximo,
pero `UpdateAppConfigDto` no valida el array. Un curl puede guardar 50 slides;
no rompe nada pero es inconsistencia.
**Impacto**: defensa en profundidad ausente. Cliente malicioso o bug en frontend
podría inflar `appConfig` JSON.
**Esfuerzo**: trivial. `@ArrayMaxSize(10)` en el DTO.
**Prioridad**: baja.

### #16 — Forzar INTERNET y ACCESS_NETWORK_STATE desde backend
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H20.
**Descripción**: El frontend marca `INTERNET` y `ACCESS_NETWORK_STATE` como
`alwaysOn`, pero el backend no los fuerza. Hoy funciona porque la plantilla
Capacitor base ya los incluye en `AndroidManifest.xml`, pero depender de la
plantilla externa es frágil.
**Impacto**: si Capacitor cambia su plantilla en una versión futura, las apps
generadas pueden salir sin INTERNET y crashear.
**Esfuerzo**: trivial. Añadir ambos al merge en `build.processor.ts` siempre.
**Prioridad**: media.

### #17 — Input editable para `CFBundleDisplayName` independiente de appName
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H21.
**Descripción**: Hoy el nombre que aparece bajo el icono en iOS es el `appName`
del builder. Algunos clientes querrán "MiApp" en stores y "App de Juan" bajo el
icono — son dos campos distintos en iOS.
**Impacto**: restricción de UX, no bug.
**Esfuerzo**: bajo. Campo nuevo en `appConfig.iosConfig.displayName`, inyectar
en `Info.plist` vía `plist.build()` (commit 2 del PR de hoy ya parsea el plist).
**Prioridad**: baja.

### #18 — Filtrar `iosPermissions`/`androidConfig`/`androidPermissions` del manifest PWA
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H16.
**Descripción**: El `app-manifest.json` que se sirve a la PWA contiene campos
irrelevantes para PWA (permisos nativos, packageName Android). No rompe nada
pero infla el JSON inicial y filtra detalles de configuración nativa al cliente
web.
**Impacto**: ~2KB de JSON innecesario en cada carga de PWA.
**Esfuerzo**: trivial. Whitelist de campos en `buildPwa()`.
**Prioridad**: baja.

### #19 — Escape completo de `app.name` al inyectar en `capacitor.config.ts`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H17.
**Descripción**: Hoy solo se escapa `'` con `replace(/'/g, "\\'")`. Caracteres
como backtick, `${`, newlines o `\` rompen la generación del template literal.
**Impacto**: cliente con nombre `My ${cool} App` rompe el build silenciosamente.
**Esfuerzo**: trivial. Función `escapeJsTemplateString(str)` que cubra `'`, `` ` ``,
`\\`, `${`, `\n`, `\r`.
**Prioridad**: media (es una superficie de "configuración del cliente puede
romper builds que no se esperan").

### #20 — Versionar `terms.content` con hash e invalidar `localStorage`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H15.
**Descripción**: Cuando el cliente actualiza los términos, los end-users que
ya los aceptaron no vuelven a ser preguntados (la flag `appforge_terms_accepted`
en `localStorage` no se invalida).
**Impacto**: legal — un cambio sustantivo en términos no obtiene nuevo
consentimiento del usuario.
**Esfuerzo**: medio. Calcular `terms.versionHash = sha256(content)` server-side
en `apps.service.updateConfig`, exponer en manifest, runtime compara hash
guardado en `localStorage` con el del manifest y re-pide si difiere.
**Prioridad**: media (sube a alta antes de aceptar primer cliente real).

### #21 — Endpoint `/upload/splash-image` con límite 5MB y validación de dimensiones
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H12.
**Descripción**: `splash.backgroundImageUrl` y `splash.logoUrl` se suben por
`POST /upload/image` que acepta hasta 100MB. Una imagen splash de 50MB carga
al runtime y bloquea el WebView en arranque.
**Impacto**: cliente malicioso o ingenuo puede degradar performance de su
propia app a niveles inusables.
**Esfuerzo**: bajo. Endpoint nuevo análogo a `/upload/app-icon` con límite
5MB y validación de dimensiones recomendadas (1080×1920 portrait).
**Prioridad**: media.

### #22 — Endpoint `PATCH /apps/:id` con `name` editable
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H10.
**Descripción**: Hoy el `app.name` solo se puede establecer al crear la app
(`POST /apps`). No hay forma de renombrar después. El `slug` debe seguir
inmutable (entra a `pwaUrl`, rutas), pero el `name` no tiene esa restricción.
**Impacto**: restricción de UX innecesaria.
**Esfuerzo**: bajo. Endpoint nuevo con DTO `UpdateAppDto { @IsString @MaxLength(60) name }`.
**Prioridad**: media.

### #23 — Tab "Identidad" del builder inconsistente con su label
**Estado**: OPEN (consume #22)
**Origen**: Auditoría 2026-05-07, hallazgo H11.
**Descripción**: El tab "Identidad" del modal de configuración solo contiene el
icono. El nombre y la descripción de la app no están ahí (el nombre se fija en
creación; la descripción no existe como campo).
**Impacto**: el cliente busca dónde editar el nombre y no lo encuentra.
**Esfuerzo**: bajo, depende de #22. Una vez resuelto #22, ampliar el tab con
`name` editable; opcionalmente `description` (campo nuevo en `appConfig`).
**Prioridad**: media.

### #24 — Sanitización HTML server-side al guardar `terms.content`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H9.
**Descripción**: `apps.service.updateConfig` guarda el HTML del editor Quill
sin sanitizar. El runtime sanitiza al renderizar (DOMPurify), pero la defensa
en profundidad pide sanitizar también server-side. La utilidad ya existe
(`lib/sanitize-html.ts`) y se aplica en `news.service.ts`.
**Impacto**: si en el futuro el HTML de `terms.content` se renderiza en otro
contexto sin DOMPurify (admin panel preview, exportación, email), es vector XSS.
**Esfuerzo**: trivial. Una llamada en `updateConfig` antes del merge.
**Prioridad**: media.

### #25 — Separar `terms.content` de `privacyPolicyUrl`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgo H8.
**Descripción**: Stores exigen URL pública separada de Política de Privacidad.
Hoy el tab "Legal" unifica todo en un único blob HTML (`terms.content`).
Play Console y App Store Connect piden la URL en su consola.
**Impacto**: bloqueante para submission a stores cuando llegue ese momento.
Workaround actual: el cliente puede meter un link a su privacy externa dentro
del HTML, pero la URL pura es lo que las consolas piden.
**Esfuerzo**: medio. Campo nuevo `appConfig.privacyPolicyUrl: string` (URL
validada), tab Legal con dos secciones.
**Prioridad**: alta antes de submission a stores.

### #26 — Validación de dimensiones de icono robusta + chequeo server-side
**Estado**: OPEN
**Origen**: Auditoría 2026-05-07, hallazgos H1+H2 del icono (no confundir con
H1+H2 globales de la auditoría — son los sub-puntos del icono dentro de la
sección 1 "Identidad").
**Descripción**: PR-2 (commit `6bd708f`) arregló la closure stale del state
en frontend. Pero el backend sigue sin validar dimensiones — solo verifica
PNG + 5MB. Un curl puede subir un PNG de 64×64 y se acepta, sharp lo escala
arriba con calidad mala al inyectarlo en `mipmap-*`.
**Impacto**: APKs con icono de baja calidad si el cliente sube por API directa.
**Esfuerzo**: bajo. `sharp(file).metadata()` en `upload.controller.ts:uploadAppIcon`
y rechazar si `width !== 1024 || height !== 1024`.
**Prioridad**: baja.

### #27 — Auditoría DTO completa + flip `forbidNonWhitelisted: true`
**Estado**: OPEN HIGH PRIORITY
**Origen**: Auditoría 2026-05-07, decisión #5 del plan H1-H5.
**Descripción**: PR `c626fef` activó `useGlobalPipes` con `whitelist: true,
forbidNonWhitelisted: false, transform: true`. El `forbidNonWhitelisted: false`
es deliberado: rompería los ~28 controllers del backend si alguno tiene
`@Body() body: SomeInterface` (interfaces no llevan metadata) o un DTO al que
le falta declarar un campo opcional que el frontend ya envía. Hoy los campos
desconocidos se descartan silenciosamente; en el futuro queremos rechazo
explícito con 400.
**Impacto**: defensa en profundidad parcial. Validadores `@Matches` y
`@IsString` SÍ se ejecutan donde están declarados, pero no se rechaza ruido
del frontend o de clientes maliciosos.
**Esfuerzo**: alto. Auditar uno por uno los controllers de: `auth`, `news`,
`events`, `booking`, `catalog`, `orders`, `push`, `social-wall`, `fan-wall`,
`loyalty`, `contact`, `coupons`, `analytics`, `app-users`, `gallery`, `menu`,
`platform`, `stripe`, `subscription`, `tenants`, `upload`, `users`, `admin`.
Cada controller debe usar DTO real con decoradores. Tras migrar todos,
flippear el flag a `true`.
**Esfuerzo estimado**: 8-12 horas distribuidas en sprints temáticos
(auth + users primero, después módulos de contenido, después admin/platform).
**Prioridad**: alta antes de aceptar primer cliente real.

### #28 — `npm install` en VPS toca `package-lock.json` (`hasInstallScript: true`)
**Estado**: OPEN
**Origen**: Sesión 2026-05-07, observado durante deploy del PR-2.
**Descripción**: Cuando el VPS hace `npm install` (necesario en deploys que
añaden dependencias), npm añade la línea `"hasInstallScript": true` al
lockfile del builder porque el `package.json` tiene hooks (`postinstall`/
`predev`/`prebuild` para `copy-shared.mjs`). El lockfile commiteado no tiene
esa línea porque quien lo generó usó una versión de npm que no la calcula.
**Impacto**: cada deploy con `npm install` deja el working tree dirty;
hay que `git checkout --` el lockfile antes de cada `git pull`.
**Esfuerzo**: trivial. Dos opciones:
  (a) regenerar el lockfile commiteado con `npm install --package-lock-only`
      desde un entorno con npm reciente y commitear la línea correcta;
  (b) cambiar la secuencia de deploy en VPS de `npm install` a `npm ci` —
      `npm ci` respeta el lockfile sin modificarlo y es más rápido.
Recomendación: ambas. (a) elimina el ruido inicial; (b) previene futuras
divergencias.
**Prioridad**: baja (operacional, no afecta producción).

---

## Sesión 2026-05-07 (PM) — Bugs área de planes (cierre Bug 1-5 + zombie seed)

PR `bfcf4bd..6a6e99a` (6 commits) cierra los 5 bugs detectados en el flujo
de subscription / planes / billing. Tres pendientes derivados:

### #29 — Endpoint para "abandonar keystore" (liberar slot tras soft-delete)
**Estado**: OPEN HIGH PRIORITY
**Origen**: Sesión 2026-05-07 PM, derivado del fix Bug 1+3 (commit `6a6e99a`).
**Descripción**: Tras la nueva regla "apps con keystore siguen contando contra
el plan", un cliente que quiera bajar de plan o liberar slots ocupados por
apps borradas no tiene UI. El mensaje de error de `changePlan` lo redirige
explícitamente a soporte. Para escalas pequeñas (1-2 downgrades/semana) está
bien; para escalas mayores el inbox de soporte se llena.
**Impacto**: cuello de botella operacional. Cada downgrade con keystore
soft-deleted requiere intervención manual del super-admin.
**Esfuerzo**: medio. Endpoint `POST /apps/:id/abandon-keystore` con doble
confirmación que elimina el `AppKeystore` row y libera el slot. UI en el
modal de borrado (cuando `hasKeystore === true`) con un toggle "abandonar
firma de stores (no podré actualizar la app en Play Store / App Store)".
**Prioridad**: alta — convertir en issue de GitHub con etiqueta `next-sprint`
cuando empiece el ramp-up de clientes pagos.

### #30 — Cleanup periódico de artifacts huérfanos en MinIO
**Estado**: OPEN
**Origen**: Sesión 2026-05-07 PM, derivado del fix Bug 5 (commit `44bdfc5`).
**Descripción**: El fix de Bug 5 hace que las aggregates de Prisma dejen de
contar bytes de apps soft-deleted, pero los archivos físicos siguen en MinIO.
La factura de storage de Hostinger sigue creciendo aunque el cliente vea su
contador a cero.
**Impacto**: invisible para el cliente (no le afecta su plan), pero crece
silenciosamente la factura del proveedor.
**Esfuerzo**: medio. Cron job semanal que: (1) lista builds COMPLETED con
`app.deletedAt != null`, (2) borra el objeto del bucket vía StorageService,
(3) marca `appBuild.artifactSize = null` o borra el row. Respetar apps con
keystore que conservan slot — sus artifacts también pueden borrarse del
bucket porque el cliente no los va a descargar (los slots son lógicos, no
contenido).
**Prioridad**: baja — backlog. Activar cuando el storage de MinIO supere
los 50 GB o cuando aparezca como ítem visible en la factura del proveedor.

### #31 — Admin endpoint `getTenantDetail` no expone `hasKeystore` en sus apps
**Estado**: OPEN
**Origen**: Sesión 2026-05-07 PM, derivado del Commit 3 (`365338d`) del
mismo PR.
**Descripción**: `apps.service.findAll` y `findOne` ahora devuelven
`hasKeystore: boolean`, consumido por el modal del builder. Pero
`admin.service.getTenantDetail` (línea 122-146) tiene su propio query con
`include: { apps: { include: { builds } } }` que NO incluye `keystore`.
Resultado: el super-admin viendo una app de un tenant ajeno no puede
distinguir si está firmada para stores. Hoy no rompe nada porque admin
no consume el flag, pero el día que se quiera mostrar un badge "firmada"
o construir el endpoint del #29, hace falta.
**Impacto**: inconsistencia de superficie API. No bug, no rompe TS strict
en builder admin (su `TenantApp` interface declara solo lo que ya recibe).
**Esfuerzo**: trivial. Añadir `keystore: { select: { id: true } }` al
`include` y mappear en la respuesta a `hasKeystore: !!keystore` para cada
app del array.
**Prioridad**: baja, sube a media cuando se aborde #29 (es prerequisito).

---

## Sesión 2026-05-08 — Auditoría panel admin Fase 1 (cierre Bug #4, #5, #7, #8)

PR `3f0faf6..ef12f9d` (5 commits) cierra los 4 bugs reales detectados en la
auditoría del panel admin. Bug #6 (JWT no invalidado al suspender) descartado
como falso positivo: `jwt.strategy.ts:24-46` ya implementa DB lookup + check
de `User.status` y `Tenant.status` en cada request. Seis pendientes derivados:

### #32 — Borrar `customer` en Stripe + webhook `customer.deleted`
**Estado**: OPEN
**Origen**: Sesión 2026-05-08, derivado del fix Bug #7 (commit `ef12f9d`).
**Descripción**: `deleteTenant` ahora cancela la `subscription` en Stripe
inmediatamente, pero NO borra el `customer`. Decisión consciente: conservar
histórico de facturación. Resultado: el customer queda en Stripe con
`subscription` en estado `canceled`. Si en el futuro quieres limpieza total
del lado Stripe, hay que añadir `stripe.customers.del(customerId)` tras la
cancelación + handler para webhook `customer.deleted` (hoy NO se procesa,
ver `stripe.service.ts:116-118` que solo maneja `customer.subscription.deleted`
y `payment_failed`).
**Impacto**: invisible para el cliente (no afecta su plan ni su facturación).
Acumulación silenciosa de "customers cancelados" en el dashboard de Stripe.
Para auditoría fiscal, mantenerlos es correcto; para limpieza operativa, no.
**Esfuerzo**: bajo. Después del `cancelSubscription` immediate, añadir el
`stripe.customers.del`. El handler de webhook se añade aparte.
**Prioridad**: baja. Activar cuando el dashboard de Stripe acumule >50
customers cancelados o cuando legal pida purga.

### #33 — Toast de éxito en operaciones críticas del admin
**Estado**: OPEN
**Origen**: Sesión 2026-05-08, derivado del fix Bug #4 (commit `0f0c8b6`)
y Bug #8 (commit `d945537`).
**Descripción**: El PR de hoy estableció `toast.error(err.message)` en cada
catch del admin. Se decidió conscientemente NO añadir `toast.success` para
mantener el scope acotado a "solo errores". Pero las 4 operaciones críticas
del `TenantDetailPage` (suspend, reactivate, delete, change plan) siguen sin
feedback de éxito — el usuario hace una acción crítica y la única señal de
que pasó es que el `<select>` o el badge cambian. Para operaciones
destructivas como `delete`, esto es ambiguo si la página redirige rápidamente.
**Impacto**: UX inconsistente. El usuario duda si la operación pasó.
**Esfuerzo**: trivial. `toast.success(message)` después de cada
`fetchTenant()` o `navigate(...)` exitoso. Aplicar a las 4 acciones a la vez
para no crear comportamiento heterogéneo.
**Prioridad**: media. El sistema de toasts ya está montado; solo es completar
el patrón.

### #34 — Paginación de builds en `getTenantDetail`
**Estado**: OPEN
**Origen**: Auditoría 2026-05-08, hallazgo Bug #14 reportado pero out-of-scope
del PR de Fase 1.
**Descripción**: `admin.service.ts:getTenantDetail` línea 134 hace
`apps: { include: { builds: { take: 5, orderBy: ... } } }`. Cada app en la
respuesta trae solo sus 5 builds más recientes. Si una app tiene historial
largo (50+ builds), el tab "Builds recientes" del frontend solo ve los
últimos 5 — sin forma de paginación.
**Impacto**: limitación de visibilidad para super-admin que quiere auditar
historial completo de builds de un tenant.
**Esfuerzo**: medio. Mantener `take: 5` para vista rápida en `getTenantDetail`
+ añadir endpoint dedicado `GET /admin/tenants/:id/builds?page=N&limit=20`.
UI: link "Ver todos los builds" en el tab que abre la lista paginada.
**Prioridad**: baja. Solo molesta a super-admin con clientes pesados.

### #35 — Variante Bug #5: dos listas separadas (active + deletedWithKeystore)
**Estado**: OPEN
**Origen**: Sesión 2026-05-08, variante del fix Bug #5 (commit `3f0faf6`).
**Descripción**: El fix mínimo del PR filtra apps soft-deleted del
`getTenantDetail`. Pero hay un caso intermedio que se vuelve invisible:
apps borradas-con-keystore (que siguen ocupando slot del plan, regla
introducida en commit `6a6e99a`). El admin no las ve aunque el `usage`
las cuente — descuadre opuesto al original. Solución más informativa:
devolver `apps` separado en `activeApps` (visibles en el tab) y
`deletedAppsWithKeystore` (con badge gris "Slot ocupado por firma de
stores").
**Impacto**: en Fase 2 cuando se aborde #29 (endpoint abandonar keystore),
el admin necesitará ver qué apps borradas-con-keystore puede abandonar.
**Esfuerzo**: medio. Cambio de tipo en `TenantApp` interface + nueva UI
de badges. Bloquea cuando se construya la UI de #29.
**Prioridad**: baja, sube a media cuando #29 se planifique.

### #36 — Test unitario para `deleteTenant` con mock de Stripe
**Estado**: OPEN
**Origen**: Sesión 2026-05-08, derivado del fix Bug #7 (commit `ef12f9d`).
**Descripción**: La nueva lógica de `deleteTenant` tiene 4 escenarios
distintos (sin `stripeCustomerId`, con customer pero sin subscription,
con ambos happy path, Stripe falla). Solo el primero es smoke-testeable
hoy en producción (los 3 tenants no tienen Stripe). Un test unitario que
mockee `stripeService.cancelSubscription` y verifique los 4 caminos vale
~30 líneas de Jest y previene regresiones futuras del fallback silencioso.
**Impacto**: defensa contra regresiones cuando se refactore el flujo
delete-tenant en el futuro (especialmente si llega #29 y se entrelaza con
keystores).
**Esfuerzo**: bajo, ~30 líneas. Stripe mockeable con el mismo patrón que
ya usan otros tests del backend.
**Prioridad**: media. No bloqueante para producción pero accesible.

### #37 — Refactor de `cancelSubscription`: separar Stripe API de update BD
**Estado**: OPEN
**Origen**: Sesión 2026-05-08, derivado del fix Bug #7 (commit `ef12f9d`).
**Descripción**: La firma actual `cancelSubscription(tenantId, options)`
con flag `skipBdUpdate` resuelve el caso `deleteTenant` pragmáticamente,
pero acopla dos responsabilidades en un mismo método (Stripe call + Prisma
update). Cuando el método tenga 3+ call sites, conviene separarlas:
`cancelStripeSubscription(tenantId, immediate)` solo toca Stripe;
quien le llama hace su propio `prisma.subscription.update` si lo necesita.
**Impacto**: deuda de diseño, no bug. La solución actual funciona.
**Esfuerzo**: medio. Refactor controlado con tests del portal flow.
**Prioridad**: baja. Activar cuando llegue el tercer call site
(probablemente la próxima vez que se toque el flujo de billing).

---

## Sesión 2026-05-08 (continuación) — Auditoría panel admin Fase 2 (cierre Bug #9-#13)

PR `67229b4..b3ecf67` (5 commits) cierra los 5 bugs detectados en la Fase 2
de la auditoría del panel admin. Bug #14 ya estaba apuntado como #34. Cinco
gaps funcionales detectados quedan apuntados aquí; GAP #1 (reset password)
y GAP #5 (impersonación) se atacan en PRs separados (PR-B y PR-C).

### #38 — Paginación de `users` en `getTenantDetail` (Bug #15)
**Estado**: OPEN
**Origen**: Sesión 2026-05-08 PM, Bug #15 reportado pero out-of-scope
del PR de Fase 2.
**Descripción**: `admin.service.ts:getTenantDetail` línea 127-133 incluye
todos los users del tenant sin paginación. Para tenants con cientos de
users CLIENT, el payload se infla y la tabla del frontend se renderiza sin
virtualización. Hoy con 1 user por tenant no se nota.
**Impacto**: visible solo cuando crezca el número de users por tenant
(reseller con su propia cartera).
**Esfuerzo**: medio. Mantener `take: 20` para vista rápida + endpoint
dedicado `GET /admin/tenants/:id/users?page=N&limit=20`. Decisión consciente:
NO filtrar `PENDING_DELETION` por defecto — el super-admin necesita verlos
como información de auditoría.
**Prioridad**: baja, sube a media cuando aparezca el primer reseller real
con >50 users.

### #39 — Página `/users` en admin para gestión cross-tenant (GAP #2)
**Estado**: OPEN
**Origen**: Sesión 2026-05-08 PM, hallazgo curioso: backend tiene
`listUsers`, `toggleUserSuspension`, `permanentDeleteUser` operativos y
`appforge-admin/src/lib/api.ts` tiene los wrappers, pero NO existe la
ruta `/users` en `App.tsx`. Endpoints orphans.
**Descripción**: para gestionar un usuario individual hoy hay que entrar
al detalle del tenant — desde ahí no hay acciones por usuario. Una página
`UsersPage` con `DataTable` cross-tenant + filtros (status, role) +
acciones inline (suspender/eliminar) cierra la deuda. Reutiliza
`DataTable` + `StatusBadge` que ya existen.
**Impacto**: gestión de usuarios individuales requiere SQL hoy.
**Esfuerzo**: medio (~2h). UI greenfield pero todos los componentes
y endpoints ya existen.
**Prioridad**: media. Bloquea soporte cuando llegue el primer ticket
de "este usuario debería estar suspendido".

### #40 — Editar datos básicos de tenant desde admin (GAP #3)
**Estado**: OPEN
**Origen**: Sesión 2026-05-08 PM, hallazgo durante auditoría.
**Descripción**: el admin solo puede suspender / reactivar / eliminar /
cambiar plan. NO puede editar `name`, `brandName`, `brandLogoUrl`,
`brandDomain`, `brandColors` aunque las columnas existan en BD. Si un
reseller se equivoca configurando su branding, el super-admin tiene que
tocar SQL.
**Impacto**: cualquier corrección de branding requiere intervención
manual del DBA.
**Esfuerzo**: medio (~3h). Endpoint `PUT /admin/tenants/:id` con DTO
+ formulario en TenantDetailPage.
**Prioridad**: media, sube a alta cuando haya resellers reales.

### #41 — Crear tenant manual desde admin (GAP #4)
**Estado**: OPEN
**Origen**: Sesión 2026-05-08 PM, hallazgo durante auditoría.
**Descripción**: tenants solo se crean por registro autoservicio. Para
casos enterprise (cliente que paga por adelantado y se le da de alta
directamente), no hay endpoint admin de creación.
**Impacto**: imposibilita venta enterprise sin tocar SQL.
**Esfuerzo**: medio (~2h). Endpoint `POST /admin/tenants` con DTO
(`name`, `email del primer user`, `planType`, opcional `brandName`)
+ formulario en TenantsPage.
**Prioridad**: baja, sube a alta cuando aparezca el primer enterprise.

### #42 — Audit log de operaciones admin destructivas (GAP #6)
**Estado**: OPEN HIGH PRIORITY
**Origen**: Sesión 2026-05-08 PM, hallazgo durante auditoría.
**Descripción**: ninguna acción destructiva del admin (eliminar tenant,
cambiar plan, suspender, eliminar user) queda registrada. Si mañana
hay disputa sobre quién cambió qué cuándo, no hay log.
**Impacto**: cero trazabilidad. Para cumplimiento (GDPR, auditoría
fiscal en algunos países) es bloqueante.
**Esfuerzo**: alto (~1-2 días). Schema nuevo `AdminActionLog` con
`actorId`, `action` (enum), `targetType` (enum: TENANT|USER|PLAN),
`targetId`, `metadata` (JSON con before/after), `createdAt`. Hooks en
cada operación destructiva. UI dedicada con filtros para ver el log.
PR-C (impersonación) ya añade un schema mínimo (`ImpersonationLog`)
que comparte filosofía pero NO sustituye a este — son tablas distintas
porque las semánticas son distintas.
**Prioridad**: alta antes de aceptar primer cliente real (cumplimiento
+ defensa en disputas).

---

## Sesión 2026-05-08 (PR-C cierre) — Riesgos de impersonación post-deploy

PR-C (commits `c61839f..1a4e40e`) implementa la impersonación con
`ImpersonationLog`. Dos riesgos de seguridad operativa quedan abiertos
y aceptados conscientemente, NO como "mejoras futuras" sino como
posición de seguridad documentada.

### #43 — TTL configurable + revocación server-side de impersonación
**Estado**: OPEN HIGH PRIORITY (riesgo de seguridad operativa)
**Origen**: Sesión 2026-05-08 PM, PR-C commit `fda7df0`.
**Descripción**: el TTL del JWT impersonado está hardcoded a `1h` en
`auth.service.ts:74` (`expiresIn: '1h'`). Sin kill switch server-side:
- Si el super-admin descubre que su token está comprometido a mitad
  de una sesión de impersonación, no puede cortar la sesión activa
  del atacante; el JWT sigue siendo válido el resto de su TTL.
- "Salir de la suplantación" en `ImpersonationBanner.tsx` solo borra
  el JWT del localStorage del builder. Si alguien copió el token
  antes (extensión maliciosa, dump de devtools), puede seguir
  actuando hasta `expiresAt`.
**Mitigación actual aceptada**: `ImpersonationLog` registra
`startedAt` + `expiresAt` para forensics post-incidente. Una disputa
puede contestarse con la tabla aunque no se pueda cortar la sesión
en vivo.
**Fix completo**:
1. TTL leído de env var `IMPERSONATION_TTL_MINUTES` con default 60.
2. JwtStrategy chequea contra la BD (`impersonationLogId`) en cada
   request — si la fila tiene un campo `revokedAt` no-null, rechaza.
3. Endpoint `POST /admin/impersonation/:logId/revoke` que setea
   `revokedAt = now()`. Coste: una query Prisma extra por request
   en sesiones impersonadas (no afecta tráfico normal).
4. Migration añade `revokedAt: DateTime?` a `ImpersonationLog`.
**Esfuerzo**: medio (~2-3h con tests).
**Prioridad**: alta antes de aceptar primer cliente real, sobre
todo si ese cliente paga y opera datos sensibles.

### #44 — Tokens de password reset NO deben loggearse en stdout cuando SMTP no está configurado
**Estado**: OPEN
**Origen**: Sesión 2026-05-08 PM, observación durante PR-B
(`platform-email.service.ts:114`).
**Descripción**: cuando SMTP plataforma no está configurado, el
método `sendPasswordResetEmail` actualmente hace
`this.logger.warn('No SMTP configured. Reset token for ${email}: ${token}')`
y devuelve OK silenciosamente. El usuario que pidió reset cree que
recibirá el email, no llega, y el token está expuesto en logs de PM2.
Si esos logs van a un sistema externo (Loki / Datadog / cualquier
agregador), los tokens viajan también.
**Impacto**: vector de leak de tokens vía logs + UX rota (usuario
nunca recibe el email pero la API responde 200).
**Fix**:
1. Si SMTP no está configurado, lanzar `ServiceUnavailableException`
   con mensaje "El servicio de email no está disponible. Contacta
   con soporte." en lugar de generar el token sin enviarlo.
2. Quitar el log con el token plano. Si se quiere debug, loggear
   solo el email (no el token).
3. Aplicar el mismo patrón a `sendPasswordChangedEmail` y otros
   métodos de email crítico.
**Esfuerzo**: bajo (~30 min).
**Prioridad**: media. Afecta cuando SMTP plataforma no está
configurado (estado actual de producción) — entonces forgot-password
del admin queda mal de UX. Subir a alta cuando se configure SMTP
plataforma porque el log con tokens pasa a producción real.

---

## Sesión 2026-05-13 — Hotfixes worker build + deuda estructural detectada

Dos hotfixes en cadena (`9d4fc16` `--include=dev` en `npm ci` del build dir;
`5119598` stub completo de `push.ts`) destaparon un patrón de acoplamiento
estructural entre el runtime template y el BuildProcessor. También se
documentó una observación independiente del cliente sobre `Build.errorMessage`.

### #45 — Stub de push.ts en build.processor.ts debe permanecer en sync con runtime/src/lib/push.ts
**Estado**: OPEN
**Origen**: Sesión 2026-05-13, hotfix `5119598`.
**Descripción**: cuando `hasPushModule && !includePushPlugin` (módulo push
presente pero FCM no configurado), el BuildProcessor escribe un stub a
`buildDir/src/lib/push.ts` que reemplaza al `push.ts` real del runtime.
Hoy el stub exporta las 4 funciones que `auth.ts` y `App.tsx` importan:
`initPush`, `getCurrentFcmToken`, `registerPushDevice`,
`detachPushDeviceFromUser`.

Acoplamiento estructural sin garantía: cualquier export futuro añadido
a `appforge-runtime/src/lib/push.ts` y consumido por algún archivo del
runtime (no solo `auth.ts` / `App.tsx`) rompe los builds DEBUG-sin-FCM
con `UNRESOLVED_VARIABLE` durante `vite build` hasta que el stub se
extienda manualmente. Es un landmine: el código compila local, los
tests pasan, y la rotura solo aparece al hacer un build real en el VPS
sin FCM.

**Impacto**: bajo en estado normal (build falla rápido y el log es
descriptivo). Alto cuando el equipo crece y nadie se acuerda del stub:
puede tardar horas diagnosticar por qué el RELEASE build local pasa
pero el DEBUG en VPS no.

**Fix propuesto**: test de integración en el backend que invoque
`BuildProcessor.process` con un schema que contenga `push_notification`
y `FCM_CONFIG = null`, deje el build llegar hasta `vite build`, y
verifique exit code 0. Se ejecuta en CI por cada PR que toque
`appforge-runtime/src/lib/push.ts` (path filter) o
`appforge-backend/src/build/build.processor.ts`. Detecta drift antes
de merge.

**Esfuerzo**: medio (~2-3h con mocks de BullMQ y fs).
**Prioridad**: MEDIA. No bloquea producción pero será inevitable
cuando push.ts evolucione (nuevos métodos para topics, deeplinks,
etc.) y el equipo crezca más allá del desarrollador único.

### #46 — Sanitización del campo Build.errorMessage según rol
**Estado**: RESUELTO 2026-06-01 (commits `bc5e1e1` backend + `af74e92` builder).
La resolución final fue MÁS ESTRICTA que el fix propuesto original — ver
nota "Resolución final" al pie de esta entrada.

**Origen**: Sesión 2026-05-13, observación del cliente al ver builds
fallidos previos en el panel.

**Descripción**: cuando un build falla, el backend persiste el error
sin sanitizar en `Build.errorMessage` (y `Build.logOutput`). Ambos
campos se devuelven verbatim a los clientes a través de
`GET /apps/:id/builds` y se renderizan en `BuildPanel.tsx` para
usuarios CLIENT. Esto expone:
- Rutas absolutas del filesystem del servidor (`/opt/appforge/...`)
- Estructura interna de los build dirs temporales y UUIDs internos
- Versiones y stack traces de dependencias (rollup, vite, node)
- Nombres de archivos y funciones del runtime template
- Información de la build pipeline interna

**Severidad**: BAJA (no son credenciales ni datos de tenant) pero el
patrón es incorrecto. Information disclosure útil para reconocimiento
previo a un ataque dirigido. Impacto en producto: UX pobre, mensajes
técnicos no actionables para el cliente, sensación de producto crudo.

**Fix propuesto**:
A. Sanitizar en el backend al devolver:
   - `GET /apps/:id/builds` (cliente): redactar `errorMessage` a un
     mensaje genérico ("Error en compilación: <categoría>. Código:
     <buildId>"), omitir `logOutput` por completo.
   - `GET /admin/builds` y similares con rol SUPER_ADMIN: devolver
     verbatim.
B. Mantener el storage interno completo en BD para diagnóstico admin.
C. Mapear categorías de error a mensajes amigables:
   - npm/vite errors → "Error preparando assets web"
   - Gradle errors → "Error compilando Android"
   - signing errors → "Error firmando APK"
   - timeout → "La compilación tardó demasiado, reintenta"
D. UI `BuildPanel.tsx` deja de renderizar `logOutput` si rol === CLIENT.

**Prioridad**: MEDIA — antes del primer cliente externo, después de
cerrar los críticos de smoke y los GAPs documentados de admin.

**Resolución final (2026-06-01)** — más estricta que el fix propuesto:
Junior reabrió esto al ver un screenshot del BuildPanel con un build
fallido mostrando stack trace de rollup + rutas `/opt/appforge/...`
en plano. Su directiva fue inequívoca: **errores genéricos para
TODOS, incluyendo "alguien con conocimiento avanzado"**. Eso descarta
el plan A/B/C/D original (role-based con SUPER_ADMIN viendo verbatim)
a favor de:

- **Backend (`bc5e1e1`)**: la única catch site del processor escribe
  un mensaje fijo en `errorMessage` ("No se pudo completar el build.
  Reintenta en unos minutos. Si el problema persiste, contacta con
  soporte.") y nunca persiste `logOutput`, ni en fallos ni en éxitos.
  Los 3 success paths (debug/release/aab, ios-export, pwa) también
  dejan `logOutput` sin escribir. La info forense raw (mensaje +
  stack + tail del log array interno) va a pm2 logs vía
  `this.logger.error`. La DB nunca contiene material expuesto.

- **Builder (`af74e92`)**: el BuildPanel ignora `build.errorMessage`
  de la BD y renderiza siempre el mismo string genérico. Esto cierra
  el leak para builds antiguos que ya están en BD con `errorMessage`
  raw, sin necesidad de migración SQL. El botón de expandir log y
  el bloque terminal-style `<pre>` se eliminaron por completo —
  unused imports (`ChevronDown`, `ChevronRight`) y state
  (`expandedLog`/`setExpandedLog`/`isExpanded`) limpios al pasar.

- **Mapping por categoría de error** (parte C del fix original):
  descartado. Genérico único es la dirección elegida — la categoría
  expone implícitamente qué tooling se usó (gradle, vite, xcodebuild)
  y es accionable solo si el usuario tiene acceso al servidor, en
  cuyo caso ya puede pm2 logs.

- **Datos viejos en BD**: no se migra. El frontend defensivo cubre
  la lectura. La columna `errorMessage` raw queda en BD para builds
  pre-fix, accesible solo por psql (admin). Si en algún momento
  hay valor de borrarlos, una UPDATE simple basta:
  `UPDATE "AppBuild" SET "errorMessage" = null, "logOutput" = null
   WHERE status = 'FAILED';`. No urgente.

**`truncateBuildLog` helper**: técnicamente unused después de `bc5e1e1`.
Se deja en el archivo (cleanup follow-up trivial cuando convenga,
expansión de diff no compensa hoy).

---

## Sesión 2026-05-25 — Incidente #8 + #2: DTOs vacíos + ValidationPipe whitelist (RESUELTO)

### #47 — Patrón a evitar: DTO NestJS con ValidationPipe whitelist:true sin decoradores
**Estado**: RESUELTO (commits `fix(app-users)` + `fix(contact)` + `chore(backend)` sesión 2026-05-25)
**Origen**: Producción. Primer cliente real (APK 2026-05-13) reporta 500 en registro
y 400 "Invalid or expired captcha token" en formulario de contacto.

**Causa raíz confirmada:**
La sesión 2026-05-07 (commit `7b2168b`) activó `useGlobalPipes` con:
```ts
new ValidationPipe({
  whitelist: true,      // ← culpable
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})
```
El comportamiento de `whitelist: true` es no-obvio: `class-validator` aplica la
`@Expose()` / decorator whitelist a nivel de *propiedad*, no de *clase*. Una propiedad
declarada como `email!: string` sin ningún decorador de `class-validator` es eliminada
silenciosamente del objeto instanciado. El service recibe `{}` y Prisma estalla.

**Síntomas observados vs. causa:**
- Bug #8 (register): `Prisma → Argument 'email' is missing` → 500.
  `dto.email === undefined` porque `RegisterAppUserDto` no tenía decoradores.
- Bug #2 (contact): `400 "Invalid or expired captcha token"`.
  `dto.captchaToken === undefined` porque `SubmitContactDto` no tenía decoradores.

**Alcance real:** 29 DTOs afectados en todo el backend desde `7b2168b`.
Ningún E2E existente los cubría (los E2E de órdenes/cupones usan DTOs ya decorados).

**Fixes aplicados (sesión 2026-05-25):**
1. `app-users/dto/`: `RegisterAppUserDto`, `LoginAppUserDto`, `UpdateAppUserDto` — añadidos
   `@IsEmail`, `@IsString`, `@MinLength(8)`, `@MaxLength`, `@IsOptional`, `@IsUrl`.
   Política de contraseña: `MinLength(8)`, sin `MaxLength` agresivo (hasta 128).
2. `contact/dto/submit-contact.dto.ts` — decoradores añadidos; `captchaToken` ahora
   `@IsOptional` porque la decisión de requerir captcha es responsabilidad del service.
3. `contact/contact.service.ts:submit` — lee `app.schema`, busca el elemento
   `moduleId === 'contact'`, comprueba `config.enableCaptcha`. Si es `false`, salta
   `verifyCaptcha`. El honeypot se mantiene en todo caso. Default seguro: captcha ON.
4. Auditoría completa: 29 DTOs restantes decorados en una sola sesión (catalog, coupons,
   events, fan-wall, gallery, menu, news, platform, push, social-wall, users/*, auth/*, build/*).

**Regla arquitectural futura (obligatoria):**
> **Todo campo de un DTO que pasa por `ValidationPipe({ whitelist: true })`
> DEBE llevar al menos un decorador de `class-validator`, incluso si el único
> propósito es "marcar que este campo existe".**
>
> - Campos obligatorios: `@IsString()` / `@IsEmail()` / `@IsNumber()` según tipo.
> - Campos opcionales: `@IsOptional()` + su tipo (sin `@IsOptional` solo, el
>   whitelist lo elimina si llega como `undefined`).
> - Declarar `field!: string` sin decorador NO es suficiente — TypeScript types
>   son borrados en runtime; `class-validator` no los ve.

**Relación con #27:**
`#27` tracked el riesgo de `forbidNonWhitelisted: false` (no rechaza propiedades extra).
Este incidente descubre la otra cara: `whitelist: true` SÍ elimina propiedades reales
sin decorador. Ambos riesgos del mismo flag, documentados ahora.
`#27` queda PARCIALMENTE ABORDADO: todos los DTOs tienen decoradores (requisito previo
para poder activar `forbidNonWhitelisted: true` en el futuro). El flip del flag sigue
pendiente.

**Verificación post-fix:**
```bash
# Debe devolver { access_token, user } con status 201:
curl -X POST https://api.creatu.app/apps/<appId>/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Temporal123","firstName":"Test"}'

# Auditoría: debe dar output vacío (0 DTOs sin decoradores):
Get-ChildItem -Path src -Recurse -Filter "*.dto.ts" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  if ($c -notmatch '@Is|@Min|@Max|@Length|@Matches|@Type|@IsNotEmpty|@IsNumber|@IsArray|@IsObject') {
    Write-Host "BROKEN: $($_.FullName)"
  }
}
```

**Verificación ejecutada 2026-05-25:** TS build limpio. Grep de auditoría: 0 DTOs afectados.

**Impacto en cascada:**
- Bug #4 (loyalty card "improbable") — pasa a "probable" sin tocar nada más, una vez
  que `app-users` funcione y los usuarios puedan registrarse.
- E2E: los tests existentes no capturaron esto porque los DTOs de órdenes/cupones
  ya tenían decoradores. Pendiente revisar cobertura E2E del flujo de registro.

---

### #48 — `@UseGuards(...)` a nivel clase rompe endpoints con auth schema distinto en el mismo controller
**Estado**: RESUELTO en `upload.controller.ts` (este commit, sesión 2026-05-25).
**Origen**: Validación post-deploy 2026-05-25. `/upload/app-user-image` devolvía
401 a tokens firmados con `APP_USER_JWT_SECRET` (end-users). La APK construyó
la petición correctamente — el rechazo era 100% server-side.

**Mecanismo:**
En NestJS, declarar `@UseGuards(...)` a nivel CLASE aplica esos guards a TODOS
los métodos del controller, encadenándose ANTES que los guards declarados a
nivel método. Cuando una misma clase mezcla endpoints con auth schemas
distintos (`JwtAuthGuard` para Client/Super-Admin vs `AppUserAuthGuard` para
end-users), el guard de clase rechaza tokens del otro schema antes de que el
guard de método llegue a ejecutarse.

Ambos guards heredan de `AuthGuard(...)` de `@nestjs/passport`. La estrategia
JWT (`JWT_SECRET`) lanza `UnauthorizedException` cuando recibe un token firmado
con otro secret. El stack para `/upload/app-user-image`:
1. Request entra con `Bearer <token-de-end-user>`.
2. `JwtAuthGuard` (clase) corre → la estrategia `'jwt'` falla verificación de
   firma → 401 → la cadena se interrumpe.
3. `AppUserAuthGuard` (método) NUNCA se ejecuta.

**Síntoma observado:**
- `/upload/app-user-image` → 401 Unauthorized para cualquier token de end-user.
- Imposible subir imágenes desde fan-wall, social-wall, o avatar de end-user.
- El mensaje del 401 venía de `JwtAuthGuard`, no de `AppUserAuthGuard`, lo que
  confundía el diagnóstico inicial (parecía un problema del cliente APK).

**Fix aplicado:**
- `appforge-backend/src/upload/upload.controller.ts`:
  - Quitado `@UseGuards(JwtAuthGuard, RolesGuard)` de nivel clase.
  - Añadido `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel método en los 4
    endpoints de Client (`image`, `app-icon`, `avatar`, `file`).
  - `app-user-image` queda solo con `@UseGuards(AppUserAuthGuard)`.
- Comportamiento de los 4 endpoints de Client: idéntico al previo (mismos
  guards, mismo orden de evaluación). Solo cambió DÓNDE se declaran.

**Auditoría del patrón en todo el backend (completada antes del commit):**
- Controllers con `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel CLASE:
  `admin`, `apps`, `upload`, `build`, `subscription`, `catalog-products`,
  `platform`, `menu-items`. Todos menos `upload` son endpoints de Client/Admin
  puros, no mezclan con `AppUserAuthGuard`.
- Controllers que usan `AppUserAuthGuard`: `app-users`, `booking`, `fan-wall`,
  `loyalty`, `orders`, `push`, `social-wall`, `upload`.
- De los 8 controllers que usan `AppUserAuthGuard`, **7 ya declaraban sus
  guards a nivel método correctamente**; `upload` era el único con el
  anti-patrón. No quedan casos latentes en producción.

**Regla arquitectural futura (obligatoria):**
> No declarar `@UseGuards(...)` a nivel clase en controllers que puedan recibir
> tokens de auth schemas distintos. Si la clase mezcla auth schemas (típicamente
> `JwtAuthGuard` con `AppUserAuthGuard`), declarar los guards a nivel método
> para cada endpoint individual.

**Verificación post-deploy:**
```bash
# Token de end-user, debe devolver 201 con { url, filename }:
curl -i -X POST https://api.creatu.app/upload/app-user-image \
  -H "Authorization: Bearer $APP_USER_TOKEN" \
  -F "file=@/tmp/test.png"

# Token de Client, debe seguir funcionando con 201 (regression check):
curl -i -X POST https://api.creatu.app/upload/image \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -F "file=@/tmp/test.png"
```

**Impacto operativo:**
- La APK actual NO necesita rebuild — solo deploy backend.
- Una vez deployado, fan-wall, social-wall y avatares de end-user vuelven a
  funcionar sin reinstalación.

---

### #49 — Capacitor Android WebView intercepta `<a target="_blank">` / `window.open('_blank')`
**Estado**: RESUELTO en booking. Auditoría del runtime completada.
**Origen**: APK 2026-05-13. Junior reportó (#7A) que tras confirmar una reserva,
pulsar "Ver mi reserva →" hacía que la app "volviera a la pantalla de inicio".

**Mecanismo:**
En Capacitor Android, el `<a target="_blank">` y `window.open(url, '_blank')`
no abren en navegador externo limpio — la WebView de la app los intercepta y,
según versión, los carga *dentro de la misma WebView* (reemplazando la app) o
los abre en externo pero al volver la app se reinstancia desde cero, perdiendo
toda la pila de navegación interna. Síntoma observado: "volver a inicio".

La hipótesis inicial fue *remount del módulo* / *backButton mal capturado*.
Ambas eran incorrectas — el archivo no hacía nada de eso. Era un único `<a>`
con `target="_blank"`.

**Fix correcto:** `Browser.open({ url })` de `@capacitor/browser` (envuelto
por `BrowserShim` en `appforge-runtime/src/lib/platform/index.ts`). Abre el
visor de browser del sistema (Chrome Custom Tabs en Android,
SFSafariViewController en iOS) **sin tocar la WebView de la app**.

**Auditoría del patrón en el runtime (commit 0215c6e):**
- `target="_blank"` raw: 1 caso. `BookingRuntime.tsx:165`. **Fix aplicado.**
- `window.open(url, '_blank')` raw o como fallback:
  - `BrowserShim.open` (lib/platform): fallback PWA, correcto.
  - `ButtonRuntime.tsx:29`: catch-fallback detrás de `await Browser.open(...)`.
    Dead code en práctica salvo que el plugin falle al cargar. No-touch.
  - `LinksRuntime.tsx:27`: igual que Button. No-touch.
  - `EventsRuntime.tsx:34`, `HeroProfileRuntime.tsx:51`,
    `PdfReaderRuntime.tsx:21`: igual patrón catch-fallback. No-touch.

**Conclusión:** un solo bug real, todos los demás sitios ya usaban el path
canónico de `Browser.open()` como primario.

**Regla arquitectural futura (obligatoria):**
> En código del runtime, NUNCA usar `<a target="_blank">` ni
> `window.open(url, '_blank')` como path principal para abrir URLs externas.
> El patrón canónico es `import { BrowserShim as Browser } from '../../lib/platform'`
> y llamar `Browser.open({ url })`. El shim se encarga de Capacitor Browser
> en nativo y `window.open` en PWA. Si necesitas un fallback adicional para
> robustez, ya está dentro del shim — no lo dupliques en el sitio de llamada.

**Verificación post-deploy:**
APK actual sirve. Después de instalar la próxima APK que incluya este commit,
hacer una reserva → pulsar "Ver mi reserva" → debe abrir el navegador del
sistema (Chrome Custom Tabs) sin matar la app. Volver con back nativo → app
sigue en la vista de éxito de reserva, no en home.

---

## Features diferidas — pendientes de planeación en sesión propia

Estas no son tech-debt strictly speaking — son funcionalidades nuevas que
salieron a luz junto con los bug fixes 2026-05-25. Documentadas aquí para no
perderlas y arrancar la próxima sesión con spec inicial.

### #7B — Builder: mini-dashboard de reservas (FEATURE, no bug)
**Estado**: DIFERIDA. Spec inicial pendiente de pulir con Junior.
**Origen**: Tras la APK 2026-05-13, Junior reportó que ver las reservas
existentes desde el panel del cliente actual es "horrible". Pide vista que
le ayude a detectar solapamientos antes de confirmar manualmente.
**Alcance estimado**: 200-400 LoC en `appforge-builder/src/modules/booking/`
(nuevo componente de panel de gestión, no toca runtime).
**Decisiones a tomar antes de implementar:**
1. ¿Vista calendario, lista ordenada, o ambas con toggle? (Calendario añade
   complejidad — librería tipo `@fullcalendar/react` o build-your-own; lista
   ordenada por `eventDate ASC` es la baseline barata).
2. Definición de "solapamiento": ¿slots adyacentes en el mismo recurso, o
   solo coincidencia exacta de `eventDate`? Depende de si Booking tiene
   duración (sí — campo `duration` en el schema, ver `BookingService`).
3. Filtros: por estado (`CONFIRMED` / `CANCELLED` / `COMPLETED` / `NO_SHOW`),
   por rango de fechas, por servicio.
4. ¿Acciones inline? (cancelar, marcar como completed, marcar no-show)
**Prioridad**: media. No bloquea el uso de la app, pero es la queja UX más
fuerte del primer cliente.
**Próxima sesión**: arrancar con Plan Mode y un mock visual.

### #7C — Runtime: UI polish del módulo booking en nativo (FEATURE)
**Estado**: DIFERIDA. Spec sin definir.
**Origen**: Junior mencionó "hay que mejorar la UI nativa para las reservas"
post-APK. Frase deliberadamente vaga al cierre de sesión.
**Bloqueador para implementar**: lista cerrada de 3-5 cambios atómicos
concretos. Sin esto el commit puede ser cualquier cosa entre 20 LoC y 500 LoC.
**Sugerencias para definir scope en la próxima sesión:**
- Confirmación visual al pulsar slot disponible (estado intermedio antes
  de submit del form).
- Spinner explícito durante `getAvailableSlots` y `createBooking`.
- Mostrar duración estimada del slot en la confirmación.
- Mensaje claro cuando todos los slots del día están ocupados.
- Persistir parcialmente los datos del form si el usuario sale y vuelve.
**Prioridad**: baja. El flujo funciona; es pulido.

---

## Operaciones diferidas

### INFRASTRUCTURE_SETUP.md no versionado
**Estado**: PENDIENTE OPERATIVA.
**Contexto**: Sesión 2026-05-13 generó este documento describiendo el
provisioning del VPS desde cero (JDK 17, Android SDK platforms;android-34,
build-tools;34.0.0, Gradle 8.7, env vars PM2 con ANDROID_SDK_ROOT, etc.).
El archivo no llegó al repo — no aparece en `git status` ni en `git log`.
**Acción pendiente**: Junior recupera el contenido (de su Claude.ai project
knowledge o del VPS) y lo commitea en raíz. Sin esto, una migración a otro
VPS o un sucesor de Junior va ciego.
**Prioridad**: media. No urgente hasta que haya que tocar infra.

---

### #50 — `@IsUrl()` aplicado a campos que reciben paths relativos de `/uploads/*`
**Estado**: RESUELTO (commit 25cbbf1, sesión 2026-05-28).
**Origen**: Regresión introducida por commit cc4ef37 ("full DTO audit" del
2026-05-25). La auditoría añadió `@IsUrl()` a todo campo que parecía URL,
sin diferenciar entre URLs externas (las que el cliente escribe a mano en
el builder) y paths internos generados por nuestros propios endpoints
`/upload/*`.

**Síntoma**: Tras desplegar cc4ef37, cualquier intento de crear un post de
fan-wall / social-wall, item de galería, etc., con imagen subida vía
`/upload/app-user-image` devolvía:
```
{"statusCode":400,"message":["imageUrl must be a URL address"]}
```
Porque el frontend mandaba el path relativo `/uploads/355e54d7-...png` que
devuelve nuestro endpoint de upload, y `@IsUrl()` exige URL absoluta.

**Lo verdaderamente alarmante**: este bug ya existía latente desde el
2026-05-07 (`7b2168b`, activación de `ValidationPipe whitelist:true`).
Entre esa fecha y cc4ef37, los mismos DTOs no tenían decoradores y el
whitelist eliminaba silenciosamente el campo `imageUrl` antes de llegar
al service. Los posts se creaban con 201 (parecía OK) **pero sin imagen**.
Dos semanas de imágenes que el cliente creía estar subiendo y se perdían
en el ValidationPipe. Mismo mecanismo que disparó #47 y #8 ahora se
manifiesta en sentido opuesto: visible > invisible, pero la pérdida de
datos ya está hecha.

**Análisis y categorización (22 ocurrencias en 19 DTOs):**

**Cat 1 — INTERNAL UPLOAD (relajar a `@IsString()`)** — 20 campos:
| Archivo | Campo |
|---------|-------|
| app-users/dto/update-app-user.dto.ts | avatarUrl |
| catalog/dto/create-collection.dto.ts | imageUrl |
| catalog/dto/update-collection.dto.ts | imageUrl |
| catalog/dto/create-product.dto.ts | imageUrls[] |
| catalog/dto/update-product.dto.ts | imageUrls[] |
| contact/dto/submit-contact.dto.ts | fileUrls[] |
| coupons/dto/create-coupon.dto.ts | imageUrl |
| coupons/dto/update-coupon.dto.ts | imageUrl |
| events/dto/create-event.dto.ts | imageUrl (línea 22) |
| events/dto/update-event.dto.ts | imageUrl (línea 21) |
| fan-wall/dto/create-fan-post.dto.ts | imageUrl |
| gallery/dto/create-gallery-item.dto.ts | imageUrl |
| gallery/dto/update-gallery-item.dto.ts | imageUrl |
| menu/dto/create-menu-category.dto.ts | imageUrl |
| menu/dto/update-menu-category.dto.ts | imageUrl |
| menu/dto/create-menu-item.dto.ts | imageUrl |
| menu/dto/update-menu-item.dto.ts | imageUrl |
| news/dto/create-news-article.dto.ts | imageUrl + videoUrl |
| news/dto/update-news-article.dto.ts | imageUrl + videoUrl |
| push/dto/send-push.dto.ts | imageUrl |
| social-wall/dto/create-social-post.dto.ts | imageUrl |
| users/dto/update-profile.dto.ts | avatarUrl |

**Cat 2 — EXTERNAL URL (mantener `@IsUrl()`)** — 2 campos:
| Archivo | Campo |
|---------|-------|
| events/dto/create-event.dto.ts | ticketUrl (línea 44) |
| events/dto/update-event.dto.ts | ticketUrl (línea 44) |

**Decisión sobre `videoUrl` (news)**: tratado como Cat 1 porque el runtime
`NewsFeedRuntime.VideoEmbed` soporta tanto YouTube/Vimeo (URL absoluta)
como upload directo (path relativo a `/uploads/*.mp4`). `@IsUrl()` rechaza
la segunda. Aceptar string permite ambos.

**Seguridad de la relajación**:
- `imageUrl` y `avatarUrl` se renderizan vía `<img src={...}>` exclusivamente,
  nunca como `<a href>` ni como argumento de `eval()`. Payloads tipo
  `javascript:` no se ejecutan en `<img src>` en navegadores modernos.
- `@MaxLength(512)` (preexistente) impide payloads patológicos.
- El upload físico del archivo sigue pasando por nuestro endpoint, que
  valida MIME-type, tamaño, y firma con `validateFileType` magic-bytes.
  El campo del DTO solo guarda la REFERENCIA al archivo ya validado.

**Regla arquitectural futura (obligatoria):**
> En cualquier auditoría DTO que añada `@IsUrl()`, **mirar siempre quién
> popula el campo**:
> - Si lo escribe el usuario en el builder (URL externa a tercero):
>   `@IsUrl()` ✓.
> - Si viene del flujo de upload interno (`/upload/*` devuelve path
>   relativo): `@IsString()` + `@MaxLength(512)`.
> - Si admite ambos (ej. videoUrl que puede ser YouTube o upload local):
>   `@IsString()` + `@MaxLength(512)`.
> El nombre del campo no es suficiente — `videoUrl` puede ser cualquiera
> de las tres. Hay que mirar el componente del builder.

**Verificación post-deploy:**
```bash
# Path relativo: debe devolver 201 (antes 400)
curl -i -X POST https://api.creatu.app/apps/<appId>/fan-wall/posts \
  -H "Authorization: Bearer $APP_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"/uploads/test.png","caption":"smoke"}'

# URL absoluta a nuestro propio dominio: debe seguir funcionando
curl -i -X POST https://api.creatu.app/apps/<appId>/fan-wall/posts \
  -H "Authorization: Bearer $APP_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://api.creatu.app/uploads/test.png","caption":"smoke"}'

# ticketUrl con valor inválido (no URL): debe seguir devolviendo 400
# (regression check, mantenemos @IsUrl ahí)
curl -i -X PUT https://api.creatu.app/apps/<appId>/events/<id> \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticketUrl":"no es url"}'
```

**Impacto operativo**:
- APK actual no necesita rebuild — fix backend-only.
- Los posts/items creados entre 2026-05-07 y 2026-05-25 (whitelist
  silencioso) NO se pueden recuperar — el imageUrl nunca llegó a la BD.
  Los clientes tendrán que re-subir esas imágenes. Comunicar.

---

### #51 — Capacitor Android back button no manejado en runtime
**Estado**: RESUELTO (commits `6b0eb50` + `a1e5cb4`, sesión 2026-05-28).
**Origen**: APK 2026-05-28. Junior reportó: "la app no responde a los botones
nativos de 'atrás' de Android". Quedaba bloqueado en vistas internas que no
tenían X / flecha visible.

**Causa**: ningún `*Runtime.tsx` registraba listener para
`App.addListener('backButton', ...)` de `@capacitor/app`. Sin handler,
Capacitor cierra la app (comportamiento por defecto) o la WebView se traga
el evento. En cualquier caso, el usuario no podía salir de detalle/modal sin
una X explícita.

**Solución**: nuevo hook `useBackButton` en `appforge-runtime/src/lib/use-back-button.ts`:

```ts
useBackButton(() => setSelectedIndex(null), selectedIndex !== null);
```

Características no-obvias del hook (que el implementador DEBE mantener si lo
modifica):
1. **`useRef`+effect del handler**: si el caller pasa un arrow function nuevo
   en cada render, el listener no se re-registra. La ref siempre apunta al
   handler "actual". Sin esto, un parent re-render causa tormenta de
   register/unregister.
2. **`removed` flag**: `CapApp.addListener` es async. Si el effect limpia
   antes de que la Promise resuelva, `handle` es `undefined` y `remove()` es
   no-op — listener zombie permanente. El flag cierra esa ventana:
   cuando la Promise resuelve, si `removed=true`, se llama `h.remove()`.
3. **`Capacitor.isNativePlatform()` guard**: PWA es no-op (el navegador
   maneja su back).
4. **Flag `enabled`**: cuando es `false`, NO se registra listener. Esto
   permite que la vista raíz de un módulo deje a Capacitor cerrar la app.

**Módulos cubiertos** (7):
- `news-feed`, `events`, `fan-wall`, `loyalty-card`, `photo-gallery`:
  estado simple (`selected*` o `show*Modal`), back → cerrar sub-vista.
- `booking`: state machine `'select' | 'form' | 'sending' | 'success' | 'error'`,
  back recorre la máquina en reverso. No registrado durante `'sending'` para
  no interrumpir red.
- `catalog`: state machine `'shopping' | 'cart' | 'login-gate' | 'checkout' | 'confirmation'`,
  back recorre la máquina hacia `'shopping'`.

**Módulos auditados y descartados (read-first rule del plan)**:
- `social-wall`: comments inline expand + form siempre-visible. Sin sub-vista.
- `menu-restaurant`: accordion + tabs (estado plano).
- `discount-coupon`: flat list.

**Módulos fuera de scope** (sin navegación interna):
- `button`, `image`, `text`, `links`, `video`, `testimonials`, `hero-profile`,
  `user-profile`, `push-notification`, `contact`, `custom-page`, `pdf-reader`.

**Regla arquitectural futura (obligatoria)**:
> Cualquier `*Runtime.tsx` que añada un sub-state (`selected*`, `*Index`,
> `show*Modal`, state machine con vistas distintas) DEBE registrar
> `useBackButton(handler, subViewIsOpen)`. Si el módulo es flat-list,
> NO registrar — el botón atrás cierra la app, comportamiento esperado en
> la vista raíz.

---

### #52 — `window.confirm` / `prompt` / `alert` no funcionan en Capacitor WebView
**Estado**: RESUELTO (commits `731f9c8` + `a799c20`, sesión 2026-05-28).
**Origen**: APK 2026-05-28. Junior reportó: "he subido una imagen a fanwall,
pero ahora al querer eliminar, no me deja. No hay errores, simplemente no
hace nada". Curl al endpoint `/fan-wall/posts/:id` con DELETE devolvía 200
limpio — bug 100% en runtime.

**Causa**: Capacitor Android WebView suprime los diálogos síncronos del web.
`window.confirm()`, `window.prompt()`, `window.alert()` retornan
`false`/`null`/`undefined` inmediatamente sin mostrar UI. Patrón típico
roto:
```ts
const handleDelete = async (postId: string) => {
  if (!confirm('¿Eliminar?')) return; // confirm() retorna false en native
  await deleteFanPost(postId);        // NUNCA SE EJECUTA
};
```
Síntoma: tap → no diálogo → no request → no error. Exactamente el reporte.

**Auditoría del runtime** (grep `confirm\(|prompt\(|alert\(` en `*Runtime.tsx`):
- 2 archivos, 9 ocurrencias totales.
- `FanWallRuntime.tsx`: 5 calls (handleDelete, handleReport con prompt + 2× alert, handleUpload caption).
- `SocialWallRuntime.tsx`: 4 calls (handleDelete, handleReport con prompt + 2× alert).
- `LoyaltyCardRuntime.tsx`: NO afectado — su modal de PIN ya es custom (commit `98d7b5a`).

**Solución**: utilidad `appforge-runtime/src/lib/dialogs.tsx` con tres
funciones promise-returning:
- `showConfirm(message, opts?): Promise<boolean>`
- `showPrompt(message, opts?): Promise<string | null>`
- `showAlert(message, opts?): Promise<void>`

Cada función monta un `<div>` en `document.body`, renderiza un modal
bottom-sheet vía `react-dom/client createRoot`, y resuelve cuando el usuario
interactúa (OK / Cancelar / X / backdrop click / Escape). Estilo idéntico al
modal de PIN de `LoyaltyCardRuntime` — mismas variables CSS, mismo radio,
misma opacidad backdrop. No se añade `@capacitor/dialog` ni ninguna otra
dependencia.

**Migración aplicada**:
- `FanWallRuntime.tsx`: 5 sitios.
- `SocialWallRuntime.tsx`: 4 sitios.
- Todas las funciones tocadas ya eran `async`, así que el cambio es
  mecánico: añadir `await` a la llamada.

**Regla arquitectural futura (obligatoria)**:
> **Prohibido** `window.confirm`, `window.prompt`, `window.alert` en
> `*Runtime.tsx`. Siempre `showConfirm`/`showPrompt`/`showAlert` de
> `appforge-runtime/src/lib/dialogs`. Funcionan en nativo y en PWA con la
> misma API y el mismo estilo visual.

**Nota operativa**: posts de fan-wall creados desde la APK actual ANTES de
este fix tienen `caption: null` en BD. El `prompt('Agrega una descripción')`
devolvía `null` silenciosamente y el endpoint guardaba `null` en lugar del
texto que el usuario nunca pudo escribir. Las imágenes están — solo el
caption se perdió. Comunicar al primer cliente si pregunta. Mismo patrón
que la pérdida de `imageUrl` documentada en #50, mecanismos distintos pero
mismo efecto.

**Verificación post-APK (Junior)**:
1. Fan-wall: tap "Eliminar" en un post propio → bottom-sheet aparece →
   tap "Eliminar" → post desaparece de la lista.
2. Fan-wall: subir nueva foto → bottom-sheet para descripción aparece →
   escribir texto → post se crea con caption.
3. Social-wall: idéntico al fan-wall en delete y report.
4. Tecla Escape (PWA): cierra el modal como cancel.

---

### Decisión: NO se abre #53 "audit nativo pendiente"
El audit que motivó esta sesión (back button + dialogs) está cerrado por
#51 + #52. Un entry permanente "audit pendiente" sería siempre `OPEN` —
es trabajo continuo. Si Junior reproduce nuevos síntomas en la próxima
APK, se abre un entry específico con su número.

---

### #54 — Regla de orden de hooks (precisificada) + boundary state persistence
**Estado parte 1 (regla)**: DOCUMENTADA tras el incidente de #310 en `6126d77`.
**Estado parte 2 (boundary `resetKeys`)**: OPEN, diferido.

#### Parte 1 — Regla del orden de hooks en `*Runtime.tsx`

**Origen**: APK 2026-05-29. NewsFeedRuntime petaba con React error #310
("Rendered more hooks than during the previous render") al pasar de
`loading=true` a `loading=false`. Causa concreta: la llamada a
`useBackButton(...)` quedó por debajo de `if (loading) return <LoadingCards />`.
El primer render (loading=true) no la alcanzaba; el segundo (loading=false)
sí → el conteo de hooks cambió entre renders → throw → sin Error Boundary
montado, el throw desmontó el árbol entero → pantalla blanca.

**Regla mal formulada en el commit message de `6126d77`**: «si el handler
depende de un valor derivado que solo existe tras un return temprano,
calcula el handler inline». Eso enfoca el problema en el handler, que NO
es la pieza relevante. El handler es una función normal — puede declararse
inline, arriba, abajo, da igual mientras solo referencie state/props ya
declarados.

**Regla correcta (precisificada)**:
> **Toda llamada a un hook (`useX(...)`) debe ejecutarse antes de cualquier
> `return` condicional del componente.** Esto incluye `useState`, `useEffect`,
> `useRef`, `useCallback`, `useMemo`, `useContext`, `useReducer` y CUALQUIER
> hook custom (`useBackButton`, hooks de routing, etc.).
>
> Las funciones que el hook recibe como argumento (handlers) pueden
> definirse en cualquier orden, mientras solo referencien identificadores
> (state, setters, props) declarados arriba en el cuerpo del componente.
>
> Si la regla parece forzar a hacer "más cosas" arriba de un early return,
> casi siempre el resultado correcto es mover el hook (y, si hace falta,
> mover el handler con él). Nunca mover el early return debajo del hook —
> la condición de salida está ahí por una razón funcional, no de hooks.

**Auditoría del fix (en `6126d77`)**: revisé los 7 runtimes tocados por
`a1e5cb4`. Solo `NewsFeedRuntime` tenía la violación. Los otros 6
(`events`, `booking`, `fan-wall`, `loyalty-card`, `photo-gallery`,
`catalog`) ya tenían el `useBackButton` correctamente por encima de
cualquier `if (...) return ...`. Confirmado por grep de posiciones de línea.

**Por qué solo NewsFeed**: era el único cuyo handler (`goBack`) hacía
referencia a `setLastVisitedIndex` Y leía `selectedIndex`, mientras que
el resto pasaban arrow functions triviales que no necesitaban una
declaración nombrada. El reflejo natural ("declaro `goBack` cerca de
donde lo uso, luego paso al hook") metió ambos por debajo del early return.
Por eso esta regla merece estar escrita, no asumida.

#### Parte 2 — `RuntimeErrorBoundary` state persistence (diferido)

**Origen**: review del boundary añadido en `9da9171`. El componente
es un class component clásico con `state = { error: null }`.
`getDerivedStateFromError` setea el error; `reset` lo limpia con un
click del usuario.

**Limitación conocida**: una vez `error` se setea, React reusa la
instancia del boundary mientras `key={element.id}` se mantenga estable
(que es lo que pasa en TabScreen — el key es el id del elemento del
schema). Si el error de hoy es no-transitorio (un bug de render
determinista), `Reintentar` re-renderiza el mismo árbol, vuelve a tirar,
fallback persiste. Si el usuario navega a otro tab y vuelve, AppShell
desmonta el TabScreen anterior → los boundaries del tab nuevo montan
frescos → en ESE caso el state se limpia solo, pero solo porque el
boundary se reinstancia, no porque el reset funcione.

**Cuándo bite**: error transitorio en el mismo módulo, mismo tab.
Ejemplos: prop nueva tras `getNews()` que el módulo no sabía manejar y
peta una vez; segunda llamada a la API devuelve un shape válido. Con el
estado pegado, el usuario no recupera aunque la causa ya no exista.

**Fix futuro (no en esta tanda)**: API `resetKeys?: unknown[]` estilo
`react-error-boundary` de Brian Vaughn. `getDerivedStateFromProps`
compara el array de keys del render anterior; si cambian, resetea
`error` a `null`. Caller en TabScreen pasaría algo como
`resetKeys={[element.config]}` para que reseteo automático ocurra
cuando la config del módulo cambia.

**Por qué no se hace ahora**:
- No está en la ruta crítica del APK actual (el #310 ya está fijo
  por la vía estructural, sin depender del reset del boundary).
- Validar `resetKeys` se hace razonando y con un test unitario, no
  necesita APK build.
- Mete una variable extra al build de verificación cuyo objetivo es
  una sola pregunta binaria: ¿la home dejó de irse a blanco?

**Acción cuando se aborde**: 1 commit en `appforge-runtime/src/components/RuntimeErrorBoundary.tsx`
añadiendo `resetKeys` prop + lifecycle. Idealmente con un test unitario
con `@testing-library/react` para verificar el reseteo. ~30 min.

**No abrir #55 para "smoke del boundary"**: se descartó tras debatir
opciones (a)/(b)/(c) en la sesión 2026-05-29. El contrato `catch →
fallback` está suficientemente garantizado por React; lo único que puede
fallar de nuestro código (el reset) no se ejercita con un swap de
Component + tab-switch (los boundaries se reinstancian al desmontar el
tab). Si en producción aparece un caso donde el fallback queda pegado,
ese síntoma abre un entry concreto.

---

### #55 — APK build worker salta `tsc -b`, deja pasar errores TypeScript a producción
**Estado**: OPEN.
**Origen**: Sesión 2026-05-29. Junior observó que dos errores TypeScript
existieron en `main` sin que el pipeline de build de APK los rechazara:
los `import.meta.env` sin tipos de `manifest.ts` / `platform/index.ts`, y
el tipo angosto del retorno de `getEvents()` que no incluía
`eventEndDate`/`category`/etc. Ambos se arreglaron a posteriori
(`bab5563` + `bac95dc`), pero solo porque corrimos `npm run build` local
antes de pushear — el pipeline del worker no los habría caçado.

**Diagnóstico**: el job de build del APK ejecuta `npx vite build`
directamente, en vez de `npm run build` que es `tsc -b && vite build`.
Vite no hace typecheck del proyecto — solo transforma y bundlea. Por
tanto, errores TypeScript silenciosos llegan a artefacto.

**Fix propuesto**: en el worker que construye APKs (en
`appforge-backend/src/build/`, el processor que invoca `vite`), una de
dos opciones:
1. Sustituir la invocación de `vite build` por `npm run build` (mantiene
   `tsc -b && vite build` definidos en el package.json del runtime).
2. Añadir un paso `npx tsc --noEmit` ANTES de `npx vite build`. Si
   `tsc --noEmit` falla con exit code != 0, el job entero falla.

Recomiendo (1) — usa la receta canónica del package.json y evita
divergencia entre dev local y CI.

**Test del fix**: introducir un error TS deliberado en cualquier archivo
del runtime (e.g. `const x: number = 'foo';`), kickear un build APK,
confirmar que el job FALLA en vez de producir APK roto. Revertir el
error después.

**Por qué no se arregla ahora**: deuda real pero no en ruta crítica del
ciclo actual. Los slips de hoy fueron cosméticos (errores de tipo, no de
runtime). Si en el futuro algo más grave colara, esto subiría de
prioridad. Estimación: 1-2h incluyendo el test de regresión.

**Prioridad**: media.

**Patrón paralelo cazado en sesión 2026-05-31 — campo opcional declarado
y leído pero no poblado.** El fix de B3 (`9f89bdc`) añadió `trackingUrl?:
string` al type de `createBooking` (api.ts) y al shape del state
`confirmedBooking` (BookingRuntime.tsx), y la derivación en el success
view lee con `confirmedBooking.trackingUrl ?? fallback`. Pero el
`setConfirmedBooking({...})` del handler en handleBook se quedó con la
firma vieja, sin `trackingUrl: result.trackingUrl`. El campo se declaraba
y se leía, pero nunca se poblaba. Resultado: `confirmedBooking.trackingUrl`
siempre undefined, el `??` colapsaba al fallback `window.location.origin`
= `https://localhost` en Capacitor, Browser.open recibía localhost,
connection refused. Costó el slot 5/5 del APK.

`tsc -b` lo deja pasar porque omitir un campo opcional de un object
literal es válido — el compilador no sabe que el runtime necesita el
valor. Y `tsc --noEmit` con strict tampoco lo caza por la misma razón.
El worker que se salta `tsc -b` ni siquiera entra en este género, pero
incluso con el typecheck completo el bug pasaría — esto es ortogonal a
#55, en realidad un patrón paralelo que merece estar fichado aquí
porque el género es el mismo: "cosas que pasan el chequeo de tipos y
fallan en runtime".

**Regla de review al tocar un campo opcional** (obligatoria de aquí en
adelante): verificar las **tres caras** en este orden — `type` →
`reader` → `writer`. Si solo grepeas dos, falta una. Específicamente,
al añadir un campo opcional a un type del state o de la API:

1. Anotar el type (lo natural).
2. Leerlo donde corresponda (`obj.field ?? fallback`).
3. **Inspeccionar TODOS los call sites de construcción del objeto** —
   `setX({...})`, `return {...}`, factory functions — y añadir el
   campo en cada uno. El grep canónico: el setter o el constructor del
   objeto cuyo type acabas de tocar.

Aplica a code review, a IA-assisted edits, y especialmente a fixes
mecánicos que tocan un type y dejan los call sites "para después".

**Variante 2026-06-01 — añadir valor a enum sin auditar condicionales
`X !== VALUE` dispersas.** El mismo género que las "tres caras", pero
para enums en vez de campos opcionales. Cuando se añadió `BuildType.PWA`
al schema Prisma, tres sitios quedaron desalineados con la asunción
"native vs debug" que era cierta cuando el enum tenía 4 valores:

1. `appforge-backend/src/build/dto/request-build.dto.ts:5` — el `@IsIn([...])`
   y el union type omitieron `'pwa'`. ValidationPipe global rechazó el body
   con 400 antes de llegar al controller. Fix: commit `0ae7232`.
2. `appforge-backend/src/build/build.processor.ts:147` —
   `else if (buildType !== BuildType.DEBUG)` trataba PWA como release nativo
   y abortaba con "Push notification module requires FCM configuration"
   aunque PWA no usa Capacitor push. Fix: añadir `&& buildType !== BuildType.PWA`
   (este commit).
3. `appforge-backend/src/build/build.service.ts:86` —
   `buildType !== BuildType.PWA` para skip de Android config (este sí
   estaba bien desde el inicio, pero por la misma razón merece auditarse
   cuando aparezca un cuarto tipo no-Android).

**Regla al añadir un valor a un enum del schema** (obligatoria de aquí en
adelante, complementaria a las "tres caras"):

1. Migrar el schema Prisma + regenerar el cliente.
2. **Greppear el enum por nombre** (`BuildType.`, `Role.`, etc.) en todo
   el monorepo. Cada `X !== VALUE` y cada `X === VALUE` que aparezca debe
   re-evaluarse: ¿esa condicional sigue siendo correcta con el nuevo
   valor en juego?
3. **Greppear también los DTOs**: cualquier `@IsIn([...])`, `@IsEnum(...)`,
   o union type `'a' | 'b' | 'c'` que liste valores del mismo dominio
   debe actualizarse en sincronía.
4. **Greppear los frontends**: dropdowns, switches, selectores. El builder
   ya muestra el botón "PWA", pero un futuro tipo podría quedarse fuera.

El patrón es idéntico al de campos opcionales: el compilador deja pasar
omisiones porque no entiende la intención semántica. La única defensa es
el grep manual disciplinado al añadir el valor.

**Verificado en producción 2026-06-01** — síntoma agudo cerrado:
- Commit del fix: `f25ac51` (`fix(backend): exclude PWA from FCM gate`).
- Build de prueba: `a65dd33d-22e0-4595-8f45-18f2e3659cfb` para app
  `2c04d1c2-6679-4e16-9219-e8ce81f544d4`. POST `/builds` → 201 Created,
  transición `QUEUED → PREPARING → BUILDING → COMPLETED` sin caer en el
  throw del gate FCM.
- BD tras COMPLETED: `App.pwaEnabled = true`,
  `App.pwaUrl = https://api.creatu.app/pwa/test-app/`,
  `App.pwaLastDeployedAt = 2026-06-01 06:21:07.762`.
- Worker log clave: `"PWA build completed: https://api.creatu.app/pwa/test-app/"`.

La regla de "auditar condicionales al añadir un valor al enum" queda
fichada para cualquier futuro `BuildType` (DESKTOP_ELECTRON, WEB_BUNDLE,
etc.) y para enums equivalentes (`Role`, `SubscriptionPlan.tier`, etc.).
El refactor de raíz vive en #56 y se ejecutará en su propio diff.

---

### #56 — Helper `isNativeBuild(buildType): boolean` para centralizar gates
**Estado**: RESUELTO 2026-06-02 (commit `b929f30`).

**Resolución**: extraído `appforge-backend/src/build/lib/build-type-traits.ts`
con tres rasgos centrales por lista afirmativa: `countsTowardQuota`,
`requiresAndroidConfig`, `requiresFcmIfPushModulePresent`. Tests unitarios
en `appforge-backend/src/build/__tests__/build-type-traits.spec.ts`
(4 describes, incluido el de drift entre función y array para el `in` de
Prisma). Tres call sites migrados: `subscription.service.ts` (canBuild +
getTenantUsage), `build.service.ts:86` (gate packageName Android),
`build.processor.ts:147` (gate FCM). `isNativeBuild` queda anotado como
comentario reservado en el helper (YAGNI: sin consumidor real hoy).

Lo que NO se tocó y por qué (auditado): el router de dispatch en
`build.processor.ts:224/243` (es `if` de "qué función llamar", no rasgo
booleano), los detalles concretos del pipeline Android en
`build.processor.ts:385+` (versionCode bump, assembleRelease vs
bundleRelease, extensiones de artefacto — distinguir dos tipos
concretos no se beneficia de un helper genérico), mappers/persistencia/
logs (no preguntan categoría).

**Estado original**: OPEN.
**Origen**: Sesión 2026-06-01. Tres bugs del mismo género en el mismo día
(commit `0ae7232` para el DTO `@IsIn`, este commit para el gate FCM en
`build.processor.ts:147`, y el chequeo `androidConfig` preventivo en
`build.service.ts:86` que sí estaba bien pero por la misma frágil razón).
La causa común: cada condicional `buildType !== X` re-encoda implícitamente
el conocimiento "qué builds son nativos / requieren FCM / requieren
keystore / requieren packageName". Cada nuevo valor del enum obliga a
auditar a mano N condicionales dispersas.

**Fix propuesto**: extraer un helper único en
`appforge-backend/src/build/lib/build-type-traits.ts` (o similar):

```ts
import { BuildType } from '@prisma/client';

/** Builds que producen un binario nativo (APK / AAB / IPA). */
export function isNativeBuild(t: BuildType): boolean {
  return t === BuildType.DEBUG
    || t === BuildType.RELEASE
    || t === BuildType.AAB
    || t === BuildType.IOS_EXPORT;
}

/** Builds que requieren FCM/google-services.json para no crashear en
 *  runtime. Excluye DEBUG porque puede correr sin FCM con stub de push.ts. */
export function requiresFcmIfPushModulePresent(t: BuildType): boolean {
  return t === BuildType.RELEASE
    || t === BuildType.AAB
    || t === BuildType.IOS_EXPORT;
}

/** Builds que requieren `App.androidConfig` (packageName, versionCode, etc). */
export function requiresAndroidConfig(t: BuildType): boolean {
  return t === BuildType.DEBUG
    || t === BuildType.RELEASE
    || t === BuildType.AAB;
}

/** Builds que descuentan del límite mensual del plan (`maxBuildsPerMonth`).
 *  Excluye DEBUG (privilegio de pago pero sin coste de cuota) y PWA (gratis,
 *  oferta del plan FREE). Añadido en sesión 2026-06-01; hoy vive como
 *  constante local `QUOTA_COUNTING_BUILD_TYPES` en `subscription.service.ts`
 *  — migra aquí cuando se cree este archivo. */
export function countsTowardQuota(t: BuildType): boolean {
  return t === BuildType.RELEASE
    || t === BuildType.AAB
    || t === BuildType.IOS_EXPORT;
}
```

Refactorizar los call sites:
- `build.processor.ts:147` → `if (hasPushModule && !fcmConfig && requiresFcmIfPushModulePresent(buildType)) throw ...`
- `build.service.ts:86` → `if (requiresAndroidConfig(buildType) && !app.androidConfig) throw ...`
- `subscription.service.ts` → reemplazar `QUOTA_COUNTING_BUILD_TYPES.includes(t)` por `countsTowardQuota(t)` en `canBuild()` y `getTenantUsage()`.
- Cualquier otro `buildType !== X` que dependa de "qué tipo de build es".

**Beneficio**: al añadir un nuevo `BuildType` (e.g. `DESKTOP_ELECTRON`,
`WEB_BUNDLE`), basta con extender los tres helpers en un solo archivo.
Sin grep manual disperso. El compilador catch el `default` faltante si
se usa `switch` exhaustivo internamente.

**Test del fix**: existing build flows (debug + release + pwa) deben
seguir funcionando idénticos. Smoke en VPS tras cada refactor de call
site.

**Por qué no se arregla ahora**: este commit cierra el síntoma agudo
(gate FCM bloqueando PWA). El refactor toca varios sitios y merece su
propio diff revisable. Mezclar refactor con fix rompe la regla "una
variable a la vez". Estimación: 1-2h incluyendo tests y smoke.

**Prioridad**: media. Cada vez que se añada un `BuildType`, el coste de
no haber hecho este refactor se materializa como un puñado de bugs como
los de hoy. Cuando aparezca un cuarto tipo no-Android o un segundo tipo
no-FCM, esto pasa a alta.

---

### #57 — Type `AppInfo` del builder se desincroniza silenciosamente del modelo Prisma `App`
**Estado**: OPEN.
**Origen**: Sesión 2026-06-01, durante Gate 0 del nuevo tab PWA. Al
añadir los campos `pwaEnabled`/`pwaUrl`/`pwaLastDeployedAt` al modelo
Prisma (commits del pipeline PWA) y al endpoint `GET /apps/:id` (que los
expone automáticamente vía spread `{...rest}` sin `select:`), el type
`AppInfo` declarado a mano en
[appforge-builder/src/lib/api.ts](appforge-builder/src/lib/api.ts:108-124)
no se actualizó. Resultado: los tres campos viajaban en el JSON pero
TypeScript no los conocía, así que el código del builder no podía
referenciarlos sin un cast manual. No es bug en runtime — los datos
estaban — pero el frontend "no los veía".

**Diagnóstico**: `AppInfo` es una declaración manual, copia parcial del
modelo Prisma. No hay generación automática ni validación de paridad. El
patrón se repetirá con cualquier campo nuevo que se añada al modelo
`App` (o, por extensión, a cualquier otro modelo cuyo type se replique a
mano en el builder).

**Fix propuesto** — dos caminos posibles, ambos no triviales:

1. **DTO de respuesta explícito en el backend con `class-transformer`**:
   crear `apps/dto/app-response.dto.ts`, marcar el controller con
   `@SerializeOptions({ type: AppResponseDto })`, y exportar el shape
   para que el frontend lo importe (o lo replique con disciplina). El
   beneficio es doble: respuesta predecible + un único sitio del que
   leer la forma del JSON.
2. **Tipo generado por Prisma compartido entre packages**: requiere
   convertir el monorepo a workspaces (yarn/npm/pnpm) y publicar un
   package interno `@appforge/types` con el output de `prisma generate`.
   Más invasivo. Reservar para cuando el dolor justifique el cambio
   estructural.

**Test del fix**: añadir un campo al modelo `App`, sin tocar
`AppInfo`. Con DTO explícito o tipo compartido, el frontend debería
verlo automáticamente (o el TypeScript debería protestar señalando la
desincronización).

**Por qué no se arregla ahora**: el fix de hoy (3 líneas a `AppInfo`)
cierra el síntoma agudo para PWA. El refactor estructural toca decisiones
de monorepo / arquitectura del DTO de respuesta y merece su propio diff.
Mezclarlo con la feature PWA rompe "una variable a la vez".

**Prioridad**: media-baja. No morderá hasta el próximo campo nuevo que
el builder quiera usar. Pero cuando ese momento llegue, el diagnóstico
costará tiempo precisamente porque no hay error — solo silencio.

---

### #58 — Service worker generado puede resolver `respondWith(undefined)` en modo offline sin cache
**Estado**: OPEN.
**Origen**: Sesión 2026-06-02, smoke de Tarea 4 (subdominio
`apps.creatu.app`). El navegador emitió `A ServiceWorker passed a
promise to FetchEvent.respondWith() that resolved with 'undefined'` en
la primera carga tras la migración. La causa raíz inmediata era CORS
(commit `d92e2ec` la cerró), pero el comportamiento del `.catch` queda
abierto como debilidad propia del SW.

**Diagnóstico**: el handler `fetch` generado por
`generateServiceWorker()` en `appforge-backend/src/build/build.processor.ts`
hace:

```js
if (url.pathname.startsWith('/apps/') || ...) {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
}
```

`caches.match(e.request)` resuelve a `undefined` cuando no hay match.
`respondWith(undefined)` es inválido — el navegador lo loguea como
warning y deja la request en limbo. En el caso de Tarea 4 fue
consecuencia del CORS (el `fetch` fallaba, entraba al `.catch`, no
había cache para datos), pero el patrón sigue siendo frágil para
escenarios legítimos: usuario offline + request a una URL nunca
cacheada (e.g. una primera visita a un módulo concreto).

**Fix propuesto** (en `generateServiceWorker`):

```js
e.respondWith(
  fetch(e.request).catch(() =>
    caches.match(e.request).then((r) =>
      r ?? new Response('Network error and not in cache', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      })
    )
  )
);
```

Mantiene el cache-on-miss como primera línea, pero garantiza una
Response real en el peor caso. La UI del runtime puede decidir cómo
renderizar el 503 (mensaje de "sin conexión" más útil que un fetch
silencioso que nunca resuelve).

**Test del fix**: regenerar la PWA, simular offline en DevTools
(Network → Offline), navegar a una ruta `/apps/...` no cacheada
previamente, confirmar que la respuesta es 503 explícita en vez de
fetch colgado.

**Por qué no se arregla ahora**: el síntoma agudo del smoke quedó
cerrado al arreglar CORS (commit `d92e2ec`). El comportamiento del SW
es debilidad latente que solo se manifiesta en modo offline con request
no cacheada — escenario marginal. Además tocar `generateServiceWorker`
implica regenerar la PWA para validar (build real, no test unitario),
así que merece su propio commit. Estimación: 30 min incluyendo el
smoke offline.

**Prioridad**: baja. Si más adelante se trabaja la experiencia offline
de las PWAs en serio, sube a media — un 503 explícito es la base
mínima para que la UI pueda mostrar "sin conexión" en condiciones.

---

### #59 — White-label de páginas end-user (StampPage + AppUserResetPasswordPage)
**Estado**: OPEN.
**Origen**: Sesión 2026-06-05, rediseño visual del builder. Identificado al planificar
el bloque "pages secundarias" — se decidió dejar estas dos páginas FUERA del rediseño
porque tokenizarlas al `--primary` del builder sería el error opuesto pero igual de
grave que el bug actual.

**Problema**: las pantallas que sirve la plataforma a usuarios finales de apps de
clientes (`appforge-builder/src/pages/StampPage.tsx`, `appforge-builder/src/pages/
AppUserResetPasswordPage.tsx`, y posiblemente `OrderPage`/`BookingPage` aunque estas
usan tokens del cliente parcialmente) tienen colores hardcodeados (`indigo-600`,
`indigo-500`, gradientes `indigo-50` → `purple-50`, etc.) en vez de heredar los
design tokens del cliente. Un usuario final de "Cafetería Juan" que abre la app y
acaba en una de estas páginas ve indigo en lugar del azul/verde de la cafetería,
rompiendo la promesa de white-label.

El caso de `AppUserResetPasswordPage` es especialmente grave: un usuario recibe email
de reset desde la app de "Cafetería Juan", hace click, llega a una URL servida por
nuestra plataforma. Si ve indigo AppForge:
- No reconoce la marca de la cafetería → fricción.
- Si conoce AppForge, descubre que la app es servida por terceros → revelación de
  marca subyacente, anti-white-label.

**Por qué no se resolvió en el rediseño visual**: tokenizar estas páginas al `primary`
AppForge sería el error opuesto pero igual de grave que el bug original — en vez de
azul random de Tailwind tendrían el indigo de AppForge clavado, lo cual rompe la
promesa de white-label de forma más visible (porque ahora la marca AppForge sería
*explícita* en la página, no accidental).

**Trabajo necesario**:
- En el mount de cada página pública (`StampPage`, `AppUserResetPasswordPage`):
  fetchear los `designTokens` del cliente vía `appId` (que ya está en la URL).
- Aplicar tokens al DOM via `applyTheme.ts` (`appforge-builder/src/lib/niche-templates/
  applyTheme.ts`) o equivalente — el mismo sistema que ya usa el `RuntimeComponent` de
  cada módulo para respetar la paleta del cliente.
- **Precisión técnica clave (no confundir)**: las páginas end-user deben leer
  `var(--color-primary)` del cliente (las que genera `applyTheme.ts` a partir de los
  design tokens del cliente), **NO `var(--primary)` del builder** (que es el indigo
  de marca AppForge declarado en `appforge-builder/src/index.css`). Son dos sistemas
  de variables distintos con nombres parecidos — confundirlos reintroduciría el bug
  exacto que esta deuda intenta resolver. La diferencia: prefijo `--color-*` =
  paleta del cliente; sin prefijo (`--primary`, `--accent`, etc.) = chrome AppForge.
- Reemplazar los `indigo-*` / `blue-*` hardcoded por las CSS vars que `applyTheme`
  genera (e.g. `var(--color-primary)` del cliente).
- Tests E2E con dos clientes distintos verificando que cada uno ve su color de marca,
  no el de AppForge ni el del otro cliente.

**Bloquea**: beta. Compromete la promesa de white-label que es valor central del
producto. Mientras esto siga abierto, mejor no hacer demo de StampPage o del flujo
de reset a clientes potenciales — verán indigo AppForge donde debería verse su marca.

**Prioridad**: alta antes de beta. Media en el corto plazo si no se hace demo
white-label en las próximas semanas.

---

### #60 — Currency hardcoded `€` en cuerpo de emails de orders

**Estado**: CLOSED. Fix aplicado tras detección durante Fase 1.1 — el helper
`resolveCatalogCurrency` se reusa en `sendOrderEmails` y se pasa como campo
`currency` a `renderCustomerEmail` y `renderMerchantEmail`. Los cuatro
`€` literales del HTML de emails sustituidos por la variable. Mismo
comportamiento que el helper en el dashboard: cuando hay catálogo con
currency, se respeta; cuando no, fallback `€`. Coherencia visual cliente +
app + email restaurada.
**Origen**: Detectado durante medición de side-effects de orders en Fase 1.1
(commit backend `1c6680e` añadió `resolveCatalogCurrency` para el dashboard de
pedidos, pero el helper no se aplica al renderizado HTML de los emails).

**Problema**: en `appforge-backend/src/orders/orders.service.ts:230-231` y `:236`,
el cuerpo del email enviado al crear un pedido tiene el símbolo `€` hardcoded:

```ts
`<td>${item.price.toFixed(2)}€</td>`
`<td>${(item.price * item.quantity).toFixed(2)}€</td>`
// ...
const totalFormatted = Number(order.total).toFixed(2);
// luego concatenado con `€` en el HTML del email
```

Y el método `sendOrderEmails` NO lee el currency del schema del módulo catalog
(no usa `resolveCatalogCurrency`).

**Consecuencia visible**: un cliente que cobra en dólares (como el cliente de
prueba que mostró `24.99$` en el dashboard de pedidos tras Fase 1.1) envía a
sus usuarios un email "Pedido confirmado" que dice `24.99€`. Dashboard y app
muestran `$`, email muestra `€`, mismo pedido. Inconsistencia visible al
usuario final, no solo interna.

**Por qué no se resolvió en Fase 1.1**: el scope era el dashboard del cliente
(la página de admin de pedidos). Los emails son side-effect del create de Order
y conviven en el mismo service pero pertenecen al ámbito "comunicación con el
usuario final", no "admin del cliente". Mezclar las dos cosas en el mismo
commit habría inflado el scope. Pero está claramente identificado, y la
solución es trivial.

**Trabajo necesario** (~3 líneas):
- En `sendOrderEmails`, llamar `this.resolveCatalogCurrency(appId)` antes del
  bucle de `itemsHtml`.
- Sustituir los `€` literales por la variable.
- Variable también para `totalFormatted`.

**Bloquea**: nada técnicamente, pero la inconsistencia es visible al usuario
final del cliente — cobrar en dólares y enviar email en euros es mala
imagen. Candidata a fix rápido cuando se toque el backend de orders por
cualquier otro motivo, no requiere PR dedicado.

**Prioridad**: baja en backlog, alta si llega un cliente real cobrando en
moneda distinta de `€` y se queja del email.

---

### #61 — Cascada de SocialComment al borrar un SocialPost deja reports de comentarios huérfanos

**Estado**: CLOSED 2026-06-11, confirmado por smoke en producción
(commit 96e021a, Fase 1.4-backend). Cerrado por ambas puertas (moderador
y autor):

- `moderateDeletePost` de social (modificación retroactiva del commit 4088b79
  de 1.3a) y `deleteOwnPost` de social usan ahora **interactive transaction
  de Prisma** (callback con `tx`) para que el `findMany` de commentIds, el
  `delete` del post y el `updateMany` de reports vivan en la misma transacción
  secuencial. El `updateMany` amplía su filtro a `targetType: { in:
  ['social_post','social_comment'] }` y `targetId: { in: [postId, ...commentIds] }`.
- La race window (commentId creado entre `findMany` y `delete` en transacciones
  separadas) queda cerrada por construcción — no por nivel de aislamiento, sino
  porque ambas operaciones viven dentro del mismo bloque transaccional. El
  default READ COMMITTED de Postgres es suficiente; no se sube a SERIALIZABLE.
- Fan ya estaba cerrado por construcción en 1.4a — FanPost no tiene entidad
  hija con `onDelete: Cascade`.

**Validación del smoke**: paso 4 del smoke de 1.4-backend dio `resolved=t`
sobre el SELECT directo en BD, validando la reescritura de `moderateDeletePost`
a callback (re-confirma que el caso simple de 1.3a sigue funcionando tras la
modificación retroactiva). El paso 3 (post con comentarios reportados, social)
queda probado por construcción — el código es espejo exacto del paso 4
validado, no añade rutas distintas.

Nota de mantenimiento: el interactive transaction tiene timeout default de 5s.
Si apareciera P2028 al borrar posts con cientos de comentarios+likes que la BD
cascadea, la mitigación es pasar `{ timeout: <ms> }` como segundo arg al
`$transaction`. No tocar antes — sería optimización prematura.

**Estado original (histórico)**: OPEN.
**Origen**: Detectado en review de Fase 1.3a (commit `4088b79`, que añadió la
cascada `delete + updateMany(reports resolved:true)` en `moderateDeletePost` y
`moderateDeleteComment`).

**Problema**: el modelo `SocialComment` tiene `postId @relation(fields: [postId],
references: [id], onDelete: Cascade)` ([schema.prisma:607](appforge-backend/prisma/schema.prisma#L607)).
Cuando el moderador llama `moderateDeletePost(postId)`:
- El post se borra ✓
- Sus comentarios se borran en cascada por la BD ✓ (sin tocar código)
- Los reports de tipo `social_post` con ese `targetId` se resuelven por nuestro
  `updateMany` ✓ (commit `4088b79`)
- **PERO** los reports de tipo `social_comment` cuyos `targetId` apuntan a
  comentarios que la BD acaba de borrar en cascada **NO se resuelven**. Quedan
  huérfanos en la cola de moderación.

**Consecuencia visible**: el moderador ve reports en la página de moderación
de social wall que apuntan a comentarios que ya no existen. Si clickea
"Eliminar contenido" en uno de esos, `moderateDeleteComment` devuelve 404
(comentario no encontrado). El `onActionError` cableado al banner del Shell
muestra el error, así que no es fallo silencioso — pero es UX confusa.

**Workaround actual**: el botón "Resolver" del report sigue funcionando (solo
marca `resolved: true`, no toca el target). El moderador puede limpiar los
huérfanos a mano clickeando Resolver.

**Por qué no se cerró en Fase 1.3a**: requiere la combinación específica de
borrar un post (no un comentario directo) cuando un comentario hijo tiene
report pendiente. Caso borde de segundo orden, no regresión (hoy ya pasa,
peor — sin la cascada de `4088b79` ningún report se resuelve solo). Ampliar
el método por un caso de baja frecuencia mientras el moderador tiene salida
(Resolver) ensanchaba el commit.

**Trabajo necesario** (~4 líneas en `moderateDeletePost` de
`social-wall.service.ts`):
- Antes de la `$transaction`, `findMany` los `id`s de SocialComment del post a
  borrar.
- Incluir en el `updateMany` una segunda condición que también resuelva
  `{ targetType: 'social_comment', targetId: { in: commentIds } }`.

Quedaría como una sola `$transaction` con tres operaciones (delete post +
updateMany social_post + updateMany social_comment para los commentIds del
post).

**Bloquea**: nada. UX confusa solo en el caso borde descrito.

**Prioridad**: baja en backlog. Subir a media si llega cliente con muro
activo + uso intensivo de reports + queja sobre reports huérfanos.

**Alcance**: `fan_post` cerrado por construcción en Fase 1.4a — FanPost no
tiene entidad hija con `onDelete: Cascade`, así que no genera huérfanos.
#61 permanece abierto solo para `social_comment` tras borrado del SocialPost
padre.

### #62 — Builder bundle 1.76 MB sin code-splitting

**Estado**: OPEN
**Origen**: Observado durante deploy de Fase 1.5a (commit `bdf68dc`,
2026-06-14) en el output de `npm run build` de `appforge-builder`.

**Descripción**: `vite build` emite el bundle principal en
`dist/assets/index-*.js` con tamaño 1.76 MB (≈420 KB gzip), excediendo el
umbral por defecto de Vite (500 KB sin gzip) y disparando el warning `(!)
Some chunks are larger than 500 kB after minification`. La causa es que todas
las páginas del builder se importan de forma **estática** en
`appforge-builder/src/App.tsx` (~25 imports tipo
`import { BookingsPage } from './pages/BookingsPage'`), así que React Router
no puede partir el grafo en chunks por ruta.

**Impacto**:
- Carga inicial del panel descarga todo el JS de páginas que el usuario
  probablemente no va a abrir en esa sesión (Coupons, Loyalty, PWA settings,
  Stripe billing, etc.).
- En conexiones lentas cada KB cuenta. Hoy con un único cliente y volumen
  bajo no se nota; con carga real + más páginas admin a futuro, sí.
- El warning aparece en el output del build cada deploy. Ruido visual que
  enmascara warnings nuevos que sí importen.

**Crecerá según**: cada nueva página admin que añadamos en Fase 2/3 (Coupons
admin, Loyalty admin, Push history, News/Events admin) suma a este mismo
chunk. Más urgente a más páginas.

**Fix**: pasar las rutas a `React.lazy(() => import(...))` + `<Suspense>` en
`App.tsx`. Vite emite un chunk por ruta automáticamente. Las rutas críticas
(Dashboard, Login) pueden quedarse estáticas para que la primera vista no
muestre un fallback.

Cuidado con el patrón de export: hoy las páginas usan `export const X`, no
`export default`. El wrapper típico
`lazy(() => import('./pages/X').then(m => ({ default: m.X })))` mantiene la
compatibilidad sin tocar las páginas. Alternativa más invasiva: re-exportar
cada página como default (~25 archivos).

Implicación operacional: si se hace, el grep de testigos al desplegar deja
de apuntar SOLO a `dist/assets/index-*.js` y debe ampliarse a
`dist/assets/*.js` — el string del componente vivirá en el chunk de su
ruta, no en el bundle principal.

**Esfuerzo estimado**: 1-2 horas. Conversion mecánica + un smoke por ruta
para confirmar que el fallback de Suspense aparece <100ms y la página
carga.

**Prioridad**: baja hoy (panel funciona, deploy funciona). Subir a media
cuando se añadan las páginas admin de Fase 2 (Coupons + Loyalty + Catalog
products) — es el momento natural antes de que el chunk siga creciendo.

**No bloquea**: ninguna fase del roadmap actual. Es deuda de tamaño de
bundle, no de funcionalidad.

### #63 — Reactivación CANCELLED→CONFIRMED deja la reserva en estado inconsistente

**Estado**: OPEN
**Origen**: Detectado durante la medición de Fase 1.5b (vaciado del bloque
residual de `booking.module.tsx`), 2026-06-14. El bloque residual ofrecía
un botón "Reactivar" (CANCELLED → CONFIRMED) que se borra con el resto
del bloque. Revisión del backend de `updateStatus`
([booking.service.ts:285-345](appforge-backend/src/booking/booking.service.ts#L285-L345))
confirmó que la operación está rota por tres caminos independientes, ninguno
mitigable desde el frontend. Eliminar el botón en 1.5b es "dejar de exponer
un bug"; restaurar reactivación de verdad es trabajo de backend.

**Problema 1 — Metadata de cancelación colgando**:
`updateStatus` solo escribe `cancelledAt` y `cancelledBy` cuando
`status === BookingStatus.CANCELLED`
([service.ts:306-309](appforge-backend/src/booking/booking.service.ts#L306-L309)).
Nunca los limpia. Una reserva reactivada queda en BD:

```
status      = CONFIRMED
cancelledAt = <fecha vieja>
cancelledBy = 'MERCHANT' | 'CUSTOMER'
```

Estado incoherente. Pista que enmascara los otros dos problemas.

**Problema 2 — Recordatorios desprogramados**:
Al cancelar, [service.ts:317-323](appforge-backend/src/booking/booking.service.ts#L317-L323)
llama a `cancelReminderJobs` que elimina los BullMQ `booking-<id>-24h` y
`booking-<id>-2h`. Reactivar **no los re-programa**. La reserva queda
CONFIRMED pero no se enviará el aviso de 24h ni el de 2h. Reduce
no-shows es el caso de uso principal de booking; sin recordatorios la
reactivación "funciona" pero el cliente puede no aparecer.

**Problema 3 — Cliente no notificado**:
El push FCM solo dispara dentro de `STATUS_PUSH_MAP`
([service.ts:22-28](appforge-backend/src/booking/booking.service.ts#L22-L28)),
que solo cubre `CANCELLED`. La app del cliente sigue mostrando la reserva
como cancelada hasta que entre al detalle y refetche.

**Workaround actual**: ninguno. Por eso "Reactivar" no se porta a
BookingsPage en 1.5a/b: portarlo expondría el bug en lugar de cerrarlo.

**Defensa colateral en BookingRow (Fase 1.5 commit 2, cancelledBy chips)**:
los chips "por cliente" / "por ti" que renderizan `cancelledBy` se gatean
por `booking.status === 'CANCELLED'`, no solo por el valor de
`cancelledBy`. Si en producción aparece una reserva con `cancelledBy`
colgando en CONFIRMED por este bug, el chip **no se pinta** y el badge
"Confirmada" no entra en contradicción visual con "por ti". El bug sigue
en BD; el frontend no lo expone.

**Fix correcto** (~30 líneas backend, no tocar antes de necesitarlo):

1. En `updateStatus`, cuando `status === CONFIRMED && previousStatus ===
   CANCELLED`, limpiar metadata: `cancelledAt = null`, `cancelledBy = null`.
2. Re-llamar a `scheduleReminders(booking, config)` tras el `update` cuando
   se reactiva.
3. Añadir notificación al cliente para la transición CANCELLED→CONFIRMED.
   `STATUS_PUSH_MAP` hoy es por `status` final; necesitará incluir contexto
   de transición, o un check directo en `updateStatus`.
4. Una vez el backend esté limpio, añadir 5ª RowAction a BookingsPage con
   `id: 'reactivate'`, `isAvailable: b.status === 'CANCELLED'`. ~10 líneas.

**Esfuerzo estimado**: 1-2 horas backend + ~10 líneas frontend. Incluye
tests del flujo cancel → reactivate (limpieza de metadata, re-schedule
de jobs, push enviado).

**Prioridad**: baja por defecto. Subir a media cuando llegue cliente real
que cancele por error y pida deshacerlo. Hasta entonces el cliente puede
crear una reserva nueva — peor UX, pero el dato no se corrompe.

**No bloquea**: ninguna fase del roadmap actual. Es feature limpia
ausente, no feature rota expuesta al usuario (1.5b la oculta).

### #64 — Currency hardcoded `€` en CouponsAdminPage

**Estado**: OPEN
**Origen**: Fase 2.1 commit 3 (CouponsAdminPage), 2026-06-15.

**Descripción**: el módulo `discount_coupon` expone una sección "Opciones
de visualización" con selector de 30+ monedas (`data.currency`). El
runtime y el `PreviewComponent` respetan esa configuración. Pero
`CouponsAdminPage` ignora el config del módulo y muestra todos los
descuentos formateados con `€` hardcoded
(`formatDiscount(coupon, '€')`).

**Síntoma**: cliente que configura su módulo en USD/MXN/GBP verá los
descuentos formateados correctamente en su app (runtime + preview), pero
inconsistentemente con `€` en el panel de administración de cupones del
builder.

**Mitigación parcial ya hecha**: `formatDiscount` en
`appforge-builder/src/lib/coupon-helpers.ts` ya acepta el parámetro
`currency` (con default `€`). El fix futuro solo necesita pasar la
currency real en vez del default — no hay que tocar la firma del helper.

**Por qué se aceptó así en v1**: leer la currency configurada requiere
una de tres rutas posibles: (a) endpoint backend nuevo de stats que
incluya currency (no existe hoy); (b) la página fetcha el schema completo
de la app via `getApp` y busca el config del módulo `discount_coupon`
(acoplamiento desde la página al schema del builder); (c) backend
devuelve currency en cada `DiscountCoupon` (cambio de contrato del
endpoint). Las tres son scope ajeno a Fase 2.1.

**Una opción de fix** (no decidida — cuando llegue el momento, se mide y
se decide entre las tres rutas, no se hereda este comentario): (a)
endpoint nuevo `GET /apps/:appId/coupons/stats` que devuelva `{ currency,
totalCoupons, activeCoupons, totalRedemptions }`, y la página pasa
`currency` a `formatDiscount`. Aprovecharía para mostrar stats cards
arriba de la página (hoy descartadas por el mismo motivo: no hay
endpoint).

**Patrón ya documentado en otra superficie**: ver [[#60]] — currency
hardcoded `€` en cuerpo de emails de orders. Es la misma deuda
conceptual aplicada a otro consumidor; el fix global debería resolver
ambos casos cuando se aborde.

**Esfuerzo estimado**: ~1h por la ruta (a) (endpoint backend + fetch en
página + paso a `formatDiscount`).

**Prioridad**: baja hoy (1 cliente, currency `€`, sin impacto visible).
Subir a media cuando aparezca cliente con currency ≠ `€`.

**No bloquea**: ninguna fase del roadmap actual.

### #65 — `ConfirmDialog` usa `aria-labelledby` con ID string fijo (HTML potencialmente inválido)

**Estado**: OPEN
**Origen**: Detectado durante la verificación de `useConfirm` con
múltiples instancias en Fase 2.1 commit 3 (CouponsAdminPage),
2026-06-15.

**Descripción**: `appforge-builder/src/components/admin/ConfirmDialog.tsx`
([L50](appforge-builder/src/components/admin/ConfirmDialog.tsx#L50))
declara `aria-labelledby="confirm-dialog-title"` con un string literal
fijo, y el `<h2>` del título usa `id="confirm-dialog-title"`. Si dos
`ConfirmDialog` estuvieran abiertos simultáneamente, habría dos elementos
DOM con el mismo `id`, lo cual es HTML inválido y rompe screen readers
(no sabe a qué título asociar el dialog activo).

**Hoy no rompe nada**: el overlay modal de `ConfirmDialog`
(`fixed inset-0 z-50 bg-black/40`) cubre toda la pantalla y bloquea
clicks fuera del dialog activo. Físicamente es imposible que el usuario
inicie un segundo confirm mientras el primero está abierto — el botón
que dispararía el segundo no es clickeable. Por eso `useConfirm` con
N instancias en `CouponsAdminPage` (una por `CouponRow` + una en
`WorkflowInbox`) funciona sin colisión real.

**Por qué registrarla aun así**: es defensa preventiva. Si en el futuro
se introduce un patrón que rompa la invariante "un confirm activo a la
vez" — por ejemplo, un drawer no-modal con un confirm dentro mientras
otro confirm modal está abierto — la colisión de IDs sale a la luz como
bug de a11y silencioso. Y el coste de arreglarlo ahora es trivial.

**Patrón correcto ya aplicado en otra pieza Fase 0**:
`FormModal.tsx` (commit `53d0a82`, Fase 2.1) usa `useId()` de React 18
para el `aria-labelledby` por exactamente esta razón. La misma técnica
aplica a `ConfirmDialog.tsx`.

**Fix** (~5 líneas):

```tsx
// dentro de useConfirm o de ConfirmDialog
const titleId = useId();
...
<div role="dialog" aria-modal="true" aria-labelledby={titleId}>
  <h2 id={titleId}>{config.title}</h2>
  ...
</div>
```

**Esfuerzo**: 15 minutos (edición + tsc + smoke del confirm en cualquier
página que lo use).

**Prioridad**: baja. Patrón de Fase 0, no bloqueante para Fase 2 o
posteriores. Buen candidato para "calm window" entre fases.

**No bloquea**: ninguna fase. Es higiene a11y en una pieza compartida.

### #66 — `RowAction.onClick` debería aceptar `void | Promise<void>`

**Estado**: OPEN
**Origen**: Fix `6ee3160` (Fase 2.1), 2026-06-15. El build de
Fase 2.1 falló con `tsc -b` porque `RowAction.onClick` de la acción
'edit' en `CouponsAdminPage` era síncrono (solo abre el FormModal con
`openEdit(c)`, sin `await`). El fix fue marcar la función como
`async (c) => { openEdit(c); }` — la promesa resuelve de inmediato,
satisface el contrato sin cambiar comportamiento, pero queda un
`async` aparente sin `await` que confunde al lector.

**Problema de contrato**:
`appforge-builder/src/components/admin/types.ts:25` declara
`onClick: (item: T) => Promise<void>;`. Esto fuerza a todas las
acciones a ser async, incluso las **legítimamente síncronas**:

- "Editar X" → abre un modal o navega. No hay I/O.
- "Ver detalles" → expande un acordeón o cambia state local.
- "Copiar al portapapeles" → llamada síncrona a Clipboard API (o
  async pero el caller no necesita esperarla).

Hoy todas se ven obligadas a marcarse `async` y devolver
`Promise<void>` por contrato, no por necesidad.

**Patrón correcto ya aplicado en otra pieza Fase 0**:
`FormModal.onSave` (commit `53d0a82`) usa `() => void | Promise<void>`
por exactamente esta razón — el caller decide si necesita ser async
en función de qué hace en el handler, no por imposición del tipo.

**Fix** (cambio de una palabra en `types.ts`):

```ts
// antes
onClick: (item: T) => Promise<void>;

// después
onClick: (item: T) => void | Promise<void>;
```

`WorkflowInbox` consume `onClick` en `runAction` con
`await action.onClick(item)` ([WorkflowInbox.tsx:88](appforge-builder/src/components/admin/WorkflowInbox.tsx#L88)).
`await` sobre un valor síncrono (`void`) es válido y se comporta
correctamente — no rompe el callsite.

Tras el fix, el `async` aparente del 'edit' de CouponsAdminPage
(`6ee3160`) puede revertirse a su forma natural:

```ts
// antes (con #66 cerrado, vuelve a esto):
onClick: (c) => openEdit(c),
```

**Por qué no se arregla en Fase 2.1**: tocar `types.ts` es cambiar
contrato de una pieza Fase 0 compartida por **todos los
consumidores de RowAction**: WorkflowInbox, BookingsPage, OrdersAdminPage,
ContactInboxPage, SocialWallModerationPage, FanWallModerationPage,
CouponsAdminPage. El cambio es ampliar tipo (`Promise<void>` →
`void | Promise<void>`), compatible hacia atrás — código existente que
devuelve `Promise<void>` sigue cuadrando. Pero re-verificar los seis
consumidores y correr `npm run build` para cada uno es trabajo
de su propio gate, no un cuelgue del commit de Coupons.

**Cross-refs**:
- Síntoma vivo en commit `6ee3160` (CouponsAdminPage.tsx:185+, el
  `async` aparente con su comentario apuntando aquí).
- Patrón correcto en `FormModal.onSave` desde `53d0a82`.
- Tema relacionado de higiene de tipos Fase 0: ver [[#65]] (aria-id
  fijo en ConfirmDialog). Los dos son buenos candidatos para una
  "calm window" entre fases que limpie Fase 0.

**Esfuerzo**: 30 minutos. Edición de una palabra en `types.ts` +
`npm run build` para verificar los seis consumidores + revertir el
`async` aparente de CouponsAdminPage.

**Prioridad**: baja. Hoy no rompe nada (`async` aparente funciona
correctamente). Subir a media cuando dos o más páginas más necesiten
RowActions síncronas y la deuda visual se acumule.

**No bloquea**: ninguna fase. Es higiene de contrato en pieza Fase 0.

### #67 — `npm audit` del backend reporta 60 vulnerabilidades (2 críticas, 16 high) + node engine mismatch

**Estado**: EN PROGRESO — resuelto en rama `chore/security-audit` (60 → 1
low). Pendiente deploy Fase C + smoke FCM dryRun en VPS para cierre. El
residual cross-project (3 árboles) va a [[#68]].
**Origen**: Detectado durante deploy de Fase 2.3 backend (commit
`ea44cfb`) en VPS, 2026-06-16. El `npm install` previo al `nest build`
reportó:

```
60 vulnerabilities (2 low, 40 moderate, 16 high, 2 critical)
npm warn EBADENGINE Unsupported engine {
  package: 'file-type@22.0.0',
  required: { node: '>=22' },
  current: { node: 'v20.20.2', npm: '10.8.2' }
}
```

**Por qué NO se arregla en caliente con `npm audit fix --force`**:
ese comando aplica breaking changes (major bumps) sin distinguir cuáles
afectan al codepath productivo. En producción real puede romper imports,
cambiar firmas de APIs, alterar comportamientos sutiles, sin warning.
Es exactamente el tipo de cambio que necesita ventana programada + plan
de rollback + smoke completo post-update.

**Plan recomendado** (no se ejecuta ahora, queda registrado para
calm window):

1. `cd appforge-backend && npm audit > audit-report.txt` — reporte
   detallado con paquetes, CVEs y rutas de dependencia.
   **`audit-report.txt` NO se commitea** — es artefacto temporal, va a
   `.gitignore` o se borra tras el triage. No queremos rastros de CVE
   IDs en el repo.
2. Triage en este orden:
   - **2 críticas** primero. Identificar paquete + CVE + si update minor
     resuelve (no breaking).
   - **16 high** después. Mismo triage.
   - **40 moderate + 2 low** al final, agrupadas.
3. Para cada vuln que se resuelva con minor/patch bump: aplicar y correr
   `npm run build` + test e2e clave (auth + un endpoint admin) en local.
4. Para las que requieran major bump: estudio caso por caso. Algunas
   pueden ser deps transitivas no usadas directamente (resolver vía
   `overrides` en `package.json` sin reescribir código). Otras
   requerirán refactor.
5. Deploy con ventana programada y plan de rollback: snapshot del
   `package-lock.json` antes, commit aislado del update, smoke de todos
   los endpoints admin críticos tras el reload.

**Node engine mismatch (`file-type@22.0.0`)**: la dep requiere node >=22
pero VPS corre v20.20.2. Hoy es warning, no error. El paquete funciona
en v20 hasta que use alguna API que solo existe en v22. Dos caminos:
(a) pin `file-type` a la última versión que soporta node 20; (b) upgrade
de node en VPS a v22 LTS. (b) es más limpio pero requiere coordinación
con otras deps del runtime y testing exhaustivo. (a) es la mitigación
rápida. **No es bloqueante hoy**, pero anotar para la misma ventana del
audit fix.

**Esfuerzo estimado**: 2-4 horas para triage + aplicar las que son
minor/patch + verificar. Las que requieran major bump se estiman caso
por caso tras el triage inicial.

**Prioridad**: **alta** — 2 críticas + 16 high es señal real, no ruido.
Pero **no bloqueante** de Fase 2/3 del roadmap (los endpoints nuevos
funcionan correctamente). Programar **antes de aceptar primer cliente
real con datos sensibles** en producción.

**No bloquea**: ninguna fase del roadmap actual.

**Conexión conceptual con [[#11]]** (No automated security patch
monitoring): ambos pertenecen a la familia "seguridad — patches y
deps", pero la conexión es conceptual, no funcional directa.
`unattended-upgrades` (que propone #11) parchea el OS, NO resuelve
`npm audit`. Si #11 se cierra con una pipeline de monitorización
periódica, **podría extenderse** a incluir `npm audit` semanal como
parte del ciclo, lo que naturalmente atajaría futuras instancias de
este tipo de deuda. Pero #67 hay que resolverlo manualmente la primera
vez, no automatizable de entrada.

**Progreso 2026-06-16** (rama `chore/security-audit`, no en main):
- T1-backend (commit `7ee3011`): 12 overrides → 60 → 24 (0C / 9H / 14M / 1L)
- T2-backend (commit `6876d0a`): bumps directos minor/patch
  (`@nestjs/core` 11.0.1→11.1.27, `@nestjs/platform-express` 11.0.1→11.1.27,
  `@nestjs/serve-static` 5.0.4→5.0.5, `@nestjs/cli` 11.0.0→11.0.23,
  `@nestjs/schematics` 11.0.0→11.1.0, `prisma` 6.19.2→6.19.3,
  `nodemailer` 8.0.3→8.0.11, `sanitize-html` 2.17.2→2.17.5,
  `uuid` 13.0.0→13.0.2) + 8 overrides extra (cluster uuid anidado +
  postcss + fast-xml-parser/builder + brace-expansion@{1,2,5}) → 24 → 1
  (0C / 0H / 0M / 1L)
- Poda overrides (commit `f13a784`): 20 → 6 load-bearing.
  Quitar el resto resuelve a versión parcheada por newest-in-range del
  rango — confirmado con `npm install` + `npm audit` + smoke FCM offline.
  Audit estable en 1 low.
- Smoke FCM offline OK: `firebase-admin` → `@grpc/grpc-js@1.14.4` →
  `protobufjs@7.6.4` → `node-forge@1.4.0` cargan; `app.messaging()`
  instancia; `.send`/`.subscribeToTopic` accesibles.
- Smoke arranque NestJS local diferido al VPS (Postgres/Redis no
  disponibles localmente).

**Residual upstream → [[#68]]**: `@babel/core <=7.29.0` (low, sin fix
upstream). Es cross-project (backend + builder + runtime), no
overrideable, no específico de #67.

**Node engine mismatch (`file-type@22.0.0`)**: sigue abierto sin tocar.
No es vulnerabilidad — es warning EBADENGINE. Subir node VPS a v22 LTS
o pinear `file-type` a versión que soporta node 20. Fuera del alcance
de esta ventana de seguridad.

**Cierre Fase C (2026-06-16)**:

Validación en VPS tras `git pull` + `npm ci` en los 4 proyectos:

1. **Lock contract respetado** — `npm ci` reproduce exactamente las
   versiones medidas en seco. Audit por proyecto coincide con la rama:
   - backend: 1 low (= [[#68]])
   - builder: 3 low (= [[#68]] + [[#70]])
   - admin: 0 vulnerabilities
   - runtime: 5 (4 high build-tools = [[#69]] + 1 low [[#68]])

2. **Builds frontends verdes y nginx sirviendo los hashes nuevos**:
   - builder `index-DKzGONKM.js` (vite@8.0.16) — servido en
     `https://app.creatu.app/` confirmado por curl
   - admin `index-Ds_tXISc.js` — servido en `https://admin.creatu.app/`
     confirmado por curl

3. **Backend arranque limpio tras `pm2 reload appforge-api`**:
   `Nest application successfully started +138ms` con RouterExplorer
   mapeando todas las rutas (incluidas las nuevas de Fase 2.3
   loyalty). **Cero stack trace de protobufjs/grpc/node-forge** —
   confirma que el path de carga del cluster firebase resuelto por
   newest-in-range (tras la poda de los pins de T1) funciona en
   producción real. Este es el primer árbitro de la poda: el arranque
   no rompe.

4. **Smoke FCM dry-run real DIFERIDO condicional** (no saltado):
   `fcm.service.ts` lee credenciales de `PlatformFcmConfig` en la DB,
   no de `.env`. En este entorno de producción la tabla está vacía —
   FCM no está activado todavía (sin proyecto Firebase configurado).
   Consecuencia: no hay forma de ejecutar `messaging().send(msg,
   dryRun=true)` contra Google con creds reales desde aquí. Tampoco
   hay usuarios end-user recibiendo push hoy que pudieran romperse
   por la poda.

   La validación de la cascada de carga (protobufjs/grpc/node-forge
   instancian y `messaging()` se accede) ya pasó en seco en local
   antes de cada commit (smoke FCM offline en T1, T2 y poda). La
   pieza que falta —que el `send()` con dryRun serialice y mande
   contra Google con red real— **queda como gate pendiente para
   cuando se configure Firebase en producción**, no como saltado.

   **TODO de cierre real**: cuando se cree el proyecto Firebase y
   se inserte el primer registro en `PlatformFcmConfig` desde el
   admin, ejecutar el dryRun reusando la inicialización de
   `fcm.service.ts` (reusar la instancia ya inicializada, no
   replicar la auth manualmente). Si pasa, marcar la ventana como
   100% cerrada. Si falla, revertir poda backend (`git revert
   f13a784`) y re-pinear `protobufjs`/`@grpc/grpc-js`/`node-forge`
   como T1.

5. **Bake real de una PWA**: pendiente como última verificación
   (superficie irreversible runtime). A ejecutar después de este doc.

**Estado de la ventana #67**: cerrada en rama, desplegada y verificada
en VPS al máximo posible dado el entorno. El dryRun real es un asterisco
honesto, no un falso verde — registrado aquí explícitamente.

### #68 — `@babel/core <=7.29.0` Arbitrary File Read vía sourceMappingURL — sin fix upstream

**Estado**: OPEN, LOW PRIORITY (residual upstream cross-project)
**Origen**: residual tras cierre de auditoría de [[#67]] en rama
`chore/security-audit`, 2026-06-16. El mismo CVE reaparece en builder
y runtime al medir sus audits — es un gap upstream cross-project,
no específico de un árbol.

**CVE**: [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
— Arbitrary File Read via sourceMappingURL Comment. Severity: low.

**Por qué no overrideable**: no existe versión parcheada de
`@babel/core` a la que apuntar. La última 7.x es 7.29.0 (vulnerable);
las siguientes versiones publicadas son `8.0.0-rc.*` (no estables).
Un override sin destino no es un fix — es un pin a la misma versión
vulnerable.

**Por qué no bloquea producción**:
- Dev/build-tree (jest/babel) — no se carga en el runtime del backend
  ni en la PWA generada
- El advisory requiere ejecutar babel sobre archivos con
  `sourceMappingURL` controlados por atacante — vector teórico en
  cadenas CI con código no-confiable, no en build interno del equipo
- Si se materializa, la superficie de exposición es el sistema de
  build (laptop dev / runner CI), no el end-user del cliente ni la
  infraestructura de AppForge

**Proyectos afectados**: `appforge-backend`, `appforge-builder`,
`appforge-runtime` (no `appforge-admin`).

**Acción**: aceptar como residual vigilable. Revisar cuando
(a) salga `@babel/core@7.29.1+` (patch en 7.x), o
(b) `@babel/core@8.x` se estabilice (mayor coordinación con jest 30/31).
Ninguno tiene ETA upstream conocida.

**Esfuerzo**: 5-10 min cuando salga fix — un solo bump por proyecto,
sin breaking changes esperados dentro de 7.x.

**Prioridad**: baja — riesgo teórico en build-tree, no en runtime.

**No bloquea**: nada.

**Conexión con [[#67]]**: residual aceptado al cierre de la auditoría
backend. Mismo gap reaparecerá al cerrar T1 en builder y runtime.

### #69 — Runtime build-tools chain: vite 6→8, @capacitor/cli major, tar+esbuild transitivos

**Estado**: OPEN, MEDIUM-LOW PRIORITY (supply-chain, no end-user)
**Origen**: residual tras T2-runtime en rama `chore/security-audit`,
2026-06-16. Limpiar el cluster de build-tools del runtime exige 2 majors
sobre el bundler y el CLI de Capacitor — fuera del alcance de la
ventana de [[#67]].

**Paquetes afectados** (4 high en runtime, todos build-time):
- `vite` (DIRECT ^6.3.5) — actualmente 6.4.1 resuelto. La vuln viene
  vía `esbuild` (`0.17.0 - 0.28.0` rango). `vite@6.4.3` sigue declarando
  `esbuild ^0.25.0` (no satisface fix `>=0.28.1`). `vite@7.3.1`
  declara `esbuild ^0.27.0` (tampoco). `vite@8.0.16` ya **no usa
  esbuild como dep** (migró a `rolldown 1.0.3` + `lightningcss`).
- `esbuild` (trans via vite) — fix in `>=0.28.1`, no alcanzable sin
  bumpear vite a 8.x.
- `@capacitor/cli` (devDep ^6.2.0) — 6.x no tiene patch (6.2.1 es
  última 6.x). Fix de `tar` requiere `@capacitor/cli@7+`.
- `tar` (trans via @capacitor/cli) — 7 advisories (hardlink path
  traversal, symlink poisoning, race condition macOS APFS, file
  smuggling). Solo se cierra bumpeando @capacitor/cli a major.

**Por qué se difiere** (no es residual upstream — hay fix, pero requiere
2 majors sobre superficie sensible):
1. **Runtime se hornea por-PWA** (línea irreversible del deploy según
   memoria [[runtime-horneado-por-pwa]]). vite 6→8 cambia el bundler
   completo — output del JS final puede diferir en chunking, tree-
   shaking, code-split → cada PWA del cliente re-horneable con bundle
   distinto. Necesita validación de bake completa antes y después.
2. **`@capacitor/cli` 6→7** afecta `npx cap sync` para Android/iOS,
   `capacitor.config.ts` puede cambiar de schema, plugins existentes
   (`@capacitor/android@6`, `@capacitor/ios@6`, etc) podrían no ser
   compatibles con cli@7 — exige bumpear toda la familia Capacitor a 7.

**Por qué no bloquea producción**:
- `esbuild` + `vite` + `tar` + `@capacitor/cli` son **build-tools**:
  corren en la máquina de build (laptop dev / CI runner), NO se
  hornean en el JS del usuario final ni se ejecutan en el dispositivo
  móvil. Modelo de amenaza: supply-chain (atacante con acceso al
  entorno de build), no end-user.
- Los advisories de `tar` requieren un atacante con control sobre
  archivos `.tar` que el build descomprima — vector teórico en CI
  con artefactos no-confiables, no en build interno del equipo.
- `vite`/`esbuild` advisories afectan al dev server (path traversal
  optimized deps, WebSocket file read) o al modo de build con
  argumentos atacante-controlados — no aplican al uso normal
  `vite build` con código del equipo.

**Acción**: estudio individual fuera de esta ventana. Cuando se
aborde:
1. Bumpear `vite ^6.3.5 → ^8.0.16` (2 majors). Validar:
   - `npm run build` verde
   - `npm run build:pwa` verde (modo crítico — se hornea por cliente)
   - Diff del bundle final (`dist/assets/index-*.js`) vs estado actual:
     verificar que no haya nuevos imports/excluds del tree-shake.
   - Smoke en browser real de la PWA generada — flujos críticos del
     end-user (carga inicial, navegación entre módulos, FCM).
2. Bumpear `@capacitor/cli ^6.2.0 → ^7.x` junto a familia completa:
   `@capacitor/android`, `@capacitor/ios`, `@capacitor/core`, todos
   los plugins de la familia 6.x. Validar `cap sync` + build nativo.

**Esfuerzo estimado**: 4-8 horas (vite major bump + verificación bundle
+ Capacitor family major + sync nativo). NO se hace en una tanda
"rápida"; merece su sprint propio con plan de rollback.

**Prioridad**: media-baja. Build-tools supply-chain, no end-user.
Pero sí relevante para higiene general de deps + el ahorro de
peso del bundle PWA al pasar a rolldown.

**No bloquea**: nada del roadmap actual. Sí bloquea cierre limpio
total de [[#67]] (runtime queda con 4 high diferidos a esta entrada).

**Conexión con [[#67]]**: residual técnico aceptado al cierre de la
auditoría runtime, separado de [[#68]] porque aquí SÍ existe fix
upstream (vite 8 / Capacitor 7) — el bloqueador es coste de
verificación + perímetro de cambio, no ausencia de parche.

### #70 — `quill@2.0.3` + `react-quill-new@3.8.3` XSS al exportar HTML — mitigado en la superficie end-user

**Estado**: OPEN, LOW PRIORITY (residual aceptado con mitigación
verificada + TODO concreto de defense-in-depth)
**Origen**: residual tras cierre de auditoría builder en rama
`chore/security-audit`, 2026-06-16. Investigado al inicio de la ventana
de [[#67]] cuando se evaluaba si el override de `quill` era seguro;
conclusión documentada aquí para que no se reabra.

**Vulnerabilidades**:
- [GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25)
  — `quill@2.0.3` vulnerable a XSS via HTML export feature. Severity: low.
- `react-quill-new@>=3.8.2` depende de `quill@2.0.3` vulnerable —
  también marcada low.

**Proyectos afectados**: `appforge-builder` (3 ubicaciones de uso del
editor: `TermsTab`, `custom_page`, `news_feed`). NO presente en
`appforge-runtime` (el runtime no edita HTML, solo lo renderiza
sanitizado), NO presente en `appforge-admin` (sin editor rich-text).

**Por qué se rechaza el "fix" de `npm audit fix --force`**: la
sugerencia es downgrade `react-quill-new` a `3.7.0` (que usa una quill
distinta). **Un downgrade nunca es un fix** — pierde funcionalidad +
versiones de seguridad de otros aspectos del editor, y mueve el
problema en vez de cerrarlo. Es un anti-patrón del audit cuando el
upstream no ha publicado parche.

**Mitigación que hace el riesgo aceptable (verificada técnicamente)**:

1. **Runtime (la PWA del end-user del cliente) sanitiza con DOMPurify
   en cada render con HTML**. Helper central
   `appforge-runtime/src/lib/sanitize.ts`:
   ```ts
   import DOMPurify from 'dompurify';
   export const sanitize = (html: string): string => DOMPurify.sanitize(html);
   ```
   Aplicado vía `dangerouslySetInnerHTML={{ __html: sanitize(content) }}`
   en los 4 puntos del runtime donde se inyecta HTML:
   - `TermsScreen.tsx`
   - `modules/custom-page/CustomPageRuntime.tsx`
   - `modules/news-feed/NewsFeedRuntime.tsx`
   - `modules/text/TextRuntime.tsx`

   Tras T2-runtime DOMPurify está en 3.4.10 (último). Smoke funcional
   ejecutado 2026-06-16 con 5 payloads XSS (img onerror, script tag,
   svg onload, javascript: URI, contenido seguro) → 5/5 PASS.

2. **Backend sanitiza con `sanitize-html` al persistir contenido de
   `news_feed`** (defense-in-depth: limpia ANTES de guardar). En
   `appforge-backend/src/news/news.service.ts` L43, L60:
   ```ts
   content: sanitizeHtmlContent(dto.content),
   ```
   `sanitize-html` está en 2.17.5 tras T2-backend.

**Conclusión sobre la superficie end-user**: el XSS de quill **no es
atacable contra el usuario final del cliente** — toda la cadena de
render pasa por DOMPurify, y `news_feed` además se sanitiza al
guardar. Un cliente malicioso que intentara inyectar `<script>` en su
propio contenido vería su payload limpiado antes de que llegue al
end-user.

**Limitación conocida (TODO accionable, no solo vigilar)**:

`sanitizeHtmlContent` en el backend **solo se aplica a `news_feed`**.
Faltan los dos otros paths de persistencia de HTML que el editor
produce:

- `custom_page` (módulo del builder): el HTML del editor llega al
  backend vía `apps.controller.ts → updateSchema` o
  `update-app-config.dto.ts` sin pasar por `sanitizeHtmlContent`.
  Comentario explícito en
  `appforge-backend/src/apps/dto/update-app-config.dto.ts:29`:
  "the service (e.g. extractCustomerFields, sanitizeHtmlContent — see
  TECH_DEBT [[#9]])".
- `terms` (en `TermsTab` del app-config): mismo path, sin sanitizar
  al guardar.

Además, los 2 `dangerouslySetInnerHTML` del builder mismo
(preview del editor en `custom_page.module.tsx` L70 y
`news_feed.module.tsx` L164) renderizan crudo sin pasar por
sanitize.

**Modelo de amenaza del gap**: self-XSS del cliente sobre sí mismo en
su propia sesión admin del builder. NO afecta al end-user (los
runtimes sanitizan), NO afecta cross-tenant (cada cliente solo ve su
propio HTML), NO afecta a otros admins (cada cliente solo accede a
sus apps). Riesgo: bajo.

**Acción defense-in-depth** (no urgente, pero registrable):
1. Extender `sanitizeHtmlContent` al path de `update-app-config`
   para sanitizar contenido HTML de `custom_page` y `terms` al
   guardar — defense-in-depth simétrica con `news_feed`.
2. (Opcional) Aplicar `sanitize` también en los previews del
   builder — riesgo bajo (self-XSS only), pero higiene.

**Esfuerzo**: 1-2 horas (extender el helper backend + aplicar en 2
puntos del flujo + tests unitarios).

**Qué cambiaría la decisión** (criterios de re-evaluación):
- Fix upstream de `react-quill-new`/`quill` que NO sea downgrade
  (versión > 3.8.3 que use una `quill` parcheada) → bumpear directo,
  cerrar #70.
- Si el preview del builder pasara a renderizar contenido
  cross-tenant (no es el caso hoy) → el gap del builder dejaría de
  ser self-XSS y el TODO defense-in-depth pasaría a urgente.
- Si DOMPurify upstream introdujera un breaking change que rompiera
  alguno de los 4 puntos de inyección del runtime → la mitigación
  caería, el riesgo subiría a high.

**Prioridad**: baja. Mitigación end-user verificada. El TODO de
extender `sanitizeHtmlContent` a `custom_page` + `terms` es higiene,
no bloqueante.

**No bloquea**: nada.

**Conexión con [[#9]]** (sanitización al persistir contenido): mismo
helper, mismo paradigma. El TODO de extender a `custom_page`/`terms`
es exactamente el cierre defense-in-depth que [[#9]] pide.

**Conexión con [[#67]]**: residual aceptado al cierre de la auditoría
builder. Distinto de [[#68]] (donde no hay fix upstream) y [[#69]]
(donde el fix existe pero requiere majors) — aquí el upstream sí
publicó algo, pero ese "algo" es un downgrade que rechazamos.


