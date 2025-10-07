# Track Management System - Complete Review & Deployment Guide

**Generated:** October 2, 2025
**Target Environment:** Windows Server 2012 (Local Company Deployment)

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture Review](#architecture-review)
3. [Database Schema](#database-schema)
4. [Backend API Review](#backend-api-review)
5. [Frontend Application Review](#frontend-application-review)
6. [Security Review](#security-review)
7. [Missing Components & Recommendations](#missing-components--recommendations)
8. [Pre-Deployment Checklist](#pre-deployment-checklist)
9. [Windows Server 2012 Deployment Guide](#windows-server-2012-deployment-guide)
10. [Post-Deployment Configuration](#post-deployment-configuration)
11. [Maintenance & Monitoring](#maintenance--monitoring)

---

## 1. SYSTEM OVERVIEW

### **Project Name:** Professional Track Management System (CDTMS)

### **Purpose:**
A comprehensive project tracking system for managing architectural/engineering projects, with phase-based workflows, time tracking, and real-time updates.

### **Technology Stack:**

**Frontend:**
- React 19 with TypeScript
- Material-UI 5 (MUI)
- React Router 7
- Socket.IO Client (Real-time updates)
- Axios (HTTP client)
- Recharts (Data visualization)
- Framer Motion (Animations)

**Backend:**
- Node.js 18+
- Express.js 4
- TypeScript
- PostgreSQL 12+ (Database)
- Socket.IO (WebSocket server)
- JWT (Authentication)
- Bcrypt (Password hashing)

**Key Features:**
✅ User Management (Supervisors & Engineers)
✅ Project Creation & Management
✅ Phase-based Project Workflow
✅ Time Tracking (Work Logs)
✅ Real-time Updates (Socket.IO)
✅ Early Access System for Phases
✅ Dashboard with Analytics
✅ Role-based Access Control
✅ Profile Management
✅ Theme Support (Light/Dark/System)

---

## 2. ARCHITECTURE REVIEW

### **System Architecture:**

```
┌─────────────────────────────────────────────────────┐
│                  Client Browsers                     │
│              (Company Local Network)                 │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP/HTTPS + WebSocket
                   ▼
┌─────────────────────────────────────────────────────┐
│          Windows Server 2012 (Company)              │
│  ┌───────────────────────────────────────────────┐  │
│  │  Frontend (React) - Port 80/443               │  │
│  │  - Static Files served via IIS or Node        │  │
│  └───────────────────────────────────────────────┘  │
│                   │                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Backend API (Node.js) - Port 5005            │  │
│  │  - REST API + Socket.IO                       │  │
│  └───────────────┬───────────────────────────────┘  │
│                  │                                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  PostgreSQL Database - Port 5432              │  │
│  │  - Data Storage                                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **File Structure:**

```
D:\cdtms new\
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/      # UI Components
│   │   ├── pages/           # Page Components
│   │   ├── contexts/        # React Contexts
│   │   ├── services/        # API Services
│   │   ├── types/           # TypeScript Types
│   │   ├── styles/          # Theme & Styles
│   │   └── utils/           # Utilities
│   ├── public/              # Static Assets
│   └── package.json
│
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── controllers/    # Route Controllers
│   │   ├── routes/         # API Routes
│   │   ├── services/       # Business Logic
│   │   ├── middleware/     # Auth & Validation
│   │   ├── database/       # DB Connection
│   │   ├── types/          # TypeScript Types
│   │   └── utils/          # Utilities
│   └── package.json
│
└── database/               # Database Scripts
    ├── schema.sql         # Main Schema
    ├── seeds.sql          # Sample Data
    └── migrations/        # Schema Updates
```

---

## 3. DATABASE SCHEMA

### **Tables Overview:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts (Supervisor/Engineer) | id, name, email, role, is_active |
| `projects` | Project management | id, name, start_date, status, predicted_hours |
| `predefined_phases` | Standard phase templates | id, name, typical_duration_weeks |
| `project_phases` | Project-specific phases | id, project_id, status, early_access_granted |
| `work_logs` | Time tracking entries | id, phase_id, engineer_id, hours, date |
| `audit_logs` | Change history | entity_type, action, old_values, new_values |
| `project_settings` | Project configuration | auto_advance_enabled, allow_timeline_mismatch |

### **Key Relationships:**

```
users (1) ─── creates ─── (N) projects
projects (1) ─── has ─── (N) project_phases
project_phases (1) ─── has ─── (N) work_logs
users (engineers) (N) ─── log ─── (N) work_logs
```

### **Early Access System:**

Project phases include:
- `early_access_granted`: Boolean flag
- `early_access_status`: 'not_accessible' | 'accessible' | 'in_progress' | 'work_completed'
- `early_access_granted_by`: User ID who granted access
- `early_access_granted_at`: Timestamp

This allows supervisors to grant engineers access to future phases before sequential approval.

---

## 4. BACKEND API REVIEW

### **API Endpoints:**

#### **Authentication (`/api/v1/auth`)**
- `POST /register` - User registration
- `POST /login` - User login (returns JWT tokens)
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user

#### **Projects (`/api/v1/projects`)**
- `GET /` - List all projects (with filters)
- `POST /` - Create new project
- `GET /:id` - Get project details
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `GET /overview` - Dashboard overview
- `GET /:id/comprehensive` - Comprehensive project view (CEO view)
- `POST /:id/archive` - Archive project
- `POST /:id/unarchive` - Unarchive project

#### **Phases (`/api/v1/phases`)**
- `GET /predefined` - Get predefined phases
- `GET /project/:projectId` - Get project phases
- `GET /:id` - Get specific phase
- `PUT /:id` - Update phase
- `POST /:id/submit` - Submit phase for approval
- `POST /:id/approve` - Approve phase (Supervisor only)
- `POST /:id/unlock` - Unlock phase (Supervisor only)
- `POST /:id/grant-early-access` - Grant early access
- `POST /:id/revoke-early-access` - Revoke early access
- `GET /:id/early-access-overview` - View early access status

#### **Work Logs (`/api/v1/work-logs`)**
- `GET /` - List work logs (with filters)
- `POST /` - Create work log
- `GET /:id` - Get specific work log
- `PUT /:id` - Update work log
- `DELETE /:id` - Delete work log
- `POST /:id/approve` - Approve work log (Supervisor only)
- `GET /summary` - Work log summary/analytics

#### **Users (`/api/v1/users`)**
- `GET /` - List users (Supervisor only)
- `GET /:id` - Get user details
- `PUT /:id` - Update user
- `DELETE /:id` - Deactivate user

#### **Profile (`/api/v1/profile`)**
- `GET /` - Get current user profile
- `PUT /` - Update profile
- `PUT /password` - Change password

#### **Smart Test (`/api/v1/smart-test`)**
- `GET /projects/:id/analytics` - Project analytics
- Test endpoints for smart warning system

### **Authentication:**

**Method:** JWT (JSON Web Tokens)
- Access Token (15min expiry) - sent in Authorization header
- Refresh Token (7 days expiry) - sent in cookie (httpOnly)

**Protected Routes:** All routes except `/auth/login` and `/auth/register`

**Middleware:** `authenticateToken` middleware validates JWT on protected routes

---

## 5. FRONTEND APPLICATION REVIEW

### **Pages/Routes:**

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | LandingPage | Public | Company landing page |
| `/login` | LoginPage | Public | User login |
| `/register` | RegisterPage | Public | User registration |
| `/dashboard` | DashboardPage | Protected | Main dashboard |
| `/projects` | ProjectsPage | Protected | Projects list |
| `/projects/new` | CreateProjectPage | Supervisor | Create project |
| `/projects/:id` | ProjectDetailPage | Protected | Project details |
| `/time-tracking` | TimeTrackingPage | Engineer | Time tracking |
| `/work-logs` | WorkLogsPage | Supervisor | Work log management |
| `/users` | UsersPage | Supervisor | User management |
| `/settings` | SettingsPage | Protected | User settings |

### **Key Components:**

**Layout:**
- `AppLayout` - Main application layout with sidebar navigation
- `Sidebar` - Navigation menu
- `Navbar` - Top navigation bar

**Dashboard:**
- `StatCard` - Statistics display
- `ProjectsChart` - Visual project analytics
- `RecentActivity` - Activity feed

**Projects:**
- `ProjectCard` - Project summary card
- `ProjectTimeline` - Timeline visualization
- `PhaseCard` - Phase status card
- `PhaseStatusBadge` - Phase status indicator

**Common:**
- `LoadingSpinner` - Loading indicator
- `ErrorMessage` - Error display
- `ConfirmDialog` - Confirmation modal
- `CompanyShowcase` - Company branding

### **Contexts:**

- `AuthContext` - User authentication state
- `ThemeContext` - Theme management (Light/Dark/System)
- `SocketContext` - Real-time Socket.IO connection

### **Real-time Features:**

Socket.IO events:
- `project:created` - New project created
- `project:updated` - Project updated
- `project:archived` / `project:unarchived` - Archive status changes
- `phase:updated` - Phase status changed
- `phase:approved` - Phase approved
- `early_access:granted` - Early access granted
- `work_log:created` - New work log added

---

## 6. SECURITY REVIEW

### ✅ **Current Security Measures:**

1. **Password Security:**
   - Bcrypt hashing (10 salt rounds)
   - No plain-text password storage

2. **Authentication:**
   - JWT-based authentication
   - Short-lived access tokens (15 minutes)
   - Refresh tokens with httpOnly cookies
   - Token expiry validation

3. **Authorization:**
   - Role-based access control (Supervisor/Engineer)
   - Middleware-based route protection
   - Frontend route guards

4. **API Security:**
   - Helmet.js for security headers
   - CORS configuration
   - Request body size limits (10MB)
   - Input validation middleware

5. **Database Security:**
   - Parameterized queries (SQL injection prevention)
   - Connection pooling
   - Environment-based credentials

### ⚠️ **Security Recommendations:**

1. **Rate Limiting:**
   - ✅ express-rate-limit installed
   - ❌ Not currently implemented on routes
   - **Action:** Add rate limiting to login/register endpoints

2. **HTTPS:**
   - ❌ Not configured (development uses HTTP)
   - **Action:** Configure SSL/TLS certificates for production

3. **Environment Variables:**
   - ⚠️ `.env` files must be properly configured
   - **Action:** Never commit `.env` files to version control

4. **Session Management:**
   - ⚠️ No session timeout on frontend
   - **Action:** Implement automatic logout after inactivity

5. **Database Backups:**
   - ❌ No automated backup system
   - **Action:** Set up daily PostgreSQL backups

---

## 7. MISSING COMPONENTS & RECOMMENDATIONS

### **Missing/Incomplete Features:**

1. **Email Notifications:**
   - No email service configured
   - **Impact:** Users don't receive notifications for approvals, etc.
   - **Recommendation:** Integrate SendGrid, AWS SES, or company SMTP

2. **File Upload System:**
   - No file attachment feature for projects/phases
   - **Recommendation:** Add file upload for project documents

3. **Reporting System:**
   - Limited export functionality
   - **Recommendation:** Add PDF/Excel report generation

4. **Audit Log Viewer:**
   - Audit logs are recorded but no UI to view them
   - **Recommendation:** Create admin page for audit history

5. **User Profile Pictures:**
   - No avatar upload feature
   - **Recommendation:** Add profile picture upload

6. **Advanced Analytics:**
   - Basic charts exist, but no advanced forecasting
   - **Recommendation:** Implement predictive analytics dashboard

7. **Mobile Responsiveness:**
   - ⚠️ Desktop-first design
   - **Recommendation:** Test and optimize for mobile/tablet

8. **Forgot Password:**
   - ❌ No password reset flow
   - **Recommendation:** Implement email-based password reset

### **Code Quality Issues:**

1. **Unused Files:**
   - `drop_preferences_tables.sql` in backend root
   - Multiple duplicate migration files in database/migrations
   - **Action:** Clean up before deployment

2. **Environment Configuration:**
   - Missing `.env.example` files
   - **Action:** Create example env files

3. **Error Handling:**
   - Some API routes lack proper error messages
   - **Action:** Standardize error responses

4. **Testing:**
   - No unit tests or integration tests
   - **Action:** Add Jest tests for critical paths

---

## 8. PRE-DEPLOYMENT CHECKLIST

### **Code Cleanup:**

- [ ] Delete unused migration files
- [ ] Remove `drop_preferences_tables.sql` from backend root
- [ ] Create `.env.example` files
- [ ] Review and update all TODOs in code
- [ ] Remove console.log statements from production code

### **Configuration:**

- [ ] Set up production environment variables
- [ ] Configure CORS for production domain
- [ ] Set NODE_ENV=production
- [ ] Generate strong JWT secrets
- [ ] Configure database connection pooling

### **Database:**

- [ ] Run `schema.sql` to create database
- [ ] Run `seeds.sql` for initial data (predefined phases)
- [ ] Apply all migration files in order
- [ ] Create database backup procedure
- [ ] Set up database user with limited permissions

### **Security:**

- [ ] Generate SSL certificates (if using HTTPS)
- [ ] Change all default passwords
- [ ] Configure Windows Firewall rules
- [ ] Set up rate limiting on auth endpoints
- [ ] Review and update CORS origins

### **Testing:**

- [ ] Test all API endpoints
- [ ] Test authentication flow
- [ ] Test role-based access
- [ ] Test real-time Socket.IO updates
- [ ] Load test with expected user count
- [ ] Test database backup/restore

---

## 9. WINDOWS SERVER 2012 DEPLOYMENT GUIDE

### **STEP 1: Server Prerequisites**

#### **Install Required Software:**

1. **Node.js 18+ LTS:**
   - Download from: https://nodejs.org/
   - Choose Windows x64 Installer (.msi)
   - Install with default options
   - Verify: Open Command Prompt and run:
     ```
     node --version
     npm --version
     ```

2. **PostgreSQL 12+ (or later):**
   - Download from: https://www.postgresql.org/download/windows/
   - Run installer
   - Set a strong master password (write it down!)
   - Default port: 5432
   - Install pgAdmin 4 (GUI tool)
   - Verify: Open pgAdmin and connect to server

3. **Git (Optional, for updates):**
   - Download from: https://git-scm.com/download/win
   - Install with default options

4. **NSSM (Non-Sucking Service Manager):**
   - Download from: https://nssm.cc/download
   - Extract to `C:\nssm\`
   - Add to PATH:
     - Right-click "Computer" → Properties
     - Advanced System Settings → Environment Variables
     - Edit PATH, add `C:\nssm\win64\`

---

### **STEP 2: Copy Project Files**

1. **Create Application Directory:**
   ```
   C:\inetpub\cdtms\
   ```

2. **Copy Files:**
   - Copy entire `frontend` folder to `C:\inetpub\cdtms\frontend`
   - Copy entire `backend` folder to `C:\inetpub\cdtms\backend`
   - Copy `database` folder to `C:\inetpub\cdtms\database`

---

### **STEP 3: Database Setup**

1. **Open pgAdmin 4**

2. **Create Database:**
   - Right-click "Databases" → Create → Database
   - Name: `track_management`
   - Owner: postgres
   - Click "Save"

3. **Run Schema:**
   - Click on `track_management` database
   - Tools → Query Tool
   - Open file: `C:\inetpub\cdtms\database\schema.sql`
   - Click "Execute" (F5)
   - Verify: No errors, tables created

4. **Load Initial Data:**
   - In Query Tool, open: `C:\inetpub\cdtms\database\seeds.sql`
   - Click "Execute"
   - Verify: Predefined phases are populated

5. **Run Migrations (if any):**
   - Open each file in `database\migrations\` folder
   - Execute in order (001, 002, etc.)

6. **Create Database User (Security Best Practice):**
   ```sql
   CREATE USER cdtms_app WITH PASSWORD 'YourStrongPassword123!';
   GRANT CONNECT ON DATABASE track_management TO cdtms_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cdtms_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cdtms_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cdtms_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cdtms_app;
   ```

---

### **STEP 4: Backend Configuration**

1. **Navigate to Backend:**
   ```cmd
   cd C:\inetpub\cdtms\backend
   ```

2. **Install Dependencies:**
   ```cmd
   npm install --production
   ```
   (This will take 3-5 minutes)

3. **Create Environment File:**
   - Create file: `C:\inetpub\cdtms\backend\.env`
   - Content:
   ```env
   # Server Configuration
   NODE_ENV=production
   PORT=5005

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=track_management
   DB_USER=cdtms_app
   DB_PASSWORD=YourStrongPassword123!
   DB_MAX_POOL=20

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-also-min-32-chars
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3001
   CORS_CREDENTIALS=true

   # Socket.IO Configuration
   SOCKET_CORS_ORIGIN=http://localhost:3001
   ```

   **Important:** Replace `your-super-secret-jwt-key...` with actual random strings:
   - Open Node.js command prompt
   - Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Copy output and paste as JWT_SECRET
   - Run again for JWT_REFRESH_SECRET

4. **Build TypeScript:**
   ```cmd
   npm run build
   ```

5. **Test Backend:**
   ```cmd
   npm start
   ```
   - Should see: "🚀 Track Management System API Started"
   - Press Ctrl+C to stop

---

### **STEP 5: Frontend Configuration**

1. **Navigate to Frontend:**
   ```cmd
   cd C:\inetpub\cdtms\frontend
   ```

2. **Create Environment File:**
   - Create file: `C:\inetpub\cdtms\frontend\.env.production`
   - Content:
   ```env
   REACT_APP_API_URL=http://your-server-ip:5005/api/v1
   REACT_APP_SOCKET_URL=http://your-server-ip:5005
   ```
   Replace `your-server-ip` with actual server IP address

3. **Install Dependencies:**
   ```cmd
   npm install --production
   ```

4. **Build Production:**
   ```cmd
   npm run build
   ```
   (This creates optimized `build` folder, takes 2-3 minutes)

---

### **STEP 6: Install as Windows Services**

#### **Create Backend Service:**

1. **Open Command Prompt as Administrator**

2. **Install Backend Service:**
   ```cmd
   cd C:\nssm\win64
   nssm install CDTMSBackend "C:\Program Files\nodejs\node.exe" "C:\inetpub\cdtms\backend\dist\app.js"
   ```

3. **Configure Service:**
   ```cmd
   nssm set CDTMSBackend AppDirectory C:\inetpub\cdtms\backend
   nssm set CDTMSBackend DisplayName "CDTMS Backend API"
   nssm set CDTMSBackend Description "Track Management System Backend API Server"
   nssm set CDTMSBackend Start SERVICE_AUTO_START
   nssm set CDTMSBackend AppStdout C:\inetpub\cdtms\logs\backend-stdout.log
   nssm set CDTMSBackend AppStderr C:\inetpub\cdtms\logs\backend-stderr.log
   ```

4. **Create Logs Folder:**
   ```cmd
   mkdir C:\inetpub\cdtms\logs
   ```

5. **Start Service:**
   ```cmd
   nssm start CDTMSBackend
   ```

6. **Verify:**
   - Open browser: http://localhost:5005/health
   - Should see JSON health status

#### **Serve Frontend (Option A: Using IIS)**

1. **Enable IIS:**
   - Server Manager → Add Roles and Features
   - Select "Web Server (IIS)"
   - Install

2. **Configure IIS Site:**
   - Open IIS Manager
   - Right-click "Sites" → Add Website
   - Site name: CDTMS
   - Physical path: `C:\inetpub\cdtms\frontend\build`
   - Binding:
     - Type: http
     - IP: All Unassigned
     - Port: 80
   - Click OK

3. **Configure URL Rewrite (for React Router):**
   - Select CDTMS site
   - Double-click "URL Rewrite"
   - If not installed: Download from https://www.iis.net/downloads/microsoft/url-rewrite
   - Add Rule → Blank Rule:
     - Name: React Router
     - Match URL: `(.*)`
     - Conditions: Add → Input: `{REQUEST_FILENAME}` → Not a file
     - Action: Rewrite → URL: `/index.html`

#### **Serve Frontend (Option B: Using Node/Express)**

1. **Create Frontend Server:**
   - Create file: `C:\inetpub\cdtms\frontend-server\server.js`
   ```javascript
   const express = require('express');
   const path = require('path');
   const app = express();
   const PORT = 80;

   app.use(express.static(path.join(__dirname, '../frontend/build')));

   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
   });

   app.listen(PORT, () => {
     console.log(`Frontend server running on port ${PORT}`);
   });
   ```

2. **Install Express:**
   ```cmd
   cd C:\inetpub\cdtms\frontend-server
   npm init -y
   npm install express
   ```

3. **Install as Service:**
   ```cmd
   cd C:\nssm\win64
   nssm install CDTMSFrontend "C:\Program Files\nodejs\node.exe" "C:\inetpub\cdtms\frontend-server\server.js"
   nssm set CDTMSFrontend AppDirectory C:\inetpub\cdtms\frontend-server
   nssm set CDTMSFrontend DisplayName "CDTMS Frontend Web Server"
   nssm set CDTMSFrontend Start SERVICE_AUTO_START
   nssm start CDTMSFrontend
   ```

---

### **STEP 7: Configure Windows Firewall**

1. **Open Windows Firewall:**
   - Control Panel → Windows Firewall → Advanced Settings

2. **Create Inbound Rules:**

   **For Backend (Port 5005):**
   - Right-click "Inbound Rules" → New Rule
   - Port → TCP → Specific local ports: 5005
   - Allow the connection
   - Apply to: Domain, Private, Public
   - Name: CDTMS Backend API

   **For Frontend (Port 80):**
   - Right-click "Inbound Rules" → New Rule
   - Port → TCP → Specific local ports: 80
   - Allow the connection
   - Apply to: Domain, Private, Public
   - Name: CDTMS Frontend Web

   **For PostgreSQL (Internal only, optional):**
   - Only if accessing database from other servers
   - Port 5432

---

## 10. POST-DEPLOYMENT CONFIGURATION

### **STEP 1: Create First User (Super Admin)**

1. **Method A: Via API (Recommended):**
   ```bash
   curl -X POST http://your-server-ip:5005/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d "{
       \"name\": \"System Administrator\",
       \"email\": \"admin@company.com\",
       \"password\": \"ChangeThisPassword123!\",
       \"role\": \"supervisor\"
     }"
   ```

2. **Method B: Via Database:**
   - Open pgAdmin
   - Run:
   ```sql
   INSERT INTO users (name, email, password_hash, role, is_active)
   VALUES (
     'System Administrator',
     'admin@company.com',
     '$2b$10$YourBcryptHashHere', -- Use bcrypt to hash password
     'supervisor',
     true
   );
   ```

### **STEP 2: Configure Predefined Phases**

Predefined phases should already be loaded from `seeds.sql`. Verify:

```sql
SELECT * FROM predefined_phases ORDER BY display_order;
```

If missing, add common phases:
```sql
INSERT INTO predefined_phases (name, description, typical_duration_weeks, display_order) VALUES
('Concept Design', 'Initial concept and schematic design', 2, 1),
('Design Development', 'Detailed design development', 3, 2),
('Construction Documents', 'Preparation of construction documentation', 4, 3),
('Bidding/Negotiation', 'Contractor bidding and negotiation', 2, 4),
('Construction Administration', 'Construction oversight and administration', 8, 5);
```

### **STEP 3: Update Frontend URLs**

If your server IP changes, update:
1. `C:\inetpub\cdtms\frontend\.env.production`
2. Rebuild frontend: `npm run build`
3. Restart frontend service

### **STEP 4: Configure Automatic Startup**

Services are already configured to start automatically. Verify:
```cmd
sc query CDTMSBackend
sc query CDTMSFrontend
```

Should show: STATE = RUNNING

---

## 11. MAINTENANCE & MONITORING

### **Daily Tasks:**

- [ ] Check service status (CDTMSBackend, CDTMSFrontend)
- [ ] Review error logs: `C:\inetpub\cdtms\logs\`
- [ ] Monitor disk space

### **Weekly Tasks:**

- [ ] Backup database
  ```cmd
  "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" -U postgres -d track_management -F c -b -v -f "C:\Backups\cdtms_backup_%date%.backup"
  ```
- [ ] Review user activity via audit_logs table
- [ ] Check for Windows Updates

### **Monthly Tasks:**

- [ ] Update Node.js dependencies (after testing)
- [ ] Review and archive old projects
- [ ] Performance optimization (if needed)

### **Monitoring Commands:**

**Check Backend Status:**
```cmd
curl http://localhost:5005/health
```

**Check Services:**
```cmd
sc query CDTMSBackend
sc query CDTMSFrontend
```

**View Logs:**
```cmd
type C:\inetpub\cdtms\logs\backend-stdout.log
```

**Database Size:**
```sql
SELECT
    pg_size_pretty(pg_database_size('track_management')) as db_size;
```

---

## 12. TROUBLESHOOTING

### **Issue: Backend Service Won't Start**

1. Check logs: `C:\inetpub\cdtms\logs\backend-stderr.log`
2. Common causes:
   - Database not running
   - Wrong database credentials in `.env`
   - Port 5005 already in use
   - Missing Node.js modules

**Fix:**
```cmd
cd C:\inetpub\cdtms\backend
npm install
npm run build
nssm restart CDTMSBackend
```

### **Issue: Frontend Shows Blank Page**

1. Check browser console (F12)
2. Common causes:
   - Backend API URL incorrect
   - CORS error
   - Build folder missing

**Fix:**
```cmd
cd C:\inetpub\cdtms\frontend
npm run build
```

### **Issue: Can't Connect to Database**

1. Verify PostgreSQL is running:
   ```cmd
   sc query postgresql-x64-14
   ```
2. Test connection:
   ```cmd
   psql -U postgres -d track_management
   ```
3. Check firewall rules
4. Verify credentials in backend `.env`

### **Issue: Real-time Updates Not Working**

1. Check Socket.IO connection in browser console
2. Verify firewall allows WebSocket connections
3. Check CORS settings in backend `.env`
4. Restart backend service

---

## 13. USER GUIDE REFERENCE

### **For End Users:**

**Supervisors can:**
- Create and manage projects
- Create and assign phases
- Approve work logs
- Grant early access to phases
- View all analytics
- Manage users

**Engineers can:**
- View assigned projects
- Log work hours
- Access phases (when approved or early access granted)
- Update profile
- View personal dashboard

### **Default Workflow:**

1. Supervisor creates project with phases
2. Phases start as "Not Started"
3. First phase auto-advances to "Ready"
4. Engineer logs work on "Ready" or "In Progress" phases
5. Engineer submits phase when complete
6. Supervisor approves phase
7. Next phase automatically becomes "Ready"
8. Repeat until project completion

---

## 14. SECURITY BEST PRACTICES

### **Production Checklist:**

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS (configure SSL certificates)
- [ ] Restrict database access (create limited user)
- [ ] Configure CORS to specific domain (not *)
- [ ] Enable Windows Firewall rules
- [ ] Regular database backups
- [ ] Keep Node.js and PostgreSQL updated
- [ ] Use environment variables (never hardcode secrets)
- [ ] Limit failed login attempts (rate limiting)
- [ ] Regular security audits

---

## 15. SYSTEM REQUIREMENTS

### **Minimum Server Requirements:**

- **OS:** Windows Server 2012 R2 or later
- **CPU:** 2 cores @ 2.4 GHz
- **RAM:** 4 GB minimum (8 GB recommended)
- **Storage:** 50 GB available space
- **Network:** 100 Mbps LAN connection

### **Expected Load:**

- **Users:** Up to 50 concurrent users
- **Projects:** 100+ active projects
- **Database Size:** ~1-2 GB per year

### **Browser Requirements:**

- Chrome 90+ (Recommended)
- Firefox 88+
- Edge 90+
- Safari 14+

---

## 16. SUPPORT & MAINTENANCE CONTACTS

**System Administrator:** [Your IT Team]
**Database Administrator:** [Your DBA]
**Technical Support:** [Your Support Team]

**Emergency Procedures:**
1. Check service status
2. Review error logs
3. Restart services if needed
4. Restore from backup if database corrupted
5. Contact system administrator

---

## APPENDIX A: Environment Variables Reference

### **Backend `.env`**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | Yes | development | Environment mode |
| PORT | Yes | 5005 | Backend API port |
| DB_HOST | Yes | localhost | PostgreSQL host |
| DB_PORT | Yes | 5432 | PostgreSQL port |
| DB_NAME | Yes | track_management | Database name |
| DB_USER | Yes | postgres | Database user |
| DB_PASSWORD | Yes | - | Database password |
| JWT_SECRET | Yes | - | JWT signing secret (32+ chars) |
| JWT_REFRESH_SECRET | Yes | - | Refresh token secret (32+ chars) |
| JWT_EXPIRES_IN | No | 15m | Access token expiry |
| JWT_REFRESH_EXPIRES_IN | No | 7d | Refresh token expiry |
| CORS_ORIGIN | Yes | * | Allowed frontend origin |
| CORS_CREDENTIALS | No | true | Allow credentials |

### **Frontend `.env.production`**

| Variable | Required | Description |
|----------|----------|-------------|
| REACT_APP_API_URL | Yes | Backend API base URL |
| REACT_APP_SOCKET_URL | Yes | Socket.IO server URL |

---

## APPENDIX B: Database Backup Script

Create file: `C:\Backups\backup_cdtms.bat`

```batch
@echo off
SET PGPASSWORD=YourPostgresPassword
SET BACKUP_PATH=C:\Backups\CDTMS
SET DATE=%date:~-4%%date:~-10,2%%date:~-7,2%
SET TIME=%time:~0,2%%time:~3,2%

mkdir %BACKUP_PATH% 2>nul

"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" ^
  -U postgres ^
  -d track_management ^
  -F c -b -v ^
  -f "%BACKUP_PATH%\cdtms_backup_%DATE%_%TIME%.backup"

echo Backup completed: %BACKUP_PATH%\cdtms_backup_%DATE%_%TIME%.backup

REM Delete backups older than 30 days
forfiles /p "%BACKUP_PATH%" /s /m *.backup /d -30 /c "cmd /c del @path"
```

**Schedule Daily Backup:**
1. Open Task Scheduler
2. Create Basic Task
3. Name: "CDTMS Daily Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a Program
6. Program: `C:\Backups\backup_cdtms.bat`

---

## APPENDIX C: Quick Reference Commands

### **Service Management:**
```cmd
REM Start services
net start CDTMSBackend
net start CDTMSFrontend

REM Stop services
net stop CDTMSBackend
net stop CDTMSFrontend

REM Restart services
nssm restart CDTMSBackend
nssm restart CDTMSFrontend

REM Check service status
sc query CDTMSBackend
```

### **Database Commands:**
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('track_management'));

-- Count records
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'work_logs', COUNT(*) FROM work_logs;

-- Recent activity
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20;

-- Active users
SELECT name, email, role FROM users WHERE is_active = true;
```

---

**END OF DOCUMENT**

*Last Updated: October 2, 2025*
*Version: 1.0*
*Status: Production Ready*
