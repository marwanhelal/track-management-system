# Coolify Database Import Guide

Complete guide to import the Track Management System database to your Coolify VPS deployment.

## Current Deployment Status

✅ **Completed:**
- Frontend deployed: http://ec048kcogswksko0s8kwoocg.77.37.124.98.sslip.io
- Backend deployed: http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io
- PostgreSQL database created in Coolify
- CORS and trust proxy configured

🔴 **Remaining:**
- Import complete database schema (7 tables + all migration columns)
- Import initial seed data (predefined phases, test users)
- Create your administrator account
- Test login functionality

---

## Prerequisites

Before starting, ensure you have:
1. ✅ Git repository pushed to GitHub
2. ✅ Access to Coolify dashboard
3. ✅ PostgreSQL database service running in Coolify

---

## Step 1: Push Database Files to GitHub (If Not Already Done)

First, commit and push the new database files to GitHub:

```bash
# Check git status
git status

# Add all database files
git add database/schema-complete.sql
git add database/seeds.sql
git add database/create-admin-user.sql

# Commit
git commit -m "Add complete database schema with all migrations for Coolify deployment"

# Push to GitHub
git push origin main
```

---

## Step 2: Access Coolify PostgreSQL Terminal

1. Log into your Coolify dashboard
2. Navigate to your PostgreSQL database service
3. Click on **"Terminal"** or **"Console"** button
4. You should now have a shell inside the PostgreSQL container

---

## Step 3: Download Database Files from GitHub

In the Coolify PostgreSQL terminal, download the SQL files:

```bash
# Download complete schema (includes all migrations)
curl -o /tmp/schema-complete.sql https://raw.githubusercontent.com/marwanhelal/track-management-system/main/database/schema-complete.sql

# Download seed data
curl -o /tmp/seeds.sql https://raw.githubusercontent.com/marwanhelal/track-management-system/main/database/seeds.sql

# Download admin user script
curl -o /tmp/create-admin-user.sql https://raw.githubusercontent.com/marwanhelal/track-management-system/main/database/create-admin-user.sql

# Verify files downloaded successfully
ls -lh /tmp/*.sql
```

**Expected output:**
```
-rw-r--r-- 1 root root  25K Oct 10 12:00 /tmp/schema-complete.sql
-rw-r--r-- 1 root root 6.4K Oct 10 12:00 /tmp/seeds.sql
-rw-r--r-- 1 root root 1.2K Oct 10 12:00 /tmp/create-admin-user.sql
```

---

## Step 4: Import Complete Database Schema

This step creates all 7 tables with all migration columns included.

```bash
# Import the complete schema
psql -U postgres -d postgres -f /tmp/schema-complete.sql
```

**Expected output:**
```
DROP TABLE
DROP TABLE
DROP TABLE
...
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
...
                                      status
----------------------------------------------------------------------------------------
 Track Management System - Complete Schema with All Migrations - Ready for Production
(1 row)
```

### Verify Tables Were Created

```bash
# List all tables
psql -U postgres -d postgres -c "\dt"
```

**Expected output (7 tables):**
```
                List of relations
 Schema |        Name         | Type  |  Owner
--------+---------------------+-------+----------
 public | audit_logs          | table | postgres
 public | predefined_phases   | table | postgres
 public | progress_adjustments| table | postgres
 public | project_phases      | table | postgres
 public | project_settings    | table | postgres
 public | projects            | table | postgres
 public | users               | table | postgres
 public | work_logs           | table | postgres
(8 rows)
```

### Verify Users Table Has All Columns

```bash
# Check users table structure
psql -U postgres -d postgres -c "\d users"
```

**Expected columns to include:**
- `id`, `name`, `email`, `password_hash`, `role`
- **`job_description`** (from migration 004)
- `is_active`, `created_at`, `updated_at`
- Role constraint should include: `'supervisor', 'engineer', 'administrator'`

---

## Step 5: Import Seed Data

This step adds:
- 10 predefined architecture phases
- 1 supervisor test user (admin@trackms.com)
- 4 engineer test users
- 1 sample project with phases
- Sample work logs
- Useful database views

```bash
# Import seed data
psql -U postgres -d postgres -f /tmp/seeds.sql
```

**Expected output:**
```
INSERT 0 10  -- 10 predefined phases
INSERT 0 1   -- 1 supervisor
INSERT 0 4   -- 4 engineers
INSERT 0 1   -- 1 project
INSERT 0 10  -- 10 project phases
INSERT 0 1   -- 1 project settings
INSERT 0 3   -- 3 work logs
INSERT 0 3   -- 3 audit logs
CREATE VIEW
CREATE VIEW
```

