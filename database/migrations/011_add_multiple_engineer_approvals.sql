-- Migration: Add support for multiple engineer approvals per checklist item
-- This allows multiple engineers to approve the same task within a phase
-- Example: Two engineers can both approve "post-production" in VIS phase

-- Set timeouts to prevent stuck queries
SET statement_timeout = '300000'; -- 5 minutes
SET lock_timeout = '30000'; -- 30 seconds

-- Start transaction for atomic operation
BEGIN;

-- Log start of migration
DO $$
BEGIN
  RAISE NOTICE 'Starting migration: Add multiple engineer approvals support at %', NOW();
END $$;

-- Create junction table for multiple engineer approvals
CREATE TABLE IF NOT EXISTS checklist_item_engineer_approvals (
  id SERIAL PRIMARY KEY,
  checklist_item_id INTEGER NOT NULL REFERENCES project_checklist_items(id) ON DELETE CASCADE,
  engineer_id INTEGER NOT NULL REFERENCES users(id),
  approved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure same engineer can't approve same item twice
  UNIQUE(checklist_item_id, engineer_id)
);

-- Create index for faster lookups
CREATE INDEX idx_checklist_engineer_approvals_item ON checklist_item_engineer_approvals(checklist_item_id);
CREATE INDEX idx_checklist_engineer_approvals_engineer ON checklist_item_engineer_approvals(engineer_id);

-- Migrate existing engineer approvals to the new table
-- Only migrate if engineer_approved_by is not null
INSERT INTO checklist_item_engineer_approvals (checklist_item_id, engineer_id, approved_at)
SELECT
  id,
  engineer_approved_by,
  engineer_approved_at
FROM project_checklist_items
WHERE engineer_approved_by IS NOT NULL
ON CONFLICT (checklist_item_id, engineer_id) DO NOTHING;

-- Keep the old columns for backward compatibility during migration
-- We'll deprecate them but not drop them yet
-- This allows for a safe rollback if needed

COMMENT ON TABLE checklist_item_engineer_approvals IS 'Stores multiple engineer approvals per checklist item';
COMMENT ON COLUMN project_checklist_items.engineer_approved_by IS 'DEPRECATED: Use checklist_item_engineer_approvals table instead';
COMMENT ON COLUMN project_checklist_items.engineer_approved_at IS 'DEPRECATED: Use checklist_item_engineer_approvals table instead';

-- Commit transaction
COMMIT;

-- Reset timeouts to default
RESET statement_timeout;
RESET lock_timeout;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully at %', NOW();
  RAISE NOTICE '✓ Created checklist_item_engineer_approvals table';
  RAISE NOTICE '✓ Migrated existing engineer approvals';
  RAISE NOTICE '✓ Old columns kept for backward compatibility';
END $$;
