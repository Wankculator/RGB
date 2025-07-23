#!/bin/bash

# LIGHTCAT Backup & Recovery Script
# Comprehensive backup solution for all components

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/lightcat-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"
S3_BUCKET="${S3_BUCKET:-}"
BACKUP_PASSWORD_FILE="$HOME/.lightcat-backup-password"

# Ensure backup directory exists
mkdir -p "$BACKUP_ROOT"

# Function to generate backup password
generate_backup_password() {
    if [ ! -f "$BACKUP_PASSWORD_FILE" ]; then
        echo -e "${YELLOW}🔐 Generating backup encryption password...${NC}"
        openssl rand -base64 32 > "$BACKUP_PASSWORD_FILE"
        chmod 600 "$BACKUP_PASSWORD_FILE"
        echo -e "${GREEN}✅ Password saved to: $BACKUP_PASSWORD_FILE${NC}"
        echo -e "${RED}⚠️  IMPORTANT: Back up this password file securely!${NC}"
        echo ""
    fi
}

# Function to perform full backup
perform_full_backup() {
    echo -e "${BLUE}💾 Performing Full Backup...${NC}"
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_DIR="$BACKUP_ROOT/full-$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"
    
    # Backup application files
    echo "Backing up application files..."
    tar -czf "$BACKUP_DIR/application.tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=backups \
        client server database scripts package*.json ecosystem.config.js
    
    # Backup configuration
    echo "Backing up configuration..."
    if [ -f .env ]; then
        cp .env "$BACKUP_DIR/.env.backup"
    fi
    
    # Backup database
    backup_database "$BACKUP_DIR"
    
    # Backup RGB wallet
    backup_rgb_wallet "$BACKUP_DIR"
    
    # Backup Lightning node
    backup_lightning_node "$BACKUP_DIR"
    
    # Backup PM2 configuration
    echo "Backing up PM2 configuration..."
    pm2 save
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.json" 2>/dev/null || true
    
    # Create backup manifest
    create_backup_manifest "$BACKUP_DIR"
    
    # Encrypt backup if enabled
    if [ "$ENCRYPTION_ENABLED" = "true" ]; then
        encrypt_backup "$BACKUP_DIR"
    fi
    
    # Upload to S3 if configured
    if [ ! -z "$S3_BUCKET" ]; then
        upload_to_s3 "$BACKUP_DIR"
    fi
    
    # Clean old backups
    clean_old_backups
    
    echo -e "${GREEN}✅ Full backup completed: $BACKUP_DIR${NC}"
}

# Function to backup database
backup_database() {
    local backup_dir=$1
    echo "Backing up database..."
    
    if [ ! -z "${DATABASE_URL:-}" ]; then
        pg_dump "$DATABASE_URL" | gzip > "$backup_dir/database.sql.gz"
        echo "✅ Database backed up"
    elif [ ! -z "${SUPABASE_URL:-}" ]; then
        # Backup Supabase using API
        echo "⚠️  Supabase backup requires manual export from dashboard"
        echo "   Visit: $SUPABASE_URL"
    else
        echo "⚠️  No database configuration found"
    fi
}

# Function to backup RGB wallet
backup_rgb_wallet() {
    local backup_dir=$1
    echo "Backing up RGB wallet..."
    
    RGB_DIR="${RGB_DIR:-$HOME/.rgb}"
    if [ -d "$RGB_DIR" ]; then
        tar -czf "$backup_dir/rgb-wallet.tar.gz" -C "$RGB_DIR" .
        echo "✅ RGB wallet backed up"
    else
        echo "⚠️  RGB wallet directory not found"
    fi
}

# Function to backup Lightning node
backup_lightning_node() {
    local backup_dir=$1
    echo "Backing up Lightning node..."
    
    # LND backup
    if [ -d "$HOME/.lnd" ]; then
        # Backup channel.backup (most important!)
        cp "$HOME/.lnd/data/chain/bitcoin/mainnet/channel.backup" \
           "$backup_dir/lnd-channel.backup" 2>/dev/null || true
        
        # Backup macaroons and certs
        tar -czf "$backup_dir/lnd-credentials.tar.gz" \
            -C "$HOME/.lnd" \
            tls.cert tls.key \
            data/chain/bitcoin/mainnet/admin.macaroon \
            2>/dev/null || true
        
        echo "✅ LND backed up"
    fi
    
    # Core Lightning backup
    if [ -d "$HOME/.lightning" ]; then
        tar -czf "$backup_dir/cln-backup.tar.gz" \
            -C "$HOME/.lightning" \
            --exclude=bitcoin \
            . 2>/dev/null || true
        echo "✅ Core Lightning backed up"
    fi
}

