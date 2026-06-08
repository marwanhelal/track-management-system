-- Allow 'deleted' as a valid status for project_briefings (soft delete)
ALTER TABLE project_briefings
  DROP CONSTRAINT IF EXISTS project_briefings_status_check;

ALTER TABLE project_briefings
  ADD CONSTRAINT project_briefings_status_check
    CHECK (status IN ('active', 'archived', 'deleted'));
