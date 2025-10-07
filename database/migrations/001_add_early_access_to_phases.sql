-- Migration: Add Early Access Support to Project Phases
-- Description: Adds early access functionality to allow supervisors to grant engineers
--              permission to work on future phases before sequential approval

-- Add early access columns to project_phases table
ALTER TABLE project_phases
ADD COLUMN early_access_granted BOOLEAN DEFAULT false,
ADD COLUMN early_access_status VARCHAR(20) DEFAULT 'not_accessible'
    CHECK (early_access_status IN ('not_accessible', 'accessible', 'in_progress', 'work_completed')),
ADD COLUMN early_access_granted_by INTEGER REFERENCES users(id),
ADD COLUMN early_access_granted_at TIMESTAMP,
ADD COLUMN early_access_note TEXT;

-- Add performance indexes for early access queries
CREATE INDEX idx_project_phases_early_access ON project_phases(project_id, early_access_granted);
CREATE INDEX idx_project_phases_early_access_status ON project_phases(early_access_status) WHERE early_access_granted = true;
CREATE INDEX idx_project_phases_early_access_granted_by ON project_phases(early_access_granted_by) WHERE early_access_granted_by IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN project_phases.early_access_granted IS 'Whether supervisor has granted early access to this phase';
COMMENT ON COLUMN project_phases.early_access_status IS 'Work status for early access: not_accessible, accessible, in_progress, work_completed';
COMMENT ON COLUMN project_phases.early_access_granted_by IS 'Supervisor who granted early access permission';
COMMENT ON COLUMN project_phases.early_access_granted_at IS 'Timestamp when early access was granted';
COMMENT ON COLUMN project_phases.early_access_note IS 'Supervisor note explaining reason for early access';

-- Update audit logs to track early access changes
INSERT INTO audit_logs (entity_type, entity_id, action, note, timestamp)
VALUES ('database', 0, 'MIGRATION', 'Added early access support to project_phases table', NOW());