# Function to create backup manifest
create_backup_manifest() {
    local backup_dir=$1
    
    cat > "$backup_dir/manifest.json" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "$(git describe --tags --always 2>/dev/null || echo 'unknown')",
    "hostname": "$(hostname)",
    "components": {
        "application": $([ -f "$backup_dir/application.tar.gz" ] && echo "true" || echo "false"),
        "database": $([ -f "$backup_dir/database.sql.gz" ] && echo "true" || echo "false"),
        "rgb_wallet": $([ -f "$backup_dir/rgb-wallet.tar.gz" ] && echo "true" || echo "false"),
        "lightning": $([ -f "$backup_dir/lnd-channel.backup" ] && echo "true" || echo "false"),
        "configuration": $([ -f "$backup_dir/.env.backup" ] && echo "true" || echo "false")
    },
    "size_bytes": $(du -sb "$backup_dir" | cut -f1),
    "file_count": $(find "$backup_dir" -type f | wc -l)
}
EOF
}

# Function to encrypt backup
encrypt_backup() {
    local backup_dir=$1
    echo "Encrypting backup..."
    
    generate_backup_password
    
    # Create encrypted archive
    tar -czf - -C "$backup_dir" . | \
        openssl enc -aes-256-cbc -salt -pbkdf2 \
        -pass file:"$BACKUP_PASSWORD_FILE" \
        -out "$backup_dir.enc"
    
    # Remove unencrypted backup
    rm -rf "$backup_dir"
    
    echo "✅ Backup encrypted: $backup_dir.enc"
}

# Function to decrypt backup
decrypt_backup() {
    local encrypted_file=$1
    local output_dir=$2
    
    echo "Decrypting backup..."
    
    if [ ! -f "$BACKUP_PASSWORD_FILE" ]; then
        echo -e "${RED}❌ Backup password file not found: $BACKUP_PASSWORD_FILE${NC}"
        exit 1
    fi
    
    mkdir -p "$output_dir"
    
    openssl enc -d -aes-256-cbc -pbkdf2 \
        -pass file:"$BACKUP_PASSWORD_FILE" \
        -in "$encrypted_file" | \
        tar -xzf - -C "$output_dir"
    
    echo "✅ Backup decrypted to: $output_dir"
}

# Function to upload to S3
upload_to_s3() {
    local backup_dir=$1
    echo "Uploading to S3..."
    
    if command -v aws &> /dev/null; then
        if [ "$ENCRYPTION_ENABLED" = "true" ]; then
            aws s3 cp "$backup_dir.enc" "s3://$S3_BUCKET/lightcat-backups/"
        else
            aws s3 sync "$backup_dir" "s3://$S3_BUCKET/lightcat-backups/$(basename $backup_dir)/"
        fi
        echo "✅ Backup uploaded to S3"
    else
        echo "⚠️  AWS CLI not installed, skipping S3 upload"
    fi
}

# Function to restore from backup
restore_from_backup() {
    echo -e "${BLUE}🔄 Restoring from Backup...${NC}"
    
    # List available backups
    echo "Available backups:"
    ls -lht "$BACKUP_ROOT" | grep -E "(full-|\.enc)" | head -10
    echo ""
    
    read -p "Enter backup name to restore: " backup_name
    
    BACKUP_PATH="$BACKUP_ROOT/$backup_name"
    
    if [ ! -e "$BACKUP_PATH" ]; then
        echo -e "${RED}❌ Backup not found: $BACKUP_PATH${NC}"
        exit 1
    fi
    
    # Create restore directory
    RESTORE_DIR="$BACKUP_ROOT/restore-$(date +%Y%m%d-%H%M%S)"
    
    # Decrypt if needed
    if [[ "$backup_name" == *.enc ]]; then
        decrypt_backup "$BACKUP_PATH" "$RESTORE_DIR"
    else
        RESTORE_DIR="$BACKUP_PATH"
    fi
    
    echo ""
    echo "Backup contents:"
    ls -la "$RESTORE_DIR"
    echo ""
    
    echo -e "${YELLOW}⚠️  WARNING: This will overwrite current data!${NC}"
    read -p "Continue with restore? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    # Perform restore
    restore_application "$RESTORE_DIR"
    restore_database "$RESTORE_DIR"
    restore_rgb_wallet "$RESTORE_DIR"
    restore_lightning_node "$RESTORE_DIR"
    
    echo -e "${GREEN}✅ Restore completed!${NC}"
}

# Function to restore application
restore_application() {
    local restore_dir=$1
    
    if [ -f "$restore_dir/application.tar.gz" ]; then
        echo "Restoring application files..."
        tar -xzf "$restore_dir/application.tar.gz" -C .
        
        # Restore configuration
        if [ -f "$restore_dir/.env.backup" ]; then
            cp "$restore_dir/.env.backup" .env
        fi
        
        # Reinstall dependencies
        npm install
        
        echo "✅ Application restored"
    fi
}

# Function to restore database
restore_database() {
    local restore_dir=$1
    
    if [ -f "$restore_dir/database.sql.gz" ]; then
        echo "Restoring database..."
        
        if [ ! -z "${DATABASE_URL:-}" ]; then
            gunzip -c "$restore_dir/database.sql.gz" | psql "$DATABASE_URL"
            echo "✅ Database restored"
        else
            echo "⚠️  DATABASE_URL not set, skipping database restore"
        fi
    fi
}

