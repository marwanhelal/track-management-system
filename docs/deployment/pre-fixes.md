# CRITICAL FIXES REQUIRED BEFORE DEPLOYMENT

## ⚠️ SECURITY ISSUES - IMMEDIATE ACTION REQUIRED

### Issue 1: Exposed Database Password
**Location:** `backend/.env` line 10
**Risk Level:** 🔴 CRITICAL

Your database password `25180047m5` is visible in the .env file.

**Actions Required:**
1. Never commit this .env file to version control (Git)
2. Change this password on the production server
3. Use a different password for production (16+ characters)

---

### Issue 2: Weak JWT Secrets
**Location:** `backend/.env` lines 18, 20
**Risk Level:** 🔴 CRITICAL

Current secrets are development-only and easily guessable.

**Action:** Generate strong secrets (see commands below)

---

## 🔧 FILES TO CREATE BEFORE DEPLOYMENT

I'll create these files for you now with placeholders.

---

## 🗑️ FILES TO DELETE BEFORE DEPLOYMENT

**Delete these duplicate migration files:**
```
database/migrations/002_add_smart_warning_system.sql
database/migrations/002_add_smart_warning_system_all_uuid.sql
database/migrations/002_add_smart_warning_system_fixed.sql
database/migrations/002_add_smart_warning_system_full_uuid.sql
database/migrations/002_add_smart_warning_system_minimal.sql
database/migrations/002_add_smart_warning_system_uuid.sql
```

**Keep only:**
```
database/migrations/002_add_smart_warning_system_integer.sql
```

**Also delete:**
```
backend/drop_preferences_tables.sql
```

---

## 📝 COMMANDS TO GENERATE SECURE SECRETS

Open Node.js command prompt and run:

```javascript
// Generate JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

// Generate Refresh Token Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the outputs and use them in your production .env file.

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Delete duplicate migration files (6 files)
- [ ] Delete drop_preferences_tables.sql
- [ ] Generate new JWT secrets (2 secrets)
- [ ] Create strong database password (16+ chars)
- [ ] Update backend .env.production with new secrets
- [ ] Update frontend .env.production with server IP
- [ ] Add .gitignore file
- [ ] Never commit .env files to Git
- [ ] Run database migrations in order (001, then 002)
- [ ] Test locally before deploying to server

---

## 🎯 ESTIMATED TIME TO FIX

**15-20 minutes** to complete all fixes.

