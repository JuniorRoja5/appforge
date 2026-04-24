#!/bin/bash
# ============================================================================
# AppForge SaaS — Backup Script
# 
# Realiza backup diario comprimido de PostgreSQL
# Retiene últimos 30 días
# Se ejecuta via cron a las 3:00 AM
#
# Instalación:
#   chmod +x /opt/backup-db.sh
#   (crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-db.sh") | crontab -
# ============================================================================

set -e

# Configuración
BACKUP_DIR="/backups/db"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="appforge"
DB_NAME="appforge_prod"
DB_PASSWORD=$(grep DATABASE_URL /opt/appforge/appforge-backend/.env | grep -oP '(?<=:)\w+(?=@)' || echo "")
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/appforge_$DATE.sql.gz"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Log
LOG_FILE="/var/log/appforge/backup.log"
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Iniciando backup de PostgreSQL ==="
log "Base de datos: $DB_NAME"
log "Host: $DB_HOST"
log "Usuario: $DB_USER"
log "Archivo: $BACKUP_FILE"

# Realizar backup
if [ -z "$DB_PASSWORD" ]; then
  log "ERROR: No se pudo extraer la contraseña de DATABASE_URL"
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE" 2>> "$LOG_FILE"; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "✓ Backup completado exitosamente"
  log "  Tamaño: $BACKUP_SIZE"
else
  log "ERROR: Fallo durante el dump de la BD"
  exit 1
fi

# Limpiar backups antiguos
log "Limpiando backups más antiguos que $RETENTION_DAYS días..."
DELETED_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "appforge_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm {} \; -print | wc -l)
log "✓ Se eliminaron $DELETED_COUNT backups antiguos"

# Verificar integridad del backup
log "Verificando integridad del backup..."
if gzip -t "$BACKUP_FILE" 2>> "$LOG_FILE"; then
  log "✓ Integridad del backup verificada"
else
  log "ERROR: El archivo backup está corrupto"
  rm "$BACKUP_FILE"
  exit 1
fi

# Resumen
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/appforge_*.sql.gz 2>/dev/null | wc -l)
log "=== Backup completado ==="
log "Total de backups retenidos: $BACKUP_COUNT"
log ""
