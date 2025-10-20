# Error Recovery System Testing Guide

This guide will help you test all the automatic error recovery features that were just implemented.

## Prerequisites

1. ✅ Frontend is running (locally or on Coolify)
2. ✅ Backend is running (locally or on Coolify)
3. ✅ Open browser DevTools (F12)
4. ✅ Check Console tab for error messages

---

## Test 1: ConnectionMonitor - Backend Health Check

**What it tests:** Passive health monitoring that checks backend every 30 seconds

### Steps:

1. **Open the application** in your browser (https://archflow.criteriadesigns.com)
2. **Login** to the dashboard
3. **Open DevTools Console** (F12 → Console tab)
4. **Wait and observe** - You should see health checks happening silently in the background
5. **In Coolify:**
   - Go to your backend application
   - Click "Stop" to stop the backend container
6. **Watch the frontend:**
   - Within 30 seconds, a **RED BANNER** should appear at the top:
     ```
     🔴 Connection Lost
     Cannot connect to the server. Refreshing in 5 seconds...
     ```
7. **Wait 5 seconds** - The page should automatically refresh
8. **In Coolify:**
   - Click "Start" to restart the backend
9. **Watch the frontend after it refreshes:**
   - If backend is back, you should see a **GREEN SUCCESS MESSAGE**:
     ```
     ✅ Connection Restored - You're back online!
     ```

### Expected Console Logs:
```
⚠️ Backend health check failed: [error message]
🔄 Connection Lost - Refreshing in 5 seconds...
```

### ✅ Test Passes If:
- Red banner appears within 30 seconds of backend stop
- Countdown shows: 5, 4, 3, 2, 1...
- Page auto-refreshes
- Green success message appears when backend is back

---

## Test 2: API Error Handling - Network Failures

**What it tests:** API interceptor detecting critical backend errors

### Steps:

#### Option A: Simulate Backend Crash (Recommended)

1. **Open the application** and login
2. **Go to any page** (Dashboard, Projects, etc.)
3. **In Coolify:** Stop the backend container
4. **In the frontend:** Try to perform any action:
   - Create a project
   - Add a work log
   - Click on any project
5. **Expected Behavior:**
   - Console shows: `❌ Critical backend error detected: Network Error`
   - Console shows: `🔄 Critical backend error detected. Refreshing page in 2 seconds...`
   - Page automatically refreshes after 2 seconds

#### Option B: Use Browser DevTools (Quick Test)

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Enable "Offline" mode:**
   - Click the dropdown that says "No throttling"
   - Select "Offline"
4. **Try any action** in the app (click a button, navigate, etc.)
5. **Expected Behavior:**
   - Error boundary appears with message
   - Shows countdown: "Auto-refreshing in 3 seconds..."
   - Provides "Refresh Now" button

6. **Disable Offline mode** before it refreshes to see normal operation

### Expected Console Logs:
```
❌ Critical backend error detected: Network Error
🔄 Critical backend error detected. Refreshing page in 2 seconds...
Error details: Network Error
```

### ✅ Test Passes If:
- API calls fail with network error
- Console shows critical error detection
- Page auto-refreshes after 2 seconds

---

## Test 3: ErrorBoundary - React Component Errors

**What it tests:** React error catching and critical error detection

### Steps:

#### Option A: Simulate Network Error (Easy)

1. **Open the application**
2. **Open DevTools Console**
3. **In DevTools Network tab:** Enable "Offline" mode
4. **Navigate to a different page** or refresh
5. **Expected Behavior:**
   - Error boundary screen appears
   - Shows: "Connection Error" title
   - Shows: "We detected a connection issue with the server..."
   - Shows countdown: "Auto-refreshing in 3 seconds..."
   - Shows circular progress indicator
   - Provides "Refresh Now" button

#### Option B: Simulate Backend 500 Error

1. **In your backend code**, temporarily add this to any endpoint:
   ```typescript
   // In any controller, add this line at the start
   throw new Error('Test 500 error');
   ```
2. **Trigger that endpoint** from the frontend
3. **Expected Behavior:**
   - Error boundary catches it
   - Auto-refreshes page

#### Option C: Test Non-Critical Error (Should NOT Refresh)

1. **Try to access a non-existent project:**
   - Navigate to: `https://archflow.criteriadesigns.com/projects/99999`
2. **Expected Behavior:**
   - App handles 404 gracefully
   - Shows "Project not found" or similar message
   - **DOES NOT auto-refresh** (this is correct!)

### Expected on Error Boundary Screen:
```
┌─────────────────────────────────────────┐
│  ⚠️  Connection Error                   │
│                                         │
│  We detected a connection issue with    │
│  the server. The page will             │
│  automatically refresh to restore       │
│  your session.                          │
│                                         │
│  Auto-refreshing in 3 seconds...        │
│  ⏳ (circular progress)                 │
│                                         │
│  [🔄 Refresh Now]                       │
└─────────────────────────────────────────┘
```

### ✅ Test Passes If:
- Error boundary appears on critical errors
- Shows countdown timer (3, 2, 1...)
- Auto-refreshes after countdown
- "Refresh Now" button works immediately
- Non-critical errors (404) DON'T trigger refresh

---

## Test 4: Socket Reconnection Failure

**What it tests:** WebSocket connection failure detection

### Steps:

1. **Open the application** and login
2. **Open DevTools Console**
3. **Watch for socket connection:**
   ```
   ✅ Socket connected: [socket-id]
   ```
4. **In Coolify:** Stop the backend container
5. **Watch Console** - You'll see reconnection attempts:
   ```
   ❌ Socket disconnected: transport close
   🔄 Attempting reconnection 1/5
   ❌ Socket connection error: Error: ...
   🔄 Attempting reconnection 2/5
   ...
   🔄 Attempting reconnection 5/5
   🚫 Socket reconnection failed - max attempts reached
   ```
6. **After 5 failed attempts:**
   - Console shows: `🔄 Socket reconnection failed. Refreshing page in 3 seconds...`
   - Page auto-refreshes after 3 seconds

7. **Restart backend in Coolify** before or after refresh
8. **After refresh, socket should reconnect successfully**

### Expected Console Logs:
```
❌ Socket disconnected: transport close
❌ Socket connection error: [error details]
🚫 Socket reconnection failed - max attempts reached
🔄 Socket reconnection failed. Refreshing page in 3 seconds...
```

### ✅ Test Passes If:
- Socket tries to reconnect 5 times
- After 5 failures, triggers auto-refresh
- Page refreshes after 3 seconds
- Socket reconnects successfully after backend restart

---

## Test 5: Infinite Loop Prevention

**What it tests:** System doesn't refresh endlessly if backend never recovers

### Steps:

1. **Stop the backend** in Coolify (keep it stopped)
2. **Open the application**
3. **Let it auto-refresh 3 times** (wait for each countdown)
4. **After the 3rd refresh:**
   - Check console for: `⚠️ Max auto-refresh attempts reached...`
   - System should STOP auto-refreshing
   - Error boundary or connection banner should show
   - Manual refresh button should still work

5. **Check sessionStorage:**
   - Open DevTools → Application → Session Storage
   - Look for keys like:
     - `errorBoundaryRefreshAttempts`
     - `connectionMonitorRefreshAttempts`
     - `apiCriticalErrorRefreshAttempts`
     - `socketReconnectionFailureRefreshAttempts`
   - Should see value "3" or similar

### ✅ Test Passes If:
- After 3 auto-refresh attempts, system stops refreshing
- Console shows "Max auto-refresh attempts reached" warning
- User can still manually refresh
- After 5 minutes, counter resets (sessionStorage clears)

---

## Test 6: Multiple Error Sources Simultaneously

**What it tests:** System handles multiple error types at once

### Steps:

1. **Open application** and login
2. **Keep DevTools Console open**
3. **In Coolify:** Stop the backend
4. **Watch the frontend:**
   - ConnectionMonitor detects health check failure
   - API calls fail with network errors
   - Socket tries to reconnect and fails
5. **Observe which one triggers refresh first:**
   - API errors: 2 seconds
   - Socket failures: 3 seconds (after 5 reconnection attempts)
   - ConnectionMonitor: 5 seconds (after 3 consecutive failures)

### Expected Behavior:
- **API error triggers first** (2 second delay is fastest)
- Page refreshes before other systems trigger
- This is correct behavior - fastest detection wins!

### ✅ Test Passes If:
- Page refreshes within 2-5 seconds
- Only refreshes ONCE (not multiple times)
- All systems detect the failure

---

## Test 7: Manual Refresh Override

**What it tests:** User can skip countdown and refresh immediately

### Steps:

1. **Trigger any error** (stop backend, go offline, etc.)
2. **Wait for countdown to start:**
   - "Auto-refreshing in 3 seconds..."
3. **Immediately click "Refresh Now" button**
4. **Expected Behavior:**
   - Page refreshes immediately
   - Doesn't wait for countdown

### ✅ Test Passes If:
- "Refresh Now" button is visible and clickable
- Clicking it immediately refreshes the page
- Countdown stops when button is clicked

---

## Test 8: Connection Restored Message

**What it tests:** Green success message when backend recovers

### Steps:

1. **Stop the backend** in Coolify
2. **Wait for red banner** to appear: "Connection Lost"
3. **Before countdown finishes:**
   - Quickly restart the backend in Coolify
   - Click the "X" to close the banner (cancel auto-refresh)
4. **Wait 30 seconds** (next health check cycle)
5. **Expected Behavior:**
   - Green snackbar appears at top center:
     ```
     ✅ Connection Restored - You're back online!
     ```
   - Message disappears after 3 seconds

### ✅ Test Passes If:
- Red banner disappears when connection restored
- Green success message appears
- Auto-refresh is cancelled
- User can continue working normally

---

## Test 9: Development vs Production Error Display

**What it tests:** Error details visibility in different environments

### Current Behavior (Development Mode):

1. **Trigger any error**
2. **Error boundary appears**
3. **Scroll down** - You should see:
   ```
   Error Details (Development Mode):
   [Full error message]
   [Stack trace]
   ```

### In Production (After deploying to Coolify):

1. **Same error**
2. **Error boundary appears**
3. **NO stack trace visible** (cleaner UX for end users)

### ✅ Test Passes If:
- Development shows full error details
- Production shows clean error message only

---

## Quick Test Checklist

Use this for rapid testing after deployment:

- [ ] Stop backend → Red banner appears within 30s
- [ ] Stop backend → Page auto-refreshes after countdown
- [ ] Start backend → Green "Connection Restored" message
- [ ] Enable Offline mode → Error boundary appears
- [ ] Error boundary shows countdown timer
- [ ] "Refresh Now" button works
- [ ] Console shows critical error detection logs
- [ ] After 3 refreshes, system stops (prevents infinite loop)
- [ ] 404 errors DON'T trigger refresh
- [ ] Socket reconnection failures trigger refresh

---

## Troubleshooting

### ❌ "Nothing happens when I stop the backend"

**Check:**
1. Is the frontend built with latest code? Run: `npm run build`
2. Open Console - are there any errors?
3. Check Network tab - are API calls being made?
4. Is ConnectionMonitor running? Look for health check logs

### ❌ "Page refreshes infinitely"

**Fix:**
1. Check sessionStorage for refresh attempt counters
2. Clear sessionStorage: `sessionStorage.clear()`
3. Should stop after 3 attempts per 5-minute window
4. If still happening, report the issue

### ❌ "Error boundary doesn't appear"

**Check:**
1. Is the error actually critical? (401, 403, 404 don't trigger it)
2. Check Console for error logs
3. Try a definite network error: Enable "Offline" mode in DevTools

### ❌ "Green 'Connection Restored' message doesn't appear"

**Reason:**
- Message only appears if you CANCEL the auto-refresh
- If page refreshes, you won't see it (you'll see the fresh page)
- To see it: Stop backend → Close red banner → Start backend → Wait 30s

---

## Console Commands for Testing

Open DevTools Console and try these commands:

### Check Current Connection Status:
```javascript
// Check if backend is reachable
fetch('http://localhost:5005/health')
  .then(r => console.log('✅ Backend is UP'))
  .catch(e => console.log('❌ Backend is DOWN'));
```

### Check SessionStorage Refresh Attempts:
```javascript
// See all refresh attempt counters
for (let i = 0; i < sessionStorage.length; i++) {
  let key = sessionStorage.key(i);
  if (key.includes('Refresh') || key.includes('Attempt')) {
    console.log(key, '=', sessionStorage.getItem(key));
  }
}
```

### Manually Clear Refresh Counters:
```javascript
sessionStorage.removeItem('errorBoundaryRefreshAttempts');
sessionStorage.removeItem('connectionMonitorRefreshAttempts');
sessionStorage.removeItem('apiCriticalErrorRefreshAttempts');
sessionStorage.removeItem('socketReconnectionFailureRefreshAttempts');
console.log('✅ Refresh counters cleared');
```

### Trigger a Test Network Error:
```javascript
// This will fail and trigger error handling
fetch('http://nonexistent-backend-url-12345.com/api/test')
  .catch(e => console.log('Network error triggered:', e));
```

---

## Expected Logs Summary

### Normal Operation (Everything Working):
```
✅ Socket connected: abc123xyz
Client abc123xyz joined project 62
```

### Backend Stopped (Error Detection):
```
⚠️ Backend health check failed: Network Error
❌ Critical backend error detected: Network Error
🔄 Critical backend error detected. Refreshing page in 2 seconds...
❌ Socket disconnected: transport close
🔄 Attempting reconnection 1/5
```

### Auto-Refresh Triggered:
```
🔄 Socket reconnection failed. Refreshing page in 3 seconds... (Attempt 1/3)
[Page reloads]
```

### Max Attempts Reached:
```
⚠️ Max auto-refresh attempts reached for socket failures. Please manually refresh the page.
```

### Connection Restored:
```
✅ Socket connected: def456uvw
Connection Restored - You're back online!
```

---

## Success Criteria

Your error recovery system is working correctly if:

✅ **Detection:** System detects backend failures within 2-30 seconds
✅ **Notification:** User sees clear messages about what's happening
✅ **Recovery:** Page auto-refreshes with countdown timer
✅ **Safety:** Stops after 3 attempts to prevent infinite loops
✅ **Override:** User can manually refresh at any time
✅ **Feedback:** Shows "Connection Restored" when backend recovers
✅ **Smart:** Doesn't refresh on user errors (401, 403, 404)
✅ **Logs:** Console shows clear error detection messages

---

## Next Steps After Testing

Once you've verified everything works:

1. ✅ **Deploy to Coolify** (git push already done)
2. ✅ **Monitor production logs** for error recovery events
3. ✅ **Inform your users** that the system now auto-recovers
4. ✅ **Watch for any issues** in the first few days
5. ✅ **Adjust timing** if needed (countdown delays, health check intervals)

---

## Need Help?

If you encounter any issues during testing:

1. Check the Console logs first
2. Check the Network tab in DevTools
3. Check sessionStorage for refresh attempt counters
4. Try clearing sessionStorage and testing again
5. Report specific error messages and steps to reproduce

Happy Testing! 🧪🎉
