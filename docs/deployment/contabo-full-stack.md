# Full Stack Deployment on Contabo
## Backend + Frontend on Single Server

This guide shows how to deploy **both** backend and frontend on your Contabo VPS.

---

## Why Host Both on Contabo?

✅ **Simpler setup** - One server to manage
✅ **No CORS issues** - Same domain for API and frontend
✅ **Lower cost** - No need for Vercel
✅ **Full control** - Everything in one place
✅ **Easier SSL** - Single certificate for both

---

## Architecture

```
Internet
    ↓
Nginx (Port 80/443)
    ├─→ / (Frontend) → Serve React static files
    ├─→ /api/* (Backend) → Proxy to Node.js:10000
    └─→ /socket.io/* → Proxy to Node.js:10000
         ↓
    Backend (Node.js + Express)
         ↓
    ┌─────────┬──────────┐
    ↓         ↓          ↓
PostgreSQL  Redis    Files
```

---

## Prerequisites

Same as before:
- Contabo VPS with Ubuntu/Debian
- SSH access
- Domain name (optional but recommended for SSL)

---

## Step-by-Step Deployment

### Step 1: Connect to Contabo & Install Software

```bash
# Connect via SSH
ssh root@YOUR_CONTABO_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Git and Node.js (for building frontend)
apt install git nodejs npm -y

# Verify
docker --version
docker-compose --version
node --version
```

### Step 2: Upload Your Code

```bash
# Create directory
mkdir -p /opt/cdtms
cd /opt/cdtms

# Option A: Clone from Git
git clone YOUR_REPOSITORY_URL .

# Option B: Upload via SCP from your local machine
# (On your local machine, run:)
# scp -r "D:\cdtms new\backend" root@YOUR_IP:/opt/cdtms/
# scp -r "D:\cdtms new\frontend" root@YOUR_IP:/opt/cdtms/
```

### Step 3: Build Frontend on Your Local Machine

```bash
# On your LOCAL machine
cd "D:\cdtms new\frontend"

# Create production environment file
# Update .env.production with your Contabo IP or domain
nano .env.production
```

Update `.env.production`:
```bash
# Use the SAME domain/IP as your server (no CORS needed!)
# If using domain: https://yourdomain.com
# If using IP without nginx: http://YOUR_CONTABO_IP:10000
# If using IP with nginx: http://YOUR_CONTABO_IP

REACT_APP_API_URL=http://YOUR_CONTABO_IP/api/v1
REACT_APP_SOCKET_URL=http://YOUR_CONTABO_IP

# Or with domain and SSL:
# REACT_APP_API_URL=https://yourdomain.com/api/v1
# REACT_APP_SOCKET_URL=https://yourdomain.com
```

Build the frontend:
```bash
# Install dependencies
npm install

# Build for production
npm run build

# This creates a 'build' folder with optimized static files
```

### Step 4: Upload Frontend Build to Contabo

```bash
# On your local machine, upload the build folder
scp -r build root@YOUR_CONTABO_IP:/opt/cdtms/backend/frontend-build

# Or if already on server, build there:
# cd /opt/cdtms/frontend
# npm install
# npm run build
# mv build ../backend/frontend-build
```

### Step 5: Configure Backend Environment

```bash
# On Contabo server
cd /opt/cdtms/backend

# Copy example env file
cp .env.production.example .env.production

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Edit environment file
nano .env.production
```

Important settings for full-stack deployment:
```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=track_management
DB_USER=cdtms_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD

# JWT (use generated secrets)
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here

# CORS - Since both are on same domain, use wildcard or specific domain
CORS_ORIGIN=http://YOUR_CONTABO_IP
# Or with domain:
# CORS_ORIGIN=https://yourdomain.com

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```

### Step 6: Use Full-Stack Docker Compose

```bash
# Rename the full-stack docker-compose file
cd /opt/cdtms/backend
mv docker-compose.yml docker-compose-backend-only.yml.bak
mv docker-compose-full-stack.yml docker-compose.yml

# Also use the full-stack nginx config
mv nginx.conf nginx-backend-only.conf.bak
mv nginx-full-stack.conf nginx.conf

# Create required directories
mkdir -p backups uploads ssl frontend-build
```

### Step 7: Deploy Everything

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy (this will build backend, start DB, Redis, Backend, and Nginx)
./deploy.sh deploy
```

### Step 8: Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Should show:
# cdtms-postgres   running
# cdtms-redis      running
# cdtms-backend    running
# cdtms-nginx      running

# Test backend health
curl http://localhost:10000/api/v1/health

# Test frontend (through nginx)
curl http://localhost/

# Test from outside
curl http://YOUR_CONTABO_IP/
curl http://YOUR_CONTABO_IP/api/v1/health
```

### Step 9: Configure Firewall

```bash
# Install firewall
apt install ufw -y

# Allow SSH (IMPORTANT!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 10: (Optional) Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot -y

# Stop nginx temporarily
docker-compose stop nginx

# Get certificate (replace with your domain)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/

# Copy certificates to ssl folder
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/cdtms/backend/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/cdtms/backend/ssl/

# Edit nginx config to enable SSL
nano nginx.conf
# Uncomment the SSL sections (lines starting with # for SSL)

# Restart nginx
docker-compose start nginx

# Set up auto-renewal
echo "0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/cdtms/backend/ssl/ && docker-compose restart nginx" | crontab -
```

