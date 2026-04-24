# Checklist QA Pre-Deployment — AppForge SaaS v1

**Fecha:** _______________
**Tester:** _______________
**Entorno:** localhost / staging
**Backend:** `npm run start:dev` (port 3000)
**Builder:** `npm run dev` (port 5173)
**Admin:** `npm run dev` (port 5174)

## Preparación

```bash
cd appforge-backend
docker compose up -d                    # PostgreSQL + Redis
npx prisma migrate dev                  # Asegurar BD actualizada
npx prisma db seed                      # Seed base (admin + planes)
npx ts-node prisma/seed-qa.ts           # Seed QA (tenants + datos de prueba)
npm run start:dev                       # Backend
# En otra terminal:
cd appforge-builder && npm run dev      # Builder
# En otra terminal:
cd appforge-admin && npm run dev        # Admin panel
```

### Cuentas de prueba

| Rol | Email | Password | Plan | Notas |
|-----|-------|----------|------|-------|
| SUPER_ADMIN | admin@appforge.com | admin123 | — | Admin panel |
| CLIENT FREE | free@qa.test | test1234 | Free | 1/1 apps (al límite) |
| CLIENT STARTER | starter@qa.test | test1234 | Starter | 1/1 apps, builds habilitados |
| CLIENT PRO | pro@qa.test | test1234 | Pro | 2/5 apps, 15 módulos |
| CLIENT EXPIRED | expired@qa.test | test1234 | Starter expirado | Para probar C1 |
| CLIENT SUSPENDED | suspended@qa.test | test1234 | Free | Tenant suspendido |
| APP USERS | user1-10@testapp.com | appuser123 | — | Usuarios de la app PRO |

---

## Bloque 1 — Autenticación y Cuentas

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 1.1 | Login exitoso | Entrar con `starter@qa.test` / `test1234` → Dashboard visible | ☐ |
| 1.2 | Login contraseña incorrecta | Usar `starter@qa.test` / `wrongpass` → Error "Credenciales inválidas" | ☐ |
| 1.3 | Login email inexistente | Usar `noexiste@qa.test` / `test1234` → Error apropiado | ☐ |
| 1.4 | Registro nuevo usuario | Registrar `nuevo@qa.test` con nombre/empresa → Auto-login → Dashboard | ☐ |
| 1.5 | Registro email duplicado | Registrar `starter@qa.test` otra vez → Error "email ya registrado" | ☐ |
| 1.6 | Logout | Click en logout → Redirige a login → No puede acceder a /dashboard | ☐ |
| 1.7 | Sesión persistente | Login → Cerrar pestaña → Abrir de nuevo → Sigue logueado | ☐ |
| 1.8 | Token expirado | Modificar token en localStorage → Hacer request → Redirige a login | ☐ |
| 1.9 | Perfil editable | Cambiar firstName, lastName, company → Guardar → Recargar → Datos persisten | ☐ |
| 1.10 | Cambio de contraseña | Cambiar contraseña → Logout → Login con nueva contraseña → OK | ☐ |
| 1.11 | Usuario suspendido | Login con `suspended@qa.test` → Debe rechazar acceso | ☐ |

**Notas del tester:**
```
(escribe aquí cualquier observación)
```

---

## Bloque 2 — Dashboard y Navegación

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 2.1 | Dashboard carga | Login → Dashboard muestra lista de apps | ☐ |
| 2.2 | Apps listadas correctamente | `pro@qa.test` debe ver 2 apps (QA Pro Completa + QA Pro Segunda) | ☐ |
| 2.3 | Información del plan | Dashboard muestra plan actual y uso (ej. "2/5 apps") | ☐ |
| 2.4 | Navegación a builder | Click en app → Abre el builder con el layout de 3 paneles | ☐ |
| 2.5 | Navegación "Nueva App" | Click en "Nueva App" → Abre NewAppPage con plantillas | ☐ |
| 2.6 | Volver al dashboard | Desde builder, click en flecha "←" → Vuelve al dashboard | ☐ |
| 2.7 | Responsive básico | Reducir ventana a ~768px → Layout sigue funcional | ☐ |

