-- 024_supervisor_type.sql
-- Adds supervisor_type to distinguish Visualization vs Working supervisor accounts
-- Both types have identical permissions; this is for organizational classification only.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supervisor_type VARCHAR(20)
    CHECK (supervisor_type IN ('visualization', 'working'));
