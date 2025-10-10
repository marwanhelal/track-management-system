# Deployment Checklist for Contabo & Vercel

Use this checklist to ensure everything is ready before and during deployment.

---

## Pre-Deployment Checklist

### 📋 Files to Review Before Deployment

#### Backend Files
- [ ] `backend/Dockerfile` - Multi-stage Docker build configuration
- [ ] `backend/.dockerignore` - Excludes unnecessary files from Docker image
- [ ] `backend/docker-compose.yml` - Orchestrates all backend services
- [ ] `backend/deploy.sh` - Deployment automation script
- [ ] `backend/nginx.conf` - Reverse proxy configuration
- [ ] `backend/.env.production` - Production environment variables
- [ ] `backend/package.json` - Dependencies and scripts
- [ ] `database/migrations/*.sql` - Database migration files

#### Frontend Files
- [ ] `frontend/vercel.json` - Vercel deployment configuration
- [ ] `frontend/.vercelignore` - Files to exclude from Vercel deployment
- [ ] `frontend/.env.production` - Production environment (API URLs)
- [ ] `frontend/package.json` - Dependencies and build scripts

### 🔧 Required Information

- [ ] Contabo VPS IP Address: `_________________`
- [ ] Contabo SSH Username: `root` (or `_________________`)
- [ ] Contabo SSH Password/Key: ✓
- [ ] Domain name (optional): `_________________`
- [ ] Vercel account created: ✓
- [ ] GitHub repository (optional): `_________________`

### 🔐 Security Preparations

- [ ] Generated strong JWT secret (64+ chars)
- [ ] Generated strong JWT refresh secret (64+ chars)
- [ ] Created strong database password (25+ chars)
- [ ] Created strong Redis password (25+ chars)
- [ ] Reviewed `.env.production.example`
- [ ] Made sure NOT to commit `.env.production` to Git

---

## Backend Deployment Checklist (Contabo)

### Step 1: Server Setup
- [ ] Connected to Contabo VPS via SSH
- [ ] Updated system packages (`apt update && apt upgrade`)
- [ ] Installed Docker (`curl -fsSL https://get.docker.com | sh`)
- [ ] Installed Docker Compose (`apt install docker-compose`)
- [ ] Installed Git (`apt install git`)
- [ ] Verified installations (docker --version, etc.)

### Step 2: Application Setup
- [ ] Created `/opt/cdtms` directory
- [ ] Uploaded/cloned backend code to server
- [ ] Navigated to `/opt/cdtms/backend`
- [ ] Created `.env.production` from `.env.production.example`
- [ ] Generated JWT secrets using Node.js crypto
- [ ] Updated all values in `.env.production`:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - [ ] `REDIS_PASSWORD`
  - [ ] `CORS_ORIGIN` (temporary, will update after Vercel)
- [ ] Created required directories (`backups`, `uploads`, `ssl`)

### Step 3: Deployment
- [ ] Made deploy script executable (`chmod +x deploy.sh`)
- [ ] Ran full deployment (`./deploy.sh deploy`)
- [ ] Verified all containers are running (`docker-compose ps`)
- [ ] Checked backend health (`curl http://localhost:10000/api/v1/health`)
- [ ] Reviewed logs for errors (`./deploy.sh logs`)

### Step 4: Firewall Configuration
- [ ] Installed UFW firewall (`apt install ufw`)
- [ ] Allowed SSH port 22 (`ufw allow 22/tcp`)
- [ ] Allowed HTTP port 80 (`ufw allow 80/tcp`)
- [ ] Allowed HTTPS port 443 (`ufw allow 443/tcp`)
- [ ] Allowed backend port 10000 (`ufw allow 10000/tcp`)
- [ ] Enabled firewall (`ufw enable`)
- [ ] Verified rules (`ufw status`)

### Step 5: Database Initialization
- [ ] Connected to PostgreSQL container
- [ ] Verified migrations ran successfully
- [ ] Checked all tables exist (`\dt` in psql)
- [ ] Verified admin user exists (or created one)
- [ ] Tested database connection from backend

