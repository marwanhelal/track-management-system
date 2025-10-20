# 🔧 How PM2 Works - Complete Explanation

A detailed guide explaining how PM2 (Process Manager 2) keeps your backend server running automatically.

---

## 🤔 **What is PM2?**

**PM2** is like a **supervisor** or **guardian** for your backend server.

Think of it like this:
- Your **backend server** = A worker doing a job
- **PM2** = The manager watching the worker
- If the worker collapses (crashes), PM2 immediately gets a replacement worker (restarts the server)

---

## 🎯 **Why Do We Need PM2?**

### **❌ Without PM2 (The Old Way):**

```
Your Backend Server (Node.js):
  ┌─────────────────────┐
  │   Backend Server    │
  │   (Node.js app)     │
  │                     │
  │   Running...        │
  └─────────────────────┘
           │
           ↓
    💥 ERROR OCCURS!
    (Bug in code)
           │
           ↓
    ❌ SERVER CRASHES
           │
           ↓
    🔴 STAYS DEAD
           │
           ↓
  Website is completely down!
  Users can't access anything!
  You must manually restart!
```

**Problems:**
- ❌ One error = Complete shutdown
- ❌ Website stays offline until you manually restart
- ❌ Users frustrated
- ❌ You get emergency calls at night

---

### **✅ With PM2 (The New Way):**

```
PM2 Process Manager:
  ┌─────────────────────────────────────────┐
  │           PM2 (Supervisor)              │
  │                                         │
  │   Watching: Backend Server              │
  │   Instances: 2 (cluster mode)           │
  │   Auto-restart: ENABLED ✓               │
  └─────────────────────────────────────────┘
           │
           ↓
  ┌──────────────────┬──────────────────┐
  │  Instance #0     │  Instance #1     │
  │  Backend Server  │  Backend Server  │
  │                  │                  │
  │  Running ✓       │  Running ✓       │
  └──────────────────┴──────────────────┘
           │                  │
           ↓                  ↓
    💥 ERROR!            Still Running ✓
    Crashes
           │
           ↓
    🔄 PM2 DETECTS CRASH
           │
           ↓
    ⏱️ Wait 2 seconds
           │
           ↓
    ✅ PM2 RESTARTS IT
           │
           ↓
  Both instances online!
  Website keeps working!
  Users barely notice!
```

**Benefits:**
- ✅ Automatic recovery in 2-5 seconds
- ✅ 2 instances = High availability
- ✅ If one crashes, the other keeps working
- ✅ No manual intervention needed
- ✅ No emergency calls

---

## 🏗️ **How PM2 Architecture Works**

### **1. Cluster Mode (2 Instances)**

Your backend runs **2 copies** at the same time:

```
                    ┌─────────────────┐
                    │   Your Users    │
                    │   (Browsers)    │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (PM2 Built-in) │
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               ↓                           ↓
    ┌────────────────────┐      ┌────────────────────┐
    │   Instance #0      │      │   Instance #1      │
    │   Backend Server   │      │   Backend Server   │
    │   Port: 10000      │      │   Port: 10000      │
    │   Process ID: 1234 │      │   Process ID: 5678 │
    └────────────────────┘      └────────────────────┘
             │                           │
             └───────────┬───────────────┘
                         ↓
                ┌─────────────────┐
                │   PostgreSQL    │
                │   Database      │
                └─────────────────┘
```

**How it works:**
1. User makes API request
2. PM2 load balancer picks Instance #0 or #1 (alternating)
3. That instance handles the request
4. Response sent back to user

**If Instance #0 crashes:**
1. PM2 immediately routes all traffic to Instance #1
2. Users don't notice any interruption
3. PM2 restarts Instance #0 in background (2-5 seconds)
4. When ready, traffic resumes to both instances

---

### **2. Crash Detection**

**How PM2 Knows Server Crashed:**

```javascript
// Your Backend Code
app.get('/api/projects/:id', async (req, res) => {
  const project = await getProject(req.params.id);

  // BUG: Forgot null check
  const name = project.data.name;  // 💥 CRASH! (project.data is undefined)

  res.json({ name });
});
```

**What Happens:**

