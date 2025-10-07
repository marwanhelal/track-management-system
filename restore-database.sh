#!/bin/bash

# Database Restore Script for Track Management System
# This script restores database from a backup file

# Configuration
DB_NAME="track_management"
DB_USER="postgres"
BACKUP_DIR="/var/backups/track-management"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Error: No backup file specified"
    echo ""
    echo "Usage: ./restore-database.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh $BACKUP_DIR/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Warning
echo "⚠️  WARNING: This will REPLACE your current database!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Stop backend to prevent database access
echo "Stopping backend..."
pm2 stop track-backend

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "Decompressing backup..."
    TEMP_FILE="/tmp/restore_temp.sql"
    gunzip -c $BACKUP_FILE > $TEMP_FILE
    RESTORE_FILE=$TEMP_FILE
else
    RESTORE_FILE=$BACKUP_FILE
fi

# Drop and recreate database
echo "Dropping existing database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO trackuser;"

# Restore backup
echo "Restoring backup..."
sudo -u postgres psql $DB_NAME < $RESTORE_FILE

# Clean up temp file
if [ -f "$TEMP_FILE" ]; then
    rm $TEMP_FILE
fi

# Restart backend
echo "Starting backend..."
pm2 start track-backend

echo ""
echo "✅ Database restored successfully!"
echo "Your system is now running with the restored data."
