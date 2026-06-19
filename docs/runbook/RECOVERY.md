# Runbook — Recuperación de AppForge desde cero

**Para el caso**: el VPS de producción está caído o perdido y hay
que recuperar el servicio.

## Árbol de decisión — qué ruta seguir

Antes de empezar, responde estas preguntas en orden:

1. **¿Tienes acceso al panel de Hostinger?** Sí → **Ruta A
   (snapshot)**. No → **Ruta B (desde cero)**.
2. **¿Es una recuperación granular (una tabla, un dato concreto)
   sin necesidad de reconstruir el VPS?** Sí → **Ruta C (restore
   quirúrgico del dump local)**. No → la ruta de la pregunta 1.

---

## Ruta A — Restore de snapshot Hostinger (ruta primaria, ~30 min)

**Cuándo**: Hostinger disponible + caída total del VPS.

1. Panel Hostinger → VPS Manager → Backup & Snapshot.
2. Selecciona el snapshot más reciente (frecuencia diaria) y
   restaura sobre el VPS existente o sobre uno nuevo.
3. Tiempo estimado: ~30 min según tamaño y carga de la cola
   del proveedor.
4. **Smoke post-restore**: salta directo al **Paso 7** del runbook
   desde-cero (smoke crítico). El VPS vuelve completo — `.env`,
   docker, pm2, nginx, monitores — y debes confirmar que los 5
   chequeos pasan. Si fallan, considera el snapshot corrupto y
   pide el anterior.

**Ventana de pérdida aceptada**: ≤24h (frecuencia diaria de
snapshots).

**Hueco conocido cubierto por Ruta B**: si pierdes el acceso a
Hostinger (cuenta comprometida, proveedor caído, billing
suspendido), Ruta A no aplica.

---

## Ruta B — Desde cero (escenario pesimista)