```
1️⃣ Error Occurs:
   JavaScript throws error: "Cannot read property 'name' of undefined"

2️⃣ Node.js Process Crashes:
   process.exit(1)  // Exit with error code

3️⃣ PM2 Detects:
   PM2: "Hey! Process ID 1234 just died!"
   PM2: "Exit code = 1 (error exit)"
   PM2: "This was not a graceful shutdown"

4️⃣ PM2 Decision:
   PM2: "According to ecosystem.config.js:"
   PM2: "  - autorestart: true ✓"
   PM2: "  - restart_delay: 2000ms"
   PM2: "  - max_restarts: 10 (haven't hit limit)"
   PM2: "Decision: RESTART IMMEDIATELY"

5️⃣ PM2 Restart:
   PM2: "Starting new process..."
   PM2: "Waiting 2 seconds..."
   PM2: "Executing: node dist/app.js"
   PM2: "Process started! New PID: 9999"
   PM2: "Checking if it stays alive..."
   PM2: "✓ Alive for 10 seconds = SUCCESS"

6️⃣ Back Online:
   PM2: "Instance #0 is healthy again"
   PM2: "Resuming traffic to both instances"
```

---

### **3. Configuration (ecosystem.config.js)**

This is the "instruction manual" you gave to PM2:

```javascript
// File: backend/ecosystem.config.js

module.exports = {
  apps: [{
    name: 'track-backend',           // Name of your app
    script: './dist/app.js',         // Entry point

    // 🔄 AUTO-RESTART SETTINGS
    autorestart: true,               // Always restart on crash
    max_restarts: 10,                // Max 10 restarts in 1 minute
    min_uptime: '10s',              // Must stay alive 10s to count as "started"
    restart_delay: 2000,             // Wait 2 seconds before restart
    exp_backoff_restart_delay: 100,  // Increase delay if keeps crashing

    // ⚡ CLUSTER MODE
    instances: 2,                    // Run 2 copies
    exec_mode: 'cluster',            // Enable load balancing

    // 💾 MEMORY LIMIT
    max_memory_restart: '1G',        // Restart if memory exceeds 1GB

    // 🔄 CRASH RECOVERY BEHAVIOR
    kill_timeout: 5000,              // Force kill after 5s if graceful fails

    // 🌍 ENVIRONMENT
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    }
  }]
};
```

**What each setting means:**

| Setting | Value | What It Does |
|---------|-------|-------------|
| **autorestart** | `true` | Restart on crash automatically |
| **max_restarts** | `10` | Max 10 restarts per minute (prevents infinite crash loop) |
| **min_uptime** | `'10s'` | Must run 10 seconds to be considered "successfully started" |
| **restart_delay** | `2000` | Wait 2 seconds before restarting (gives system time to stabilize) |
| **exp_backoff_restart_delay** | `100` | If keeps crashing, increase delay: 100ms → 200ms → 400ms → 800ms |
| **instances** | `2` | Run 2 copies for high availability |
| **exec_mode** | `'cluster'` | Enable Node.js cluster mode for load balancing |
| **max_memory_restart** | `'1G'` | Restart if RAM usage exceeds 1GB (prevents memory leaks) |

---

## 🔄 **The Restart Process (Step-by-Step)**

### **Scenario: Server Crashes at 3:45:00 PM**

```
⏰ 3:45:00.000 - Normal Operation
┌────────────────────────────────────┐
│ Instance #0: Running ✓             │
│ Instance #1: Running ✓             │
│ Handling requests normally         │
└────────────────────────────────────┘

⏰ 3:45:00.123 - Error Occurs
┌────────────────────────────────────┐
│ User requests: GET /api/project/55 │
│ Instance #0 handles request        │
│ 💥 Error: Null pointer exception   │
│ Instance #0 crashes!               │
└────────────────────────────────────┘

⏰ 3:45:00.150 - PM2 Detection (27ms later)
┌────────────────────────────────────┐
│ PM2: "Process 1234 exited!"        │
│ PM2: "Exit code: 1 (error)"        │
│ PM2: "Instance #0 is DOWN"         │
│ PM2: "Instance #1 still UP ✓"      │
└────────────────────────────────────┘

⏰ 3:45:00.150 - PM2 Decision
┌────────────────────────────────────┐
│ PM2: "Checking config..."          │
│ PM2: "autorestart = true ✓"        │
│ PM2: "Restarts this min: 0/10 ✓"   │
│ PM2: "Decision: RESTART"           │
└────────────────────────────────────┘

⏰ 3:45:00.150 - Traffic Rerouting
┌────────────────────────────────────┐
│ PM2: "Routing ALL traffic to #1"   │
│ All new requests → Instance #1     │
│ Users don't notice interruption    │
└────────────────────────────────────┘

⏰ 3:45:00.150 - Restart Delay Begins
┌────────────────────────────────────┐
│ PM2: "Waiting 2 seconds..."        │
│ (Gives system time to stabilize)   │
│ Still routing to Instance #1       │
└────────────────────────────────────┘

⏰ 3:45:02.150 - Starting New Process
┌────────────────────────────────────┐
│ PM2: "Executing: node dist/app.js" │
│ New process starting...            │
│ PID: 9999                          │
└────────────────────────────────────┘

⏰ 3:45:02.500 - Process Started
┌────────────────────────────────────┐
│ New process running                │
│ Connecting to database...          │
│ Loading routes...                  │
│ PM2: "Monitoring uptime..."        │
└────────────────────────────────────┘

⏰ 3:45:03.000 - Health Check
┌────────────────────────────────────┐
│ PM2: "Process alive for 500ms"     │
│ PM2: "Still monitoring..."         │
└────────────────────────────────────┘

⏰ 3:45:12.150 - Success!
┌────────────────────────────────────┐
│ PM2: "Process alive for 10s ✓"     │
│ PM2: "Restart successful!"         │
│ Instance #0: Online ✓              │
│ Instance #1: Online ✓              │
│ Resuming load balancing            │
└────────────────────────────────────┘

Total Recovery Time: 12 seconds
User Impact: ~3 seconds (slight slowdown)
Manual Intervention: NONE ✓
```

