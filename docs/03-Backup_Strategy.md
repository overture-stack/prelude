# Data Backup Strategy

## Overview

This document outlines the backup and restore procedures for PostgreSQL data in the Drug Discovery Portal. The system uses Docker volumes for data persistence, providing reliable and production-ready storage.

## Current Configuration

- **Database**: PostgreSQL 15 Alpine
- **Storage Type**: Docker Volume (`postgres-data`)
- **Container Name**: `postgres-platform`
- **Database Name**: `overtureDb`
- **Database User**: `admin`

## Backup Methods

### Method 1: SQL Dump (Recommended)

Best for regular automated backups and disaster recovery.

**Advantages:**
- Database-agnostic format
- Version-independent
- Small file size
- Can restore to different PostgreSQL versions
- Human-readable SQL format available

#### Create Backup

```bash
# Single database backup (compressed custom format)
docker exec postgres-platform pg_dump -U admin -Fc overtureDb > backup_$(date +%Y%m%d_%H%M%S).dump

# Single database backup (SQL format)
docker exec postgres-platform pg_dump -U admin overtureDb > backup_$(date +%Y%m%d_%H%M%S).sql

# All databases backup
docker exec postgres-platform pg_dumpall -U admin > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore from Backup

**Important Notes:**
- The `-i` flag keeps stdin open to pipe the backup file into the container
- No volume mounting is required - the file is piped directly from your host
- The `--clean` flag drops existing objects before recreating them
- Ensure the PostgreSQL container is running before restoring

```bash
# Restore from custom format (.dump files)
docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup_20241124_140000.dump

# Restore from SQL format (.sql files)
docker exec -i postgres-platform psql -U admin overtureDb < backup_20241124_140000.sql

# Restore all databases (from pg_dumpall)
docker exec -i postgres-platform psql -U admin < full_backup_20241124_140000.sql
```

**Alternative: Copy file into container first**
```bash
# Method 2: Copy then restore (useful for large files or slow pipes)
docker cp backup_20241124_140000.dump postgres-platform:/tmp/backup.dump
docker exec postgres-platform pg_restore -U admin -d overtureDb --clean /tmp/backup.dump
docker exec postgres-platform rm /tmp/backup.dump
```

### Method 2: Volume Snapshot (For Large Databases)

Best for large databases where pg_dump takes too long.

**Advantages:**
- Fast backup for multi-GB databases
- Point-in-time filesystem consistency
- Complete system state capture

#### Create Snapshot

```bash
# Ensure database consistency
docker exec postgres-platform psql -U admin -c "CHECKPOINT;"

# Create snapshot
docker run --rm \
  -v postgres-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_snapshot_$(date +%Y%m%d_%H%M%S).tar.gz -C /source .
```

#### Restore from Snapshot

```bash
# Stop PostgreSQL container
PROFILE=platform docker compose stop postgres-platform

