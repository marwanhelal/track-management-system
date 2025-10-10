# Deployment Testing Checklist

Complete testing checklist to verify your Track Management System deployment is working correctly.

---

## Pre-Deployment Verification

- [ ] Frontend URL accessible: http://ec048kcogswksko0s8kwoocg.77.37.124.98.sslip.io
- [ ] Backend URL accessible: http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io
- [ ] Backend health check: `curl http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/health`
- [ ] PostgreSQL service running in Coolify

---

## Database Import Verification

### Schema Import
- [ ] All 8 tables created (users, projects, project_phases, work_logs, predefined_phases, audit_logs, project_settings, progress_adjustments)
- [ ] All indexes created successfully
- [ ] All functions created (update_updated_at_column, calculate_hours_based_progress, etc.)
- [ ] All triggers created (auto_sync_work_log_progress, etc.)

### Data Import
- [ ] 10 predefined phases exist
- [ ] 5 test users exist (1 supervisor + 4 engineers)
- [ ] 1 admin user exists (marwanhelal15@gmail.com)
- [ ] 1 sample project exists ("Residential Complex A")
- [ ] 10 sample project phases exist
- [ ] Sample work logs exist
- [ ] 2 database views created (project_overview, engineer_work_summary)

### Schema Verification Commands
```bash
# Verify table count
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
# Expected: 8

# Verify users count
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"
# Expected: 6

# Verify roles
psql -U postgres -d postgres -c "SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;"
# Expected: administrator(1), engineer(4), supervisor(1)

# Verify migration columns exist
psql -U postgres -d postgres -c "\d project_phases" | grep -E "(early_access|calculated_progress|submitted_date)"
# Should show all migration columns
```

---

## Authentication Testing

### Backend API Login Test
```bash
# Test admin login via API
curl -X POST http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marwanhelal15@gmail.com","password":"Admin@2025"}'
```

**Success Criteria:**
- [ ] Returns HTTP 200 status
- [ ] Response contains `"success": true`
- [ ] Response contains JWT token
- [ ] Response contains user object with role: "administrator"

**If Failed:**
- [ ] Check backend logs in Coolify
- [ ] Verify DATABASE_URL environment variable
- [ ] Verify user exists in database
- [ ] Check password hash is correct

### Frontend Login Test
1. Navigate to: http://ec048kcogswksko0s8kwoocg.77.37.124.98.sslip.io

**Login Page:**
- [ ] Login page loads without errors
- [ ] Email and password fields visible
- [ ] "Login" button visible and clickable
- [ ] No console errors in browser DevTools

**Login Process:**
- [ ] Enter email: marwanhelal15@gmail.com
- [ ] Enter password: Admin@2025
- [ ] Click "Login" button
- [ ] Successfully redirected to Dashboard
- [ ] No errors in browser console
- [ ] User name displayed in header/navbar

---

## Core Functionality Testing

### Dashboard
- [ ] Dashboard page loads
- [ ] Sample project "Residential Complex A" is visible
- [ ] Project statistics display correctly (phases, hours, etc.)
- [ ] Can click on project to view details

### Project Details Page
**Navigation:**
- [ ] Click on "Residential Complex A" project
- [ ] Project details page loads

**Tabs Visibility:**
- [ ] "Phases" tab visible and works
- [ ] "Work Logs" tab visible and works
- [ ] "Team" tab visible and works
- [ ] "Settings" tab visible and works

**Phases Tab:**
- [ ] All 10 phases displayed in order
- [ ] Phase status shows correctly
- [ ] Predicted hours displayed
- [ ] Actual hours displayed (should show some hours from sample data)
- [ ] Phase actions menu works (3-dot menu)

**Work Logs Tab:**
- [ ] Sample work logs visible (3 entries)
- [ ] Engineer names displayed
- [ ] Hours displayed correctly
- [ ] Dates displayed correctly
- [ ] Descriptions visible

**Team Tab:**
- [ ] Shows engineers who logged hours
- [ ] Hours per engineer calculated correctly
- [ ] Can filter by date range

**Settings Tab:**
- [ ] Project settings visible
- [ ] Can toggle auto-advance option
- [ ] Can toggle timeline mismatch option

### User Menu
- [ ] User name "Marwan Helal" displayed in header
- [ ] Can click user menu dropdown
- [ ] "Change Password" option visible
- [ ] "Logout" option visible

---

## Feature Testing (Administrator Role)

### As Administrator User:
- [ ] Can view all projects
- [ ] Can view project details
- [ ] Can view work logs
- [ ] Can export data (if export feature accessible)
- [ ] **Cannot** create new projects (read-only)
- [ ] **Cannot** modify phases
- [ ] **Cannot** log hours
- [ ] **Cannot** approve work logs

---

## Advanced Features Testing (Optional)

### Early Access Feature
1. Login as supervisor (admin@trackms.com / admin123)
2. Navigate to a project
3. Find a phase with status "not_started"
4. Try to grant early access

**Test Criteria:**
- [ ] Early access action visible in phase menu
- [ ] Can grant early access with note
- [ ] Phase status updates to show "Early Access - Available"
- [ ] Database column `early_access_granted` = true

### Manual Progress Tracking
1. Login as supervisor
2. Navigate to a phase with work logs
3. Try to adjust progress manually

