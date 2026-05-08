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
