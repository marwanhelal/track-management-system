# Deployment & Backup Guide

## 🚀 Deployment Architecture

- **Frontend (React)** → Vercel
- **Backend (Node.js + Express) + PostgreSQL** → Render.com

---

## 📦 Backup Strategy

Your database is automatically backed up with multiple layers of protection:

### 1. Automated Daily Backups (Recommended for Production)

#### On Render.com:
Render provides automatic PostgreSQL backups:
- **Free Plan**: Daily backups retained for 7 days
- **Paid Plans**: Continuous backups with point-in-time recovery

#### Manual Backup System:
Our custom backup system provides additional protection.

---

## 🛠️ Backup Commands

### Create a Backup
```bash
npm run backup:create
```
Creates a full database backup with timestamp.

### List All Backups
```bash
npm run backup:list
```
Shows all available backups with size and date.

### Restore from Backup
```bash
npm run backup:restore ./backups/backup-track_management-2025-10-06.sql
```
Restores database from a specific backup file.

### Clean Old Backups
```bash
npm run backup:clean 7
```
Keeps only the most recent 7 backups (default).

### Backup Statistics
```bash
npm run backup:stats
```
Shows total backups count and storage usage.

### Scheduled Backups (Production)
```bash
npm run backup:scheduled
```
Runs automated backups according to schedule.

---

## ⚙️ Backup Configuration

Edit `backend/.env`:

```env
# Backup Configuration
BACKUP_DIR=./backups              # Where to store backups
BACKUP_SCHEDULE=0 2 * * *         # Cron schedule (2 AM daily)
BACKUP_KEEP_COUNT=7               # Number of backups to keep
```

### Cron Schedule Examples:
- `0 2 * * *` - Every day at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Every Sunday at midnight
- `0 */12 * * *` - Every 12 hours

---

## 🌐 Deployment Steps

### Step 1: Deploy Backend to Render.com

1. **Create Render Account**: Go to [render.com](https://render.com)

2. **Create PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Name: `track-management-db`
   - Plan: Choose based on needs (Free for testing)
   - Region: Choose closest to your users
   - Copy the **Internal Database URL**

3. **Create Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Name: `track-management-api`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Choose based on needs

4. **Set Environment Variables** on Render:
   ```
   NODE_ENV=production
   PORT=10000

   # Database (from your Render PostgreSQL)
   DB_HOST=<your-render-postgres-host>
   DB_PORT=5432
   DB_NAME=<your-database-name>
   DB_USER=<your-database-user>
   DB_PASSWORD=<your-database-password>
   DB_SSL=true

   # JWT (Generate new secrets!)
   JWT_SECRET=<generate-random-string>
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=<generate-random-string>
   JWT_REFRESH_EXPIRES_IN=30d

   # Security
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS (Your Vercel URL)
   CORS_ORIGIN=https://your-app.vercel.app
   CORS_CREDENTIALS=true

   # API
   API_PREFIX=/api/v1
   API_DOCS_ENABLED=false

   # Socket.IO
   SOCKET_CORS_ORIGIN=https://your-app.vercel.app

   # Backups
   BACKUP_SCHEDULE=0 2 * * *
   BACKUP_KEEP_COUNT=7
   ```

5. **Deploy**: Render will automatically deploy your backend

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com)

2. **Import Project**:
   - Click "New Project"
   - Import your GitHub repository
   - Framework: React
   - Root Directory: `frontend`

3. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

