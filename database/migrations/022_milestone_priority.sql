-- Migration 022: Add priority to task_milestones

ALTER TABLE task_milestones
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high'));