**Cuándo**: Hostinger no disponible (caso b de [[TECH_DEBT #84]]).

Continúa con los pasos 1-8 abajo. **Tiempo objetivo**: 60-90 min
con todo a mano. Si pasa de 90 min, algún paso necesita
automatización (anota dónde se atascó la recuperación para iterar
el runbook después).

---

## Ruta C — Restore quirúrgico (tabla concreta del dump local)

**Cuándo**: alguien borró una tabla / corrupción de filas
identificadas / rollback de una migración fallida, pero el VPS
sigue vivo.

1. Identifica el dump más reciente en `/backups/db/appforge_YYYYMMDD.sql.gz`
   que sea anterior al daño.
2. `gunzip -c <dump>.sql.gz | grep -A <N> 'COPY "TablaAfectada"'`
   para extraer la tabla concreta.
3. Aplica el restore quirúrgico con `psql` directo a la BD viva,
   en una transacción que puedas rollback.
4. NO uses este flujo para "restaurar todo" — usa Ruta A o B
   para eso.

---

## Pasos detallados — Ruta B (desde cero)

**Práctica recomendada**: ensayar Ruta B 1 vez al año en una VM
efímera, sin avisar al operador. El runbook que no se ensaya
envejece silenciosamente.

---

## Pre-requisitos en la máquina nueva

- Docker + docker compose
- Node 20+
- Git
- Acceso al disco/gestor donde está custodiado el set de 15 claves
  de [[TECH_DEBT #79]]
- El dump más reciente de la BD. **Ver Paso 2** — sin este artefacto
  no hay recovery.

---

## Paso 1 — Clonar el código

```bash
git clone https://github.com/JuniorRoja5/appforge.git
cd appforge
```

---

## Paso 2 — Obtener el último dump de `/backups/db/`

**Si llegaste aquí siguiendo Ruta B**, significa que Hostinger no
está disponible. El dump más reciente vive en el VPS, y el VPS no
responde. Las opciones, en orden de viabilidad:

1. **VPS aún accesible por SSH aunque la API esté caída**: copia
   el dump más reciente.
   ```bash
   scp root@srv1616198:/backups/db/appforge_$(date +%Y%m%d).sql.gz ./backup.sql.gz
   ```
2. **VPS completamente perdido**: no hay dump recuperable por la
   ruta B. La ruta A (Hostinger) era la única protección contra
   este escenario y por hipótesis tampoco está. Es el "caso peor"
   de [[TECH_DEBT #84]] (rebajada): hueco residual asumido. No
   hay recovery posible de los datos hasta el último snapshot, y
   ya no existe.

**Esto es por construcción la limitación del modelo de backup
actual.** Documentada en [[#84]]. Si este escenario se materializa,
la única acción es comunicar la pérdida a los clientes
afectados y restaurar la última copia disponible (snapshot de
Hostinger más antiguo si lo hay, o reconstrucción desde cero del
servicio sin datos históricos).

---

## Paso 3 — Reconstruir el `.env` desde la custodia

Abre el disco/gestor con el item de 15 claves custodiado en [[#79]].
Copia los valores a un nuevo `appforge-backend/.env` siguiendo el
template de `env.production.example`.

**Las dos intocables** (Clase A — si pierdes alguna = catástrofe):
- `SMTP_ENCRYPTION_KEY` (debe tener exactamente 64 chars hex)
- `KEYSTORE_ENCRYPTION_KEY` (debe tener exactamente 64 chars hex)

**Las otras 13** (Clase B — re-emisibles): `JWT_SECRET`,
`APP_USER_JWT_SECRET`, `DATABASE_URL`, `MINIO_ACCESS_KEY`,
`MINIO_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, y del `.env` raíz:
`DB_PASSWORD`, `MINIO_PASSWORD`. Y de `/etc/uu-alert.env`: `BOT_TOKEN`,
`CHAT_ID`.

Resto de variables (`PUBLIC_*`, `STRIPE_PRICE_*`, `APP_URL`,
`NODE_ENV`, `PORT`) NO están en custodia porque son públicas o
configuración — cópialas de `env.production.example` y ajusta a la
URL nueva si cambia el dominio.

**Verificación post-edición** (sin descifrar todavía):

```bash
grep -E "^(SMTP|KEYSTORE)_ENCRYPTION_KEY=" appforge-backend/.env \
  | awk -F= '{print $1"=<"(length($0)-length($1)-1)" chars>"}'
# Esperado:
# SMTP_ENCRYPTION_KEY=<64 chars>
# KEYSTORE_ENCRYPTION_KEY=<64 chars>
```

---

## Paso 4 — Levantar infraestructura

```bash
cd appforge-backend
docker compose up -d   # Postgres + Redis + MinIO
sleep 5
docker ps              # debe mostrar los 3 contenedores Up
```

---

## Paso 5 — Restaurar el dump

El procedimiento es el mismo que se verificó en [[#78]] (INFRA-2):

```bash
gunzip -c ../backup.sql.gz | docker exec -i appforge-postgres \
  psql -U appforge -d appforge

# Smoke rápido — la BD tiene tablas y filas
docker exec -i appforge-postgres psql -U appforge -d appforge \
  -c 'SELECT COUNT(*) FROM "App";'
docker exec -i appforge-postgres psql -U appforge -d appforge \
  -c 'SELECT COUNT(*) FROM "User";'
```

---

## Paso 6 — Arrancar el backend

⚠️ **CRÍTICO — invariante operacional de [[TECH_DEBT #86]]**: el
único arranque legítimo de los procesos PM2 de AppForge es vía
`ecosystem.config.js`. **NUNCA arranques a pelo con
`pm2 start dist/main.js --name appforge-api`** — perderías
`WORKER_MODE=separate` y la API registraría procesadores BullMQ
in-process en paralelo con el worker → cada job ejecutado dos
veces (push duplicadas, builds APK doble-arrancados).

```bash
cd appforge-backend
npm ci
npm run build
pm2 start /opt/appforge/appforge-backend/ecosystem.config.js
sleep 5
pm2 list   # ambos online: appforge-api Y appforge-worker
pm2 logs --lines 20 --nostream | grep -E "successfully started|ERROR|FATAL"
# Esperado: "Nest application successfully started", sin ERROR/FATAL.

# Verificar que WORKER_MODE=separate se aplicó (el árbitro de [[#86]] bug 2)
pm2 describe appforge-api | grep -i WORKER_MODE
# Esperado: WORKER_MODE: separate

# Persistir estado + gate de verificación (lección de [[#86]] bug 1)
pm2 save
sudo grep -oE 'appforge-(api|worker)' /root/.pm2/dump.pm2 | sort -u
# 🚨 GATE OBLIGATORIO: debe mostrar EXACTAMENTE dos líneas:
#   appforge-api
#   appforge-worker
# Si falta alguna → sleep 5 más + repetir pm2 save. NO continuar
# sin esto verde — el dump incompleto haría que el próximo reboot
# resucite solo lo que el dump contenga.
```

---

## Paso 7 — Smoke crítico (el árbitro)

Estos 5 chequeos son el árbitro. Si los 5 pasan → recuperación
funcional. Si el **7.3** o el **7.4** fallan con error de descifrado
→ catástrofe identificada (la clave del `.env` no es la que cifró
el dump; verificar fechas de rotación contra fecha del dump).

### 7.1 — Health endpoint

```bash
curl -s http://localhost:3000/health
# Esperado: {"ok":true,"deps":{"db":{"up":true,...},"redis":{"up":true,...}},...}
```

### 7.2 — Login admin (token JWT)

```bash
# Credenciales del super-admin: del disco custodiado.
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-pass>"}'
# Esperado: { "access_token": "...", ... } — confirma que JWT_SECRET
# del .env es coherente con los hashes de password de la BD restaurada.
```

### 7.3 — Descifrado de `PlatformSmtpConfig` (el flujo del reset de cliente — [[#74]])

`PlatformSmtpConfig.encryptedPass` es la fila que se pobló en [[#74]]
para que el backend pueda mandar emails de reset de password a los
clientes finales. Es la columna que MÁS duele perder — si no descifra,
los clientes no pueden recuperar sus cuentas.

```bash
# Lee el SMTP_ENCRYPTION_KEY desde stdin (no del argv ni del entorno
# global — defensa contra que quede en logs/history).
read -rsp "SMTP_ENCRYPTION_KEY (hex64, no se mostrará): " SMTP_ENCRYPTION_KEY
echo

# Extrae el payload cifrado de la fila singleton de PlatformSmtpConfig.
PAYLOAD=$(docker exec appforge-postgres psql -U appforge -d appforge \
  -t -A -c 'SELECT "encryptedPass" FROM "PlatformSmtpConfig" LIMIT 1;')

# Descifra con node nativo (sin dependencias externas, sin scripts
# auxiliares que puedan no existir el día del desastre).
SMTP_ENCRYPTION_KEY="$SMTP_ENCRYPTION_KEY" PAYLOAD="$PAYLOAD" node -e '
const crypto = require("crypto");
const [ivH, tagH, dataH] = process.env.PAYLOAD.split(":");
if (!ivH || !tagH || !dataH) {
  console.error("ERROR: payload mal formado (esperado iv:tag:ciphertext en hex)");
  process.exit(1);
}
const decipher = crypto.createDecipheriv(
  "aes-256-gcm",
  Buffer.from(process.env.SMTP_ENCRYPTION_KEY, "hex"),
  Buffer.from(ivH, "hex"),
);
decipher.setAuthTag(Buffer.from(tagH, "hex"));
try {
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataH, "hex")),
    decipher.final(),
  ]).toString("utf8");
  console.log("Decrypt OK, length:", plain.length);
} catch (e) {
  console.error("ERROR de descifrado:", e.message);
  console.error("Probable causa: SMTP_ENCRYPTION_KEY de .env NO es la que cifró este dump.");
  console.error("Verificar: fecha del dump vs fechas de rotación de claves (#7 y posteriores).");
  process.exit(1);
}
unset SMTP_ENCRYPTION_KEY
'
```

**Esperado**: `Decrypt OK, length: <N>` con N coherente (≥ 8 chars
para una password SMTP real). Match con el baseline de [[#7]]
(`length: 9` en el plaintext de la rotación verificada).

### 7.4 — Descifrado de `AppSmtpConfig` (el SMTP por app del cliente)

Mismo procedimiento, otra tabla. Si un cliente configuró su propio
SMTP para emails personalizados de su app, su fila vive aquí. Sin este
test, no sabemos si los SMTPs por-app sobreviven a la recuperación.

```bash
read -rsp "SMTP_ENCRYPTION_KEY (hex64, no se mostrará): " SMTP_ENCRYPTION_KEY
echo

# Misma clave (SMTP_ENCRYPTION_KEY cifra ambas tablas), distinta query.
PAYLOAD=$(docker exec appforge-postgres psql -U appforge -d appforge \
  -t -A -c 'SELECT "encryptedPass" FROM "AppSmtpConfig" LIMIT 1;')

# Si la tabla está vacía (ningún cliente configuró SMTP por app),
# este test no aplica. Lo registras y sigues.
if [ -z "$PAYLOAD" ]; then
  echo "AppSmtpConfig vacía — ningún cliente configuró SMTP por app. Test no aplica."
else
  SMTP_ENCRYPTION_KEY="$SMTP_ENCRYPTION_KEY" PAYLOAD="$PAYLOAD" node -e '
  const crypto = require("crypto");
  const [ivH, tagH, dataH] = process.env.PAYLOAD.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.SMTP_ENCRYPTION_KEY, "hex"),
    Buffer.from(ivH, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataH, "hex")),
    decipher.final(),
  ]).toString("utf8");
  console.log("Decrypt OK, length:", plain.length);
  '
fi
unset SMTP_ENCRYPTION_KEY
```

### 7.5 — Listar apps

```bash
TOKEN="<el access_token del Paso 7.2>"
curl -s http://localhost:3000/apps -H "Authorization: Bearer $TOKEN" | head -100
# Esperado: lista no vacía, los slugs/nombres reconocibles.
```

---

## Paso 8 — Cableado operacional

Reconstruir las piezas de monitorización y backup que viven en el VPS,
no en el repo:

1. **`/usr/local/bin/health-alert.sh`** + `/etc/cron.d/health-alert`
   (ver [[TECH_DEBT #82]] para el script completo).
2. **`/usr/local/bin/backup-alert.sh`** + `/etc/cron.d/backup-alert`
   (ver [[TECH_DEBT #81]]).
3. **`/etc/uu-alert.env`** con `BOT_TOKEN`/`CHAT_ID` (del disco
   custodiado).
4. **`/opt/backup-db.sh`** + cron `0 3 * * *` (ver [[TECH_DEBT #80]]).
5. **`/root/.ssh/authorized_keys`** y `/etc/ssh/sshd_config` — solo
   si hubo accesos SSH específicos del operador (no había puller
   remoto cuando se redactó este runbook).
6. **PM2 startup**: `pm2 startup systemd` + `pm2 save` (con el gate
   robusto `grep -oE 'appforge-(api|worker)' /root/.pm2/dump.pm2`
   tras el save — lección de [[TECH_DEBT #86]] bug 1). Verificar que
   `pm2 list` post-reboot resucita ambos procesos antes de declarar
   el VPS recuperado.
7. **NO arrancar procesos PM2 sin `ecosystem.config.js`**: ver Paso
   6 + [[TECH_DEBT #86]] bug 2.

---

## Notas para mantener este runbook vivo

- Cada vez que se rote una clave en `.env` (como en [[#7]]),
  actualizar el item del disco custodiado en el mismo gesto. Sin
  esta disciplina, la custodia queda desfasada silenciosamente y al
  día del desastre **este runbook falla en Paso 7.3 con error de
  descifrado**.
- Cada vez que cambie el contrato de `/health` (body shape), también
  cambia el monitor de [[#82]] (depende de `"ok":true`). Verifica
  ambas piezas.
- Cuando [[#84]] cierre, sustituir el Paso 2 por el comando real de
  fetch off-VPS y borrar la advertencia ⚠️ del encabezado.
- Cuando cambie de máquina el destino de la custodia (gestor nuevo,
  nuevo formato de disco cifrado), actualizar Paso 3 con la nueva
  ubicación.

---

## Anexo — Referencias cruzadas a `TECH_DEBT.md`

- [[#7]] — rotación de claves AES hex64 (baseline del descifrado).
- [[#74]] — SMTP de plataforma (origen del flujo del Paso 7.3).
- [[#78]] — INFRA-2, restore probado (origen del procedimiento del
  Paso 5).
- [[#79]] — custodia off-VPS de las 15 claves (origen del Paso 3).
- [[#80]] — `backup-db.sh` desplegado superior al del repo (origen
  del Paso 8.4).
- [[#81]] — monitor del cron de backup (origen del Paso 8.2).
- [[#82]] — monitor `/health` (origen del Paso 8.1).
- [[#83]] — limpieza de `.env` históricos (relevante: rotaciones
  futuras deben purgar copias).
- [[#84]] — replicación off-VPS del dump **REBAJADA**: cubierta
  por snapshots de Hostinger. Ruta A del árbol de decisión es la
  primaria; Ruta B (este runbook desde-cero) queda para el
  escenario pesimista de proveedor no disponible.
