# 🔍 Error Detection & Monitoring Guide

Complete guide for detecting, monitoring, and fixing errors in your Track Management System.

---

## 📊 **Where to Find Errors**

### **1. Coolify Logs (Real-Time Server Logs)**

**Access:**
1. Open Coolify dashboard: https://coolify.hostinger.com (or your Coolify URL)
2. Go to your backend application
3. Click **"Logs"** tab
4. Set to **"Live"** mode to see real-time logs

**What to look for:**

```bash
# ✅ GOOD - Server running normally:
PM2 | App [track-backend:0] online
PM2 | App [track-backend:1] online
Server listening on port 10000

# ⚠️ WARNING - Rate limit errors (common, auto-recovers):
"GET /api/v1/phases/project/55 HTTP/1.1" 429 54
Warning: Rate limit exceeded for IP 192.168.1.100

# ❌ ERROR - Server crash (PM2 will auto-restart):
TypeError: Cannot read property 'id' of undefined
    at ProjectController.getProject (/app/dist/controllers/projects.js:45)
PM2 | App [track-backend:0] exited with code [1]
PM2 | App [track-backend:0] will restart in 2000ms
PM2 | App [track-backend:0] restarted ✅

# 🔴 CRITICAL - Database connection failure:
Error: connect ECONNREFUSED 127.0.0.1:5432
Unable to connect to PostgreSQL database
PM2 | App [track-backend:0] exited with code [1]
```

**How to download logs:**
- Click **"Download Logs"** button in Coolify
- Saves all logs to a file for analysis

---

### **2. Browser Console (Frontend Errors)**

**Access (For Engineers):**
1. Open your website: https://archflow.criteriadesigns.com
2. Press **F12** (Windows) or **Cmd+Option+I** (Mac)
3. Click **"Console"** tab

**What to look for:**

```javascript
// ✅ GOOD - Normal operation:
✓ Connected to WebSocket
✓ User authenticated: marwan@example.com

// ⚠️ WARNING - Connection issues (auto-recovers):
⚠️ Backend health check failed: Network Error
⚠️ Critical backend error detected: {status: 429}
💡 Use the "Try Again" button in the banner to reconnect

// ❌ ERROR - API failures:
❌ GET https://api.archflow.criteriadesigns.com/api/v1/phases/project/55 429 (Rate Limit Exceeded)
❌ POST https://api.archflow.criteriadesigns.com/api/v1/auth/login 401 (Unauthorized)

// 🔴 CRITICAL - React errors:
Error: Cannot read property 'map' of undefined
    at ProjectList.render (ProjectList.tsx:45)
```

**How to save console logs:**
- Right-click in console → **"Save as..."**
- Or click **"Preserve log"** to keep logs during navigation

---

### **3. Browser Network Tab (API Request Failures)**

**Access:**
1. Press **F12** → **"Network"** tab
2. Reload the page
3. Look for **red entries** (failed requests)

**What to look for:**

| Status Code | Meaning | Action |
|-------------|---------|--------|
| **200-299** | ✅ Success | No action needed |
| **401** | 🔑 Unauthorized | Login expired - refresh page |
| **429** | ⚠️ Rate limit | Too many requests - click "Try Again" |
| **500** | ❌ Server error | Backend crash - PM2 will restart |
| **502/503** | 🔴 Service unavailable | Backend down - wait for PM2 restart |
| **504** | ⏱️ Timeout | Slow server - retry request |

**How to export network log:**
- Right-click in Network tab → **"Save all as HAR"**
- Send HAR file to developer for debugging

---

## 🛠️ **How to Fix Common Errors**

### **Error 1: HTTP 429 - Rate Limit Exceeded**

**Symptom:**
```
"GET /api/v1/phases/project/55 HTTP/1.1" 429 54
```

**Cause:**
- Too many requests too quickly
- Current limit: 1000 requests per 15 minutes

**Fix Options:**