**Notas del tester:**
```

```

---

## Bloque 3 — Gestión de Apps

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 3.1 | Crear app con plantilla | `pro@qa.test` → Nueva App → Seleccionar plantilla → Crear → Builder se abre | ☐ |
| 3.2 | Crear app en blanco | Nueva App → "En blanco" → Nombre + slug → Crear → Builder vacío | ☐ |
| 3.3 | Slug auto-generado | Escribir nombre "Mi Restaurant" → Slug = "mi-restaurant" automático | ☐ |
| 3.4 | Slug duplicado | Crear app con slug "qa-pro-full" (ya existe) → Error descriptivo | ☐ |
| 3.5 | Pre-check límite apps | `free@qa.test` → Nueva App → Banner "Has alcanzado el límite" + botón deshabilitado | ☐ |
| 3.6 | Contador de apps | `pro@qa.test` → Nueva App → Debe mostrar "2/5 apps" en la esquina | ☐ |
| 3.7 | App con plantilla — módulos pre-cargados | Crear con plantilla → Builder muestra módulos de la plantilla en canvas | ☐ |
| 3.8 | App con plantilla — design tokens | Crear con plantilla → Colores del tema visibles en el canvas | ☐ |
| 3.9 | Suscripción expirada | `expired@qa.test` → Nueva App → Crear → Error 403 "suscripción expirada" | ☐ |

**Notas del tester:**
```

```

---

## Bloque 4 — Constructor Visual (Builder)

### 4.0 — Builder General

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.0.1 | Layout 3 paneles | Abrir builder → Sidebar izq (módulos) + Canvas central + Sidebar der (settings) | ☐ |
| 4.0.2 | Drag & drop módulo | Arrastrar módulo de sidebar izq → Soltar en canvas → Se agrega | ☐ |
| 4.0.3 | Seleccionar elemento | Click en elemento del canvas → Se resalta + Sidebar der muestra settings | ☐ |
| 4.0.4 | Eliminar elemento | Seleccionar → Botón eliminar → Se borra del canvas | ☐ |
| 4.0.5 | Reordenar elementos | Drag & drop entre elementos del canvas → Orden cambia | ☐ |
| 4.0.6 | Undo/Redo | Hacer cambios → Ctrl+Z deshace → Ctrl+Shift+Z rehace | ☐ |
| 4.0.7 | Guardar manual | Click "Guardar" → Indicador "Guardado" (verde) → Recargar → Persiste | ☐ |
| 4.0.8 | Ctrl+S | Ctrl+S → Guardado | ☐ |
| 4.0.9 | Auto-save indicador | Hacer cambio → Indicador "Sin guardar" (ámbar) aparece | ☐ |
| 4.0.10 | Auto-save 30s | Hacer cambio → Esperar 30s → Indicador cambia a "Guardando..." → "Guardado" | ☐ |
| 4.0.11 | Design tokens | Cambiar color primario en Theme settings → Preview actualiza en tiempo real | ☐ |
| 4.0.12 | Tipografía | Cambiar familia tipográfica → Preview actualiza | ☐ |
| 4.0.13 | Tabs configuración | Asignar módulo a tab 1, otro a tab 2 → Vista de tabs muestra correctamente | ☐ |

### 4.1 — Módulo: custom_page

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.1.1 | Agregar al canvas | Drag custom_page → Canvas muestra preview de página | ☐ |
| 4.1.2 | Editar título | Settings → Cambiar título → Preview actualiza en tiempo real | ☐ |
| 4.1.3 | Editar contenido HTML | Settings → Cambiar contenido → Preview renderiza HTML | ☐ |
| 4.1.4 | Cambiar color fondo | Settings → Color de fondo → Preview actualiza | ☐ |
| 4.1.5 | Persistencia | Guardar → Recargar → Config sigue igual | ☐ |