---

## 📊 **Monitoring & Logs**

### **What PM2 Tracks:**

```
PM2 Dashboard (pm2 status):
┌──────────┬──────┬─────────┬──────┬─────┬────────┬──────────┐
│ Name     │ ID   │ Mode    │ PID  │ Mem │ CPU    │ Status   │
├──────────┼──────┼─────────┼──────┼─────┼────────┼──────────┤
│ track-   │ 0    │ cluster │ 1234 │ 85M │ 0.3%   │ online   │
│ backend  │      │         │      │     │        │          │
├──────────┼──────┼─────────┼──────┼─────┼────────┼──────────┤
│ track-   │ 1    │ cluster │ 5678 │ 82M │ 0.2%   │ online   │
│ backend  │      │         │      │     │        │          │
└──────────┴──────┴─────────┴──────┴─────┴────────┴──────────┘

PM2 Logs (pm2 logs):
[3:45:00 PM] ✅ Instance #0 online
[3:45:00 PM] ✅ Instance #1 online
[3:45:12 PM] ❌ Error in Instance #0: Cannot read property 'name'
[3:45:12 PM] 💥 Instance #0 exited with code 1
[3:45:12 PM] 🔄 Restarting Instance #0...
[3:45:14 PM] ⏱️ Waiting 2000ms before restart
[3:45:16 PM] 🚀 Instance #0 restarted
[3:45:26 PM] ✅ Instance #0 healthy (alive >10s)
```

### **What You See in Coolify:**

```
Coolify Logs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3:45:00] Server listening on port 10000
[3:45:12] ❌ TypeError: Cannot read property 'name' of undefined
[3:45:12]    at ProjectController.getProject (projects.ts:145)
[3:45:12] 💥 PM2 | App [track-backend:0] exited with code [1]
[3:45:12] 🔄 PM2 | App [track-backend:0] will restart in 2000ms
[3:45:14] 🔄 PM2 | App [track-backend:0] restarting...
[3:45:16] ✅ PM2 | App [track-backend:0] online
[3:45:16] ✅ Connected to PostgreSQL database
[3:45:16] ✅ Server ready to accept requests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🛡️ **Protection Mechanisms**

### **1. Infinite Crash Loop Prevention**

**Problem:** What if the bug causes the server to crash immediately on startup?

```
Without Protection:
  Start → Crash → Restart → Crash → Restart → Crash...
  (Infinite loop, wastes CPU)

With PM2 Protection:
  Start → Crash (1) → Restart
  Start → Crash (2) → Restart
  Start → Crash (3) → Restart
  ...
  Start → Crash (10) → STOP!

  PM2: "⚠️ Max restarts (10) reached in 1 minute"
  PM2: "⚠️ Stopping restarts to prevent CPU overload"
  PM2: "⚠️ Manual intervention required"
```

**Your configuration:**
```javascript
max_restarts: 10,  // Max 10 restarts per minute
```

If server crashes more than 10 times in 1 minute, PM2 stops trying and alerts you.

---

### **2. Exponential Backoff**

**Problem:** If server keeps crashing, restarting immediately might make things worse.

**Solution:** PM2 increases the delay between restarts:

```
Crash #1: Wait 100ms → Restart
Crash #2: Wait 200ms → Restart
Crash #3: Wait 400ms → Restart
Crash #4: Wait 800ms → Restart
Crash #5: Wait 1600ms → Restart
...

PM2: "Giving system more time to stabilize"
```

**Your configuration:**
```javascript
exp_backoff_restart_delay: 100,  // Start at 100ms, double each time
```

---

### **3. Minimum Uptime Check**

**Problem:** How does PM2 know if the restart was successful?

**Solution:** Server must stay alive for minimum time:

```
Server starts → PM2 starts timer

