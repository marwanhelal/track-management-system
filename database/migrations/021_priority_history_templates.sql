-- Migration 021: Add priority to tasks, task history log, task templates

-- 1. Task priority column
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Task history log (audit trail of status changes)
CREATE TABLE IF NOT EXISTS task_history (
  id               SERIAL PRIMARY KEY,
  assignment_id    INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  action           VARCHAR(50) NOT NULL,
  from_status      VARCHAR(20),
  to_status        VARCHAR(20),
  note             TEXT,
  performed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  performed_by_name VARCHAR(255),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_history_assignment_id ON task_history(assignment_id);

-- 3. Task templates
CREATE TABLE IF NOT EXISTS task_templates (
  id              SERIAL PRIMARY KEY,
  team_leader_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  allocated_hours DECIMAL(8,2),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_templates_team_leader_id ON task_templates(team_leader_id);

CREATE TABLE IF NOT EXISTS task_template_milestones (
  id              SERIAL PRIMARY KEY,
  template_id     INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  allocated_hours DECIMAL(6,2),
  display_order   INTEGER DEFAULT 0
);