### 4.2 — Módulo: news_feed

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.2.1 | Agregar al canvas | Drag news_feed → Preview muestra layout de noticias | ☐ |
| 4.2.2 | Configurar título | Settings → Cambiar título → Preview actualiza | ☐ |
| 4.2.3 | Toggle mostrar imágenes | Settings → showImages on/off → Preview refleja | ☐ |
| 4.2.4 | Cambiar layout | Settings → Layout card/list → Preview cambia | ☐ |
| 4.2.5 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.3 — Módulo: contact

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.3.1 | Agregar al canvas | Drag contact → Preview muestra formulario | ☐ |
| 4.3.2 | Configurar email/teléfono | Settings → Cambiar email + phone → Preview actualiza | ☐ |
| 4.3.3 | Configurar campos | Settings → Agregar/quitar campos → Preview refleja | ☐ |
| 4.3.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.4 — Módulo: photo_gallery

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.4.1 | Agregar al canvas | Drag photo_gallery → Preview muestra grid | ☐ |
| 4.4.2 | Cambiar columnas | Settings → 2/3/4 columnas → Preview actualiza grid | ☐ |
| 4.4.3 | Toggle títulos | Settings → showTitles on/off → Preview refleja | ☐ |
| 4.4.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.5 — Módulo: events

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.5.1 | Agregar al canvas | Drag events → Preview muestra lista/calendario | ☐ |
| 4.5.2 | Cambiar layout | Settings → List/Calendar toggle → Preview actualiza | ☐ |
| 4.5.3 | Mostrar eventos pasados | Settings → showPastEvents → Preview refleja | ☐ |
| 4.5.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.6 — Módulo: loyalty_card

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.6.1 | Agregar al canvas | Drag loyalty_card → Preview muestra tarjeta | ☐ |
| 4.6.2 | Configurar puntos máx. | Settings → maxPoints → Preview actualiza puntos | ☐ |
| 4.6.3 | Configurar recompensa | Settings → Cambiar reward text → Preview actualiza | ☐ |
| 4.6.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.7 — Módulo: menu_restaurant

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.7.1 | Agregar al canvas | Drag menu_restaurant → Preview muestra menú | ☐ |
| 4.7.2 | Configurar moneda | Settings → Cambiar currency → Preview muestra símbolo correcto | ☐ |
| 4.7.3 | Toggle alérgenos | Settings → showAllergens → Preview refleja | ☐ |
| 4.7.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.8 — Módulo: discount_coupon

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.8.1 | Agregar al canvas | Drag discount_coupon → Preview muestra cupones | ☐ |
| 4.8.2 | Toggle expirados | Settings → showExpired → Preview refleja | ☐ |
| 4.8.3 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.9 — Módulo: catalog

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.9.1 | Agregar al canvas | Drag catalog → Preview muestra catálogo | ☐ |
| 4.9.2 | Configurar moneda | Settings → Currency → Preview actualiza | ☐ |
| 4.9.3 | Toggle precios | Settings → showPrices → Preview refleja | ☐ |
| 4.9.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.10 — Módulo: booking

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.10.1 | Agregar al canvas | Drag booking → Preview muestra reservas | ☐ |
| 4.10.2 | Configurar duración slot | Settings → slotDuration → Preview actualiza | ☐ |
| 4.10.3 | Configurar horario | Settings → startHour/endHour → Preview actualiza | ☐ |
| 4.10.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.11 — Módulo: social_wall

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.11.1 | Agregar al canvas | Drag social_wall → Preview muestra muro social | ☐ |
| 4.11.2 | Toggle imágenes | Settings → allowImages → Preview refleja | ☐ |
| 4.11.3 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.12 — Módulo: fan_wall

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.12.1 | Agregar al canvas | Drag fan_wall → Preview muestra muro de fans | ☐ |
| 4.12.2 | Toggle likes | Settings → allowLikes → Preview refleja | ☐ |
| 4.12.3 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.13 — Módulo: links

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.13.1 | Agregar al canvas | Drag links → Preview muestra lista de enlaces | ☐ |
| 4.13.2 | Agregar enlace | Settings → Add link (label + URL + icon) → Preview actualiza | ☐ |
| 4.13.3 | Eliminar enlace | Settings → Remove link → Preview actualiza | ☐ |
| 4.13.4 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.14 — Módulo: pdf_reader

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.14.1 | Agregar al canvas | Drag pdf_reader → Preview muestra visor PDF | ☐ |
| 4.14.2 | Configurar URL PDF | Settings → URL → Preview actualiza (o placeholder) | ☐ |
| 4.14.3 | Persistencia | Guardar → Recargar → OK | ☐ |

