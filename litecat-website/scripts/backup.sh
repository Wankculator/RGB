#!/bin/bash

# LITECAT Backup Script
# Performs full system backup including database, files, and configurations

set -e

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="/var/backups/litecat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="litecat_backup_${TIMESTAMP}"
RETENTION_DAYS=30
S3_BUCKET=${BACKUP_S3_BUCKET:-""}
TELEGRAM_TOKEN=${BACKUP_TELEGRAM_TOKEN:-""}
TELEGRAM_CHAT_ID=${BACKUP_TELEGRAM_CHAT_ID:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to send notification
send_notification() {
    local message=$1
    local status=$2
    
    if [ ! -z "$TELEGRAM_TOKEN" ] && [ ! -z "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=🐱⚡ LITECAT Backup ${status}: ${message}" \
            -d "parse_mode=HTML" > /dev/null
    fi
}

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    send_notification "$1" "❌ Failed"
    exit 1
}

# Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR/${BACKUP_NAME}"
cd "$BACKUP_DIR/${BACKUP_NAME}"

# Backup database (Supabase)
log "Backing up database..."
if [ ! -z "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" -f "database_${TIMESTAMP}.sql" || error "Database backup failed"
    gzip "database_${TIMESTAMP}.sql"
    log "Database backup completed"
else
    log "Skipping database backup (no DATABASE_URL configured)"
fi

# Backup Redis data
log "Backing up Redis data..."
if command -v redis-cli &> /dev/null; then
    redis-cli --rdb "redis_${TIMESTAMP}.rdb" || log "Redis backup failed (non-critical)"
else
    log "Skipping Redis backup (Redis not installed)"
fi

# Backup application files
log "Backing up application files..."
APP_BACKUP_DIR="app_${TIMESTAMP}"
mkdir -p "$APP_BACKUP_DIR"

# Files to backup
rsync -av --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    --exclude='.git' \
    --exclude='temp' \
    --exclude='uploads/temp' \
    /var/www/litecat/ "$APP_BACKUP_DIR/" || error "Application files backup failed"

# Backup uploads directory separately
if [ -d "/var/www/litecat/uploads" ]; then
    log "Backing up user uploads..."
    tar -czf "uploads_${TIMESTAMP}.tar.gz" -C /var/www/litecat uploads/
fi

# Backup configuration files
log "Backing up configuration files..."
CONFIG_BACKUP_DIR="config_${TIMESTAMP}"
mkdir -p "$CONFIG_BACKUP_DIR"

# Nginx configuration
[ -f "/etc/nginx/sites-available/litecat" ] && cp /etc/nginx/sites-available/litecat "$CONFIG_BACKUP_DIR/"

# PM2 configuration
[ -f "/var/www/litecat/ecosystem.config.js" ] && cp /var/www/litecat/ecosystem.config.js "$CONFIG_BACKUP_DIR/"

# Environment file (encrypted)
if [ -f "/var/www/litecat/.env" ]; then
    openssl enc -aes-256-cbc -salt -in /var/www/litecat/.env -out "$CONFIG_BACKUP_DIR/env.enc" -k "${BACKUP_ENCRYPTION_KEY:-defaultkey}"
fi

# SSL certificates metadata (not the actual certs)
if [ -d "/etc/letsencrypt/live/litecat.xyz" ]; then
    echo "SSL certificates present for litecat.xyz" > "$CONFIG_BACKUP_DIR/ssl_info.txt"
    ls -la /etc/letsencrypt/live/litecat.xyz/ >> "$CONFIG_BACKUP_DIR/ssl_info.txt"
fi

# Create backup archive
log "Creating backup archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME/"
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

# Upload to S3 if configured
if [ ! -z "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_NAME}.tar.gz" "s3://${S3_BUCKET}/backups/" || error "S3 upload failed"
        log "Backup uploaded to S3"
    else
        log "AWS CLI not installed, skipping S3 upload"
    fi
fi

# Clean up temporary files
log "Cleaning up temporary files..."
rm -rf "$BACKUP_NAME"

# Remove old backups
log "Removing old backups (older than ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "litecat_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Generate backup report
REPORT="Backup completed successfully!\n"
REPORT+="Name: ${BACKUP_NAME}\n"
REPORT+="Size: ${BACKUP_SIZE}\n"
REPORT+="Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz\n"
[ ! -z "$S3_BUCKET" ] && REPORT+="S3: s3://${S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz\n"

log "$REPORT"
send_notification "$REPORT" "✅ Success"

# Create backup info file
cat > "$BACKUP_DIR/latest_backup.info" << EOF
BACKUP_NAME=${BACKUP_NAME}
BACKUP_DATE=$(date)
BACKUP_SIZE=${BACKUP_SIZE}
BACKUP_PATH=${BACKUP_DIR}/${BACKUP_NAME}.tar.gz
S3_PATH=${S3_BUCKET:+s3://${S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz}
EOF

log "Backup process completed successfully!"