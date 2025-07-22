#!/bin/bash

# LITECAT Automated Backup Cron Setup
# Sets up automated daily backups with monitoring

set -e

# Configuration
SCRIPTS_DIR="/var/www/litecat/scripts"
LOG_DIR="/var/log/litecat"
CRON_USER="root"

# Create log directory
mkdir -p "$LOG_DIR"

# Function to setup cron job
setup_cron() {
    local schedule=$1
    local description=$2
    local cron_entry="$schedule cd $SCRIPTS_DIR && ./backup.sh >> $LOG_DIR/backup.log 2>&1"
    
    # Remove existing entry if any
    crontab -u $CRON_USER -l 2>/dev/null | grep -v "backup.sh" | crontab -u $CRON_USER - || true
    
    # Add new entry
    (crontab -u $CRON_USER -l 2>/dev/null; echo "# $description"; echo "$cron_entry") | crontab -u $CRON_USER -
    
    echo "✅ Cron job configured: $description"
    echo "   Schedule: $schedule"
}

# Display menu
echo "🐱⚡ LITECAT Backup Schedule Configuration"
echo "========================================"
echo ""
echo "Select backup schedule:"
echo "1) Daily at 2:00 AM"
echo "2) Twice daily (2:00 AM and 2:00 PM)"
echo "3) Weekly (Sunday at 2:00 AM)"
echo "4) Custom schedule"
echo "5) Disable automated backups"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_cron "0 2 * * *" "Daily backup at 2:00 AM"
        ;;
    2)
        setup_cron "0 2,14 * * *" "Twice daily backup at 2:00 AM and 2:00 PM"
        ;;
    3)
        setup_cron "0 2 * * 0" "Weekly backup on Sunday at 2:00 AM"
        ;;
    4)
        echo "Enter custom cron schedule (e.g., '0 3 * * *' for 3:00 AM daily):"
        read -p "Schedule: " custom_schedule
        setup_cron "$custom_schedule" "Custom backup schedule"
        ;;
    5)
        crontab -u $CRON_USER -l 2>/dev/null | grep -v "backup.sh" | crontab -u $CRON_USER - || true
        echo "✅ Automated backups disabled"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Setup log rotation for backup logs
cat > /etc/logrotate.d/litecat-backup << EOF
$LOG_DIR/backup.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

echo ""
echo "📋 Current cron configuration:"
crontab -u $CRON_USER -l | grep -A1 -B1 "backup.sh" || echo "No backup jobs configured"

echo ""
echo "✅ Backup automation configured successfully!"
echo ""
echo "Additional commands:"
echo "- View cron jobs: crontab -l"
echo "- View backup logs: tail -f $LOG_DIR/backup.log"
echo "- Run backup manually: cd $SCRIPTS_DIR && ./backup.sh"
echo "- List backups: ./restore.sh --list"