### 4.15 — Módulo: push_notification

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 4.15.1 | Agregar al canvas | Drag push_notification → Preview muestra panel push | ☐ |
| 4.15.2 | Configurar título | Settings → Cambiar título → Preview actualiza | ☐ |
| 4.15.3 | Persistencia | Guardar → Recargar → OK | ☐ |

**Notas del tester Bloque 4:**
```

```

---

## Bloque 5 — Usuarios de la App

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 5.1 | Lista de usuarios | `pro@qa.test` → Builder → Usuarios → Lista muestra 10 AppUsers | ☐ |
| 5.2 | Búsqueda | Buscar "user5" → Filtra correctamente | ☐ |
| 5.3 | Ver detalle usuario | Click en usuario → Muestra email, nombre, último login | ☐ |
| 5.4 | Banear usuario | Seleccionar user ACTIVE → Banear → Estado cambia a BANNED | ☐ |
| 5.5 | Desbanear usuario | Seleccionar user BANNED → Desbanear → Estado cambia a ACTIVE | ☐ |
| 5.6 | Usuario ya baneado | user10@testapp.com debe aparecer como BANNED (seed) | ☐ |
| 5.7 | Paginación | Si hay >10 usuarios → Paginación funciona | ☐ |

**Notas del tester:**
```

```

---

## Bloque 6 — Analytics

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 6.1 | Dashboard analytics | `pro@qa.test` → App → Analytics → Muestra gráficos con datos del seed | ☐ |
| 6.2 | Total sesiones | Número total de sesiones ≈ 50 (del seed) | ☐ |
| 6.3 | Distribución plataformas | Gráfico muestra Android/iOS/Web | ☐ |
| 6.4 | Eventos por módulo | Gráfico muestra distribución de module_view por módulo | ☐ |
| 6.5 | Rango de fechas | Cambiar rango (7d, 30d) → Gráficos actualizan | ☐ |
| 6.6 | Sin datos | App nueva sin analytics → Muestra estado vacío apropiado | ☐ |

**Notas del tester:**
```

```

---

## Bloque 7 — Build Pipeline

