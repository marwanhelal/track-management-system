# Backup & Disaster Recovery Guide

## Simple & Safe Backup Strategy for Your System

---

## 📋 Backup Plan Overview

**What gets backed up:** Your entire database (projects, users, work logs, everything)

**How often:** Automatically every day at 2 AM

**Where stored:**
1. On your server: `/var/backups/track-management/`
2. Downloaded to your computer: Weekly (manual)

**How long kept:** 30 days of backups on server

---

## ⚙️ Setup Automated Daily Backups (Do Once After Deployment)

After you deploy your system, run these commands **once** on your server:

### Step 1: Upload Backup Script

```bash
# Upload backup-database.sh to server
cd /var/www/track-management
chmod +x backup-database.sh
```

### Step 2: Test Manual Backup

```bash
# Run backup manually to test
./backup-database.sh
```

You should see:
```
✅ Backup completed successfully!
File: /var/backups/track-management/backup_2025-10-04_14-30-00.sql.gz
Size: 2.3M
Total backups: 1
```

### Step 3: Setup Automatic Daily Backups

```bash
# Open crontab editor
crontab -e
```

Add this line at the bottom:
```
0 2 * * * /var/www/track-management/backup-database.sh >> /var/log/backup.log 2>&1
```

This runs backup every day at 2 AM.

Save and exit (CTRL+X, then Y, then Enter)

### Step 4: Verify Cron Job

```bash
# Check if cron job is added
crontab -l
```

✅ Done! Your database now backs up automatically every night.

---

## 📥 How to Download Backups to Your Computer (Do Weekly)

**Why?** If your server crashes completely, you'll have a copy on your computer.

### Using WinSCP (Easy for Windows):

1. Download WinSCP: https://winscp.net/
2. Connect to your server:
   - Host: YOUR_SERVER_IP
   - Username: root
   - Password: YOUR_SERVER_PASSWORD
3. Navigate to: `/var/backups/track-management/`
4. Drag the latest backup file to your computer
5. Store it safely on your computer

**Recommended:** Download the latest backup every **Sunday**.

---

## 🔄 How to Restore from Backup (Emergency!)

### Scenario 1: Need to Restore Recent Data

```bash
# On your server
cd /var/www/track-management

# List available backups
ls -lh /var/backups/track-management/

# Restore from specific backup
chmod +x restore-database.sh
./restore-database.sh /var/backups/track-management/backup_2025-10-04_14-30-00.sql.gz
```

Type `yes` when prompted.

✅ Your database is restored!

### Scenario 2: Server Completely Crashed - Need to Restore on New Server

1. Deploy new server (follow DEPLOYMENT_GUIDE.md)
2. Upload backup file from your computer to new server:
   ```bash
   # Use WinSCP or run from your computer:
   scp backup_2025-10-04_14-30-00.sql.gz root@NEW_SERVER_IP:/tmp/
   ```
3. Restore on new server:
   ```bash
   cd /var/www/track-management
   ./restore-database.sh /tmp/backup_2025-10-04_14-30-00.sql.gz
   ```

✅ Your system is back online with all your data!

---

## 📊 View All Backups

```bash
# List all backups with size and date
ls -lh /var/backups/track-management/
```

Example output:
```
-rw-r--r-- 1 root root 2.3M Oct  1 02:00 backup_2025-10-01_02-00-00.sql.gz
-rw-r--r-- 1 root root 2.4M Oct  2 02:00 backup_2025-10-02_02-00-00.sql.gz
-rw-r--r-- 1 root root 2.5M Oct  3 02:00 backup_2025-10-03_02-00-00.sql.gz
-rw-r--r-- 1 root root 2.6M Oct  4 02:00 backup_2025-10-04_02-00-00.sql.gz
```

---

## 🎯 Manual Backup (Anytime)

Want to create a backup before making big changes?

```bash
cd /var/www/track-management
./backup-database.sh
```

Creates instant backup with current timestamp.

---

## 🚨 Emergency Contact Plan

If something goes wrong:

### Problem: Can't access system
1. Check if server is running: `pm2 status`
2. Check logs: `pm2 logs track-backend`
3. Restart backend: `pm2 restart track-backend`

### Problem: Data is corrupted
1. Stop backend: `pm2 stop track-backend`
2. Restore from yesterday's backup
3. Start backend: `pm2 start track-backend`

### Problem: Accidentally deleted data
1. Restore from most recent backup (before deletion)
2. Data recovered!

### Problem: Server completely dead
1. Create new server
2. Follow deployment guide
3. Restore from backup you downloaded to your computer

---

## 📅 Recommended Backup Schedule

| Task | Frequency | Takes |
|------|-----------|-------|
| Automated backup | Daily (automatic) | 0 min (runs at 2 AM) |
| Download to computer | Weekly (Sunday) | 2 min |
| Test restore | Monthly | 5 min |

---

## 💾 Storage Space

Backups are small:
- Each backup: ~2-5 MB
- 30 days of backups: ~60-150 MB
- Your $4/month server has 25 GB space
- **Backups use less than 1% of your space** ✅

---

## ✅ Backup Checklist (After Deployment)

- [ ] Uploaded backup-database.sh to server
- [ ] Tested manual backup
- [ ] Setup automated daily backups (cron job)
- [ ] Verified cron job is active
- [ ] Downloaded first backup to computer
- [ ] Stored backup in safe place on computer
- [ ] Tested restore process once

---

## 🎉 You're Protected!

With this backup plan:
- ✅ Data backed up every night
- ✅ Can restore anytime
- ✅ Protected from accidents
- ✅ Safe from server crashes
- ✅ Can recover from any disaster

**Sleep well knowing your data is safe!** 😊
