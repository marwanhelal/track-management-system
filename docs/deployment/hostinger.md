# Hostinger VPS Deployment Guide
## Simplest Deployment for Your CDTMS Application

**This is the EASIEST deployment option with good support!**

---

## Why Hostinger VPS?

✅ **Better support than Contabo** - 24/7 live chat
✅ **User-friendly control panel** - hPanel is easier than Contabo
✅ **One-click apps** - Docker, Node.js pre-installed options
✅ **Same cost** - Starting at $7.99/month
✅ **Better documentation** - Beginner-friendly guides
✅ **All your files work** - Use the same deployment files!

---

## Prerequisites

1. **Hostinger VPS Account** - Get one at: https://www.hostinger.com/vps-hosting
   - Recommended: VPS 2 plan ($7.99/month) or higher
   - Includes: 4GB RAM, 100GB storage, Ubuntu

2. **Domain (Optional but recommended)** - Can buy from Hostinger too
   - Makes SSL setup easier
   - Professional look

---

## Step-by-Step Deployment

### Step 1: Set Up Hostinger VPS

1. **Purchase VPS Plan**
   - Go to Hostinger.com
   - Choose VPS Hosting → VPS 2 or VPS 3
   - Select Ubuntu 22.04 as OS
   - Complete purchase

2. **Access hPanel**
   - Login to Hostinger
   - Go to VPS → Manage
   - Note your:
     - Server IP: `xxx.xxx.xxx.xxx`
     - SSH Username: `root`
     - SSH Password: (in hPanel)

3. **Connect via SSH**

   **Windows (Using PuTTY):**
   - Download PuTTY from putty.org
   - Enter IP address
   - Click Open
   - Login with root and password

   **Or use hPanel Browser SSH:**
   - In hPanel, click "Browser SSH"
   - Automatically logged in!

---

### Step 2: Install Docker (One Command!)

