# Subdomain Setup Guide for Track Management System

This guide will help you connect your domain (e.g., `cdtms.yourdomain.com` or `app.yourdomain.com`) to your application hosted on Coolify.

## Prerequisites

- ✅ Your domain name (e.g., `yourdomain.com`)
- ✅ Access to your domain's DNS management panel (GoDaddy, Namecheap, Cloudflare, etc.)
- ✅ Your VPS IP address from Contabo
- ✅ Coolify dashboard access
- ✅ Application already deployed in Coolify

---

## Step 1: Choose Your Subdomain

Decide what subdomain you want to use. Common options:
- `cdtms.yourdomain.com` (recommended - descriptive)
- `app.yourdomain.com`
- `track.yourdomain.com`
- `projects.yourdomain.com`

**For this guide, we'll use `cdtms.yourdomain.com` as an example.**

---

## Step 2: Configure DNS Records

### Option A: Using Cloudflare (Recommended)

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your domain

2. **Add A Record for Backend**
   - Click "DNS" in the left menu
   - Click "Add record"
   - Configure:
     ```
     Type: A
     Name: cdtms (or your chosen subdomain)
     IPv4 address: YOUR_VPS_IP_ADDRESS
     Proxy status: Proxied (orange cloud) ← IMPORTANT for DDoS protection
     TTL: Auto
     ```
   - Click "Save"

3. **Add CNAME Record for Frontend (if using Vercel)**
   - Click "Add record"
   - Configure:
     ```
     Type: CNAME
     Name: cdtms-app (or your frontend subdomain)
     Target: cname.vercel-dns.com
     Proxy status: Proxied (orange cloud)
     TTL: Auto
     ```
   - Click "Save"

### Option B: Using Other DNS Providers (GoDaddy, Namecheap, etc.)

1. **Log in to your DNS provider**
2. **Navigate to DNS Management / DNS Records**
3. **Add A Record:**
   ```
   Type: A
   Host: cdtms (or your chosen subdomain)
   Points to: YOUR_VPS_IP_ADDRESS
   TTL: 3600 (or default)
   ```
4. **Save changes**

**Note:** DNS propagation can take 5-60 minutes. Use https://dnschecker.org to verify.

---

## Step 3: Configure Backend Domain in Coolify

### 3.1 Set Domain in Coolify

1. **Open Coolify Dashboard**
   - Navigate to your backend application

2. **Configure Domain**
   - Click on "Domains" tab
   - Add your backend subdomain: `cdtms.yourdomain.com`
   - Click "Save"

3. **Enable HTTPS/SSL**
   - Coolify should automatically detect Let's Encrypt support
   - Check "Enable HTTPS" or "SSL"
   - Click "Generate Certificate"
   - Wait 1-2 minutes for certificate generation

### 3.2 Verify SSL Certificate

- Look for the green lock icon 🔒 in Coolify
- Status should show "Active" or "Issued"

---

## Step 4: Update Environment Variables

### Backend Environment Variables (.env)

Update these in Coolify's environment variable editor:

```bash
# Frontend URL (Vercel or your frontend domain)
CORS_ORIGIN=https://your-frontend-domain.vercel.app
# Or if frontend is also on subdomain:
# CORS_ORIGIN=https://cdtms-app.yourdomain.com

# Socket.IO CORS (same as CORS_ORIGIN)
SOCKET_CORS_ORIGIN=https://your-frontend-domain.vercel.app

# JWT Secrets (keep existing values)
ACCESS_TOKEN_SECRET=your_existing_secret
REFRESH_TOKEN_SECRET=your_existing_secret

# Database (keep existing values)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=track_management
DB_USER=postgres
DB_PASSWORD=your_db_password

# Node environment
NODE_ENV=production

# CORS Credentials
CORS_CREDENTIALS=true

# Port
PORT=5005
```

**IMPORTANT:** After updating, click "Save" and restart the application.

---

## Step 5: Update Frontend Environment Variables

### If Using Vercel

1. **Go to Vercel Dashboard**
   - Select your frontend project
   - Go to "Settings" → "Environment Variables"

2. **Update REACT_APP_API_URL**
   ```
   REACT_APP_API_URL=https://cdtms.yourdomain.com/api/v1
   ```

3. **Update REACT_APP_SOCKET_URL**
   ```
   REACT_APP_SOCKET_URL=https://cdtms.yourdomain.com
   ```

4. **Add Production Domain (if using custom frontend domain)**
   - Go to "Settings" → "Domains"
   - Add `cdtms-app.yourdomain.com`
   - Configure CNAME in your DNS as mentioned in Step 2

5. **Redeploy**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### If Using Coolify for Frontend

Update `.env` file in Coolify:
```bash
REACT_APP_API_URL=https://cdtms.yourdomain.com/api/v1
REACT_APP_SOCKET_URL=https://cdtms.yourdomain.com
```

---

## Step 6: Enable HTTPS Enforcement in Frontend

Once SSL is working, uncomment the HTTPS check in the frontend:

**File:** `frontend/src/services/api.ts`

Find and uncomment lines 33-47:

```typescript
// Uncomment after SSL certificate is configured
if (process.env.NODE_ENV === 'production' && window.location.protocol === 'http:') {
  console.warn('🔒 Upgrading to HTTPS for security...');
  window.location.href = window.location.href.replace('http:', 'https:');
  throw new Error('Upgrading to HTTPS');
}
```

Commit and push this change to trigger redeployment.

---

## Step 7: Test Your Setup

### Backend Testing

1. **Health Check**
   ```bash
   curl https://cdtms.yourdomain.com/health
   ```
   Expected: JSON response with status "ok"

