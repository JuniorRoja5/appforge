# Sesión 2026-05-07 — Auditoría Configuración → Ajustes (cierre H1-H7+H14)

## Resumen ejecutivo

Sesión de auditoría técnica del flujo "Configuración → Ajustes de la app"
del builder y su correlación end-to-end con el pipeline de build (APK + PWA).
Detectados 21 hallazgos clasificados en 4 niveles: 1 bloqueante de submission
a stores, 4 críticos pre-producción, 7 importantes, 9 tech-debt menor.

Implementados 8 fixes en dos PRs encadenados (críticos H1-H5 + triviales
H6+H7+H14). Los 13 hallazgos restantes pasaron a TECH_DEBT con plantillas
detalladas (#14-#28) ordenados por prioridad.

Sin desviaciones críticas en producción. Una decisión de implementación
divergió del plan aprobado (symlink → copy script con hooks npm) por
incompatibilidad de Windows con symlinks en Git, documentada y validada
con test de paridad como red de seguridad.


## Origen y diagnóstico

Punto de partida: solicitud de auditoría técnica del flujo Configuración →
Ajustes en modo "code review" (sin pruebas en dispositivo). Las 7 secciones
del modal a auditar: Identidad, Splash Screen, Bienvenida, Legal, Email
SMTP, Android, Permisos iOS. Para cada una, correlacionar frontend →
backend → build pipeline → APK + PWA.

Metodología aplicada: empezar por `build.processor.ts` y `capacitor.config.ts`
para entender qué inputs consume realmente el pipeline, y desde ahí trabajar
hacia atrás hasta la UI del builder. Esa perspectiva expone desconexiones
sin asumir intención.

Duración total: ~5 horas distribuidas en cuatro fases:
1. Exploración del código (~30 min) — leer build pipeline, controllers, DTOs, tabs.
2. Redacción del informe de auditoría (~45 min) — 21 hallazgos priorizados.
3. Plan de PR (3 iteraciones, ~1.5 h) — gating manual entre versiones del plan.
4. Implementación + deploys (~2 h) — dos PRs, dos despliegues, verificación.


## Hallazgos detectados (21 totales)

### Bloqueantes para submission

- **H1** — `#APP_NAME` no se reemplaza en descripciones de permisos iOS.
  La UI del builder dice "se reemplazará automáticamente al compilar" pero
  `injectIosPermissions` escribe el placeholder literal al `Info.plist`.
  Apple rechaza apps con texto placeholder en NSDescriptions durante review.

### Críticos pre-producción

- **H2** — Auto-inyección Android desincronizada: backend cubre 3 mappings,
  frontend cubre 11. Apps con `events`/`booking`/`loyalty_card`/`discount_coupon`/
  `contact` salen sin permisos críticos → crash en runtime.
- **H3** — Auto-inyección iOS desincronizada: mismo problema, peor (backend
  no cubre nada).
- **H4** — `injectIosPermissions` usa `string.replace('</dict>', ...)` sin
  parser plist real ni escape XML. Caracteres `&/</>/"/'` en descripciones
  rompen el `Info.plist`. Sub-dicts del plist (CFBundleURLTypes, etc.)
  causan inyección en lugar incorrecto.
- **H5** — DTO validation no se ejecuta. `main.ts` no llama a `useGlobalPipes`,
  `apps.controller.updateConfig` tipa `@Body() body: Record<string, unknown>`
  en lugar de `UpdateAppConfigDto`. El `@Matches(PACKAGE_NAME_REGEX)` que el
  security audit del 17/04 añadió nunca se ejecutaba; un curl podía guardar
  `packageName: "../../etc/passwd"`.

### Importantes (PR-2)

- **H6** — `splash.duration` mismatch unidades (segundos en builder, ms en
  runtime). Splash duraba 4 ms en lugar de 4000 ms.
- **H7** — `AppIconTab.tsx` validación de dimensiones rota: `if (error) return;`
  leía closure stale del state, iconos no-1024×1024 pasaban silenciosamente
  al backend.
- **H14** — `OnboardingScreen.tsx` mutaba el array `slides` con `.sort()`
  in-place en lugar de `[...slides].sort()`. Latente; no observado en runtime
  pero preventivo.

### Resto (a TECH_DEBT)

H8 (Privacy Policy URL separada), H9 (sanitización HTML server-side),
H10 (rename endpoint), H11 (tab Identidad), H12 (upload splash dedicado),
H13 (regex packageName), H15 (versionado terms), H16 (filtrar PWA manifest),
H17 (escape app.name), H18 (splash native Android), H19 (validación slides),
H20 (forzar INTERNET), H21 (CFBundleDisplayName).
Mapeados en TECH_DEBT.md como #14-#28 (ver sección "Pendientes derivados").


## Decisiones consolidadas durante el plan

Tres rondas de revisión del plan antes de implementar:

| Ronda | Detección |
|---|---|
| 1 | Plan inicial inventaba mappings de permisos divergentes del frontend actual; `forbidNonWhitelisted: true` global rompería ~28 controllers no auditados; `@IsNotEmpty` en password rompería el flujo "preservar password existente"; test de paridad podía fallar en CI aislado. |
| 2 | Verificación H5 documentada como `400 con property unknownField should not exist` — incompatible con la decisión `forbidNonWhitelisted: false`. Segunda fuente de verdad latente: el array `IOS_PERMISSIONS` del frontend mantenía `defaultText` inline aunque el JSON compartido los tuviera. |
| 3 | Plan aprobado para implementación. |

Decisiones clave:

1. **Scope**: solo H1-H5 en este PR, H6+H7+H14 en PR-2 inmediato, resto a
   TECH_DEBT. Argumento: separación clara para bisección si algo falla.
2. **Compartir mapas de permisos (H2/H3)**: JSON único como fuente de verdad,
   referencia desde frontend. Plan inicial: symlink relativo. Decisión final
   en implementación: copy script con hooks `postinstall`/`predev`/`prebuild`,
   por incompatibilidad de Windows con symlinks en Git (ver "Desviaciones").
3. **Plist parser (H4)**: lib `plist` (npm). Resuelve H1+H4+escape XML de raíz.
4. **ValidationPipe (H5)**: `whitelist: true, transform: true,
   forbidNonWhitelisted: false`. El strict global queda como TECH_DEBT #27
   bloqueante de auditoría DTO de los ~28 controllers.


## Plan ejecutado (PR principal H1-H5)

Hash final: `c626fef`. Seis commits bisectables:

```
04e270e fix(ios-build): replace #APP_NAME in iOS permission descriptions (H1)
f447691 fix(ios-build): use plist library to inject iOS permissions safely (H4)
8c3c660 refactor(build): centralize module-permission map as shared JSON (H2/H3)
b6e8fd4 test(build): regression test for module-permissions JSON parity (H2/H3)
7b2168b fix(api): enable global ValidationPipe + use DTOs in apps controller (H5)
c626fef fix(api): add class-validator decorators to UpdateSmtpConfigDto (H5b)
```

Archivos tocados:
- `appforge-backend/src/build/build.processor.ts` (commits 1, 2, 3)
- `appforge-backend/package.json` (commit 2: añade `plist`, `@types/plist`)
- `appforge-backend/src/build/module-permissions.json` (NEW, commit 3)
- `appforge-builder/src/lib/module-permissions.json` (NEW, commit 3 — copia
  trackeada, no symlink)
- `appforge-builder/scripts/copy-shared.mjs` (NEW, commit 3)
- `appforge-builder/src/lib/MODULE_PERMISSIONS_README.md` (NEW, commit 3)
- `appforge-builder/src/features/builder/app-config/tabs/AndroidConfigTab.tsx`
  (commit 3: import desde JSON)
- `appforge-builder/src/features/builder/app-config/tabs/IosPermissionsTab.tsx`
  (commit 3: tres bloques refactorizados — mapping, descriptions, IOS_PERMISSIONS)
- `appforge-backend/src/build/__tests__/module-permissions.spec.ts` (NEW,
  commit 4: 4 aserciones de invariantes)
- `appforge-backend/src/main.ts` (commit 5: `useGlobalPipes`)
- `appforge-backend/src/apps/apps.controller.ts` (commit 5: DTOs en `updateConfig`
  y `updateSmtp`)
- `appforge-backend/src/apps/dto/update-app-config.dto.ts` (commit 6: decoradores
  en `UpdateSmtpConfigDto`, `password` como `@IsOptional`)


## Plan ejecutado (PR-2 triviales H6+H7+H14)

Hash final: `025c9b3`. Tres commits bisectables, sin nuevas dependencias:

```
4149e3f fix(runtime): splash duration is in seconds, not ms (H6)
6bd708f fix(builder): icon dimension validation no longer reads stale state (H7)
025c9b3 fix(runtime): copy slides before sorting in OnboardingScreen (H14)
```

Archivos:
- `appforge-runtime/src/components/SplashScreen.tsx` (H6: `* 1000`)
- `appforge-builder/src/features/builder/app-config/tabs/AppIconTab.tsx`
  (H7: variable local `validationError` en lugar de leer state stale)
- `appforge-runtime/src/components/OnboardingScreen.tsx` (H14:
  `[...config.slides].sort(...)`)


## Desviación de implementación: symlink → copy script

El plan aprobado especificaba symlink relativo desde
`appforge-builder/src/lib/module-permissions.json` al backend. En la práctica
no funcionó por:

- En este repo `git config core.symlinks` está en `false` (default Windows
  donde Junior tiene su entorno de desarrollo local).
- `git update-index` con mode `120000` SÍ registra el symlink en el index,
  pero al checkout en Windows materializa un archivo de texto plano con el
  path target dentro.
- Resultado: el `import json from '...'` en Vite recibiría una string como
  `../../../appforge-backend/src/build/module-permissions.json` en lugar
  del JSON real. Build roto en Windows.

Solución elegida: copia trackeada en git + script de regeneración.

- Archivo `module-permissions.json` commiteado en ambas ubicaciones (idéntico
  por construcción).
- Script `appforge-builder/scripts/copy-shared.mjs` regenera la copia desde
  el backend al builder.
- Hooks npm:
  - `postinstall`: corre tras cada `npm install`
  - `predev`: corre antes de `npm run dev`
  - `prebuild`: corre antes de `npm run build`
- Test Jest (`b6e8fd4`) valida que ambos archivos tienen contenido idéntico
  (red de seguridad: si alguien edita uno sin regenerar el otro, CI falla).

Trade-off: dos copias en disco vs symlink ideal. Idempotente en los tres OS
(Linux/Mac/Windows) sin configuración por OS. El test de paridad mantiene la
garantía de fuente única de verdad.


## Verificación end-to-end

Verificación 1 (H5 ValidationPipe) — confirmada en navegador:

```js
fetch('https://api.creatu.app/apps/<id>/config', {
  method: 'PUT',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    androidConfig: { packageName: '../../etc/passwd', versionName: '1.0.0', versionCode: 1 }
  }),
})
→ status: 400 (rechazo por @Matches(PACKAGE_NAME_REGEX))
```

Verificación 2 (H7 icono inválido) — confirmada en navegador:
- Subir PNG no-1024×1024 → alert rojo con dimensiones reales.
- Thumbnail no se actualiza, upload no procede, sin request a backend.

Verificaciones diferidas (requieren APK/PWA real):
- **H1+H4**: `grep '#APP_NAME'` en `Info.plist` del zip iOS debe devolver vacío;
  `&` en descripciones debe aparecer como `&amp;`.
- **H2/H3**: app con `events` + `booking` + `loyalty_card` sin tocar permisos
  manualmente → `aapt dump permissions <apk>` debe listar `READ_CALENDAR`,
  `WRITE_CALENDAR`, `VIBRATE`, `CAMERA`. Equivalente para iOS.
- **H6**: splash con `duration: 4` debe durar ~4 segundos, no parpadear.
- **H14**: `grep -o '\[\.\.\.config.slides\]' bundle.js` del runtime debe
  encontrar match.

Las cuatro verificaciones de APK/PWA quedan diferidas al próximo build con
propósito real. El test de paridad del JSON (`b6e8fd4`), el smoke test del
ValidationPipe y la verificación visual del icono cubren los invariantes
críticos. La verificación end-to-end con APK confirma observabilidad humana
del fix; útil pero no bloqueante.


## Pendientes derivados (a TECH_DEBT.md)

15 entradas añadidas en commit `343b33d` siguiendo el patrón canónico
(numeración secuencial inmutable). Resumen:

| # | Resumen | Prioridad |
|---|---|---|
| #14 | Splash native Android customizado (~100-200ms flash) | baja |
| #15 | Backend valida `slides.length <= 10` | baja |
| #16 | Forzar INTERNET y ACCESS_NETWORK_STATE desde backend | media |
| #17 | Input editable para CFBundleDisplayName | baja |
| #18 | Filtrar `iosPermissions`/`androidConfig` del manifest PWA | baja |
| #19 | Escape completo de `app.name` en `capacitor.config.ts` | media |
| #20 | Versionar `terms.content` con hash + invalidar localStorage | media → alta antes de cliente real |
| #21 | Endpoint `/upload/splash-image` con límite 5MB | media |
| #22 | Endpoint `PATCH /apps/:id` con `name` editable | media |
| #23 | Tab "Identidad" inconsistente con su label (consume #22) | media |
| #24 | Sanitización HTML server-side en `terms.content` | media |
| #25 | Separar `terms.content` de `privacyPolicyUrl` | alta antes de submission |
| #26 | Validación dimensiones de icono robusta + chequeo server-side | baja |
| #27 | **Auditoría DTO + flip `forbidNonWhitelisted: true`** | alta antes de cliente real |
| #28 | `npm install` en VPS toca `package-lock.json` (operacional) | baja |

Orden de ataque sugerido:
1. **#25 + #20** — legales, antes de submission.
2. **#27** — antes de aceptar primer cliente real. Bloqueante de sección 11
   del Continuity Document.
3. **#22 + #23** — sprint UX cuando haya ciclos.
4. **Resto** — oportunístico.


## Lecciones operacionales

1. **El gate de revisión de plan antes de implementar funciona**.
   Tres rondas de feedback identificaron 4 problemas que habrían sido
   regresiones (forbidNonWhitelisted estricto rompiendo controllers no
   auditados, `@IsNotEmpty` en password rompiendo flujo legítimo,
   `IOS_PERMISSIONS` con defaultText divergiendo del JSON, mappings de
   permisos inventados). Coste del gate: ~30 min. Coste si esos hubieran
   llegado a producción: medio día de debugging post-deploy + revert + redeploy.

2. **`fetch` en consola del navegador resuelve contra el host actual,
   no contra el host del API**. Junior intentó verificar H5 con un fetch
   relativo (`/apps/.../config`) desde la consola del builder
   (`app.creatu.app`); Nginx devolvió 405 porque el endpoint no vive en
   ese host. Para verificación manual desde DevTools, siempre URL absoluta
   (`https://api.creatu.app/...`).

3. **El token JWT en `localStorage.getItem('appforge-auth')` es JSON
   serializado de Zustand, no el token raw**. Acceso correcto:
   `JSON.parse(localStorage.getItem('appforge-auth')).state.token`.
   Si se pasa el blob completo al header `Authorization: Bearer`, el guard
   rechaza con 401 antes de que el ValidationPipe se ejecute, dando un
   diagnóstico falso.

4. **`git status` puede mentir sobre `up to date with origin/main`** si no
   se ha hecho `git fetch` reciente. La cabeza local de `origin/main` es
   un cache. Siempre `git fetch` antes de pullear si han pasado horas
   desde la última sincronización.

5. **`npm install` en VPS modifica el `package-lock.json`** cuando los
   `package.json` declaran hooks (`postinstall`/`prebuild`/etc) — npm
   añade `"hasInstallScript": true` al lockfile. Si el lockfile commiteado
   no tenía esa línea (porque se generó con npm sin esa optimización),
   cada deploy deja el working tree dirty. Workaround temporal:
   `git checkout -- package-lock.json` antes de cada `git pull`. Solución
   definitiva: regenerar lockfile commiteado o cambiar `npm install` por
   `npm ci` en el VPS (TECH_DEBT #28).

6. **Las verificaciones que requieren build de APK/PWA pueden diferirse
   sin coste operativo** si el código está mergeado y compilado. El test
   de paridad (`b6e8fd4`) y los tests unitarios + el smoke test del
   ValidationPipe cubren el invariante crítico (que el cambio funciona).
   La verificación end-to-end con APK confirma la observabilidad humana
   del fix; útil pero no urgente.

7. **Una desviación del plan aprobado merece commit explícito y
   documentación**. La decisión symlink → copy script no era prevista
   en el plan; se descubrió en la implementación por restricción del
   entorno (Git+Windows). Documentarla aquí + en el README del builder
   evita que un futuro Claude/desarrollador deshaga el copy script
   pensando que era subóptimo.


## Estado del proyecto al cierre

- **Modo**: test, sin usuarios reales en producción.
- **Builder web (`app.creatu.app`)**: bundle desplegado tras `npm run build`
  del 7 de mayo, sirviendo desde `dist/`.
- **Backend (`api.creatu.app`)**: PM2 ambos online (`appforge-api`,
  `appforge-worker`), arranque limpio post-deploy con ValidationPipe activo.
- **Worker BullMQ**: sin cambios funcionales en esta sesión; recibe los
  fixes del runtime (H6+H14) automáticamente al copiar el template fresco
  en cada job de build.
- **Tests**: pasando localmente (`module-permissions.spec.ts` confirma
  paridad del JSON compartido).

Próximos focos previstos:
- Decisión sobre cuál de los ejes priorizados de TECH_DEBT atacar primero:
  legales (#25 + #20), auditoría DTO completa (#27), o ramp-up para primera
  APK release-signed real con verificación end-to-end de los cuatro
  hallazgos diferidos en esta sesión.
- Bug que Junior mencionó haber detectado durante esta sesión, pendiente
  de descripción en próxima sesión.


## Información del usuario pertinente para continuidad

Sin novedades respecto a sesiones anteriores. Junior sigue siendo
operacional/SRE, no developer. Disciplina de gates de verificación
constante; detectó dos problemas operativos durante esta sesión —
el `fetch` URL relativa y el lockfile dirty — antes de propagarlos.
