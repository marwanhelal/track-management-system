# 🚀 Pre-Deployment Checklist

## ✅ Critical Fixes Applied

- [x] Rate limiting added to auth endpoints
- [x] Response compression (gzip) enabled
- [x] Production logging enabled (Morgan)
- [x] Database connection pool made configurable
- [x] Connection timeout increased to 5 seconds

---

## 🔐 STEP 1: Generate Secure Secrets (5 minutes)

### Generate JWT Secrets

Run this command **TWICE** to generate two different secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Save these values** - you'll need them in the next step:
- First output → `JWT_SECRET`
- Second output → `JWT_REFRESH_SECRET`

---

## ⚙️ STEP 2: Configure Production Environment (10 minutes)

### Backend Environment Variables

Create `.env` file on your production server (Render.com) with these values:

```env
# Server Configuration
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# Database (Get from Render PostgreSQL dashboard)
DB_HOST=your-db-host.render.com
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
DB_SSL=true
DB_POOL_MIN=10
DB_POOL_MAX=100
DB_CONNECTION_TIMEOUT=5000

# JWT Configuration (Use generated secrets from Step 1)
JWT_SECRET=PASTE_FIRST_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=PASTE_SECOND_GENERATED_SECRET_HERE
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (Your Vercel frontend URL)
CORS_ORIGIN=https://your-app-name.vercel.app
CORS_CREDENTIALS=true

# API
API_PREFIX=/api/v1
API_DOCS_ENABLED=false

# Socket.IO
SOCKET_CORS_ORIGIN=https://your-app-name.vercel.app

# Backups
BACKUP_SCHEDULE=0 2 * * *
BACKUP_KEEP_COUNT=7
```

### Frontend Environment Variables (Vercel)

Set these in Vercel dashboard → Project Settings → Environment Variables:

```env
REACT_APP_API_URL=https://your-api.onrender.com/api/v1
REACT_APP_SOCKET_URL=https://your-api.onrender.com
```

---

## 🏗️ STEP 3: Build the Application (10 minutes)

### Build Backend

```bash
cd backend
npm install
npm run build
```

**Verify**: Check that `backend/dist` folder is created with compiled JavaScript files.

### Build Frontend

```bash
cd frontend

# Set environment variables for build
export REACT_APP_API_URL=https://your-api.onrender.com/api/v1
export REACT_APP_SOCKET_URL=https://your-api.onrender.com

# Or on Windows:
# set REACT_APP_API_URL=https://your-api.onrender.com/api/v1
# set REACT_APP_SOCKET_URL=https://your-api.onrender.com

npm install
npm run build
```

**Verify**: Check that `frontend/build` folder is created with optimized files.

---

## 🗄️ STEP 4: Database Setup (15 minutes)

### Create PostgreSQL Database on Render

1. Go to Render.com dashboard
2. Click "New" → "PostgreSQL"
3. Name: `track-management-db`
4. Plan: Choose appropriate plan
5. Click "Create Database"
6. **Copy the Internal Database URL**

### Run Migrations

```bash
# Update backend/.env with production database credentials first
cd backend

# Test connection
npm run db:test

# Run migrations
psql <YOUR_RENDER_DATABASE_URL> -f ../database/schema.sql
psql <YOUR_RENDER_DATABASE_URL> -f ../database/migrations/001_add_early_access_to_phases.sql
psql <YOUR_RENDER_DATABASE_URL> -f ../database/migrations/003_add_manual_progress_tracking.sql
psql <YOUR_RENDER_DATABASE_URL> -f ../database/migrations/004_add_administrator_role.sql
psql <YOUR_RENDER_DATABASE_URL> -f ../database/migrations/005_add_submitted_approved_dates.sql
```

### Create Backup

```bash
npm run backup:create
```

---

## 🚢 STEP 5: Deploy Backend to Render (20 minutes)

### Create Web Service

1. Go to Render dashboard → Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `track-management-api`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Instance Type**: Choose based on needs

4. Add all environment variables from Step 2

5. Click "Create Web Service"

6. Wait for deployment (5-10 minutes)

7. **Copy the service URL**: `https://your-api.onrender.com`

---

