-- 023_project_briefings.sql
-- Supervisor-to-TL project briefings: CEO meeting outcomes, instructions, resources

CREATE TABLE IF NOT EXISTS project_briefings (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_leader_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  duration_notes  TEXT,
  resources       TEXT,
  attachments     JSONB NOT NULL DEFAULT '[]'::JSONB,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_briefing_phases (
  id          SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES project_briefings(id) ON DELETE CASCADE,
  phase_id    INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  UNIQUE (briefing_id, phase_id)
);

CREATE TABLE IF NOT EXISTS project_briefing_history (
  id              SERIAL PRIMARY KEY,
  briefing_id     INTEGER NOT NULL REFERENCES project_briefings(id) ON DELETE CASCADE,
  action          VARCHAR(50) NOT NULL,
  changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(500),
  note            TEXT,
  snapshot        JSONB,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_project    ON project_briefings(project_id);
CREATE INDEX IF NOT EXISTS idx_briefings_tl         ON project_briefings(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_briefings_created_by ON project_briefings(created_by);
CREATE INDEX IF NOT EXISTS idx_briefings_status     ON project_briefings(status);
CREATE INDEX IF NOT EXISTS idx_briefing_phases_bid  ON project_briefing_phases(briefing_id);
CREATE INDEX IF NOT EXISTS idx_briefing_history_bid ON project_briefing_history(briefing_id);

CREATE TRIGGER trg_briefings_updated_at
  BEFORE UPDATE ON project_briefings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
