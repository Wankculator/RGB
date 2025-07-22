#!/bin/bash

# LITECAT Restore Script
# Restores system from backup including database, files, and configurations

set -e

# Configuration
BACKUP_DIR="/var/backups/litecat"
RESTORE_DIR="/var/www/litecat"
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
            -d "text=🐱⚡ LITECAT Restore ${status}: ${message}" \
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

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to list available backups
list_backups() {
    echo "Available backups:"
    echo "=================="
    
    # Local backups
    if [ -d "$BACKUP_DIR" ]; then
        echo -e "\n${GREEN}Local backups:${NC}"
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | awk '{print $9, $5}' || echo "No local backups found"
    fi
    
    # S3 backups
    if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        echo -e "\n${GREEN}S3 backups:${NC}"
        aws s3 ls "s3://${S3_BUCKET}/backups/" | grep "litecat_backup_" || echo "No S3 backups found"
    fi
}

# Parse arguments
if [ "$1" == "--list" ]; then
    list_backups
    exit 0
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_name> [--from-s3]"
    echo "       $0 --list"
    echo ""
    echo "Examples:"
    echo "  $0 litecat_backup_20240315_120000.tar.gz"
    echo "  $0 litecat_backup_20240315_120000.tar.gz --from-s3"
    exit 1
fi

BACKUP_NAME=$1
FROM_S3=false

if [ "$2" == "--from-s3" ]; then
    FROM_S3=true
fi

# Create temporary restore directory
TEMP_RESTORE="/tmp/litecat_restore_$$"
mkdir -p "$TEMP_RESTORE"
cd "$TEMP_RESTORE"

# Download backup if from S3
if [ "$FROM_S3" = true ]; then
    log "Downloading backup from S3..."
    if [ -z "$S3_BUCKET" ]; then
        error "S3_BUCKET not configured"
    fi
    aws s3 cp "s3://${S3_BUCKET}/backups/${BACKUP_NAME}" . || error "Failed to download backup from S3"
else
    # Check if backup exists locally
    if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}" ]; then
        error "Backup not found: $BACKUP_DIR/${BACKUP_NAME}"
    fi
    cp "$BACKUP_DIR/${BACKUP_NAME}" .
fi

# Extract backup
log "Extracting backup..."
tar -xzf "$BACKUP_NAME" || error "Failed to extract backup"

# Find extracted directory
EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "litecat_backup_*" | head -1)
if [ -z "$EXTRACTED_DIR" ]; then
    error "Could not find extracted backup directory"
fi

cd "$EXTRACTED_DIR"

# Stop services
log "Stopping services..."
pm2 stop litecat-api || warning "PM2 process not found"
systemctl stop nginx || warning "Nginx not running"

# Create restore point
log "Creating restore point..."
if [ -d "$RESTORE_DIR" ]; then
    RESTORE_POINT="${RESTORE_DIR}_restore_point_$(date +%Y%m%d_%H%M%S)"
    cp -r "$RESTORE_DIR" "$RESTORE_POINT"
    log "Restore point created at: $RESTORE_POINT"
fi

