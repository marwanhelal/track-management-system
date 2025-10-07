-- Migration: Add administrator role and job_description field
-- Date: 2025-10-05
-- Description: Add 'administrator' role for read-only users with export capabilities
--              Add job_description field to store English job titles

-- Step 1: Add job_description column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS job_description VARCHAR(100);

-- Step 2: Update the role CHECK constraint to include 'administrator'
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('supervisor', 'engineer', 'administrator'));

-- Step 3: Update existing users with default job descriptions (optional)
UPDATE users
SET job_description = CASE
    WHEN role = 'supervisor' THEN 'Manager'
    WHEN role = 'engineer' THEN 'Engineer'
    ELSE job_description
END
WHERE job_description IS NULL;

-- Step 4: Create index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Add comment for documentation
COMMENT ON COLUMN users.job_description IS 'Job title/description in English (e.g., Manager, Engineer, Administrator, Chairman of the Board)';
COMMENT ON COLUMN users.role IS 'System role: supervisor (full access), engineer (time logging), administrator (read-only + export)';