2. **API Test**
   ```bash
   curl https://cdtms.yourdomain.com/api/v1/auth/login -H "Content-Type: application/json"
   ```
   Expected: Error response about missing credentials (proves API is accessible)

3. **SSL Test**
   - Visit https://www.ssllabs.com/ssltest/
   - Enter your backend domain
   - Should get A or A+ rating

### Frontend Testing

1. **Open Browser**
   - Visit your frontend URL
   - Should see login page

2. **Login Test**
   - Try logging in with your credentials
   - Should successfully authenticate and redirect to dashboard

3. **WebSocket Test**
   - Check browser console (F12)
   - Should see Socket.IO connection established
   - No CORS errors

4. **Feature Test**
   - Create a project
   - Real-time updates should work
   - Check notifications

---

## Step 8: Security Verification Checklist

- ✅ **HTTPS Working** - Green lock icon in browser
- ✅ **HTTP Redirects to HTTPS** - Auto-upgrade working
- ✅ **CORS Configured** - No CORS errors in console
- ✅ **Security Headers Present** - Check with https://securityheaders.com
- ✅ **Rate Limiting Active** - Try 6+ failed login attempts (should be blocked)
- ✅ **JWT Authentication Working** - Login/logout functions correctly
- ✅ **Session Expires on Browser Close** - Close browser and reopen (should require login)

---

## Common Issues & Solutions

### Issue 1: "NET::ERR_CERT_AUTHORITY_INVALID"

**Cause:** SSL certificate not generated or still pending

**Solution:**
1. Go to Coolify dashboard
2. Check SSL certificate status
3. Click "Regenerate Certificate"
4. Wait 2-3 minutes
5. Clear browser cache and retry

### Issue 2: CORS Errors in Browser Console

**Cause:** CORS_ORIGIN mismatch

**Solution:**
1. Verify CORS_ORIGIN in backend .env matches your frontend URL exactly
2. Include protocol: `https://` not `http://`
3. No trailing slash
4. Restart backend after changing

### Issue 3: WebSocket Connection Failed

**Cause:** SOCKET_CORS_ORIGIN mismatch or proxy configuration

**Solution:**
1. Verify SOCKET_CORS_ORIGIN matches frontend URL
2. Check Coolify proxy settings allow WebSocket
3. Verify Port 5005 is exposed in Coolify

### Issue 4: DNS Not Resolving

**Cause:** DNS propagation delay or incorrect A record

**Solution:**
1. Wait 15-60 minutes for DNS propagation
2. Verify A record with: `nslookup cdtms.yourdomain.com`
3. Check https://dnschecker.org for global propagation
4. Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### Issue 5: 502 Bad Gateway

**Cause:** Backend application not running or port mismatch

**Solution:**
1. Check Coolify logs for backend
2. Verify PORT=5005 in environment variables
3. Restart backend application
4. Check database connection is working

---

## Rollback Plan (If Something Goes Wrong)

If you encounter issues and need to rollback:

1. **Revert to IP-based access:**
   - Frontend: Use `http://YOUR_VPS_IP:5005/api/v1`
   - Update REACT_APP_API_URL back to IP

2. **Remove DNS records:**
   - Delete the A record from DNS provider
   - Wait for propagation

3. **Disable HTTPS enforcement:**
   - Comment out HTTPS check in frontend/src/services/api.ts
   - Redeploy

4. **Check Coolify logs:**
   - Review deployment logs
   - Check application logs for errors

---

## Performance & Monitoring

After setup, monitor:

1. **SSL Certificate Expiry**
   - Let's Encrypt auto-renews every 90 days
   - Verify auto-renewal is enabled in Coolify

2. **DNS Health**
   - Use UptimeRobot or similar to monitor uptime
   - Set up alerts for downtime

3. **Application Logs**
   - Check Coolify logs regularly
   - Monitor for errors or unusual activity

4. **Database Backups**
   - Ensure regular backups are configured
   - Test restore process

---

## Next Steps After Domain Setup

1. **Update Documentation**
   - Share new URL with team members
   - Update any bookmarks or saved links

2. **Configure Custom Email (Optional)**
   - Set up notifications@yourdomain.com for system emails

3. **Set Up Monitoring**
   - Configure UptimeRobot or similar
   - Set up Slack/email alerts

4. **Enable Cloudflare Features (If Using)**
   - Enable firewall rules
   - Configure caching policies
   - Enable DDoS protection

---

## Support & Resources

- **Coolify Documentation:** https://coolify.io/docs
- **Let's Encrypt:** https://letsencrypt.org/
- **DNS Checker:** https://dnschecker.org
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Security Headers:** https://securityheaders.com

---

## Summary

Your setup should look like this:

```
Frontend (Vercel):          https://your-app.vercel.app
                           OR https://cdtms-app.yourdomain.com
                                    ↓
Backend (Coolify):         https://cdtms.yourdomain.com
                                    ↓
Database (PostgreSQL):     localhost:5432 (internal)
```

**Flow:**
1. User visits frontend URL
2. Frontend makes API calls to `https://cdtms.yourdomain.com/api/v1`
3. Backend validates JWT and processes requests
4. Real-time updates via Socket.IO WebSocket connection
5. All traffic encrypted with SSL/TLS

---

**Security is now fully covered with:**
- ✅ Enhanced security headers (Content Security Policy, HSTS, XSS protection)
- ✅ Session-based authentication (clears on browser close)
- ✅ Rate limiting (5 login attempts per 15 minutes)
- ✅ JWT with automatic refresh
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS encryption
- ✅ Helmet.js comprehensive protection

Your system is production-ready! 🚀
