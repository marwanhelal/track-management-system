-- Support reopening rejected tasks without creating a new task
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS reopen_note TEXT;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS reopened_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
