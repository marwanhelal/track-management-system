#!/bin/bash

# Database Backup Script for Track Management System
# This script creates daily backups of your database

# Configuration
DB_NAME="track_management"
DB_USER="postgres"
BACKUP_DIR="/var/backups/track-management"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
DAYS_TO_KEEP=30  # Keep backups for 30 days

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating backup..."
sudo -u postgres pg_dump $DB_NAME > $BACKUP_FILE

# Compress backup to save space
echo "Compressing backup..."
gzip $BACKUP_FILE

# Delete old backups (older than DAYS_TO_KEEP)
echo "Cleaning old backups..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$DAYS_TO_KEEP -delete

# Show backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
echo "✅ Backup completed successfully!"
echo "File: $BACKUP_FILE.gz"
echo "Size: $BACKUP_SIZE"
echo "Location: $BACKUP_DIR"

# Count total backups
TOTAL_BACKUPS=$(ls -1 $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | wc -l)
echo "Total backups: $TOTAL_BACKUPS"