**Option A: Increase Rate Limit (If Legitimate Traffic)**
```javascript
// File: backend/src/app.ts (Line 98)

// Current:
max: 1000,  // 1000 requests per 15 minutes

// Change to:
max: 2000,  // 2000 requests per 15 minutes (for high traffic)
```

**Option B: Find & Fix Request Loop (If Bug)**
1. Check browser console for repeated requests
2. Look for `useEffect` without proper dependencies
3. Check polling intervals (should be 30+ seconds)

**Engineers Action:**
- Click **"Try Again"** button in banner
- Wait 15 minutes for rate limit reset
- Report if it happens frequently

---

### **Error 2: Backend Crash (Any 500/502/503 Error)**

**Symptom:**
```
PM2 | App [track-backend:0] exited with code [1]
TypeError: Cannot read property 'id' of undefined
```

**PM2 Auto-Recovery:**
1. PM2 detects crash (immediate)
2. PM2 restarts app (2-5 seconds)
3. App comes back online
4. Engineers click "Try Again" to reconnect

**How to Find Root Cause:**
1. Check Coolify logs for error message
2. Find the file and line number:
   ```
   at ProjectController.getProject (/app/dist/controllers/projects.js:45)
   ```
3. Open that file in your code
4. Fix the bug (e.g., add null check)

**Example Fix:**
```typescript
// BEFORE (causes crash):
const project = await getProjectById(id);
const name = project.name;  // ❌ Crashes if project is null

// AFTER (safe):
const project = await getProjectById(id);
if (!project) {
  return res.status(404).json({ error: 'Project not found' });
}
const name = project.name;  // ✅ Safe
```

---

### **Error 3: Database Connection Failure**

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Unable to connect to PostgreSQL database
```

**Causes:**
1. PostgreSQL service stopped
2. Wrong database credentials
3. Network issue between backend and database

**Fix in Coolify:**
1. Go to Coolify Dashboard
2. Check **PostgreSQL service** is running
3. Verify environment variables:
   - `DATABASE_HOST`
   - `DATABASE_PORT` (5432)
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `DATABASE_NAME`
4. Restart backend service

**Engineers Action:**
- Report to you immediately (this requires server access)
- PM2 will keep trying to restart, but app won't work until DB is fixed

---

### **Error 4: Memory Leak (Server Restarts Frequently)**

**Symptom:**
```
PM2 | App [track-backend:0] exceeding memory limit (1GB)
PM2 | Restarting app due to memory threshold
```

**Cause:**
- Memory leak in code
- Too many cached objects
- Large file uploads not cleaned up

**Fix:**
1. Check Coolify logs for memory usage pattern
2. Identify which endpoint causes memory spike
3. Review code for:
   - Unclosed database connections
   - Large arrays/objects in memory
   - File uploads not deleted after processing

**Temporary Fix:**
```javascript
// File: backend/ecosystem.config.js (Line 17)

// Current:
max_memory_restart: '1G',

