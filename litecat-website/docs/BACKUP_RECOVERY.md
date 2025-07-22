# LITECAT Backup and Recovery Guide

## Overview

This guide covers the backup and recovery procedures for the LITECAT platform, including automated backups, manual backups, and disaster recovery.

## Backup Components

The backup system covers:
- **Database**: Complete PostgreSQL/Supabase database dump
- **Redis Data**: Cache and session data
- **Application Files**: Source code, configurations, and static assets
- **User Uploads**: All user-uploaded content
- **Configuration Files**: Nginx, PM2, and environment settings
- **SSL Certificates**: Certificate metadata (not the actual certs)

## Automated Backups

### Setup Automated Backups

1. Configure environment variables in `.env`:
```bash
# S3 Configuration (optional)
BACKUP_S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1

# Notifications (optional)
BACKUP_TELEGRAM_TOKEN=your-telegram-bot-token
BACKUP_TELEGRAM_CHAT_ID=your-chat-id

# Encryption
BACKUP_ENCRYPTION_KEY=your-strong-encryption-key
```

2. Run the cron setup script:
```bash
cd /var/www/litecat/scripts
sudo ./backup-cron.sh
```

3. Choose your backup schedule:
   - Daily at 2:00 AM (recommended)
   - Twice daily
   - Weekly
   - Custom schedule

### Backup Retention

By default, backups are retained for 30 days. Modify the `RETENTION_DAYS` variable in `backup.sh` to change this.

## Manual Backups

### Creating a Manual Backup

```bash
cd /var/www/litecat/scripts
sudo ./backup.sh
```

This will:
1. Create a timestamped backup in `/var/backups/litecat/`
2. Upload to S3 if configured
3. Send notification if configured
4. Clean up old backups

### Backup Output

Backups are stored as compressed archives:
```
/var/backups/litecat/litecat_backup_20240315_120000.tar.gz
```

## Recovery Procedures

### List Available Backups

```bash
cd /var/www/litecat/scripts
sudo ./restore.sh --list
```

### Restore from Local Backup

```bash
sudo ./restore.sh litecat_backup_20240315_120000.tar.gz
```

### Restore from S3 Backup

```bash
sudo ./restore.sh litecat_backup_20240315_120000.tar.gz --from-s3
```

### Recovery Process

The restore script will:
1. Download backup (if from S3)
2. Create a restore point of current system
3. Stop all services
4. Restore database
5. Restore Redis data
6. Restore application files
7. Restore configurations
8. Rebuild application
9. Start services
10. Verify system health

## Disaster Recovery Plan

### Scenario 1: Database Corruption

1. Stop the application:
   ```bash
   pm2 stop litecat-api
   ```

2. Restore database from latest backup:
   ```bash
   cd /var/www/litecat/scripts
   sudo ./restore.sh --list  # Find latest backup
   sudo ./restore.sh litecat_backup_YYYYMMDD_HHMMSS.tar.gz
   ```

3. Verify database integrity:
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

### Scenario 2: Complete Server Failure

1. Provision new server
2. Run initial setup:
   ```bash
   cd /var/www/litecat/deploy
   sudo ./deploy-vps.sh
   ```

3. Restore from S3 backup:
   ```bash
   cd /var/www/litecat/scripts
   sudo ./restore.sh litecat_backup_YYYYMMDD_HHMMSS.tar.gz --from-s3
   ```

### Scenario 3: Ransomware/Security Breach

1. Isolate affected server
2. Provision clean server
3. Restore from backup before breach:
   ```bash
   # List backups and identify clean backup
   sudo ./restore.sh --list
   
   # Restore from specific date
   sudo ./restore.sh litecat_backup_20240301_020000.tar.gz --from-s3
   ```

4. Update all credentials and secrets
5. Apply security patches

## Backup Verification

### Monthly Verification Process

1. List recent backups:
   ```bash
   ls -la /var/backups/litecat/
   ```

2. Verify backup integrity:
   ```bash
   tar -tzf /var/backups/litecat/litecat_backup_latest.tar.gz | head -20
   ```

3. Test restore on staging environment
4. Document verification in log

### Monitoring Backup Health

Check backup logs:
```bash
tail -f /var/log/litecat/backup.log
```

Check last backup info:
```bash
cat /var/backups/litecat/latest_backup.info
```

## Best Practices

1. **Test Restores Regularly**
   - Perform monthly restore tests on staging
   - Document restore times
   - Verify data integrity

2. **Multiple Backup Locations**
   - Keep local backups for quick recovery
   - Use S3 for offsite backups
   - Consider cross-region replication

3. **Security**
   - Encrypt sensitive data (environment files)
   - Restrict backup access
   - Rotate encryption keys annually

4. **Documentation**
   - Keep this guide updated
   - Document any custom procedures
   - Maintain recovery contact list

5. **Monitoring**
   - Set up alerts for failed backups
   - Monitor backup sizes for anomalies
   - Track backup/restore metrics

## Troubleshooting

### Backup Fails

1. Check disk space:
   ```bash
   df -h
   ```

2. Check permissions:
   ```bash
   ls -la /var/backups/litecat/
   ```

3. Review backup log:
   ```bash
   tail -100 /var/log/litecat/backup.log
   ```

### Restore Fails

1. Verify backup file exists and is readable
2. Check database connectivity
3. Ensure sufficient disk space
4. Review restore output for specific errors

### S3 Upload Fails

1. Verify AWS credentials:
   ```bash
   aws s3 ls s3://your-bucket/
   ```

2. Check IAM permissions
3. Verify network connectivity

## Emergency Contacts

Update these with your actual contacts:

- **System Administrator**: admin@litecat.xyz
- **Database Administrator**: dba@litecat.xyz
- **DevOps Lead**: devops@litecat.xyz
- **Security Team**: security@litecat.xyz

## Recovery Time Objectives

- **Database Recovery**: < 30 minutes
- **Full System Recovery**: < 2 hours
- **Data Loss Tolerance**: < 24 hours

## Compliance and Audit

- Backup logs are retained for 1 year
- Restore tests documented monthly
- Annual disaster recovery drill
- Quarterly backup policy review