# Track Management System - Deployment Guide

## Complete Step-by-Step Guide for Beginners

### Prerequisites
- Budget: $4/month ($48/year)
- Time needed: ~1 hour

---

## Step 1: Create DigitalOcean Account

1. Go to https://www.digitalocean.com
2. Click "Sign Up"
3. You'll get $200 free credit for 60 days!
4. Add your credit card (won't be charged during free trial)

---

## Step 2: Create a Droplet (Server)

1. Click **"Create"** → **"Droplets"**
2. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic
   - **CPU Options:** Regular ($4/month)
   - **Region:** Choose closest to you (e.g., New York, Frankfurt)
   - **Authentication:** SSH Key (recommended) or Password
   - **Hostname:** track-management-server

3. Click **"Create Droplet"**
4. Wait 1-2 minutes for server creation
5. Copy the **IP address** (e.g., 123.45.67.89)

---

## Step 3: Connect to Your Server

### On Windows:
1. Open PowerShell or Command Prompt
2. Type: `ssh root@YOUR_IP_ADDRESS`
3. Type "yes" when asked about fingerprint
4. Enter your password

---

## Step 4: Run Automated Setup Script

Copy and paste this entire command:

```bash
curl -o setup.sh https://raw.githubusercontent.com/YOUR_REPO/setup.sh && chmod +x setup.sh && ./setup.sh
```

**OR** manually run these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git

echo "✅ Basic setup complete!"
```

---

## Step 5: Upload Your Code

On your Windows computer, compress your project folder:
1. Right-click "cdtms new" folder
2. Send to → Compressed (zipped) folder
3. Upload to server using FileZilla or WinSCP

**OR** use Git (recommended):
```bash
# On server
cd /var/www
git clone YOUR_GIT_REPOSITORY
cd track-management
```

---

## Step 6: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE track_management;
CREATE USER trackuser WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE track_management TO trackuser;
\q
```

---

## Step 7: Setup Backend

```bash
cd /var/www/track-management/backend

# Install dependencies
npm install --production

# Copy production environment
cp ../.env.production .env

# Edit .env file
nano .env
```

**IMPORTANT:** Update these values in .env:
- `DB_PASSWORD` → Your PostgreSQL password
- `JWT_SECRET` → Generate random 32+ character string
- `JWT_REFRESH_SECRET` → Different random 32+ character string
- `CORS_ORIGIN` → Your server IP (http://YOUR_IP)

Save: CTRL+X, then Y, then Enter

```bash
# Run database migrations
npm run migrate

# Test backend
npm start
```

Press CTRL+C to stop

---

## Step 8: Setup Frontend

```bash
cd /var/www/track-management/frontend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add this line:
```
REACT_APP_API_URL=http://YOUR_SERVER_IP:5005/api/v1
```

Save and exit.

```bash
# Build production version
npm run build
```

---

## Step 9: Configure Nginx

```bash
nano /etc/nginx/sites-available/track-management
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    # Frontend
    location / {
        root /var/www/track-management/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Save and exit.

```bash
# Enable site
ln -s /etc/nginx/sites-available/track-management /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## Step 10: Start Backend with PM2

```bash
cd /var/www/track-management/backend

# Start with PM2
pm2 start npm --name "track-backend" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Step 11: Test Your Deployment

1. Open browser
2. Go to: `http://YOUR_SERVER_IP`
3. You should see the login page!

Default login:
- Email: Your supervisor email
- Password: The password you set

---

## Step 12: (Optional) Add Domain & HTTPS

### Buy Domain ($10-15/year):
- Namecheap.com
- GoDaddy.com
- Google Domains

### Point Domain to Server:
1. In domain settings, add A record:
   - Type: A
   - Name: @
   - Value: YOUR_SERVER_IP

### Install SSL Certificate (FREE):
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renew
certbot renew --dry-run
```

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs track-backend
```

### Database connection error:
```bash
sudo -u postgres psql
\l  # List databases
\du # List users
```

### Frontend not loading:
```bash
systemctl status nginx
nginx -t
```

---

## Need Help?

- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Restart services:
  - Backend: `pm2 restart track-backend`
  - Nginx: `systemctl restart nginx`

---

## Your System is Now Live! 🎉

Access from anywhere: `http://YOUR_SERVER_IP`

(Or `https://yourdomain.com` if you set up a domain)