### Step 6: Nginx Setup (Optional but Recommended)
- [ ] Updated `nginx.conf` with correct CORS origin
- [ ] Started nginx container (`docker-compose up -d nginx`)
- [ ] Tested nginx configuration
- [ ] Verified nginx is serving requests on port 80

### Step 7: SSL Setup (Optional but Recommended)
- [ ] Pointed domain to Contabo IP
- [ ] Waited for DNS propagation
- [ ] Installed Certbot (`apt install certbot python3-certbot-nginx`)
- [ ] Obtained SSL certificate (`certbot --nginx -d yourdomain.com`)
- [ ] Verified auto-renewal (`certbot renew --dry-run`)

---

## Frontend Deployment Checklist (Vercel)

### Step 1: Local Preparation
- [ ] Navigated to `frontend` directory on local machine
- [ ] Installed Vercel CLI (`npm install -g vercel`)
- [ ] Updated `.env.production` with Contabo backend URL:
  - [ ] `REACT_APP_API_URL` set correctly
  - [ ] `REACT_APP_SOCKET_URL` set correctly
- [ ] Tested build locally (`npm run build`)
- [ ] Verified `build/` directory created successfully
- [ ] No build errors or warnings

### Step 2: Vercel Deployment
- [ ] Logged into Vercel (`vercel login`)
- [ ] Deployed to Vercel (`vercel`)
- [ ] Answered setup prompts correctly
- [ ] Deployed to production (`vercel --prod`)
- [ ] Noted the Vercel URL (e.g., `https://cdtms-frontend.vercel.app`)

### Step 3: Update Backend CORS
- [ ] SSH back into Contabo server
- [ ] Edited `.env.production` with actual Vercel URL
- [ ] Updated `CORS_ORIGIN` with Vercel URL
- [ ] Updated `SOCKET_CORS_ORIGIN` with Vercel URL
- [ ] Updated `nginx.conf` if using nginx
- [ ] Restarted backend (`./deploy.sh restart`)
- [ ] Restarted nginx if applicable (`docker-compose restart nginx`)

---

## Post-Deployment Testing

### Functional Testing
- [ ] Opened frontend URL in browser
- [ ] No console errors on page load
- [ ] Login page loads correctly
- [ ] Logged in with admin credentials (`admin` / `Admin@123`)
- [ ] Login successful, redirected to dashboard
- [ ] Dashboard loads without errors
- [ ] Changed admin password immediately
- [ ] Logged out and logged in with new password
- [ ] Created a test project
- [ ] Created test phases for project
- [ ] Added work logs
- [ ] Verified data persists after page refresh
- [ ] Tested notifications
- [ ] Tested real-time features (Socket.IO)
  - [ ] Opened two browser windows
  - [ ] Made change in one window
  - [ ] Verified update appears in other window

### API Testing
- [ ] Tested health endpoint: `curl https://your-backend/api/v1/health`
- [ ] Response is `{"status":"ok"}`
- [ ] Tested authentication endpoint
- [ ] Tested project creation via API
- [ ] Checked response times (should be < 500ms)

### Database Testing
- [ ] Connected to database
- [ ] Verified test data exists
- [ ] Checked database size
- [ ] Ran test queries
- [ ] Verified indexes are created
- [ ] Created manual backup (`./deploy.sh backup`)
- [ ] Verified backup file exists in `backups/` directory

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks (check with browser DevTools)
- [ ] Checked server resource usage (`htop` or `top`)
- [ ] CPU usage normal (< 50% at rest)
- [ ] Memory usage normal (< 70%)
- [ ] Disk space sufficient (`df -h`)

### Security Testing
- [ ] HTTPS working (if SSL configured)
- [ ] Mixed content warnings resolved
- [ ] CORS only allows Vercel domain
- [ ] Rate limiting working
- [ ] JWT tokens expiring correctly
- [ ] Passwords are hashed in database
- [ ] No sensitive data in console/logs
- [ ] Environment variables not exposed
- [ ] Firewall rules active

---

## Monitoring & Maintenance Setup

### Automated Backups
- [ ] Set up cron job for daily backups
- [ ] Tested manual backup (`./deploy.sh backup`)
- [ ] Verified backup file created and compressed
- [ ] Set up backup rotation (keep last 7 days)
- [ ] (Optional) Set up remote backup to cloud storage

