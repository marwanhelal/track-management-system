-- Migration: Drop Checklist System
-- This migration removes all checklist-related tables and data

-- Drop checklist item engineer approvals junction table first (has FK to checklist items)
DROP TABLE IF EXISTS checklist_item_engineer_approvals CASCADE;

-- Drop project checklist items (has FK to projects)
DROP TABLE IF EXISTS project_checklist_items CASCADE;

-- Drop checklist templates
DROP TABLE IF EXISTS checklist_templates CASCADE;

-- Success message
SELECT 'Dropped checklist system tables: checklist_templates, project_checklist_items, checklist_item_engineer_approvals' as status;
