-- Migration 006: Increase work_logs hours column precision for historical project imports
-- This allows storing cumulative hours (e.g., 200+ hours) for historical data entry
-- Date: 2025-10-12

-- Drop the old CHECK constraint
ALTER TABLE work_logs DROP CONSTRAINT IF EXISTS work_logs_hours_check;

-- Change the hours column from DECIMAL(4,2) to DECIMAL(10,2)
-- This allows values up to 99,999,999.99 hours
ALTER TABLE work_logs ALTER COLUMN hours TYPE DECIMAL(10,2);

-- Add new CHECK constraint: hours must be positive, no upper limit for historical imports
ALTER TABLE work_logs ADD CONSTRAINT work_logs_hours_check CHECK (hours > 0);

-- Update column comment
COMMENT ON COLUMN work_logs.hours IS 'Hours worked - for regular entries max 24/day is recommended, for historical imports cumulative hours are allowed';

-- Verification query (optional - run separately to test)
-- SELECT column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_name = 'work_logs' AND column_name = 'hours';

SELECT 'Migration 006 completed: work_logs.hours now supports DECIMAL(10,2) for historical imports' as status;