# Function to restore RGB wallet
restore_rgb_wallet() {
    local restore_dir=$1
    
    if [ -f "$restore_dir/rgb-wallet.tar.gz" ]; then
        echo "Restoring RGB wallet..."
        
        RGB_DIR="${RGB_DIR:-$HOME/.rgb}"
        mkdir -p "$RGB_DIR"
        tar -xzf "$restore_dir/rgb-wallet.tar.gz" -C "$RGB_DIR"
        
        echo "✅ RGB wallet restored"
    fi
}

# Function to restore Lightning node
restore_lightning_node() {
    local restore_dir=$1
    
    # Restore LND
    if [ -f "$restore_dir/lnd-channel.backup" ]; then
        echo "Restoring LND channel backup..."
        
        LND_DIR="$HOME/.lnd"
        mkdir -p "$LND_DIR/data/chain/bitcoin/mainnet"
        cp "$restore_dir/lnd-channel.backup" \
           "$LND_DIR/data/chain/bitcoin/mainnet/channel.backup"
        
        if [ -f "$restore_dir/lnd-credentials.tar.gz" ]; then
            tar -xzf "$restore_dir/lnd-credentials.tar.gz" -C "$LND_DIR"
        fi
        
        echo "✅ LND restored"
        echo "⚠️  Remember to unlock wallet and run: lncli restorechanbackup"
    fi
}

# Function to clean old backups
clean_old_backups() {
    echo "Cleaning old backups..."
    
    # Clean local backups
    find "$BACKUP_ROOT" -name "full-*" -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    find "$BACKUP_ROOT" -name "*.enc" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean S3 backups if configured
    if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 ls "s3://$S3_BUCKET/lightcat-backups/" | \
            awk '{print $4}' | \
            while read file; do
                age=$(( ($(date +%s) - $(date -d "$(aws s3 ls s3://$S3_BUCKET/lightcat-backups/$file | awk '{print $1, $2}')" +%s)) / 86400 ))
                if [ $age -gt $BACKUP_RETENTION_DAYS ]; then
                    aws s3 rm "s3://$S3_BUCKET/lightcat-backups/$file"
                fi
            done
    fi
    
    echo "✅ Old backups cleaned"
}

# Function to verify backup
verify_backup() {
    local backup_path=$1
    echo -e "${BLUE}🔍 Verifying Backup...${NC}"
    
    # Check if backup exists
    if [ ! -e "$backup_path" ]; then
        echo -e "${RED}❌ Backup not found: $backup_path${NC}"
        return 1
    fi
    
    # Decrypt if needed
    TEMP_DIR="$BACKUP_ROOT/verify-$$"
    if [[ "$backup_path" == *.enc ]]; then
        decrypt_backup "$backup_path" "$TEMP_DIR"
    else
        TEMP_DIR="$backup_path"
    fi
    
    # Check manifest
    if [ -f "$TEMP_DIR/manifest.json" ]; then
        echo "Backup manifest:"
        cat "$TEMP_DIR/manifest.json" | jq .
    fi
    
    # Verify components
    echo ""
    echo "Verifying components:"
    [ -f "$TEMP_DIR/application.tar.gz" ] && echo "✅ Application backup found" || echo "❌ Application backup missing"
    [ -f "$TEMP_DIR/database.sql.gz" ] && echo "✅ Database backup found" || echo "❌ Database backup missing"
    [ -f "$TEMP_DIR/rgb-wallet.tar.gz" ] && echo "✅ RGB wallet backup found" || echo "❌ RGB wallet backup missing"
    [ -f "$TEMP_DIR/lnd-channel.backup" ] && echo "✅ Lightning backup found" || echo "❌ Lightning backup missing"
    [ -f "$TEMP_DIR/.env.backup" ] && echo "✅ Configuration backup found" || echo "❌ Configuration backup missing"
    
    # Cleanup
    if [[ "$backup_path" == *.enc ]]; then
        rm -rf "$TEMP_DIR"
    fi
    
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup      Perform full backup"
    echo "  restore     Restore from backup"
    echo "  verify      Verify backup integrity"
    echo "  list        List available backups"
    echo "  clean       Clean old backups"
    echo ""
    echo "Options:"
    echo "  --no-encrypt    Disable backup encryption"
    echo "  --s3 BUCKET     Upload to S3 bucket"
    echo "  --retention N   Keep backups for N days (default: 30)"
    echo ""
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        backup|restore|verify|list|clean)
            COMMAND=$1
            shift
            ;;
        --no-encrypt)
            ENCRYPTION_ENABLED=false
            shift
            ;;
        --s3)
            S3_BUCKET=$2
            shift 2
            ;;
        --retention)
            BACKUP_RETENTION_DAYS=$2
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute command
case "$COMMAND" in
    backup)
        perform_full_backup
        ;;
    restore)
        restore_from_backup
        ;;
    verify)
        read -p "Enter backup name to verify: " backup_name
        verify_backup "$BACKUP_ROOT/$backup_name"
        ;;
    list)
        echo "Available backups:"
        ls -lht "$BACKUP_ROOT" | grep -E "(full-|\.enc)"
        ;;
    clean)
        clean_old_backups
        ;;
    *)
        show_usage
        exit 1
        ;;
esac