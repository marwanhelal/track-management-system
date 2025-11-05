-- Migration 012: Generate Checklists for All Existing Projects
-- This migration creates checklist items for all projects that don't have them yet
-- Project information fields will be left as NULL and can be filled by supervisors later
-- Created: 2025-11-05

-- Set timeouts to prevent stuck queries
SET statement_timeout = '300000'; -- 5 minutes
SET lock_timeout = '30000'; -- 30 seconds

-- Start transaction for atomic operation
BEGIN;

-- Log start of migration
DO $$
BEGIN
  RAISE NOTICE 'Starting migration: Generate checklists for existing projects at %', NOW();
END $$;

-- ============================================================================
-- GENERATE CHECKLISTS FOR PROJECTS WITHOUT CHECKLIST ITEMS
-- ============================================================================

-- Insert checklist items for all projects that don't have any checklist items yet
-- This copies all active templates and associates them with each project

INSERT INTO project_checklist_items (
  project_id,
  phase_name,
  section_name,
  task_title_ar,
  task_title_en,
  display_order,
  is_completed,
  client_notes,
  created_at,
  updated_at
)
SELECT
  p.id as project_id,
  t.phase_name,
  t.section_name,
  t.task_title_ar,
  t.task_title_en,
  t.display_order,
  false as is_completed,
  NULL as client_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM projects p
CROSS JOIN checklist_templates t
WHERE t.is_active = true
  -- Only for projects that don't have ANY checklist items yet
  AND NOT EXISTS (
    SELECT 1 FROM project_checklist_items pci
    WHERE pci.project_id = p.id
  )
ORDER BY p.id, t.phase_name, t.display_order;

-- Get count of projects that got checklists
DO $$
DECLARE
  projects_count INTEGER;
  items_count INTEGER;
BEGIN
  -- Count projects without checklist items (before this migration)
  SELECT COUNT(DISTINCT p.id) INTO projects_count
  FROM projects p
  LEFT JOIN project_checklist_items pci ON pci.project_id = p.id
  WHERE pci.id IS NULL;

  -- Count newly created checklist items
  GET DIAGNOSTICS items_count = ROW_COUNT;

  RAISE NOTICE '✓ Generated checklists for % projects', projects_count;
  RAISE NOTICE '✓ Created % checklist items total', items_count;
END $$;

-- Commit transaction
COMMIT;

-- Reset timeouts to default
RESET statement_timeout;
RESET lock_timeout;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully at %', NOW();
  RAISE NOTICE '✓ All existing projects now have checklist items';
  RAISE NOTICE '✓ Project information fields (land_area, building_type, etc.) are NULL';
  RAISE NOTICE '✓ Supervisors can fill in project information from the checklist page';
END $$;
