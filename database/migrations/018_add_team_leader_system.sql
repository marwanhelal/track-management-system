-- Migration 018: Team Leader System
-- Adds team_leader role, team memberships, task assignments,
-- milestones, notes, resources, blockers, and notifications.

-- ─────────────────────────────────────────────────────────────
-- 1. ADD team_leader TO users ROLE CHECK
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('supervisor', 'engineer', 'administrator', 'team_leader'));

-- ─────────────────────────────────────────────────────────────
-- 2. TEAM MEMBERSHIPS
-- An engineer can belong to multiple team leaders across
-- different projects. One row = one (TL, engineer, project).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_memberships (
  id              SERIAL PRIMARY KEY,
  team_leader_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engineer_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  note            TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_team_membership UNIQUE (team_leader_id, engineer_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_tl      ON team_memberships(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_eng     ON team_memberships(engineer_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_project ON team_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_active  ON team_memberships(is_active);

-- ─────────────────────────────────────────────────────────────
-- 3. TASK ASSIGNMENTS
-- TL assigns a task to one of their engineers on a specific
-- project phase, with an hours budget and deadline.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_assignments (
  id                 SERIAL PRIMARY KEY,
  team_leader_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engineer_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id         INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id           INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,

  title              VARCHAR(255) NOT NULL,
  description        TEXT,

  allocated_hours    DECIMAL(6,2) NOT NULL CHECK (allocated_hours > 0),
  deadline           DATE,

  -- Lifecycle status
  status             VARCHAR(20) NOT NULL DEFAULT 'assigned'
                     CHECK (status IN (
                       'assigned',
                       'in_progress',
                       'blocked',
                       'submitted',
                       'approved',
                       'rejected',
                       'cancelled'
                     )),

  -- Submission fields (engineer fills in on submit)
  final_deliverable  TEXT,
  submitted_at       TIMESTAMP WITH TIME ZONE,

  -- Review fields (TL fills in on approve/reject)
  review_note        TEXT,
  reviewed_at        TIMESTAMP WITH TIME ZONE,
  reviewed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_tl       ON task_assignments(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_eng      ON task_assignments(engineer_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_project  ON task_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_phase    ON task_assignments(phase_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status   ON task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_deadline ON task_assignments(deadline);

-- ─────────────────────────────────────────────────────────────
-- 4. TASK MILESTONES
-- Checkpoints the TL defines inside a task. Engineer must
-- mark each complete before submitting the full task.
-- Overdue = due_date < NOW() AND status = 'pending'.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_milestones (
  id              SERIAL PRIMARY KEY,
  assignment_id   INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,

  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  due_date        DATE NOT NULL,

  -- Status: overdue is COMPUTED on read, not stored
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed')),

  -- Engineer completion
  engineer_note   TEXT,
  completed_at    TIMESTAMP WITH TIME ZONE,
  completed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- TL review note on the milestone
  review_note     TEXT,
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,

  display_order   INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_milestones_assignment ON task_milestones(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_milestones_due_date   ON task_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_task_milestones_status     ON task_milestones(status);

-- ─────────────────────────────────────────────────────────────
-- 5. TASK NOTES
-- Ongoing text thread. Both engineer and TL can post.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_notes (
  id             SERIAL PRIMARY KEY,
  assignment_id  INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  author_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notes_assignment ON task_notes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_author     ON task_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_created    ON task_notes(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 6. TASK RESOURCES
-- Text documents, external links, and technical data entries
-- the engineer uploads as evidence/reference per task.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_resources (
  id             SERIAL PRIMARY KEY,
  assignment_id  INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  milestone_id   INTEGER REFERENCES task_milestones(id) ON DELETE SET NULL,
  author_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  resource_type  VARCHAR(30) NOT NULL
                 CHECK (resource_type IN (
                   'text_document',
                   'external_link',
                   'technical_data'
                 )),

  title          VARCHAR(255) NOT NULL,
  -- text_document : body text
  -- external_link : the URL
  -- technical_data: JSON string of [{key, value}] pairs
  content        TEXT NOT NULL,
  description    TEXT,

  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_resources_assignment ON task_resources(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_milestone  ON task_resources(milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_author     ON task_resources(author_id);

-- ─────────────────────────────────────────────────────────────
-- 7. TASK BLOCKERS
-- Engineer raises a formal blocker when stuck. TL resolves it.
-- While active the task status is set to 'blocked'.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_blockers (
  id             SERIAL PRIMARY KEY,
  assignment_id  INTEGER NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  reported_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  reason         TEXT NOT NULL,

  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'resolved')),

  resolved_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_note  TEXT,
  resolved_at    TIMESTAMP WITH TIME ZONE,

  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_blockers_assignment ON task_blockers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_blockers_status     ON task_blockers(status);

-- ─────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- In-app notification feed. Triggered by system events and
-- delivered via Socket.IO in real-time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type            VARCHAR(60) NOT NULL
                  CHECK (type IN (
                    'task_assigned',
                    'task_approved',
                    'task_rejected',
                    'task_cancelled',
                    'milestone_due_soon',
                    'milestone_overdue',
                    'milestone_completed',
                    'tl_note_added',
                    'engineer_note_added',
                    'blocker_reported',
                    'blocker_resolved',
                    'hours_budget_exceeded',
                    'task_submitted'
                  )),

  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,

  -- Polymorphic reference to the source entity
  reference_type  VARCHAR(50),
  reference_id    INTEGER,

  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 9. WORK LOGS — add optional task assignment link
-- Engineers can tie a time log to a specific task so the TL
-- can see hours-logged vs hours-allocated per task.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE work_logs
  ADD COLUMN IF NOT EXISTS task_assignment_id INTEGER
  REFERENCES task_assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_logs_task_assignment
  ON work_logs(task_assignment_id);

-- ─────────────────────────────────────────────────────────────
-- 10. updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_memberships_updated_at
  BEFORE UPDATE ON team_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_task_milestones_updated_at
  BEFORE UPDATE ON task_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_task_notes_updated_at
  BEFORE UPDATE ON task_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_task_resources_updated_at
  BEFORE UPDATE ON task_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_task_blockers_updated_at
  BEFORE UPDATE ON task_blockers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 11. HELPER VIEW: task_assignments_with_stats
-- Joins hours logged, milestone counts, and blocker status
-- so controllers don't repeat this logic.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW task_assignments_with_stats AS
SELECT
  ta.*,
  -- Hours logged against this task
  COALESCE(wl.logged_hours, 0)          AS logged_hours,
  -- Milestone counts
  COALESCE(ms.total_milestones, 0)      AS total_milestones,
  COALESCE(ms.completed_milestones, 0)  AS completed_milestones,
  COALESCE(ms.overdue_milestones, 0)    AS overdue_milestones,
  -- Active blocker flag
  COALESCE(bl.has_active_blocker, false) AS has_active_blocker,
  -- Joined names
  eng.name   AS engineer_name,
  eng.email  AS engineer_email,
  tl.name    AS team_leader_name,
  pr.name    AS project_name,
  ph.phase_name
FROM task_assignments ta
JOIN users    eng ON eng.id = ta.engineer_id
JOIN users    tl  ON tl.id  = ta.team_leader_id
JOIN projects pr  ON pr.id  = ta.project_id
JOIN project_phases ph ON ph.id = ta.phase_id
LEFT JOIN (
  SELECT task_assignment_id, SUM(hours) AS logged_hours
  FROM work_logs
  WHERE task_assignment_id IS NOT NULL
  GROUP BY task_assignment_id
) wl ON wl.task_assignment_id = ta.id
LEFT JOIN (
  SELECT
    assignment_id,
    COUNT(*)                                                    AS total_milestones,
    COUNT(*) FILTER (WHERE status = 'completed')               AS completed_milestones,
    COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) AS overdue_milestones
  FROM task_milestones
  GROUP BY assignment_id
) ms ON ms.assignment_id = ta.id
LEFT JOIN (
  SELECT assignment_id, true AS has_active_blocker
  FROM task_blockers
  WHERE status = 'active'
  GROUP BY assignment_id
) bl ON bl.assignment_id = ta.id;

SELECT 'Migration 018: Team Leader System applied successfully' AS status;