// Increase (temporary):
max_memory_restart: '2G',  // Gives more room, but doesn't fix leak
```

**Permanent Fix:**
- Find and fix memory leak in code
- Add cleanup logic for temporary files
- Use streaming for large data

---

## 📈 **Monitoring Dashboard (Future Enhancement)**

For better error tracking, you can add these tools:

### **Option 1: PM2 Plus (Official PM2 Monitoring)**
- Real-time monitoring dashboard
- Error tracking and alerts
- Performance metrics
- Email notifications on crash

**Setup:**
```bash
pm2 plus
# Follow prompts to create account
# Dashboard: https://app.pm2.io
```

### **Option 2: Sentry (Error Tracking)**
- Captures all errors automatically
- Shows stack traces and user context
- Email alerts on new errors
- Free tier: 5,000 errors/month

**Setup:**
```bash
cd backend
npm install @sentry/node
```

### **Option 3: Grafana + Loki (Log Aggregation)**
- Centralized log viewing
- Search across all logs
- Custom dashboards
- Alert rules

---

## 🚨 **Error Alert Checklist**

When an error occurs, check these in order:

### **Step 1: Check Coolify Logs**
- [ ] Is PM2 showing restart messages?
- [ ] What's the error message?
- [ ] What file/line caused the error?

### **Step 2: Check Browser Console**
- [ ] Are there frontend errors?
- [ ] Is the API returning errors?
- [ ] What's the response status code?

### **Step 3: Check Network Tab**
- [ ] Which API endpoint is failing?
- [ ] What's the request payload?
- [ ] What's the response body?

### **Step 4: Check Database**
- [ ] Is PostgreSQL running in Coolify?
- [ ] Can you connect to database manually?
- [ ] Are there any database errors in logs?

### **Step 5: Check Environment**
- [ ] Are all environment variables set correctly?
- [ ] Is the correct branch deployed?
- [ ] Did a recent deployment cause this?

---

## 📝 **Error Report Template (For Engineers)**

When engineers encounter an error they can't self-recover from, ask them to send:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    ERROR REPORT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Date & Time:**
[e.g., 2025-10-20 at 3:45 PM]

**What were you doing?**
[e.g., Trying to add a new phase to Project #55]

**What happened?**
[e.g., Red banner appeared saying "Connection Lost"]

**What did you try?**
[ ] Clicked "Try Again" button
[ ] Refreshed the page
[ ] Waited 5 minutes and tried again
[ ] Logged out and back in

**Error message (if visible):**
[Copy/paste any error text or take screenshot]

**Browser Console Errors:**
1. Press F12
2. Click "Console" tab
3. Screenshot any red errors
4. Attach screenshot

**Did it work after retrying?**
[ ] Yes, after trying again
[ ] Yes, after refreshing
[ ] No, still broken

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 **Quick Reference**

| Error Type | Detection Method | Fix Time | Who Fixes |
|------------|------------------|----------|-----------|
| Rate Limit 429 | Browser console | Instant | Engineer (click "Try Again") |
| Backend Crash | Coolify logs | 5-10 sec | PM2 (auto-restart) |
| React Error | Browser console | Instant | Engineer (click "Try Again") |
| Database Down | Coolify logs | Minutes | Admin (restart DB service) |
| Memory Leak | Coolify logs | Hours | Developer (code fix) |
| Network Timeout | Network tab | Instant | Engineer (retry) |

---

## 📞 **When to Escalate**

Engineers should contact you **ONLY** if:

1. ❌ "Try Again" button doesn't work after 3 attempts
2. ❌ Error persists after page refresh
3. ❌ Multiple engineers report the same issue
4. ❌ Error message mentions "Database" or "PostgreSQL"
5. ❌ Error happens repeatedly (every 5-10 minutes)

**Do NOT contact for:**
- ✅ Red banner that goes away after "Try Again"
- ✅ Single 429 rate limit error
- ✅ Connection lost during network issues
- ✅ Errors that auto-recover within 30 seconds

---

## 🔧 **Developer Debugging Workflow**

When you need to fix a bug:

1. **Reproduce the error** (ask engineer for exact steps)
2. **Check logs** (Coolify + Browser console)
3. **Find the file/line** (from stack trace)
4. **Fix the code** locally
5. **Test the fix** (reproduce error → verify fixed)
6. **Commit & push** to GitHub
7. **Verify deployment** in Coolify
8. **Ask engineer to test** (confirm fixed)

---

## 📚 **Additional Resources**

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Coolify Logs:** https://coolify.io/docs/logs
- **Browser DevTools:** https://developer.chrome.com/docs/devtools/
- **Error Tracking with Sentry:** https://sentry.io/
- **PostgreSQL Logs:** Check Coolify database service logs

---

**Last Updated:** 2025-10-20
**System:** Track Management System v2.0
**Deployment:** Coolify + PM2 + PostgreSQL + Redis