> **Requisitos:** Backend corriendo, Docker disponible para builds, o build server configurado.

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 7.1 | Abrir panel build | `starter@qa.test` → Builder → "Generar App" → Panel se abre | ☐ |
| 7.2 | Info suscripción visible | Panel muestra "Plan Starter" y "builds: X/5 este mes" | ☐ |
| 7.3 | Build tipo selector | 4 tipos visibles: Debug, Release, AAB, Xcode | ☐ |
| 7.4 | Build DEBUG | Seleccionar Debug → Click "Construir" → Status QUEUED → BUILDING → COMPLETED | ☐ |
| 7.5 | Download APK debug | Build completado → Click "Descargar" → Descarga APK | ☐ |
| 7.6 | Build RELEASE (keystore warning) | Seleccionar Release → Click Construir → Warning de keystore aparece → "Entendido" → Build inicia | ☐ |
| 7.7 | Keystore generado | Después del primer release build → Sección keystore aparece con botón Descargar | ☐ |
| 7.8 | Build RELEASE completado | Status pasa a COMPLETED → APK firmado descargable | ☐ |
| 7.9 | Build AAB | Seleccionar AAB → Construir → COMPLETED → Bundle descargable | ☐ |
| 7.10 | Historial de builds | Panel muestra lista de builds anteriores con status y tipo | ☐ |
| 7.11 | Build FAILED — retry | Si hay build fallido → Botón "Reintentar" visible → Click → Nuevo build con mismo tipo | ☐ |
| 7.12 | Build FAILED — log expandible | Click en chevron de build fallido → Log de error visible | ☐ |
| 7.13 | Build concurrent blocking | Mientras un build está activo → Botón "Construir" disabled ("Build en progreso") | ☐ |
| 7.14 | Polling de estado | Build en progreso → Status se actualiza automáticamente (cada 3s) | ☐ |
| 7.15 | Plan FREE — builds disabled | `free@qa.test` → Generar App → "Tu plan no incluye builds" | ☐ |
| 7.16 | Instalar APK en dispositivo | APK debug → Instalar en Android → App abre → Módulos visibles | ☐ |
| 7.17 | Verificar módulos en app | En el dispositivo: cada módulo muestra contenido correcto | ☐ |
| 7.18 | versionCode incremento | Build release 1 → versionCode=2 → Build release 2 → versionCode=3 | ☐ |

**Notas del tester:**
```

```

---

## Bloque 8 — Planes y Stripe

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 8.1 | Ver plan actual | Dashboard → Sección de plan muestra nombre + límites | ☐ |
| 8.2 | Suscripción expirada — auto-downgrade | `expired@qa.test` → Intentar crear app → Error "suscripción expirada" + auto-downgrade a FREE | ☐ |
| 8.3 | Suscripción expirada — canBuild | `expired@qa.test` → Intentar build → Error "suscripción expirada" | ☐ |
| 8.4 | Checkout Stripe (si configurado) | Click "Upgrade" → Redirige a Stripe Checkout → Completar pago → Plan cambia | ☐ |
| 8.5 | Portal Stripe | Click "Gestionar suscripción" → Abre portal de Stripe | ☐ |
| 8.6 | Cancelar suscripción | Portal → Cancelar → cancelAtPeriodEnd=true en BD | ☐ |
| 8.7 | Webhook: subscription.updated | Stripe event → BD actualiza currentPeriodEnd | ☐ |
| 8.8 | Webhook: subscription.deleted | Stripe event → Tenant vuelve a FREE | ☐ |
| 8.9 | Webhook: payment_failed | Stripe event → Email de notificación enviado al tenant | ☐ |

**Notas del tester:**
```

```

---

## Bloque 9 — Super-Admin Panel

> **Login:** `admin@appforge.com` / `admin123` en el Admin Panel (port 5174)

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 9.1 | Dashboard admin | Login → Dashboard muestra métricas: tenants, apps, MRR, builds | ☐ |
| 9.2 | Lista de tenants | Tenants → Lista muestra los 5+ tenants del QA seed | ☐ |
| 9.3 | Detalle tenant | Click en tenant → Muestra info, plan, apps, usuarios | ☐ |
| 9.4 | Cambiar plan manualmente | Seleccionar QA Free Tenant → Cambiar a Starter → Verificar en BD | ☐ |
| 9.5 | Suspender tenant | Seleccionar tenant → Suspender → Estado = SUSPENDED | ☐ |
| 9.6 | Reactivar tenant | Seleccionar QA Suspended → Reactivar → Estado = ACTIVE | ☐ |
| 9.7 | Ver builds globales | Builds → Lista muestra los 3 builds del seed + cualquiera nuevo | ☐ |
| 9.8 | Retry build (admin) | Build FAILED → Botón retry → Nuevo build creado | ☐ |
| 9.9 | Dashboard facturación | Billing → MRR total, gráfico histórico, invoices | ☐ |
| 9.10 | MRR correcto | MRR = suma de subs activas × precio mensual (verificar manualmente) | ☐ |
| 9.11 | Editar límites de plan | Plans → Editar maxApps de Starter → Guardar → Verificar cambio | ☐ |
| 9.12 | Lista de suscripciones | Subscriptions → Lista con plan, tenant, expiresAt, cancelAtPeriodEnd | ☐ |
| 9.13 | Resellers (si aplica) | Resellers tab → Lista filtrada por RESELLER_STARTER + RESELLER_PRO | ☐ |
| 9.14 | Platform SMTP config | Platform → SMTP → Configurar/verificar credenciales SMTP | ☐ |
| 9.15 | Platform FCM config | Platform → FCM → Configurar/verificar credentials Firebase | ☐ |