### Log Monitoring
- [ ] Configured log rotation
- [ ] Set up log aggregation (optional)
- [ ] Added monitoring script (optional)
- [ ] Tested log viewing (`./deploy.sh logs`)

### Uptime Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Configured alerts for downtime
- [ ] Set up email notifications
- [ ] Tested alert system

### Health Checks
- [ ] Verified Docker health checks working
- [ ] Tested health endpoint
- [ ] Set up external monitoring ping

---

## Documentation Checklist

### Files Created
- [ ] `CONTABO_VERCEL_DEPLOYMENT.md` - Main deployment guide
- [ ] `backend/DATABASE_SETUP.md` - Database management guide
- [ ] `DEPLOYMENT_CHECKLIST.md` - This checklist
- [ ] `backend/Dockerfile` - Docker build configuration
- [ ] `backend/docker-compose.yml` - Service orchestration
- [ ] `backend/deploy.sh` - Deployment automation
- [ ] `backend/nginx.conf` - Nginx configuration
- [ ] `frontend/vercel.json` - Vercel configuration

### Environment Files
- [ ] `backend/.env.production` - Backend production config (NOT committed)
- [ ] `backend/.env.production.example` - Backend template
- [ ] `frontend/.env.production` - Frontend production config

### Passwords & Secrets Recorded
- [ ] Database password saved securely
- [ ] Redis password saved securely
- [ ] JWT secrets backed up securely
- [ ] Admin password changed and saved
- [ ] Server SSH credentials secured

---

## Troubleshooting Reference

### If Backend Won't Start
1. Check logs: `docker-compose logs backend`
2. Check environment file: `cat .env.production`
3. Verify database is running: `docker-compose ps`
4. Check ports: `netstat -tulpn | grep 10000`

### If Frontend Can't Connect
1. Check browser console for errors
2. Verify API URL in Vercel environment variables
3. Test backend directly: `curl http://your-ip/api/v1/health`
4. Check CORS settings in backend `.env.production`
5. Check nginx configuration if using reverse proxy

### If Database Connection Fails
1. Check PostgreSQL container: `docker-compose logs postgres`
2. Verify credentials in `.env.production`
3. Test connection: `docker exec -it cdtms-postgres psql -U cdtms_user -d track_management`
4. Check database host (should be `postgres` in Docker network)

### If Socket.IO Not Working
1. Check browser console for WebSocket errors
2. Verify `REACT_APP_SOCKET_URL` matches backend
3. Check `SOCKET_CORS_ORIGIN` in backend
4. Verify nginx WebSocket proxy configuration

---

## Success Criteria

Your deployment is successful when:

✅ All backend containers are running (`docker-compose ps`)
✅ Health endpoint returns 200 OK
✅ Frontend loads without errors
✅ Can log in with admin credentials
✅ Can create, read, update, delete projects
✅ Real-time features working (Socket.IO)
✅ Database persisting data correctly
✅ Backups being created successfully
✅ No CORS errors in browser console
✅ SSL certificate installed (if configured)
✅ Firewall configured and active
✅ Monitoring and alerts set up

---

## Emergency Rollback

If something goes wrong:

```bash
# Stop current deployment
cd /opt/cdtms/backend
./deploy.sh stop

# Restore database from backup
gunzip -c backups/db_backup_LATEST.sql.gz | docker exec -i cdtms-postgres psql -U cdtms_user -d track_management

# Restart services
./deploy.sh start

# Or redeploy from scratch
./deploy.sh deploy
```

For frontend:
```bash
# Rollback to previous deployment
vercel rollback
```

---

## Support Contacts

- **Deployment Issues**: Check logs first (`./deploy.sh logs`)
- **Database Issues**: See `backend/DATABASE_SETUP.md`
- **Full Guide**: See `CONTABO_VERCEL_DEPLOYMENT.md`

---

## Final Notes

📝 Save this checklist and mark items as you complete them during deployment.
📝 Keep environment files and passwords in a secure password manager.
📝 Schedule regular maintenance windows for updates.
📝 Monitor logs regularly for the first week after deployment.
📝 Test backup restoration process at least once to ensure it works.

**Good luck with your deployment! 🚀**
