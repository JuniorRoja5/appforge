#!/bin/bash
set -e

# ============================================================================
# AppForge SaaS — Deploy Setup Script
# Ubuntu 24.04 LTS | Hostinger KVM 2
# 
# Este script configura la infraestructura completa de producción.
# Ejecutar UNA SOLA VEZ después de que Hostinger haya instalado Ubuntu.
#
# Uso: bash deploy-setup.sh
# ============================================================================

echo "🚀 AppForge SaaS — Instalación de Infraestructura"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Este script debe ejecutarse como root (sudo)${NC}"
  exit 1
fi

echo -e "${YELLOW}[1/12] Actualizando sistema operativo...${NC}"
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git build-essential software-properties-common

echo -e "${YELLOW}[2/12] Instalando Docker y Docker Compose...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
usermod -aG docker root

# Docker Compose (standalone)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Iniciar Docker
systemctl enable docker
systemctl start docker

echo -e "${YELLOW}[3/12] Instalando Node.js v20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# npm global packages
npm install -g pm2 yarn

echo -e "${YELLOW}[4/12] Instalando PostgreSQL 15 (cliente)...${NC}"
apt-get install -y postgresql-client-15

echo -e "${YELLOW}[5/12] Instalando Redis (cliente)...${NC}"
apt-get install -y redis-tools

echo -e "${YELLOW}[6/12] Instalando JDK 17 (para Gradle/Android builds)...${NC}"
apt-get install -y openjdk-17-jdk

echo -e "${YELLOW}[7/12] Instalando Android SDK...${NC}"
mkdir -p /opt/android-sdk
cd /opt/android-sdk

# Descargar cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
rm commandlinetools-linux-11076708_latest.zip

# Renombrar estructura esperada por Gradle
mv cmdline-tools tools

# Aceptar licencias y descargar componentes
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin

yes | sdkmanager --sdk_root=/opt/android-sdk "platforms;android-34"
yes | sdkmanager --sdk_root=/opt/android-sdk "build-tools;34.0.0"
yes | sdkmanager --sdk_root=/opt/android-sdk "ndk;26.1.10909125"

# Permisos
chmod -R 755 /opt/android-sdk

echo -e "${YELLOW}[8/12] Instalando Gradle...${NC}"
mkdir -p /opt/gradle
cd /opt/gradle
wget https://services.gradle.org/distributions/gradle-8.7-bin.zip
unzip -q gradle-8.7-bin.zip
rm gradle-8.7-bin.zip
ln -sf /opt/gradle/gradle-8.7/bin/gradle /usr/local/bin/gradle

echo -e "${YELLOW}[9/12] Configurando variables de entorno...${NC}"
cat >> /root/.bashrc << 'EOF'
export ANDROID_SDK_ROOT=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export GRADLE_HOME=/opt/gradle/gradle-8.7
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin:$GRADLE_HOME/bin
EOF

source /root/.bashrc

echo -e "${YELLOW}[10/12] Instalando Nginx...${NC}"
apt-get install -y nginx

echo -e "${YELLOW}[11/12] Instalando Certbot (Let's Encrypt)...${NC}"
apt-get install -y certbot python3-certbot-nginx

echo -e "${YELLOW}[12/12] Configurando Postfix (SMTP)...${NC}"
# Instalación no-interactiva de Postfix
echo "postfix postfix/mailname string creatu.app" | debconf-set-selections
echo "postfix postfix/main_mailer_type string 'Internet Site'" | debconf-set-selections
apt-get install -y postfix

# ============================================================================
# Configuración de directorios y permisos
# ============================================================================

echo -e "${GREEN}✓ Creando directorios de aplicación...${NC}"
mkdir -p /opt/appforge
mkdir -p /backups/db
mkdir -p /var/log/appforge
chown -R root:root /opt/appforge /backups /var/log/appforge
chmod -R 755 /opt/appforge /backups /var/log/appforge

# ============================================================================
# UFW Firewall
# ============================================================================

echo -e "${GREEN}✓ Configurando firewall (UFW)...${NC}"
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Nginx)
ufw allow 443/tcp   # HTTPS (Nginx)
ufw --force enable

# ============================================================================
# PM2 Startup
# ============================================================================

echo -e "${GREEN}✓ Configurando PM2 para auto-startup...${NC}"
pm2 startup -u root --hp /root
pm2 save

# ============================================================================
# Cron para backups diarios de PostgreSQL
# ============================================================================

echo -e "${GREEN}✓ Creando cron job para backups...${NC}"
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/db"
DB_HOST="localhost"
DB_USER="appforge"
DB_NAME="appforge_prod"
DATE=$(date +\%Y\%m\%d)

# Realizar backup
PGPASSWORD="$(cat /opt/appforge/.env | grep 'DATABASE_URL' | grep -oP '(?<=:)\w+(?=@)' || echo '')" pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/appforge_$DATE.sql.gz"

# Retener últimos 30 días
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completado: appforge_$DATE.sql.gz"
EOF
chmod +x /opt/backup-db.sh

# Añadir cron job (3:00 AM diario)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-db.sh >> /var/log/appforge/backup.log 2>&1") | crontab -

# ============================================================================
# Verificación final
# ============================================================================

echo ""
echo -e "${GREEN}=================================================="
echo "✓ Instalación completada exitosamente"
echo "==================================================${NC}"
echo ""
echo "Componentes instalados:"
echo "  ✓ Docker $(docker --version)"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ npm $(npm --version)"
echo "  ✓ PM2 v$(pm2 --version)"
echo "  ✓ JDK $(java -version 2>&1 | grep 'version' | head -1)"
echo "  ✓ Gradle $(gradle --version | head -1)"
echo "  ✓ Android SDK /opt/android-sdk"
echo "  ✓ Nginx"
echo "  ✓ Certbot (Let's Encrypt)"
echo "  ✓ Postfix (SMTP)"
echo "  ✓ PostgreSQL Client"
echo "  ✓ Redis Client"
echo ""
echo "Próximos pasos:"
echo "  1. Clonar repositorio: git clone https://github.com/JuniorRoja5/appforge.git /opt/appforge"
echo "  2. Configurar .env.production en /opt/appforge/appforge-backend/"
echo "  3. Copiar docker-compose.prod.yml a /opt/appforge/"
echo "  4. Ejecutar: cd /opt/appforge && docker-compose -f docker-compose.prod.yml up -d"
echo "  5. Ejecutar migraciones: cd appforge-backend && npm install && npx prisma migrate deploy"
echo "  6. Seed data: npm run seed"
echo "  7. Build apps: cd ../appforge-builder && npm run build && cd ../appforge-admin && npm run build"
echo "  8. Iniciar PM2: pm2 start ecosystem.prod.config.js"
echo "  9. Configurar Nginx: cp nginx.conf /etc/nginx/sites-available/appforge.conf && ln -s /etc/nginx/sites-available/appforge.conf /etc/nginx/sites-enabled/"
echo "  10. Certbot: certbot --nginx -d api.creatu.app -d app.creatu.app -d admin.creatu.app"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Configura las variables en /opt/appforge/.env.production${NC}"
echo "    incluyendo Stripe keys, JWT secrets, y credenciales de base de datos."
echo ""