---

## Updating the Application

### Update Backend Only

```bash
cd /opt/cdtms/backend
git pull  # or upload new files
./deploy.sh restart
```

### Update Frontend Only

```bash
# On your local machine
cd frontend
npm run build

# Upload new build
scp -r build root@YOUR_CONTABO_IP:/opt/cdtms/backend/frontend-build

# On server, reload nginx
docker-compose restart nginx
```

### Update Both

```bash
# Build frontend locally
cd frontend
npm run build

# Upload everything
scp -r build root@YOUR_CONTABO_IP:/opt/cdtms/backend/frontend-build

# On server
cd /opt/cdtms/backend
git pull  # or upload backend changes
./deploy.sh update
```

---

## Environment Variables for Frontend

Since everything is on the same server, update your frontend `.env.production`:

### With Nginx (Recommended)
```bash
# Everything on same domain, so just use relative paths or same domain
REACT_APP_API_URL=http://YOUR_IP_OR_DOMAIN/api/v1
REACT_APP_SOCKET_URL=http://YOUR_IP_OR_DOMAIN

# With SSL:
REACT_APP_API_URL=https://yourdomain.com/api/v1
REACT_APP_SOCKET_URL=https://yourdomain.com
```

### Direct Access (No Nginx)
```bash
REACT_APP_API_URL=http://YOUR_IP:10000/api/v1
REACT_APP_SOCKET_URL=http://YOUR_IP:10000
```

---

## Advantages of This Setup

1. **No CORS Issues**: Frontend and backend on same domain
2. **Single SSL Certificate**: One certificate covers both
3. **Simpler Deployment**: One server, one deploy command
4. **Lower Costs**: No need for Vercel or other hosting
5. **Full Control**: Everything under your management
6. **Easier Debugging**: All logs in one place

---

## Disadvantages

1. **No CDN**: Slower for users far from server
2. **Single Point of Failure**: If server goes down, everything is down
3. **Resource Sharing**: Frontend and backend compete for resources
4. **Manual SSL Management**: Need to maintain certificates yourself

---

## Performance Optimization

### Enable Nginx Caching

Add to `nginx-full-stack.conf`:
```nginx
# Cache path
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# In API location block:
location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    # ... rest of config
}
```

### Optimize Frontend Build

```bash
# On local machine
cd frontend

# Analyze bundle size
npm install -g source-map-explorer
npm run build
source-map-explorer build/static/js/*.js
```

---

## Monitoring

```bash
# View all logs
cd /opt/cdtms/backend
docker-compose logs -f

# View nginx access logs
docker-compose logs nginx

# View backend logs
docker-compose logs backend

# Check resource usage
docker stats
```

---

## Backup Strategy

Same as before:
```bash
# Automated daily backups
./deploy.sh backup

# Set up cron
crontab -e
# Add: 0 2 * * * cd /opt/cdtms/backend && ./deploy.sh backup
```

Also backup frontend build:
```bash
# Backup frontend
tar -czf frontend-backup-$(date +%Y%m%d).tar.gz frontend-build/
```

---

## Troubleshooting

### Frontend shows 404
- Check if `frontend-build` folder exists and has files
- Check nginx container logs: `docker-compose logs nginx`
- Verify nginx config: `docker exec cdtms-nginx nginx -t`

### API calls fail
- Check if backend is running: `docker-compose ps`
- Test backend directly: `curl http://localhost:10000/api/v1/health`
- Check nginx proxy config

### Blank page or errors
- Check browser console for errors
- Verify environment variables in build
- Check that static files are accessible

---

## Quick Commands Reference

```bash
# Full deployment
./deploy.sh deploy

# Restart everything
./deploy.sh restart

# View logs
./deploy.sh logs

# Update application
./deploy.sh update

# Backup database
./deploy.sh backup

# Check health
./deploy.sh health

# Rebuild frontend (after code changes)
# On local: npm run build
# Upload: scp -r build root@IP:/opt/cdtms/backend/frontend-build
# On server: docker-compose restart nginx
```

---

## Comparison: Contabo Only vs Contabo + Vercel

| Feature | Contabo Only | Contabo + Vercel |
|---------|-------------|------------------|
| Setup Complexity | ★★☆☆☆ | ★★★☆☆ |
| Cost | $ | $$ |
| Performance (nearby) | ★★★★☆ | ★★★★★ |
| Performance (global) | ★★☆☆☆ | ★★★★★ |
| CORS Issues | None | Possible |
| SSL Setup | Manual | Automatic |
| CDN | No | Yes |
| Control | Full | Split |
| Recommended for | Local/Regional | Global |

---

## Recommendation

**Choose Contabo Full-Stack If:**
- Your users are in one region/country
- You want full control
- You want simpler deployment
- Budget is limited
- You're comfortable with server management

**Choose Contabo + Vercel If:**
- Users are worldwide
- You want maximum frontend performance
- You want automatic SSL/CDN
- You prefer managed frontend hosting

---

**Both options are valid! Start with full-stack on Contabo (simpler), and migrate to Vercel later if needed.**
