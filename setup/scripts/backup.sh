#!/bin/bash
# =============================================================================
# Prelude Portal — Automated Backup Script
# =============================================================================
# Backs up PostgreSQL and (optionally) Elasticsearch data.
# Run manually or schedule via cron:
#
#   crontab -e
#   0 2 * * * /path/to/prelude/setup/scripts/backup.sh
#
# Backups are stored in ./backups/ with date-stamped directories.
# Retention: 30 days by default (configurable below).
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M)

# PostgreSQL container and credentials (reads from .env if available)
if [ -f "$PROJECT_DIR/.env" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
fi
PG_CONTAINER="${PG_CONTAINER:-postgres}"
PG_USER="${POSTGRES_USER:-admin}"
PG_DB="${POSTGRES_DB:-overtureDb}"

# Create backup directory
CURRENT_BACKUP="$BACKUP_DIR/$DATE"
mkdir -p "$CURRENT_BACKUP"

echo "Starting backup: $DATE"
echo "Backup directory: $CURRENT_BACKUP"

# --- PostgreSQL Backup -------------------------------------------------------
echo ""
echo "Backing up PostgreSQL..."
if docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" > /dev/null 2>&1; then
    docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$CURRENT_BACKUP/postgres.dump"
    PG_SIZE=$(du -h "$CURRENT_BACKUP/postgres.dump" | cut -f1)
    echo "  PostgreSQL backup complete ($PG_SIZE)"
else
    echo "  WARNING: PostgreSQL container is not running. Skipping."
fi

# --- Cleanup Old Backups -----------------------------------------------------
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +$RETENTION_DAYS -print -exec rm -rf {} \; | wc -l | tr -d ' ')
echo "  Removed $DELETED old backup(s)"

# --- Summary -----------------------------------------------------------------
echo ""
echo "Backup complete: $CURRENT_BACKUP"
ls -lh "$CURRENT_BACKUP/"
