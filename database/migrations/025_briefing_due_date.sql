-- 025_briefing_due_date.sql
-- Adds a proper delivery due_date to project_briefings

ALTER TABLE project_briefings
  ADD COLUMN IF NOT EXISTS due_date DATE;
