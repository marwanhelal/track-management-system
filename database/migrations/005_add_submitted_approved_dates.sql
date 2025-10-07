-- Migration: Add submitted_date and approved_date to project_phases
-- This allows tracking when phases are submitted to client and when they get approved

-- Add submitted_date column (date when supervisor submits phase to client)
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS submitted_date DATE;

-- Add approved_date column (date when client approves the phase)
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS approved_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN project_phases.submitted_date IS 'Date when the phase was submitted to the client for review';
COMMENT ON COLUMN project_phases.approved_date IS 'Date when the client approved the phase';
