-- Migration: Drop unused Smart Warning system tables
-- These tables were created but never implemented in the application code

-- Drop unused tables (keeping warning_analytics and phase_dependencies which ARE used)
DROP TABLE IF EXISTS smart_notification_rules CASCADE;
DROP TABLE IF EXISTS critical_path_analysis CASCADE;
DROP TABLE IF EXISTS project_timeline_forecasts CASCADE;
DROP TABLE IF EXISTS resource_predictions CASCADE;

-- Drop associated indexes (CASCADE should handle this, but being explicit)
DROP INDEX IF EXISTS idx_resource_predictions_engineer_expires;
DROP INDEX IF EXISTS idx_timeline_forecasts_project_created;
DROP INDEX IF EXISTS idx_critical_path_project_date;

-- Success message
SELECT 'Dropped unused Smart Warning tables: resource_predictions, project_timeline_forecasts, critical_path_analysis, smart_notification_rules' as status;