# Restore database
if [ -f "database_*.sql.gz" ]; then
    log "Restoring database..."
    DB_FILE=$(ls database_*.sql.gz | head -1)
    gunzip "$DB_FILE"
    DB_FILE_SQL="${DB_FILE%.gz}"
    
    if [ ! -z "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" < "$DB_FILE_SQL" || error "Database restore failed"
        log "Database restored successfully"
    else
        warning "DATABASE_URL not configured, skipping database restore"
    fi
fi

# Restore Redis data
if [ -f "redis_*.rdb" ]; then
    log "Restoring Redis data..."
    REDIS_FILE=$(ls redis_*.rdb | head -1)
    
    if command -v redis-cli &> /dev/null; then
        systemctl stop redis-server || true
        cp "$REDIS_FILE" /var/lib/redis/dump.rdb
        chown redis:redis /var/lib/redis/dump.rdb
        systemctl start redis-server
        log "Redis data restored"
    else
        warning "Redis not installed, skipping Redis restore"
    fi
fi

# Restore application files
if [ -d "app_"* ]; then
    log "Restoring application files..."
    APP_DIR=$(ls -d app_* | head -1)
    
    # Create backup directory if it doesn't exist
    mkdir -p "$RESTORE_DIR"
    
    # Restore files
    rsync -av --delete \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='logs' \
        --exclude='temp' \
        --exclude='.env' \
        "$APP_DIR/" "$RESTORE_DIR/" || error "Application files restore failed"
    
    log "Application files restored"
fi

# Restore uploads
if [ -f "uploads_*.tar.gz" ]; then
    log "Restoring user uploads..."
    UPLOADS_FILE=$(ls uploads_*.tar.gz | head -1)
    tar -xzf "$UPLOADS_FILE" -C "$RESTORE_DIR/"
    log "User uploads restored"
fi

# Restore configurations
if [ -d "config_"* ]; then
    log "Restoring configurations..."
    CONFIG_DIR=$(ls -d config_* | head -1)
    
    # Restore Nginx config
    if [ -f "$CONFIG_DIR/litecat" ]; then
        cp "$CONFIG_DIR/litecat" /etc/nginx/sites-available/
        log "Nginx configuration restored"
    fi
    
    # Restore PM2 config
    if [ -f "$CONFIG_DIR/ecosystem.config.js" ]; then
        cp "$CONFIG_DIR/ecosystem.config.js" "$RESTORE_DIR/"
        log "PM2 configuration restored"
    fi
    
    # Restore environment file
    if [ -f "$CONFIG_DIR/env.enc" ]; then
        log "Decrypting environment file..."
        read -p "Enter backup encryption key: " -s ENCRYPTION_KEY
        echo
        openssl enc -d -aes-256-cbc -in "$CONFIG_DIR/env.enc" -out "$RESTORE_DIR/.env" -k "$ENCRYPTION_KEY"
        chmod 600 "$RESTORE_DIR/.env"
        log "Environment file restored"
    fi
fi

# Rebuild application
log "Rebuilding application..."
cd "$RESTORE_DIR"
npm ci || error "Failed to install dependencies"
npm run build:production || error "Failed to build application"

# Set permissions
log "Setting permissions..."
chown -R www-data:www-data "$RESTORE_DIR"
chmod -R 755 "$RESTORE_DIR"
chmod -R 775 "$RESTORE_DIR/logs" "$RESTORE_DIR/uploads" "$RESTORE_DIR/temp"

# Start services
log "Starting services..."
systemctl start nginx
pm2 start ecosystem.config.js || pm2 start
pm2 save

# Verify services
log "Verifying services..."
sleep 5

# Check if services are running
if pm2 status | grep -q "litecat-api.*online"; then
    log "PM2 process running"
else
    error "PM2 process not running"
fi

if systemctl is-active --quiet nginx; then
    log "Nginx running"
else
    error "Nginx not running"
fi

# Test application
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "Application health check passed"
else
    error "Application health check failed"
fi

# Clean up
log "Cleaning up..."
rm -rf "$TEMP_RESTORE"

# Generate restore report
REPORT="Restore completed successfully!\n"
REPORT+="Backup: ${BACKUP_NAME}\n"
REPORT+="Restored to: ${RESTORE_DIR}\n"
REPORT+="Restore point: ${RESTORE_POINT:-None}\n"

log "$REPORT"
send_notification "$REPORT" "✅ Success"

log "Restore process completed successfully!"
log ""
log "Next steps:"
log "1. Verify application functionality"
log "2. Check logs: pm2 logs"
log "3. Monitor system: pm2 monit"
log ""
log "To rollback to restore point (if created):"
log "  mv $RESTORE_DIR ${RESTORE_DIR}_failed"
log "  mv $RESTORE_POINT $RESTORE_DIR"