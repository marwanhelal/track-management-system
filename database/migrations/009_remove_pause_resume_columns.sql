-- Migration 009: Remove Pause/Resume Columns from Timer Sessions
-- Description: Drops unused pause/resume columns from timer_sessions table
--              These columns were planned but never implemented in the application
-- Date: 2025-11-01

-- Remove paused_at and total_paused_ms columns
ALTER TABLE timer_sessions
DROP COLUMN IF EXISTS paused_at,
DROP COLUMN IF EXISTS total_paused_ms;

-- Update the status check constraint to remove 'paused' status
ALTER TABLE timer_sessions
DROP CONSTRAINT IF EXISTS timer_sessions_status_check;

ALTER TABLE timer_sessions
ADD CONSTRAINT timer_sessions_status_check
  CHECK (status IN ('active', 'completed', 'cancelled'));

-- Update comment to reflect current functionality
COMMENT ON TABLE timer_sessions IS 'Stores active timer sessions for engineers with start/stop functionality and automatic recovery';
COMMENT ON COLUMN timer_sessions.status IS 'Session status: active (running), completed (converted to work log), cancelled (discarded)';

-- Remove the broken unique constraint that prevents multiple completed sessions
-- This constraint was preventing engineers from having multiple completed timer sessions
ALTER TABLE timer_sessions
DROP CONSTRAINT IF EXISTS unique_active_session_per_engineer;

-- Create a partial unique index that only enforces uniqueness for active sessions
-- This allows engineers to have multiple completed/cancelled sessions but only one active session
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_timer_per_engineer
ON timer_sessions (engineer_id)
WHERE status = 'active';

-- Add comment explaining the index
COMMENT ON INDEX unique_active_timer_per_engineer IS 'Ensures engineers can only have one active timer at a time, but allows multiple completed/cancelled sessions';