## 🎨 STEP 6: Deploy Frontend to Vercel (10 minutes)

### Import Project to Vercel

1. Go to vercel.com → Click "New Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Add environment variables:
   ```
   REACT_APP_API_URL=https://your-api.onrender.com/api/v1
   REACT_APP_SOCKET_URL=https://your-api.onrender.com
   ```

5. Click "Deploy"

6. Wait for deployment (2-5 minutes)

7. **Your app is live!** Copy the Vercel URL

### Update Backend CORS

Go back to Render → Your Web Service → Environment → Update:
```
CORS_ORIGIN=https://your-app.vercel.app
SOCKET_CORS_ORIGIN=https://your-app.vercel.app
```

Click "Save Changes" (this will redeploy)

---

## ✅ STEP 7: Verify Deployment (15 minutes)

### Backend Health Check

Visit: `https://your-api.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-06T...",
  "uptime": 123.45,
  "database": {
    "status": "healthy",
    "connected": true
  }
}
```

### Frontend Test

1. Open `https://your-app.vercel.app`
2. Try to login with test credentials
3. Verify all features work:
   - [ ] Login/Logout
   - [ ] Dashboard loads
   - [ ] Projects list
   - [ ] Create new project
   - [ ] Add work logs
   - [ ] Real-time updates (Socket.IO)
   - [ ] Export functionality

### Test Rate Limiting

Try logging in with wrong password 6 times rapidly.
Expected: Should block you after 5 attempts

---

## 🔒 STEP 8: Security Verification (10 minutes)

### Check Environment Variables

- [ ] No secrets in Git repository
- [ ] JWT secrets are strong (64+ characters)
- [ ] Database password is strong
- [ ] CORS origins match your domains
- [ ] NODE_ENV=production

### Check Headers

Visit: https://securityheaders.com/
Enter your Vercel URL and verify security headers

### Check SSL

- [ ] Both frontend and backend use HTTPS
- [ ] No mixed content warnings

---

## 📊 STEP 9: Setup Monitoring (10 minutes)

### Render Monitoring

1. Enable "Auto-Deploy" on Git push
2. Enable email notifications for failed deploys
3. Set up health check monitoring

### Vercel Monitoring

1. Enable Analytics (if on paid plan)
2. Set up deployment notifications

### Database Backups

1. Verify Render's automatic backups are enabled
2. Schedule manual backup cron job:
   - Command: `npm run backup:create`
   - Schedule: `0 2 * * *` (2 AM daily)

---

## 📝 STEP 10: Documentation (5 minutes)

### Update README

Create a deployment summary:
- Production URLs
- Deployment date
- Key environment variables (non-sensitive)
- Troubleshooting contacts

### Save Credentials Securely

Store in a password manager:
- Database credentials
- JWT secrets
- Admin user credentials
- Render/Vercel account info

---

## 🎉 Deployment Complete!

### Post-Deployment Tasks

**Week 1:**
- [ ] Monitor error logs daily
- [ ] Check database performance
- [ ] Verify backup system works
- [ ] Test all user workflows

**Week 2:**
- [ ] Review application performance
- [ ] Check resource usage (CPU/Memory)
- [ ] Optimize if needed
- [ ] Collect user feedback

**Monthly:**
- [ ] Review and update dependencies
- [ ] Test backup restoration
- [ ] Security audit
- [ ] Performance review

---

## 🆘 Troubleshooting

### Backend won't start
- Check Render logs
- Verify database connection string
- Ensure all environment variables are set

### Frontend can't connect to backend
- Check CORS settings
- Verify API URL in frontend env
- Check network tab for errors

### Database connection errors
- Verify database credentials
- Check database status on Render
- Ensure SSL is enabled

### Rate limiting too strict
- Adjust limits in `backend/src/app.ts`
- Redeploy backend

---

## 📞 Support

- **Render Status**: https://status.render.com
- **Vercel Status**: https://status.vercel.com
- **Documentation**: See `DEPLOYMENT_BACKUP_GUIDE.md`

---

**Estimated Total Time**: 2-3 hours
**Complexity**: Medium
**Prerequisites**: GitHub account, Render account, Vercel account

✅ **You're ready for production!**
