#!/bin/bash
set -euo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

BACKUP_DIR="/backups/db"
CONTAINER="appforge-postgres"
ENV_FILE="/opt/appforge/appforge-backend/.env"
DATE="$(date +%Y%m%d)"
TS="$(date '+%Y-%m-%d %H:%M:%S')"
OUT="$BACKUP_DIR/appforge_$DATE.sql.gz"
MIN_SIZE=1024

mkdir -p "$BACKUP_DIR"

DB_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [ -z "$DB_URL" ]; then
  echo "[$TS] ERROR: DATABASE_URL no encontrada en $ENV_FILE" >&2
  exit 1
fi

echo "[$TS] Iniciando backup -> $OUT"

docker exec "$CONTAINER" pg_dump --dbname="$DB_URL" --clean --if-exists | gzip > "$OUT"

ACTUAL_SIZE="$(stat -c '%s' "$OUT")"
if [ "$ACTUAL_SIZE" -lt "$MIN_SIZE" ]; then
  echo "[$TS] ERROR: backup demasiado pequeno ($ACTUAL_SIZE bytes < $MIN_SIZE). pg_dump probablemente fallo." >&2
  rm -f "$OUT"
  exit 1
fi

if ! gzip -t "$OUT" 2>/dev/null; then
  echo "[$TS] ERROR: archivo gzip corrupto." >&2
  rm -f "$OUT"
  exit 1
fi

HEADER="$(zcat "$OUT" 2>/dev/null | head -5 || true)"
if ! echo "$HEADER" | grep -q "PostgreSQL database dump"; then
  echo "[$TS] ERROR: el dump no contiene cabecera de pg_dump." >&2
  rm -f "$OUT"
  exit 1
fi

find "$BACKUP_DIR" -name 'appforge_*.sql.gz' -mtime +30 -delete

echo "[$TS] OK -- backup $OUT ($ACTUAL_SIZE bytes)"