Hostinger makes this easier than Contabo:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker using Hostinger's optimized script
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Node.js (for building frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installations
docker --version
docker-compose --version
node --version
```

**Hostinger Advantage:** Often Docker is pre-installed or available as one-click app!

---

### Step 3: Upload Your Application

**Option A: Using FileZilla (Easiest for Windows users)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect:
   - Host: `sftp://YOUR_HOSTINGER_IP`
   - Username: `root`
   - Password: (from hPanel)
   - Port: `22`
3. Upload folders:
   - Upload `backend` folder to `/opt/cdtms/backend`
   - Upload `frontend` folder to `/opt/cdtms/frontend`

**Option B: Using Git**

```bash
# Create directory
mkdir -p /opt/cdtms
cd /opt/cdtms

# Clone your repository
git clone YOUR_REPOSITORY_URL .
```

---

### Step 4: Build Frontend (On Your Local PC)

```bash
# On your Windows PC
cd "D:\cdtms new\frontend"

# Update .env.production with Hostinger IP
# Open in Notepad and edit:
REACT_APP_API_URL=http://YOUR_HOSTINGER_IP/api/v1
REACT_APP_SOCKET_URL=http://YOUR_HOSTINGER_IP

# Or with domain (if you have one):
REACT_APP_API_URL=https://yourdomain.com/api/v1
REACT_APP_SOCKET_URL=https://yourdomain.com

# Install and build
npm install
npm run build
```

This creates a `build` folder.

---

### Step 5: Upload Frontend Build

**Using FileZilla:**
1. Navigate to `D:\cdtms new\frontend\build` locally
2. Upload entire `build` folder to `/opt/cdtms/backend/frontend-build` on server

**Or using SCP:**
```bash
scp -r build root@YOUR_HOSTINGER_IP:/opt/cdtms/backend/frontend-build
```

---

### Step 6: Configure Backend

```bash
# On Hostinger VPS (via SSH)
cd /opt/cdtms/backend

# Copy environment template
cp .env.production.example .env.production

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Edit environment file (use nano or hPanel file manager)
nano .env.production
```

**Important settings:**

```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=track_management
DB_USER=cdtms_user
DB_PASSWORD=ChangeThisToStrongPassword123!

# JWT (paste generated values)
JWT_SECRET=your_generated_secret_here_64_chars
JWT_REFRESH_SECRET=your_generated_refresh_secret_here_64_chars

# CORS - Use your Hostinger IP or domain
CORS_ORIGIN=http://YOUR_HOSTINGER_IP
SOCKET_CORS_ORIGIN=http://YOUR_HOSTINGER_IP

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=AnotherStrongPassword456!
```

Save with `Ctrl+X`, then `Y`, then `Enter`

---

### Step 7: Deploy Using Full-Stack Configuration

```bash
cd /opt/cdtms/backend

# Use full-stack docker-compose (both backend + frontend)
cp docker-compose-full-stack.yml docker-compose.yml

# Use full-stack nginx config
cp nginx-full-stack.conf nginx.conf

# Create required directories
mkdir -p backups uploads ssl frontend-build

# Make deploy script executable
chmod +x deploy.sh

# Deploy everything!
./deploy.sh deploy
```

**Wait 2-3 minutes for deployment...**

You should see:
```
✓ All requirements met
✓ Directories created
✓ Deployment complete
✓ Migrations completed
✓ API is healthy
🚀 Deployment successful!
```

---

### Step 8: Configure Hostinger Firewall

**In hPanel (Easier than command line!):**

1. Go to VPS → Manage → Firewall
2. Add rules:
   - Port 22 (SSH) - Already enabled
   - Port 80 (HTTP) - Add this
   - Port 443 (HTTPS) - Add this
3. Save

**Or via command line:**

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

### Step 9: Test Your Application

1. **Open browser** and visit: `http://YOUR_HOSTINGER_IP`
2. You should see your CDTMS login page!
3. **Login** with:
   - Username: `admin`
   - Password: `Admin@123`
4. **Change password immediately!**

**Test API:**
```bash
curl http://YOUR_HOSTINGER_IP/api/v1/health
# Should return: {"status":"ok"}
```

---

### Step 10: (Optional) Setup Domain & SSL

**If you bought domain from Hostinger:**

1. **Point domain to VPS:**
   - In hPanel → Domains → Manage
   - Go to DNS settings
   - Add A record: `@` → `YOUR_VPS_IP`
   - Add A record: `www` → `YOUR_VPS_IP`
   - Wait 5-10 minutes for DNS propagation

2. **Install SSL Certificate:**

```bash
# Stop nginx temporarily
cd /opt/cdtms/backend
docker-compose stop nginx

# Install Certbot
apt install certbot -y

# Get SSL certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
mkdir -p /opt/cdtms/backend/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/cdtms/backend/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/cdtms/backend/ssl/

# Edit nginx config to enable SSL
nano nginx.conf
# Uncomment SSL sections (remove # before ssl lines)

# Restart nginx
docker-compose start nginx
```

3. **Update frontend URLs:**

Rebuild frontend with HTTPS:
```bash
# On your PC
cd frontend
# Edit .env.production
REACT_APP_API_URL=https://yourdomain.com/api/v1
REACT_APP_SOCKET_URL=https://yourdomain.com

# Rebuild
npm run build

# Upload again to server
scp -r build root@YOUR_HOSTINGER_IP:/opt/cdtms/backend/frontend-build

# Restart nginx
docker-compose restart nginx
```

---

## Maintenance Commands

```bash
# View logs
cd /opt/cdtms/backend
./deploy.sh logs

# Restart application
./deploy.sh restart

# Create backup
./deploy.sh backup

# Check health
./deploy.sh health

# Update application
./deploy.sh update
```

---

## Hostinger-Specific Advantages

### 1. Easy Monitoring via hPanel
- CPU/RAM usage graphs
- Bandwidth monitoring
- Disk space tracking
- No command line needed!

### 2. Automatic Backups
- Enable in hPanel → VPS → Backups
- Weekly automated snapshots
- One-click restore

### 3. Better Support
- 24/7 live chat support
- Helpful for beginners
- Faster response than Contabo

### 4. One-Click Services
- Pre-configured apps available
- Easier initial setup
- Optimized for performance

---

## Troubleshooting

### Can't connect to server
- Check firewall in hPanel
- Verify ports 80 and 443 are open
- Check if containers are running: `docker-compose ps`

### Frontend shows 404
- Verify `frontend-build` folder exists: `ls -la /opt/cdtms/backend/frontend-build`
- Check nginx logs: `docker-compose logs nginx`
- Restart nginx: `docker-compose restart nginx`

### Database connection errors
- Check PostgreSQL: `docker-compose logs postgres`
- Verify credentials in `.env.production`
- Restart backend: `./deploy.sh restart`

### Need help?
- Use Hostinger 24/7 support chat
- Check deployment logs: `./deploy.sh logs`
- Review this guide's troubleshooting section

---

## Cost Breakdown

**Hostinger VPS 2 Plan:**
- 4GB RAM
- 2 CPU cores
- 100GB storage
- **$7.99/month** (with promotional pricing)

**Total Cost:** ~$8/month for everything!

**Optional Add-ons:**
- Domain: ~$10/year
- SSL: FREE with Let's Encrypt
- Backups: Included in VPS plan

---

## Comparison: Hostinger vs Contabo

| Feature | Hostinger VPS | Contabo VPS |
|---------|--------------|-------------|
| **Support** | 24/7 Live Chat ⭐⭐⭐⭐⭐ | Email only ⭐⭐ |
| **Control Panel** | hPanel (Easy) ⭐⭐⭐⭐⭐ | Basic panel ⭐⭐⭐ |
| **Setup Difficulty** | Easier ⭐⭐ | Harder ⭐⭐⭐ |
| **Price** | $7.99/month | $6.99/month |
| **Performance** | Good ⭐⭐⭐⭐ | Good ⭐⭐⭐⭐ |
| **Backups** | One-click ⭐⭐⭐⭐⭐ | Manual ⭐⭐ |
| **Documentation** | Excellent ⭐⭐⭐⭐⭐ | Limited ⭐⭐ |
| **For Beginners** | **BETTER** ✅ | Okay ⚠️ |

---

## Quick Start Summary

1. **Buy Hostinger VPS** ($7.99/month)
2. **Build frontend** on your PC (`npm run build`)
3. **Upload files** via FileZilla or SCP
4. **Configure environment** (`.env.production`)
5. **Deploy**: `./deploy.sh deploy`
6. **Visit**: `http://YOUR_IP`

**Total time: ~1 hour**

---

## Next Steps After Deployment

1. ✅ Change admin password
2. ✅ Set up domain and SSL (optional)
3. ✅ Configure automated backups in hPanel
4. ✅ Monitor resources in hPanel dashboard
5. ✅ Create user accounts for your team

---

## Support Resources

- **Hostinger Support**: 24/7 live chat in hPanel
- **Deployment Guide**: This file
- **Database Guide**: `backend/DATABASE_SETUP.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Community**: Hostinger tutorials website

---

## 🎉 Congratulations!

You now have a **fully functional CDTMS application** running on Hostinger VPS!

**Your application is accessible at:**
- `http://YOUR_HOSTINGER_IP` (or `https://yourdomain.com` if SSL configured)

**Login with:**
- Username: `admin`
- Password: `Admin@123` (CHANGE THIS!)

---

**Hostinger VPS is perfect for beginners - easier than Contabo, with better support!** 🚀
