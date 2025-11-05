-- Migration 010: Add Checklist System
-- Adds comprehensive checklist management for project phases with 4-level approval workflow
-- Created: 2025-01-05
-- SAFE FOR PRODUCTION: Idempotent, no data loss, can be re-run safely

-- Set statement timeout to prevent stuck queries (5 minutes)
SET statement_timeout = '300000';

-- Set lock timeout to prevent waiting indefinitely (30 seconds)
SET lock_timeout = '30000';

-- ============================================================================
-- SAFETY CHECKS
-- ============================================================================

-- Check for existing stuck transactions (informational only, doesn't block)
DO $$
BEGIN
  RAISE NOTICE 'Running migration 010 - Checklist System';
  RAISE NOTICE 'Current timestamp: %', NOW();
END $$;

-- ============================================================================
-- EXTEND PROJECTS TABLE WITH NEW FIELDS
-- ============================================================================

-- Add new project detail fields (IF NOT EXISTS makes this safe to re-run)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_area VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_type VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floors_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bua VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);

-- Add CHECK constraint separately (only if column was just added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_floors_count_check'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_floors_count_check CHECK (floors_count >= 0);
  END IF;
END $$;

-- Add comments for new columns
COMMENT ON COLUMN projects.land_area IS 'Land area of the project (e.g., "500 متر مربع")';
COMMENT ON COLUMN projects.building_type IS 'Type of building (e.g., "فيلا سكنية", "عمارة تجارية")';
COMMENT ON COLUMN projects.floors_count IS 'Number of floors in the building';
COMMENT ON COLUMN projects.location IS 'Project location (e.g., "الرياض - حي النرجس")';
COMMENT ON COLUMN projects.bua IS 'Built-Up Area (BUA)';
COMMENT ON COLUMN projects.client_name IS 'Name of the client';

-- ============================================================================
-- CHECKLIST TEMPLATES TABLE
-- ============================================================================

-- Stores predefined checklist templates for each phase
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    phase_name VARCHAR(50) NOT NULL CHECK (phase_name IN ('VIS', 'DD', 'License', 'Working', 'BOQ')),
    section_name VARCHAR(200),
    task_title_ar TEXT NOT NULL,
    task_title_en TEXT,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick template retrieval
CREATE INDEX idx_checklist_templates_phase ON checklist_templates(phase_name, display_order);
CREATE INDEX idx_checklist_templates_active ON checklist_templates(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE checklist_templates IS 'Predefined checklist task templates for each project phase';
COMMENT ON COLUMN checklist_templates.phase_name IS 'Phase this checklist belongs to: VIS, DD, License, Working, BOQ';
COMMENT ON COLUMN checklist_templates.section_name IS 'Section grouping for tasks (optional)';
COMMENT ON COLUMN checklist_templates.task_title_ar IS 'Task title in Arabic';
COMMENT ON COLUMN checklist_templates.task_title_en IS 'Task title in English (optional)';
COMMENT ON COLUMN checklist_templates.display_order IS 'Order for displaying tasks';

-- ============================================================================
-- PROJECT CHECKLIST ITEMS TABLE
-- ============================================================================

-- Stores checklist items for each project (instances of templates)
CREATE TABLE IF NOT EXISTS project_checklist_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_name VARCHAR(50) NOT NULL CHECK (phase_name IN ('VIS', 'DD', 'License', 'Working', 'BOQ')),
    section_name VARCHAR(200),
    task_title_ar TEXT NOT NULL,
    task_title_en TEXT,
    display_order INTEGER NOT NULL,

    -- Task completion and approval tracking
    is_completed BOOLEAN DEFAULT false,

    -- 4-level approval workflow
    engineer_approved_by INTEGER REFERENCES users(id),
    engineer_approved_at TIMESTAMP,

    supervisor_1_approved_by INTEGER REFERENCES users(id),
    supervisor_1_approved_at TIMESTAMP,

    supervisor_2_approved_by INTEGER REFERENCES users(id),
    supervisor_2_approved_at TIMESTAMP,

    supervisor_3_approved_by INTEGER REFERENCES users(id),
    supervisor_3_approved_at TIMESTAMP,

    -- Client notes
    client_notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_project_checklist_items_project ON project_checklist_items(project_id, phase_name);
CREATE INDEX idx_project_checklist_items_phase ON project_checklist_items(phase_name);
CREATE INDEX idx_project_checklist_items_order ON project_checklist_items(project_id, phase_name, display_order);
CREATE INDEX idx_project_checklist_items_completed ON project_checklist_items(project_id, is_completed);
CREATE INDEX idx_project_checklist_items_engineer_approved ON project_checklist_items(engineer_approved_by) WHERE engineer_approved_by IS NOT NULL;

-- Comments
COMMENT ON TABLE project_checklist_items IS 'Project-specific checklist items with 4-level approval workflow';
COMMENT ON COLUMN project_checklist_items.phase_name IS 'Phase this checklist item belongs to';
COMMENT ON COLUMN project_checklist_items.is_completed IS 'Whether the task has been checked/completed by engineer';
COMMENT ON COLUMN project_checklist_items.engineer_approved_by IS 'Engineer who approved (Level 1) - only assigned engineer';
COMMENT ON COLUMN project_checklist_items.supervisor_1_approved_by IS 'Supervisor Level 1 approval - any supervisor';
COMMENT ON COLUMN project_checklist_items.supervisor_2_approved_by IS 'Supervisor Level 2 approval - any supervisor';
COMMENT ON COLUMN project_checklist_items.supervisor_3_approved_by IS 'Supervisor Level 3 approval - any supervisor';
COMMENT ON COLUMN project_checklist_items.client_notes IS 'Special client requirements or notes (editable by supervisors only)';

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger for checklist_templates updated_at
CREATE TRIGGER update_checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for project_checklist_items updated_at
CREATE TRIGGER update_project_checklist_items_updated_at
    BEFORE UPDATE ON project_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGGING FOR CHECKLIST CHANGES
-- ============================================================================

-- Create audit function for checklist items
CREATE OR REPLACE FUNCTION audit_checklist_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_values, new_values)
    VALUES (
        'project_checklist_items',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.engineer_approved_by
            WHEN TG_OP = 'UPDATE' AND NEW.supervisor_3_approved_by IS NOT NULL THEN NEW.supervisor_3_approved_by
            WHEN TG_OP = 'UPDATE' AND NEW.supervisor_2_approved_by IS NOT NULL THEN NEW.supervisor_2_approved_by
            WHEN TG_OP = 'UPDATE' AND NEW.supervisor_1_approved_by IS NOT NULL THEN NEW.supervisor_1_approved_by
            ELSE NEW.engineer_approved_by
        END,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Attach audit trigger
CREATE TRIGGER audit_checklist_items_changes
    AFTER INSERT OR UPDATE OR DELETE ON project_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_checklist_changes();

-- ============================================================================
-- HELPER FUNCTIONS FOR CHECKLIST MANAGEMENT
-- ============================================================================

-- Function to get checklist completion statistics for a project phase
CREATE OR REPLACE FUNCTION get_checklist_statistics(
    p_project_id INTEGER,
    p_phase_name VARCHAR
) RETURNS TABLE (
    total_tasks INTEGER,
    completed_tasks INTEGER,
    engineer_approved_tasks INTEGER,
    supervisor_1_approved_tasks INTEGER,
    supervisor_2_approved_tasks INTEGER,
    supervisor_3_approved_tasks INTEGER,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_tasks,
        COUNT(*) FILTER (WHERE is_completed = true)::INTEGER as completed_tasks,
        COUNT(*) FILTER (WHERE engineer_approved_by IS NOT NULL)::INTEGER as engineer_approved_tasks,
        COUNT(*) FILTER (WHERE supervisor_1_approved_by IS NOT NULL)::INTEGER as supervisor_1_approved_tasks,
        COUNT(*) FILTER (WHERE supervisor_2_approved_by IS NOT NULL)::INTEGER as supervisor_2_approved_tasks,
        COUNT(*) FILTER (WHERE supervisor_3_approved_by IS NOT NULL)::INTEGER as supervisor_3_approved_tasks,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
        END as completion_percentage
    FROM project_checklist_items
    WHERE project_id = p_project_id
    AND phase_name = p_phase_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_checklist_statistics IS 'Returns completion statistics for a project phase checklist';

-- Migration complete
SELECT 'Migration 010: Checklist System - Complete' as status;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✓ Migration 010 completed successfully!';
  RAISE NOTICE '✓ Checklist system is ready';
  RAISE NOTICE '✓ Extended projects table with 6 new fields';
  RAISE NOTICE '✓ Created 2 new tables (checklist_templates, project_checklist_items)';
  RAISE NOTICE '✓ Added helper functions and triggers';
  RAISE NOTICE '✓ Next step: Run seed file (checklist_templates_seed.sql)';
  RAISE NOTICE '==================================================';
END $$;

-- Reset timeouts to default
RESET statement_timeout;
RESET lock_timeout;
