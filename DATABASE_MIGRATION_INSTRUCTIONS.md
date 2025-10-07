# Database Migration Instructions

## Manual Progress Tracking Feature - Database Setup

The progress tracking feature requires running a database migration to add new tables and columns. Since `psql` command line is not available in this environment, you'll need to run the migration manually through **pgAdmin 4**.

---

## Steps to Run the Migration

### 1. Open pgAdmin 4
- Launch pgAdmin 4 on your computer
- Password: `25180047m5`

### 2. Connect to the Database
- Navigate to: **Servers** → **PostgreSQL** → **Databases** → **track_management**

### 3. Open Query Tool
- Right-click on **track_management** database
- Select **Query Tool**

### 4. Load the Migration File
- In the Query Tool, click **File** → **Open**
- Navigate to: `D:\cdtms new\database\migrations\003_add_manual_progress_tracking.sql`
- Select and open the file

### 5. Execute the Migration
- Click the **Execute/Run** button (or press F5)
- Wait for the migration to complete
- You should see: "Query returned successfully" message

### 6. Verify Migration Success
Run this query to verify the new table was created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'progress_adjustments';
```

You should see one row with `progress_adjustments`.

Run this query to verify the new columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_logs'
  AND column_name IN ('manual_progress_percentage', 'progress_notes', 'progress_adjusted_by', 'progress_adjusted_at');
```

You should see 4 rows with the new columns.

Run this query to verify project_phases columns:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_phases'
  AND column_name IN ('calculated_progress', 'actual_progress', 'progress_variance');
```

You should see 3 rows with the new columns.

---

## What the Migration Does

### Creates New Table:
- **`progress_adjustments`** - Tracks all manual progress adjustments with full audit trail

### Modifies Existing Tables:
- **`work_logs`** - Adds progress tracking fields
- **`project_phases`** - Adds calculated/actual progress and variance fields

### Creates Database Functions:
- `calculate_hours_based_progress()` - Calculates automatic progress from hours
- `get_actual_progress()` - Gets supervisor-adjusted or calculated progress
- `sync_phase_progress()` - Aggregates progress from all engineers

### Creates Triggers:
- Auto-sync phase progress when work logs change
- Auto-sync when progress adjustments are made
- Backfills all existing phases with calculated progress

---

## Troubleshooting

### If Migration Fails:

1. **Check if tables already exist:**
```sql
DROP TABLE IF EXISTS progress_adjustments CASCADE;
```

2. **Check if columns already exist:**
```sql
ALTER TABLE work_logs DROP COLUMN IF EXISTS manual_progress_percentage;
ALTER TABLE work_logs DROP COLUMN IF EXISTS progress_notes;
ALTER TABLE work_logs DROP COLUMN IF EXISTS progress_adjusted_by;
ALTER TABLE work_logs DROP COLUMN IF EXISTS progress_adjusted_at;

ALTER TABLE project_phases DROP COLUMN IF EXISTS calculated_progress;
ALTER TABLE project_phases DROP COLUMN IF EXISTS actual_progress;
ALTER TABLE project_phases DROP COLUMN IF EXISTS progress_variance;
```

3. **Then re-run the migration file**

---

## After Migration

Once the migration is successful:

1. ✅ Backend server is already running (started automatically)
2. ✅ Frontend server is already running (started automatically)
3. ✅ All code changes are in place
4. 🎯 You're ready to test!

---

## Next Steps

See `TESTING_GUIDE.md` for detailed testing instructions.