4. **Set Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-api.onrender.com
   REACT_APP_SOCKET_URL=https://your-api.onrender.com
   ```

5. **Deploy**: Vercel will automatically build and deploy

---

## 🔐 Production Backup Setup on Render

### Option 1: Use Render's Built-in Backups (Easiest)

Render automatically backs up your PostgreSQL database:
- **Automatic**: No configuration needed
- **Retention**: 7 days on free, longer on paid plans
- **Recovery**: One-click restore from dashboard

**To restore a backup on Render:**
1. Go to your PostgreSQL dashboard
2. Click "Backups" tab
3. Select backup and click "Restore"

### Option 2: Custom Scheduled Backups

Run our backup script on a schedule using Render Cron Jobs:

1. **Create a Cron Job** on Render:
   - Type: Cron Job
   - Command: `npm run backup:create`
   - Schedule: `0 2 * * *` (2 AM daily)

2. **Store Backups in Cloud Storage** (Recommended):
   - Use AWS S3, Google Cloud Storage, or Backblaze B2
   - Modify `backup-database.ts` to upload backups to cloud storage

### Option 3: Manual Backups Before Major Changes

Always create a backup before:
- Deploying major updates
- Running migrations
- Modifying data structures

```bash
# From your local machine (connected to production DB)
npm run backup:create
```

---

## 📥 Downloading Backups from Render

### Method 1: pg_dump via Command Line
```bash
# Get your database URL from Render dashboard
pg_dump YOUR_DATABASE_URL > backup.sql
```

### Method 2: Download via Render Dashboard
1. Go to your PostgreSQL service
2. Click "Backups"
3. Click "Download" next to any backup

### Method 3: Automated Download Script

Create a script to download backups locally:

```bash
# download-backup.sh
#!/bin/bash
RENDER_DB_URL="your-render-database-url"
BACKUP_FILE="backup-$(date +%Y-%m-%d-%H-%M-%S).sql"

echo "Downloading backup from Render..."
pg_dump $RENDER_DB_URL > ./backups/$BACKUP_FILE
echo "Backup saved: $BACKUP_FILE"
```

---

## 🔄 Disaster Recovery Plan

### Scenario 1: Complete Data Loss

1. **Restore from Latest Backup**:
   ```bash
   npm run backup:restore ./backups/latest-backup.sql
   ```

2. **Or restore from Render's backup**:
   - Go to Render PostgreSQL dashboard
   - Click "Backups" → Select backup → "Restore"

### Scenario 2: Accidental Data Deletion

1. **Find the backup before the deletion**:
   ```bash
   npm run backup:list
   ```

2. **Restore to a test database first**:
   ```bash
   # Change DB_NAME in .env to test database
   npm run backup:restore ./backups/backup-before-deletion.sql
   ```

3. **Extract only needed data**, then restore to production

### Scenario 3: Render Server Issues

1. **Deploy to another platform** (e.g., Railway, Fly.io)
2. **Restore database** from local backup
3. **Update frontend** environment variables to new API URL

---

## ✅ Backup Best Practices

### 1. Multiple Backup Locations
- ✅ Render automatic backups (primary)
- ✅ Local backups (secondary)
- ✅ Cloud storage (S3/Google Cloud) (tertiary)

### 2. Regular Backup Testing
```bash
# Test backup restoration monthly
npm run backup:restore ./backups/latest.sql
# Verify data integrity
```

### 3. Pre-Deployment Backups
```bash
# Always backup before deploying
npm run backup:create
git tag backup-$(date +%Y-%m-%d)
```

### 4. Monitor Backup Size
```bash
npm run backup:stats
```
If backups grow too large, consider archiving old data.

### 5. Backup Retention Schedule
- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months

---

## 📊 Monitoring

### Check Backup Health
```bash
npm run backup:stats
```

### Verify Last Backup
```bash
npm run backup:list | head -1
```

### Set Up Alerts
Configure monitoring to alert you if:
- Backup size drops significantly (data loss)
- Backup fails
- No backup in 24+ hours

---

## 🆘 Emergency Contacts

### If Something Goes Wrong:

1. **Check Render Status**: [status.render.com](https://status.render.com)
2. **Check Vercel Status**: [status.vercel.com](https://status.vercel.com)
3. **Review logs**:
   - Render: Dashboard → Logs
   - Vercel: Dashboard → Deployments → Click deployment → View logs

4. **Restore from backup** (see Disaster Recovery above)

---

## 📝 Quick Reference

```bash
# Backup Commands
npm run backup:create        # Create backup now
npm run backup:list          # Show all backups
npm run backup:restore FILE  # Restore from file
npm run backup:clean 10      # Keep 10 most recent
npm run backup:stats         # Show statistics

# Deployment
vercel --prod               # Deploy frontend
git push                    # Auto-deploy backend (if connected to Render)

# Database
npm run db:migrate          # Run migrations
npm run db:seed             # Seed database
```

---

## 🎯 Summary

Your deployment is protected with:

1. ✅ **Render automatic backups** (7+ days retention)
2. ✅ **Custom backup system** (manual and scheduled)
3. ✅ **Multiple storage options** (local + cloud)
4. ✅ **Easy restoration** (one-command restore)
5. ✅ **Disaster recovery plan** (documented procedures)

**You're all set!** Your data is safe and recoverable. 🎉