**Notas del tester:**
```

```

---

## Bloque 10 — Seguridad y Edge Cases

| # | Test | Pasos | Resultado |
|---|------|-------|-----------|
| 10.1 | CORS bloqueado | Desde consola de otro dominio: `fetch('http://localhost:3000/apps')` → Bloqueado | ☐ |
| 10.2 | CORS permitido | Desde localhost:5173: requests normales → OK | ☐ |
| 10.3 | Uploads headers | `curl -I http://localhost:3000/uploads/test` → X-Content-Type-Options: nosniff | ☐ |
| 10.4 | JWT requerido | `curl http://localhost:3000/apps` sin token → 401 | ☐ |
| 10.5 | Tenant isolation | `starter@qa.test` no ve apps de `pro@qa.test` | ☐ |
| 10.6 | Role isolation | CLIENT no accede a endpoints de SUPER_ADMIN → 403 | ☐ |
| 10.7 | SQL/NoSQL injection | Slug con `'; DROP TABLE--` → Rechazado o sanitizado | ☐ |
| 10.8 | XSS en inputs | Nombre de app `<script>alert(1)</script>` → Se escapa, no ejecuta | ☐ |
| 10.9 | Concurrencia guardado | Abrir builder en 2 tabs → Guardar en ambas → No corrupción de datos | ☐ |
| 10.10 | Upload file size | Subir imagen >50MB → Error apropiado (no crash) | ☐ |
| 10.11 | Rate limiting | 100 requests rápidos → Backend responde (no crash, eventual rate limit) | ☐ |

**Notas del tester:**
```

```

---

## Resumen de Resultados

| Bloque | Total tests | ✅ Pass | ❌ Fail | ⚠️ Minor | Notas |
|--------|-------------|---------|---------|----------|-------|
| 1. Auth & Cuentas | 11 | | | | |
| 2. Dashboard & Nav | 7 | | | | |
| 3. Gestión Apps | 9 | | | | |
| 4. Builder Visual | 55 | | | | |
| 5. Usuarios App | 7 | | | | |
| 6. Analytics | 6 | | | | |
| 7. Build Pipeline | 18 | | | | |
| 8. Planes & Stripe | 9 | | | | |
| 9. Super-Admin | 15 | | | | |
| 10. Seguridad | 11 | | | | |
| **TOTAL** | **148** | | | | |

## Criterios para pasar a Docker Sprint

- **0 CRÍTICOS** — Todos los tests de seguridad (Bloque 10) y suscripciones (8.2, 8.3) pasan
- **0 ALTOS** — Builder funcional (4.0.x), builds end-to-end (7.4-7.9), admin panel operativo (9.1-9.6)
- **≤3 MEDIOS** — Cosméticos o UX menores aceptables con ticket de follow-up

## Bugs Encontrados

| # | Bloque | Severidad | Test # | Descripción | Screenshot |
|---|--------|-----------|--------|-------------|------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