### Verify Seed Data

```bash
# Check predefined phases
psql -U postgres -d postgres -c "SELECT id, name, display_order FROM predefined_phases ORDER BY display_order;"

# Check test users
psql -U postgres -d postgres -c "SELECT id, name, email, role FROM users ORDER BY id;"

# Check sample project
psql -U postgres -d postgres -c "SELECT id, name, status, predicted_hours, actual_hours FROM projects;"
```

---

## Step 6: Create Your Administrator Account

This creates your personal admin account: **marwanhelal15@gmail.com**

```bash
# Create admin user
psql -U postgres -d postgres -f /tmp/create-admin-user.sql
```

**Expected output:**
```
INSERT 0 1
 id |    name     |         email           |     role      |  job_description    | is_active |         created_at
----+-------------+-------------------------+---------------+---------------------+-----------+----------------------------
  6 | Marwan Helal| marwanhelal15@gmail.com | administrator | System Administrator|     t     | 2025-10-10 12:30:45.123456
(1 row)

INSERT 0 1
                                  status
----------------------------------------------------------------------------
 Admin user created successfully! Login with: marwanhelal15@gmail.com / Admin@2025
(1 row)

                                   warning
----------------------------------------------------------------------------
 IMPORTANT: Change the password immediately after first login!
(1 row)
```

### Verify Your Account

```bash
# Check your account exists
psql -U postgres -d postgres -c "SELECT id, name, email, role FROM users WHERE email = 'marwanhelal15@gmail.com';"
```

---

## Step 7: Final Database Verification

Run these commands to ensure everything is set up correctly:

```bash
# Count all tables (should be 8 including progress_adjustments)
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

# Count predefined phases (should be 10)
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM predefined_phases;"

# Count users (should be 6: 5 test users + 1 admin)
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"

# Verify administrator role exists
psql -U postgres -d postgres -c "SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;"

# Check project_phases has all migration columns
psql -U postgres -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'project_phases' AND column_name IN ('early_access_granted', 'calculated_progress', 'submitted_date', 'job_description') ORDER BY column_name;"
```

**Expected results:**
- 8 tables total
- 10 predefined phases
- 6 users (1 admin, 1 supervisor, 4 engineers)
- Roles: administrator, engineer, supervisor
- All migration columns present

---

## Step 8: Test Login via Backend API

Now test if login works through your deployed backend:

```bash
# Exit the PostgreSQL terminal first
exit

# Test login from your local machine (replace with your actual backend URL)
curl -X POST http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marwanhelal15@gmail.com",
    "password": "Admin@2025"
  }'
```

**Expected successful response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 6,
    "name": "Marwan Helal",
    "email": "marwanhelal15@gmail.com",
    "role": "administrator",
    "jobDescription": "System Administrator"
  }
}
```

**If you get an error:**
- Check the backend logs in Coolify
- Verify DATABASE_URL is correctly set in backend environment variables
- Ensure backend can connect to PostgreSQL

---

## Step 9: Test Login via Frontend

1. Open your frontend URL in a browser: http://ec048kcogswksko0s8kwoocg.77.37.124.98.sslip.io
2. You should see the login page
3. Enter credentials:
   - **Email:** marwanhelal15@gmail.com
   - **Password:** Admin@2025
4. Click "Login"

**Expected result:**
- ✅ Login successful
- ✅ Redirected to Dashboard
- ✅ Can see "Residential Complex A" sample project
- ✅ Can navigate to all pages

---

## Step 10: Change Default Password (IMPORTANT!)

**Security First!** Change your password immediately after first login:

1. In the application, navigate to user settings/profile
2. Change password from `Admin@2025` to your own secure password
3. Log out and log back in with new password to verify

---

## Troubleshooting

### Problem: "psql: command not found"

**Solution:** You're not in the PostgreSQL container. Check:
1. Make sure you clicked "Terminal" on the PostgreSQL database service, not the backend
2. Try: `which psql` to verify psql is available

### Problem: "relation already exists" errors

**Solution:** Tables already exist from previous import attempts. Clean up first:

```bash
# Drop all tables
psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then re-run the import from Step 4
```

### Problem: "curl: command not found"

**Solution:** The PostgreSQL container doesn't have curl. Alternative:

```bash
# Use wget instead
wget -O /tmp/schema-complete.sql https://raw.githubusercontent.com/marwanhelal/track-management-system/main/database/schema-complete.sql
```

Or manually copy-paste the SQL files content into the terminal.

### Problem: Login returns "Invalid credentials"

**Solutions to try:**

1. **Check user exists:**
   ```bash
   psql -U postgres -d postgres -c "SELECT * FROM users WHERE email = 'marwanhelal15@gmail.com';"
   ```

2. **Check backend DATABASE_URL:**
   - In Coolify, go to Backend service → Environment variables
   - Verify DATABASE_URL points to the PostgreSQL service
   - Format: `postgresql://postgres:password@postgres-service:5432/postgres`