After 10 seconds:
  ✅ Still alive? → SUCCESS! Count as successful restart
  ❌ Crashed already? → FAILURE! This counts toward max_restarts
```

**Your configuration:**
```javascript
min_uptime: '10s',  // Must run 10 seconds to be considered healthy
```

---

### **4. Memory Leak Protection**

**Problem:** Memory leak causes server to slowly use more and more RAM until server freezes.

**Solution:** PM2 monitors memory usage and restarts if too high:

```
Normal Operation:
  Memory: 85MB ✓

After 2 hours (memory leak):
  Memory: 200MB ⚠️

After 4 hours:
  Memory: 500MB ⚠️⚠️

After 6 hours:
  Memory: 1000MB (1GB) 🔴

PM2: "Memory exceeded 1GB limit!"
PM2: "Performing graceful restart..."
PM2: "New instance: Memory 85MB ✓"
```

**Your configuration:**
```javascript
max_memory_restart: '1G',  // Restart if memory > 1GB
```

---

## 🎯 **Real-World Examples**

### **Example 1: Database Connection Lost**

```
Scenario:
  PostgreSQL database restarts for maintenance

Without PM2:
  Backend can't connect to database
  Backend crashes
  ❌ Website completely down
  ❌ Must manually restart after DB is back

With PM2:
  Backend can't connect to database
  Backend crashes
  PM2 restarts backend (2 seconds)
  Backend tries to connect again
  Database is back online
  ✅ Connection successful!
  ✅ Website works again!
```

---

### **Example 2: Memory Leak**

```
Scenario:
  Bug in code causes memory leak (common issue)

Without PM2:
  Hour 1: 100MB RAM ✓
  Hour 2: 200MB RAM ⚠️
  Hour 3: 500MB RAM ⚠️⚠️
  Hour 4: 1.5GB RAM 🔴
  Server becomes slow and unresponsive
  ❌ Website freezes
  ❌ Must manually restart

With PM2:
  Hour 1: 100MB RAM ✓
  Hour 2: 200MB RAM ⚠️
  Hour 3: 500MB RAM ⚠️⚠️
  Hour 4: 1000MB RAM (hits limit)
  PM2: "Memory limit exceeded"
  PM2: Graceful restart
  ✅ Back to 100MB RAM
  ✅ Website continues working
  (Note: Still fix the memory leak in code!)
```

---

### **Example 3: Code Deployment**

```
Scenario:
  You deploy new code with a bug

Without PM2:
  Deploy new code
  Server starts
  Bug causes immediate crash
  ❌ Website completely broken
  ❌ Must rollback manually
  ❌ Users can't access site

With PM2:
  Deploy new code
  PM2 restarts with new code
  Bug causes crash
  PM2 detects crash within 1 second
  PM2 restarts (attempt 1)
  Still crashes
  PM2 restarts (attempt 2)
  Still crashes
  ...
  PM2: "Crashed 10 times, stopping"
  PM2: Keeps old version running
  ⚠️ You get alert: "Deployment failed"
  ✅ Website still works (old version)
  ✅ You can fix and redeploy
```

---

## 📈 **Performance Impact**

### **CPU Usage:**
```
Without PM2:
  Node.js: ~5% CPU ✓

With PM2:
  Node.js: ~5% CPU ✓
  PM2: ~0.5% CPU ✓
  Total: ~5.5% CPU ✓ (minimal overhead)
```

### **Memory Usage:**
```
Without PM2:
  Node.js: 85MB ✓

With PM2:
  Node.js: 85MB ✓
  PM2: 25MB ✓
  Total: 110MB ✓ (acceptable overhead)
```

### **Restart Time:**
```
Manual restart: 30-60 seconds (you must do it)
PM2 restart: 2-5 seconds (automatic)
```

---

## 🎓 **Summary**

**PM2 is like having a 24/7 system administrator that:**

✅ **Watches** your server constantly
✅ **Detects** crashes within milliseconds
✅ **Restarts** automatically in 2-5 seconds
✅ **Balances** traffic across 2 instances
✅ **Protects** against infinite crash loops
✅ **Monitors** memory usage
✅ **Logs** everything for debugging
✅ **Keeps** your website online 99.9% of the time

**Without PM2:**
- 😫 Manual restarts required
- 😫 Long downtimes (15-30 minutes)
- 😫 Emergency calls at night
- 😫 Frustrated users

**With PM2:**
- 😊 Automatic recovery (3 seconds)
- 😊 Minimal downtime
- 😊 Sleep peacefully at night
- 😊 Happy users

---

**Last Updated:** 2025-10-20
**System:** Track Management System v2.0
**PM2 Version:** 5.3.0
**Status:** ✅ Production Ready
