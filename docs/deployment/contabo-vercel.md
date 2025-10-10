# CDTMS Deployment Guide
## Deploying Backend to Contabo VPS & Frontend to Vercel

This guide will walk you through deploying your CDTMS (Construction Document Tracking Management System) application with:
- **Backend**: Contabo VPS (Docker + PostgreSQL + Redis)
- **Frontend**: Vercel (Static hosting)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment on Contabo](#backend-deployment-on-contabo)
3. [Frontend Deployment on Vercel](#frontend-deployment-on-vercel)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Access
- [ ] Contabo VPS account with server provisioned
- [ ] Vercel account (free tier works)
- [ ] GitHub account (optional, for auto-deployments)
- [ ] Domain name (optional, but recommended)

### Required Software
- [ ] SSH client (PuTTY for Windows, or built-in terminal for Mac/Linux)
- [ ] Git installed locally
- [ ] Node.js 18+ and npm installed locally
- [ ] Vercel CLI: `npm install -g vercel`

### Information You'll Need
- [ ] Contabo VPS IP address
- [ ] Contabo SSH credentials (root user)
- [ ] Database credentials (will be auto-generated)
- [ ] JWT secrets (will be generated)

---

## Backend Deployment on Contabo

### Step 1: Connect to Your Contabo VPS

```bash
ssh root@YOUR_CONTABO_IP
```

Replace `YOUR_CONTABO_IP` with your actual Contabo server IP address.

### Step 2: Update System & Install Required Software

```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Git
apt install git -y

# Verify installations
docker --version
docker-compose --version
git --version
```

### Step 3: Clone Your Repository

```bash
# Create application directory
mkdir -p /opt/cdtms
cd /opt/cdtms

# Clone your repository
git clone YOUR_REPOSITORY_URL .

# Or upload files via SCP/SFTP
```

**If uploading manually:**
- Use WinSCP, FileZilla, or `scp` command
- Upload the entire `backend` directory to `/opt/cdtms/backend`

### Step 4: Configure Environment Variables

```bash
cd /opt/cdtms/backend

# Copy example environment file
cp .env.production.example .env.production

# Generate secure secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Edit environment file
nano .env.production
```

**Update the following values in `.env.production`:**

```bash
# Server Configuration
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# Database Configuration
DB_HOST=postgres                    # Docker container name
DB_PORT=5432
DB_NAME=track_management
DB_USER=cdtms_user
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123!
DB_SSL=false                        # Internal connection, no SSL needed
DB_POOL_MIN=10
DB_POOL_MAX=100

# JWT Secrets (paste generated values from above)
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration (will update after Vercel deployment)
CORS_ORIGIN=https://your-app.vercel.app
CORS_CREDENTIALS=true

# Socket.IO
SOCKET_CORS_ORIGIN=https://your-app.vercel.app

# Redis Configuration
REDIS_HOST=redis                    # Docker container name
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_456!
REDIS_DB=0

# API Configuration
API_PREFIX=/api/v1
API_DOCS_ENABLED=false

# Backup Configuration
BACKUP_DIR=./backups
BACKUP_SCHEDULE=0 2 * * *
BACKUP_KEEP_COUNT=7
```

**Save and exit** (`Ctrl+X`, then `Y`, then `Enter` in nano)

### Step 5: Create Required Directories

```bash
mkdir -p backups uploads ssl
chmod 755 backups uploads
```

### Step 6: Deploy with Docker Compose

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run full deployment
./deploy.sh deploy
```

This will:
- ✅ Build Docker images
- ✅ Start PostgreSQL database
- ✅ Start Redis cache
- ✅ Start backend application
- ✅ Run database migrations
- ✅ Perform health checks

**Expected output:**
```
✓ All requirements met
✓ Directories created
✓ Code updated
✓ Database backed up
✓ Deployment complete
✓ Migrations completed
✓ API is healthy
🚀 Deployment successful!
```

### Step 7: Verify Backend is Running

```bash
# Check container status
docker-compose ps

# Should show:
# cdtms-backend    running    0.0.0.0:10000->10000/tcp
# cdtms-postgres   running    5432/tcp
# cdtms-redis      running    6379/tcp

# Test API health endpoint
curl http://localhost:10000/api/v1/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 8: Configure Firewall

```bash
# Install UFW if not already installed
apt install ufw -y

# Allow SSH (IMPORTANT: Don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow backend port (if not using nginx)
ufw allow 10000/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 9: (Optional) Setup Nginx Reverse Proxy

**Why use Nginx?**
- SSL/TLS termination
- Better performance
- Load balancing
- Standard ports (80/443)

```bash
# Nginx is included in docker-compose.yml
# Update nginx.conf with your Vercel URL
cd /opt/cdtms/backend
nano nginx.conf

# Update this line (around line 40):
add_header Access-Control-Allow-Origin "https://your-actual-app.vercel.app" always;

# Save and restart
docker-compose restart nginx
```

### Step 10: (Optional) Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal:
certbot renew --dry-run
```

### Step 11: Initialize Database with Default User

The database migrations should create the admin user automatically. If not:

```bash
# Access PostgreSQL
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management

# Check if admin exists
SELECT username, email, role FROM users WHERE role = 'admin';

# If no admin user, create one:
INSERT INTO users (
    username,
    email,
    password,
    role,
    full_name,
    phone,
    is_active
) VALUES (
    'admin',
    'admin@cdtms.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYkZjxC9pYS', -- password: Admin@123
    'admin',
    'System Administrator',
    '+1234567890',
    true
);

# Exit PostgreSQL
\q
```

**⚠️ IMPORTANT:** Change the default admin password immediately after first login!

---

## Frontend Deployment on Vercel

### Step 1: Install Vercel CLI

```bash
# On your local machine (not on Contabo server)
npm install -g vercel
```

### Step 2: Update Frontend Environment Variables

Navigate to your frontend directory and update `.env.production`:

```bash
cd frontend
# Open in your favorite editor
```

**Update with your Contabo server details:**

```bash
# Option 1: Using IP address with nginx (port 80)
REACT_APP_API_URL=http://YOUR_CONTABO_IP/api/v1
REACT_APP_SOCKET_URL=http://YOUR_CONTABO_IP

# Option 2: Using domain with SSL (RECOMMENDED)
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_SOCKET_URL=https://api.yourdomain.com

# Option 3: Direct backend access (no nginx)
REACT_APP_API_URL=http://YOUR_CONTABO_IP:10000/api/v1
REACT_APP_SOCKET_URL=http://YOUR_CONTABO_IP:10000
```

### Step 3: Test Build Locally

```bash
# Install dependencies
npm install

# Create production build
npm run build

# Verify build folder exists
ls -la build/
```

### Step 4: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (first time - will ask questions)
vercel

# Follow the prompts:
# ? Set up and deploy "frontend"? [Y/n] Y
# ? Which scope? Your account
# ? Link to existing project? [y/N] n
# ? What's your project's name? cdtms-frontend
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# This creates a preview deployment
# After testing, deploy to production:
vercel --prod
```

**Alternative: Deploy via Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add Environment Variables:
   - `REACT_APP_API_URL`: `http://YOUR_CONTABO_IP/api/v1`
   - `REACT_APP_SOCKET_URL`: `http://YOUR_CONTABO_IP`
6. Click "Deploy"

### Step 5: Get Vercel URL

After deployment, you'll get a URL like:
```
https://cdtms-frontend.vercel.app
```

### Step 6: Update Backend CORS Settings

**On Contabo server:**

```bash
cd /opt/cdtms/backend
nano .env.production
```

**Update CORS settings:**
```bash
CORS_ORIGIN=https://cdtms-frontend.vercel.app
SOCKET_CORS_ORIGIN=https://cdtms-frontend.vercel.app
```

**Restart backend:**
```bash
./deploy.sh restart
```

**If using nginx, also update nginx.conf:**
```bash
nano nginx.conf

# Update this line:
add_header Access-Control-Allow-Origin "https://cdtms-frontend.vercel.app" always;

# Restart
docker-compose restart nginx
```

---

## Post-Deployment Configuration

### 1. Test Full Application Flow

1. **Open Frontend**: Visit `https://your-app.vercel.app`
2. **Login**: Use `admin` / `Admin@123`
3. **Change Password**: Go to Profile → Change Password
4. **Create Test Project**: Verify database connectivity
5. **Test Real-time Features**: Open in two browsers, verify Socket.IO works

### 2. Setup Database Backups

```bash
# On Contabo server
cd /opt/cdtms/backend

# Test manual backup
./deploy.sh backup

# Setup automated backups (cron job)
crontab -e

# Add this line (backup daily at 2 AM):
0 2 * * * cd /opt/cdtms/backend && ./deploy.sh backup >> /var/log/cdtms-backup.log 2>&1

# Save and exit
```

### 3. Setup Monitoring

```bash
# View live logs
cd /opt/cdtms/backend
./deploy.sh logs

# Check application health
./deploy.sh health

# View container status
./deploy.sh status
```

---

## Maintenance Commands

### Backend (Contabo)

```bash
cd /opt/cdtms/backend

# View logs
./deploy.sh logs

# Check health
./deploy.sh health

# Restart application
./deploy.sh restart

# Stop application
./deploy.sh stop

# Start application
./deploy.sh start

# Full update (pull code + redeploy)
./deploy.sh update

# Create backup
./deploy.sh backup

# Run migrations
./deploy.sh migrate

# Cleanup old images/backups
./deploy.sh cleanup
```

### Frontend (Vercel)

```bash
cd frontend

# Deploy new version
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs

# Rollback to previous deployment
vercel rollback
```

---

## Troubleshooting

### Backend Issues

**Problem: Can't connect to backend**
```bash
# Check if containers are running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Check if port is open
netstat -tulpn | grep 10000

# Test locally on server
curl http://localhost:10000/api/v1/health
```

**Problem: Database connection errors**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database credentials
cat .env.production | grep DB_

# Connect to database manually
docker exec -it cdtms-postgres psql -U cdtms_user -d track_management
```

**Problem: CORS errors**
```bash
# Verify CORS_ORIGIN in .env.production matches your Vercel URL exactly
cat .env.production | grep CORS

# Restart backend after changing
./deploy.sh restart
```

**Problem: Out of disk space**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Clean old backups
./deploy.sh cleanup
```

### Frontend Issues

**Problem: API calls failing**
- Check browser console for CORS errors
- Verify `REACT_APP_API_URL` in Vercel environment variables
- Test backend URL directly in browser: `http://YOUR_IP/api/v1/health`

**Problem: Environment variables not updating**
- Redeploy: `vercel --prod`
- Clear Vercel build cache in dashboard
- Check Environment Variables section in Vercel dashboard

**Problem: Build failing**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep error
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated unique JWT secrets
- [ ] Set strong database passwords
- [ ] Configured firewall (UFW)
- [ ] Enabled SSL/HTTPS (recommended)
- [ ] Set `NODE_ENV=production`
- [ ] Disabled API docs (`API_DOCS_ENABLED=false`)
- [ ] Configured CORS to specific domain (not `*`)
- [ ] Regular backups configured
- [ ] Monitoring/alerts set up

---

## Quick Reference

### Important URLs
- Frontend: `https://your-app.vercel.app`
- Backend API: `http://YOUR_CONTABO_IP/api/v1`
- Health Check: `http://YOUR_CONTABO_IP/api/v1/health`

### Default Credentials
- Username: `admin`
- Password: `Admin@123` (⚠️ CHANGE IMMEDIATELY)

### Important Commands
```bash
# Deploy backend
cd /opt/cdtms/backend && ./deploy.sh deploy

# Deploy frontend
cd frontend && vercel --prod

# View logs
./deploy.sh logs

# Backup database
./deploy.sh backup

# Restart services
./deploy.sh restart
```

---

**Congratulations! Your CDTMS application is now deployed! 🎉**