# Restore volume
docker run --rm \
  -v postgres-data:/target \
  -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /target/* /target/..?* /target/.[!.]* 2>/dev/null; tar xzf /backup/postgres_snapshot_20241124_140000.tar.gz -C /target"

# Start PostgreSQL container
PROFILE=platform docker compose start postgres-platform
```

## Recommended Backup Schedule

### Development Environment
- **Before major changes**: Manual backup
- **Weekly**: Automated SQL dump
- **Retention**: 2 weeks

### Production Environment
- **Daily at 2 AM**: SQL dump backup
- **Weekly on Sunday**: Volume snapshot backup
- **Before deployments**: Manual SQL dump
- **Retention**: 30 days for daily, 12 weeks for weekly

## Automated Backup Script

Create `/opt/ddp-backups/backup-postgres.sh`:

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/ddp-backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "[$(date)] Starting PostgreSQL backup..."
docker exec postgres-platform pg_dump -U admin -Fc overtureDb > \
  "$BACKUP_DIR/overtureDb_$TIMESTAMP.dump"

# Verify backup file exists and is not empty
if [ ! -s "$BACKUP_DIR/overtureDb_$TIMESTAMP.dump" ]; then
    echo "[$(date)] ERROR: Backup file is empty or missing!"
    exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: $BACKUP_DIR/overtureDb_$TIMESTAMP.dump"
echo "[$(date)] Backup size: $(du -h $BACKUP_DIR/overtureDb_$TIMESTAMP.dump | cut -f1)"
```

Make it executable:
```bash
chmod +x /opt/ddp-backups/backup-postgres.sh
```

## Setup Automated Backups (Linux Production)

Create cron job `/etc/cron.d/ddp-postgres-backup`:

```cron
# Daily backup at 2 AM
0 2 * * * root /opt/ddp-backups/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1
```

Enable and restart cron:
```bash
systemctl enable cron
systemctl restart cron
```

## Backup Verification

Always verify backups after creation:

```bash
# Check backup file size
ls -lh backup_20241124_140000.dump

# Test restore to temporary database (SQL dump)
docker exec postgres-platform psql -U admin -c "CREATE DATABASE test_restore;"
docker exec -i postgres-platform pg_restore -U admin -d test_restore < backup_20241124_140000.dump
docker exec postgres-platform psql -U admin -c "DROP DATABASE test_restore;"
```

## Disaster Recovery Procedure

### Complete System Restore

1. **Stop all services:**
   ```bash
   PROFILE=platform docker compose down
   ```

2. **Remove old volume (if corrupted):**
   ```bash
   docker volume rm ddp-v40-beta_postgres-data
   ```

3. **Start PostgreSQL only:**
   ```bash
   PROFILE=platform docker compose up -d postgres-platform
   ```

4. **Wait for PostgreSQL to be ready:**
   ```bash
   docker exec postgres-platform pg_isready -U admin
   ```

5. **Restore from backup:**
   ```bash
   docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup_20241124_140000.dump
   ```

6. **Verify data integrity:**
   ```bash
   docker exec postgres-platform psql -U admin -d overtureDb -c "\dt"
   docker exec postgres-platform psql -U admin -d overtureDb -c "SELECT COUNT(*) FROM your_table;"
   ```

7. **Start remaining services:**
   ```bash
   PROFILE=platform docker compose up -d
   ```

## Off-Site Backup Storage

For production, store backups in a separate location:

### Option 1: Copy to Remote Server
```bash
# Add to backup script
rsync -avz --delete "$BACKUP_DIR/" backup-server:/backups/ddp-postgres/
```

### Option 2: Cloud Storage (S3 Example)
```bash
# Install AWS CLI
apt-get install awscli

# Add to backup script
aws s3 sync "$BACKUP_DIR/" s3://your-bucket/ddp-backups/postgres/ --storage-class STANDARD_IA
```

### Option 3: Network Storage (NFS)
```bash
# Mount NFS share
mount backup-server:/backups /mnt/backups

# Update BACKUP_DIR in script
BACKUP_DIR="/mnt/backups/ddp-postgres"
```

## Monitoring Backup Health

### Check Last Backup
```bash
ls -lht /opt/ddp-backups/postgres/ | head -5
```

### Check Backup Logs
```bash
tail -f /var/log/postgres-backup.log
```

### Alert on Backup Failure
Add to backup script:
```bash
if [ $? -ne 0 ]; then
    echo "Backup failed!" | mail -s "DDP PostgreSQL Backup Failed" admin@example.com
fi
```

## Simple Restore Guide

### Quick Restore (Services Running)

If your services are still running and you just need to restore data:

```bash
# 1. Ensure postgres is running
docker ps | grep postgres-platform

# 2. Restore from backup (piping directly - no volume mount needed!)
docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup.dump

# 3. Verify restore
docker exec postgres-platform psql -U admin -d overtureDb -c "\dt"
```

### Full System Restore (After Reset)

If you've run `make reset` or need to restore from scratch:

```bash
# 1. Start PostgreSQL
PROFILE=platform docker compose up -d postgres-platform

# 2. Wait for it to be ready
docker exec postgres-platform pg_isready -U admin

# 3. Restore data
docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup.dump

# 4. Start remaining services
PROFILE=platform docker compose up -d
```

### Using Makefile Commands

Create a backup before reset:
```bash
# Backup first
docker exec postgres-platform pg_dump -U admin -Fc overtureDb > backup_$(date +%Y%m%d).dump

# Then reset
make reset

# Then restore (after running 'make platform')
docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup_20241124.dump
```

## Quick Reference Commands

```bash
# Create backup
docker exec postgres-platform pg_dump -U admin -Fc overtureDb > backup.dump

# Restore backup (note the -i flag!)
docker exec -i postgres-platform pg_restore -U admin -d overtureDb --clean < backup.dump

# List tables
docker exec postgres-platform psql -U admin -d overtureDb -c "\dt"

# Check database size
docker exec postgres-platform psql -U admin -c "SELECT pg_size_pretty(pg_database_size('overtureDb'));"

# Check volume size
docker system df -v | grep postgres-data
```

## Troubleshooting

### Backup Fails with Permission Error
```bash
# Ensure container is running
docker ps | grep postgres-platform

# Check container logs
docker logs postgres-platform
```

### Restore Fails with "database is being accessed"
```bash
# Disconnect all users
docker exec postgres-platform psql -U admin -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = 'overtureDb' AND pid <> pg_backend_pid();"
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean old Docker resources
docker system prune -a --volumes

# Remove old backups manually
find /opt/ddp-backups/postgres/ -name "*.dump" -mtime +30 -delete
```

---

**Document Version:** 1.0
**Last Updated:** November 24, 2024
**Tested On:** Docker Compose, PostgreSQL 15 Alpine, Linux
