-- Add allocated_hours to milestones (set by team leader when creating milestone)
ALTER TABLE task_milestones ADD COLUMN IF NOT EXISTS allocated_hours DECIMAL(6,2);

-- Link work logs to a specific milestone (optional)
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS task_milestone_id INTEGER REFERENCES task_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_logs_task_milestone_id ON work_logs(task_milestone_id);