**Test Criteria:**
- [ ] Progress adjustment option visible
- [ ] Can set manual progress percentage
- [ ] Can add adjustment reason
- [ ] `progress_adjustments` table gets new entry
- [ ] Phase progress updates correctly

### Submitted/Approved Dates
1. Login as supervisor
2. Submit a phase that's "in_progress"
3. Approve a phase that's "submitted"

**Test Criteria:**
- [ ] Submit action sets `submitted_date`
- [ ] Approve action sets `approved_date`
- [ ] Dates visible in UI

---

## Performance Testing

### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Project details loads in < 2 seconds
- [ ] Login response in < 1 second

### API Response Times
```bash
# Test projects endpoint
time curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/projects
```

**Success Criteria:**
- [ ] API responds in < 500ms
- [ ] No timeout errors
- [ ] Returns valid JSON

---

## Error Handling Testing

### Invalid Login
```bash
curl -X POST http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrong"}'
```

**Expected:**
- [ ] Returns HTTP 401 status
- [ ] Returns error message: "Invalid credentials"
- [ ] Does not crash backend

### Unauthorized Access
```bash
# Try to access projects without token
curl http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/projects
```

**Expected:**
- [ ] Returns HTTP 401 status
- [ ] Returns error about missing authentication
- [ ] Does not expose sensitive data

---

## Security Testing

### Password Security
- [ ] Passwords stored as bcrypt hashes (not plain text)
- [ ] Login rate limiting works (try 10+ wrong passwords)
- [ ] JWT tokens expire after configured time

### CORS Configuration
```bash
# Test CORS from different origin
curl -H "Origin: http://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/auth/login
```

**Expected:**
- [ ] Returns CORS headers
- [ ] Allows configured frontend origin
- [ ] Blocks unauthorized origins

### SQL Injection Protection
```bash
# Try SQL injection in login
curl -X POST http://w0o0g8skogkks8c0k8k4sso8.77.37.124.98.sslip.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackms.com OR 1=1--","password":"anything"}'
```

**Expected:**
- [ ] Returns "Invalid credentials"
- [ ] Does not log in
- [ ] Does not crash backend
- [ ] Properly escaped by pg-promise

---

## Browser Compatibility Testing

Test frontend on different browsers:

### Chrome
- [ ] Login works
- [ ] All pages load
- [ ] No console errors

### Firefox
- [ ] Login works
- [ ] All pages load
- [ ] No console errors

### Safari (if available)
- [ ] Login works
- [ ] All pages load
- [ ] No console errors

### Edge
- [ ] Login works
- [ ] All pages load
- [ ] No console errors

---

## Mobile Responsiveness (Optional)

Test on mobile devices or use browser DevTools device emulation:

- [ ] Login page responsive on mobile
- [ ] Dashboard responsive on mobile
- [ ] Project details readable on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Buttons accessible (not too small)

---

## Monitoring & Logging

### Backend Logs
In Coolify, check backend logs:
- [ ] No error messages in logs
- [ ] Successful database connections logged
- [ ] API requests logged (if logging enabled)

### Frontend Console
Open browser DevTools console:
- [ ] No React errors
- [ ] No API call errors
- [ ] No CORS errors

---

## Post-Deployment Actions

### Immediate
- [ ] Change default admin password from "Admin@2025"
- [ ] Test login with new password
- [ ] Verify password change worked

### Optional Production Steps
- [ ] Import real user data
- [ ] Import real project data
- [ ] Configure custom domain (cdtms.criteriadesigns.com)
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring alerts

---

## Critical Issues Checklist

**If any of these fail, deployment is NOT ready:**
- [ ] ❌ Cannot login
- [ ] ❌ Database connection fails
- [ ] ❌ Frontend shows white screen
- [ ] ❌ API returns 500 errors
- [ ] ❌ Tables missing from database

**If any of these fail, investigate but may continue:**
- [ ] ⚠️ Sample data missing
- [ ] ⚠️ Slow page loads
- [ ] ⚠️ Console warnings (not errors)
- [ ] ⚠️ Minor UI issues

---

## Success Criteria Summary

✅ **Deployment is successful when:**

1. **Authentication:** Can login with marwanhelal15@gmail.com
2. **Database:** All 8 tables exist with correct data
3. **Frontend:** Dashboard loads and shows sample project
4. **Backend:** API responds to requests correctly
5. **Features:** Can navigate all tabs and view data
6. **Security:** CORS configured, passwords hashed, rate limiting works
7. **No Critical Errors:** No 500 errors, no crashes, no data loss

---

## Deployment Completion Time

**Estimated Testing Time:**
- Basic tests (authentication, database, core pages): **10 minutes**
- Advanced features tests: **10 minutes**
- Full comprehensive testing: **30 minutes**

**Minimum required:** 10 minutes for basic tests

---

## Contact & Support

If tests fail:
1. Review [COOLIFY_DATABASE_IMPORT.md](./COOLIFY_DATABASE_IMPORT.md) troubleshooting section
2. Check Coolify service logs (both frontend and backend)
3. Verify environment variables are correct
4. Check GitHub repository has latest code

---

**Start testing! Check off each item as you go. ✅**