3. **Check backend logs:**
   - In Coolify, view backend service logs
   - Look for database connection errors

4. **Test with seed user:**
   - Try logging in with: admin@trackms.com / admin123
   - If this works, the database is fine; issue is with your admin account creation

### Problem: "Cannot connect to database"

**Solutions:**

1. **Check database is running:**
   - In Coolify, verify PostgreSQL service status is "Running"

2. **Check backend environment variables:**
   - Ensure DATABASE_URL is set
   - Ensure it uses the internal service name (not external URL)

3. **Restart backend service:**
   - In Coolify, restart the backend service
   - Wait 30 seconds for it to reconnect to database

---

## Database Schema Overview

Your complete database now includes:

### Core Tables (7):
1. **users** - System users (engineers, supervisors, administrators)
2. **predefined_phases** - 10 architecture phases
3. **projects** - Main projects table
4. **project_phases** - Project phases with workflow
5. **work_logs** - Engineer time tracking
6. **audit_logs** - Complete change history
7. **project_settings** - Per-project configuration

### Additional Tables (1):
8. **progress_adjustments** - Manual progress tracking (migration 003)

### Key Features Included:
- ✅ Early Access System (migration 001)
- ✅ Manual Progress Tracking (migration 003)
- ✅ Administrator Role (migration 004)
- ✅ Submitted/Approved Dates (migration 005)
- ✅ Automatic hour calculations
- ✅ Audit logging
- ✅ Progress variance tracking

### Database Views:
- `project_overview` - Dashboard project summary
- `engineer_work_summary` - Engineer productivity metrics

---

## Next Steps After Database Import

### Immediate (Critical):
1. ✅ Complete this database import guide
2. ✅ Test login with your admin account
3. ✅ Change default password
4. ✅ Verify all features work (create project, add phases, log hours)

### Optional (Production Readiness):
5. **Import Real Data:**
   - Export your local database data (users, projects)
   - Import to Coolify using similar psql commands

6. **Configure Custom Domain:**
   - Add `cdtms.criteriadesigns.com` in Coolify
   - Update DNS records to point to your VPS IP
   - Enable automatic SSL

7. **Enable HTTPS:**
   - Coolify will auto-provision SSL certificates via Let's Encrypt
   - Update frontend environment variable: `REACT_APP_API_URL=https://api.cdtms.criteriadesigns.com`

8. **Backup Configuration:**
   - Set up automated database backups in Coolify
   - Test restore procedure

---

## Success Criteria

✅ **Database import is successful when:**

1. All 8 tables exist in the database
2. `psql -U postgres -d postgres -c "\dt"` shows 8 tables
3. Users table has 6 users including your admin account
4. Predefined_phases table has 10 phases
5. Login works with: marwanhelal15@gmail.com / Admin@2025
6. Frontend loads and shows dashboard
7. Sample project "Residential Complex A" is visible

---

## Time Estimates

- **Step 1-3:** 5 minutes (download files)
- **Step 4-6:** 5 minutes (import data)
- **Step 7-9:** 3 minutes (verification & testing)
- **Total:** ~13 minutes

**Critical path to working login: 13 minutes**

---

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Review Coolify backend logs for error messages
3. Verify all environment variables are set correctly
4. Ensure DATABASE_URL format matches PostgreSQL connection string

---

## Files Reference

- `database/schema-complete.sql` - Complete schema with all migrations (440+ lines)
- `database/seeds.sql` - Initial data and test users (114 lines)
- `database/create-admin-user.sql` - Your admin account creation (28 lines)

All files are available in your GitHub repository:
https://github.com/marwanhelal/track-management-system/tree/main/database

---

**Ready to start? Begin with Step 1! 🚀**
