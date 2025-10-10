# Database Setup Guide for Contabo Deployment

This guide explains how to set up and migrate your PostgreSQL database on Contabo VPS.

---

## Table of Contents
1. [Database Architecture](#database-architecture)
2. [Initial Setup](#initial-setup)
3. [Running Migrations](#running-migrations)
4. [Data Seeding](#data-seeding)
5. [Backup & Restore](#backup--restore)
6. [Troubleshooting](#troubleshooting)

---

## Database Architecture

### Database Details
- **Database Engine**: PostgreSQL 15
- **Database Name**: `track_management`
- **Default User**: `cdtms_user` (configurable)
- **Port**: `5432` (internal Docker network)
- **Charset**: UTF-8
- **Locale**: en_US.UTF-8

### Tables Overview
The system uses the following main tables:
- `users` - User accounts and authentication
- `projects` - Construction projects
- `project_phases` - Project phases and deliverables
- `work_logs` - Daily work progress tracking
- `smart_test_warnings` - Automated warnings and alerts
- `notifications` - System notifications
- `audit_logs` - System audit trail

---

## Initial Setup

### 1. Database is Auto-Created

When you run `./deploy.sh deploy`, Docker Compose automatically:
- Creates PostgreSQL container
- Creates database with configured name
- Sets up user credentials
- Configures connection pooling

### 2. Verify Database Connection

```bash
# Check if PostgreSQL container is running
docker-compose ps

# Should show:
# cdtms-postgres   running   5432/tcp

# Connect to database
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# You should see:
# track_management=#

# Check PostgreSQL version
SELECT version();

# Exit
\q
```

---

## Running Migrations

### Automatic Migration (Recommended)

The deployment script automatically runs migrations:

```bash
cd /opt/cdtms/backend
./deploy.sh deploy
```

This executes all SQL files in `database/migrations/` directory in order.

### Manual Migration

If you need to run migrations manually:

```bash
# Navigate to backend directory
cd /opt/cdtms/backend

# Run all migrations
for file in ./database/migrations/*.sql; do
    echo "Running migration: $file"
    docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < "$file"
done
```

### Individual Migration Files

To run a specific migration:

```bash
docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < ./database/migrations/001_initial_schema.sql
```

### Available Migrations

Your `database/migrations/` directory should contain:

1. **001_initial_schema.sql** - Creates all base tables
2. **002_add_indexes.sql** - Adds performance indexes
3. **003_add_manual_progress_tracking.sql** - Manual progress features
4. **004_add_administrator_role.sql** - Administrator role support
5. **005_add_submitted_approved_dates.sql** - Phase submission tracking

### Check Migration Status

```bash
# Connect to database
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# List all tables
\dt

# You should see:
# public | users
# public | projects
# public | project_phases
# public | work_logs
# public | smart_test_warnings
# public | notifications
# public | audit_logs
# public | user_notification_settings

# Check table structure
\d users
\d projects
\d project_phases

# Exit
\q
```

---

## Data Seeding

### Seed Default Data

If you have seed data (default users, test projects, etc.):

```bash
# Run seed file
docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < ./database/seeds.sql
```

### Create Admin User Manually

```bash
# Connect to database
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Create admin user
INSERT INTO users (
    username,
    email,
    password,
    role,
    full_name,
    phone,
    is_active,
    created_at
) VALUES (
    'admin',
    'admin@cdtms.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYkZjxC9pYS', -- Admin@123
    'admin',
    'System Administrator',
    '+1234567890',
    true,
    NOW()
);

# Verify
SELECT id, username, email, role FROM users;

# Exit
\q
```

### Password Hash Generation

To create password hashes for new users:

```bash
# Using Node.js on your server
docker exec -it cdtms-backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('YourPassword123', 12, (err, hash) => {
    console.log('Password hash:', hash);
});
"
```

---

## Backup & Restore

### Manual Backup

```bash
# Create backup
cd /opt/cdtms/backend
./deploy.sh backup

# Backups are saved to: ./backups/db_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Manual Backup (Raw SQL)

```bash
# Create SQL dump
docker exec cdtms-postgres pg_dump -U cdtms_user track_management > backup.sql

# Create compressed backup
docker exec cdtms-postgres pg_dump -U cdtms_user track_management | gzip > backup.sql.gz

# Backup specific tables only
docker exec cdtms-postgres pg_dump -U cdtms_user -t users -t projects track_management > partial_backup.sql
```

### Restore from Backup

```bash
# Uncompress backup if needed
gunzip backup.sql.gz

# Restore database
docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < backup.sql

# Or restore compressed backup directly
gunzip -c backup.sql.gz | docker exec -i cdtms-postgres psql -U cdtms_user -d track_management
```

### Automated Backups

Set up cron job for automated daily backups:

```bash
# Edit crontab
crontab -e

# Add this line (backup daily at 2 AM)
0 2 * * * cd /opt/cdtms/backend && ./deploy.sh backup >> /var/log/cdtms-backup.log 2>&1

# Verify cron job
crontab -l
```

### Backup to Remote Storage

```bash
# Install rclone (for cloud storage)
apt install rclone -y

# Configure rclone (follow prompts)
rclone config

# Sync backups to cloud
rclone sync /opt/cdtms/backend/backups remote:cdtms-backups

# Add to cron for automatic cloud backup
0 3 * * * rclone sync /opt/cdtms/backend/backups remote:cdtms-backups
```

---

## Database Maintenance

### Optimize Database

```bash
# Connect to database
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Analyze tables (update statistics)
ANALYZE;

# Vacuum database (reclaim storage)
VACUUM;

# Full vacuum (more thorough, requires exclusive lock)
VACUUM FULL;

# Reindex (rebuild indexes)
REINDEX DATABASE track_management;
```

### Check Database Size

```bash
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Database size
SELECT pg_size_pretty(pg_database_size('track_management')) as database_size;

# Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Active Connections

```bash
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Show active connections
SELECT * FROM pg_stat_activity WHERE datname = 'track_management';

# Count connections by state
SELECT state, count(*) FROM pg_stat_activity WHERE datname = 'track_management' GROUP BY state;
```

---

## Useful SQL Queries

### User Management

```sql
-- List all users
SELECT id, username, email, role, is_active FROM users;

-- Create new user
INSERT INTO users (username, email, password, role, full_name, is_active)
VALUES ('john', 'john@example.com', 'hashed_password', 'user', 'John Doe', true);

-- Update user role
UPDATE users SET role = 'admin' WHERE username = 'john';

-- Deactivate user
UPDATE users SET is_active = false WHERE username = 'john';

-- Reset password (you need to generate hash first)
UPDATE users SET password = '$2b$12$...' WHERE username = 'admin';
```

### Project Queries

```sql
-- List all projects
SELECT id, project_name, status, start_date, predicted_hours
FROM projects
ORDER BY created_at DESC;

-- Count projects by status
SELECT status, COUNT(*) FROM projects GROUP BY status;

-- Projects with phase progress
SELECT
    p.project_name,
    COUNT(pp.id) as total_phases,
    SUM(CASE WHEN pp.status = 'completed' THEN 1 ELSE 0 END) as completed_phases,
    ROUND(AVG(pp.progress_percentage), 2) as avg_progress
FROM projects p
LEFT JOIN project_phases pp ON p.id = pp.project_id
GROUP BY p.id, p.project_name;
```

### Audit Queries

```sql
-- Recent audit logs
SELECT
    al.action,
    al.entity_type,
    al.entity_id,
    u.username,
    al.timestamp
FROM audit_logs al
JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC
LIMIT 50;

-- User activity summary
SELECT
    u.username,
    COUNT(*) as actions,
    MAX(al.timestamp) as last_activity
FROM audit_logs al
JOIN users u ON al.user_id = u.id
GROUP BY u.id, u.username
ORDER BY actions DESC;
```

---

## Troubleshooting

### Problem: Can't connect to database

```bash
# Check if container is running
docker-compose ps

# Check container logs
docker-compose logs postgres

# Check PostgreSQL is accepting connections
docker exec cdtms-postgres pg_isready -U cdtms_user -d track_management

# Check port is listening
docker exec cdtms-postgres netstat -tlnp | grep 5432
```

### Problem: Migration fails

```bash
# Check current schema version
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management -c "\dt"

# Check for errors in PostgreSQL logs
docker-compose logs postgres | grep ERROR

# Manually review migration file
cat ./database/migrations/XXX_migration.sql

# Run migration with error output
docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < ./database/migrations/XXX_migration.sql 2>&1
```

### Problem: Slow queries

```bash
# Enable query logging
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Show slow queries (requires pg_stat_statements extension)
SELECT
    calls,
    mean_exec_time,
    max_exec_time,
    query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check for missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;
```

### Problem: Database corruption

```bash
# Check database integrity
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Check for corrupted indexes
REINDEX DATABASE track_management;

# Verify table integrity
SELECT * FROM pg_class WHERE relname = 'your_table';

# If serious corruption, restore from backup
cd /opt/cdtms/backend
./deploy.sh stop
# Restore from latest backup
gunzip -c backups/db_backup_*.sql.gz | docker exec -i cdtms-postgres psql -U cdtms_user -d track_management
./deploy.sh start
```

### Problem: Out of disk space

```bash
# Check disk usage
df -h

# Check database size
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management -c "SELECT pg_size_pretty(pg_database_size('track_management'));"

# Clean old data
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Delete old audit logs (older than 90 days)
DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days';

# Vacuum to reclaim space
VACUUM FULL;
```

---

## Database Configuration

### Connection Pool Settings

Edit `.env.production`:

```bash
DB_POOL_MIN=10          # Minimum connections
DB_POOL_MAX=100         # Maximum connections
```

### PostgreSQL Performance Tuning

```bash
# Edit PostgreSQL config
docker exec -it cdtms-postgres bash
apt update && apt install nano
nano /var/lib/postgresql/data/postgresql.conf

# Recommended settings (adjust based on your server RAM):
shared_buffers = 256MB              # 25% of RAM
effective_cache_size = 1GB          # 50% of RAM
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1              # For SSD
effective_io_concurrency = 200      # For SSD

# Restart PostgreSQL
exit
docker-compose restart postgres
```

---

## Quick Reference

### Common Commands

```bash
# Connect to database
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Execute SQL file
docker exec -i cdtms-postgres psql -U cdtms_user -d track_management < file.sql

# Backup database
./deploy.sh backup

# Run migrations
./deploy.sh migrate

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Important Files

- Migrations: `./database/migrations/*.sql`
- Seeds: `./database/seeds.sql`
- Backups: `./backups/db_backup_*.sql.gz`
- Database config: `.env.production`

---

## Security Best Practices

1. ✅ Use strong database passwords (25+ characters)
2. ✅ Don't expose PostgreSQL port (5432) publicly
3. ✅ Keep database inside Docker network only
4. ✅ Regular backups (automated daily)
5. ✅ Monitor database logs for suspicious activity
6. ✅ Use connection pooling (already configured)
7. ✅ Keep PostgreSQL updated
8. ✅ Limit database user permissions (don't use superuser)

---

**For more help, see the main deployment guide: CONTABO_VERCEL_DEPLOYMENT.md**
