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
**Estado**: OPEN
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

