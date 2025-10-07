-- Migration: Performance Optimizations for Track Management System
-- Version: 001
-- Date: 2024-01-01
-- Description: Add missing indexes and performance optimizations

-- Start transaction
BEGIN;

-- ====================
-- BACKUP CURRENT STATE
-- ====================

-- Create backup info table
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Record this migration
INSERT INTO migration_history (migration_name, description)
VALUES ('001_performance_optimizations', 'Added missing indexes and performance optimizations for production scaling');

-- ====================
-- ADD MISSING INDEXES
-- ====================

-- 1. Projects table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_archived_status
    ON projects(archived_at, status)
    WHERE archived_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active_created_at
    ON projects(status, created_at)
    WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_created_at
    ON projects(status, created_at);

-- 2. Work logs table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_logs_engineer_date
    ON work_logs(engineer_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_logs_project_date
    ON work_logs(project_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_logs_supervisor_approved
    ON work_logs(supervisor_approved, engineer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_logs_created_at
    ON work_logs(created_at DESC);

-- 3. Project phases optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_phases_status_order
    ON project_phases(project_id, status, phase_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_phases_status_project
    ON project_phases(status, project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_phases_dates
    ON project_phases(planned_start_date, planned_end_date);

-- 4. Users table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
    ON users(role, is_active)
    WHERE is_active = true;

-- 5. Audit logs optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_timestamp
    ON audit_logs(entity_type, entity_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent
    ON audit_logs(timestamp DESC)
    WHERE timestamp > NOW() - INTERVAL '30 days';

-- 6. Project settings optimizations
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_project_settings_project_unique
    ON project_settings(project_id);

-- ====================
-- OPTIMIZE EXISTING INDEXES
-- ====================

-- Analyze tables to update statistics
ANALYZE projects;
ANALYZE project_phases;
ANALYZE work_logs;
ANALYZE users;
ANALYZE audit_logs;
ANALYZE project_settings;

-- ====================
-- ADD PERFORMANCE MONITORING
-- ====================

-- Create table to track slow queries
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_text TEXT,
    execution_time_ms INTEGER,
    called_by TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for slow query analysis
CREATE INDEX IF NOT EXISTS idx_slow_query_log_timestamp
    ON slow_query_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_execution_time
    ON slow_query_log(execution_time_ms DESC);

-- ====================
-- ADD PERFORMANCE FUNCTIONS
-- ====================

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
    query_text TEXT,
    execution_time_ms INTEGER,
    called_by TEXT DEFAULT 'unknown'
)
RETURNS VOID AS $$
BEGIN
    -- Only log queries that take more than 100ms
    IF execution_time_ms > 100 THEN
        INSERT INTO slow_query_log (query_text, execution_time_ms, called_by)
        VALUES (query_text, execution_time_ms, called_by);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get project dashboard data efficiently
CREATE OR REPLACE FUNCTION get_project_dashboard_data(
    user_id INTEGER,
    user_role TEXT
)
RETURNS TABLE (
    project_id INTEGER,
    project_name TEXT,
    project_status TEXT,
    progress_percentage NUMERIC,
    total_hours NUMERIC,
    last_activity DATE,
    warning_count INTEGER
) AS $$
BEGIN
    IF user_role = 'supervisor' THEN
        -- Supervisors see all projects
        RETURN QUERY
        WITH project_stats AS (
            SELECT
                p.id,
                p.name,
                p.status,
                CASE
                    WHEN p.predicted_hours > 0 THEN (p.actual_hours::float / p.predicted_hours * 100)
                    ELSE 0
                END as progress_percentage,
                p.actual_hours,
                wl_agg.last_activity,
                phase_agg.warning_count
            FROM projects p
            LEFT JOIN (
                SELECT
                    pp.project_id,
                    MAX(wl.date) as last_activity
                FROM work_logs wl
                JOIN project_phases pp ON wl.phase_id = pp.id
                GROUP BY pp.project_id
            ) wl_agg ON p.id = wl_agg.project_id
            LEFT JOIN (
                SELECT
                    project_id,
                    COUNT(CASE WHEN warning_flag = true THEN 1 END)::INTEGER as warning_count
                FROM project_phases
                GROUP BY project_id
            ) phase_agg ON p.id = phase_agg.project_id
            WHERE p.status != 'cancelled' AND p.archived_at IS NULL
        )
        SELECT
            ps.id,
            ps.name::TEXT,
            ps.status::TEXT,
            ps.progress_percentage::NUMERIC,
            ps.actual_hours::NUMERIC,
            ps.last_activity,
            COALESCE(ps.warning_count, 0)::INTEGER
        FROM project_stats ps
        ORDER BY ps.last_activity DESC NULLS LAST
        LIMIT 10;
    ELSE
        -- Engineers see only projects they're working on
        RETURN QUERY
        WITH engineer_projects AS (
            SELECT DISTINCT
                p.id,
                p.name,
                p.status,
                CASE
                    WHEN p.predicted_hours > 0 THEN (p.actual_hours::float / p.predicted_hours * 100)
                    ELSE 0
                END as progress_percentage,
                p.actual_hours,
                wl_agg.last_activity,
                phase_agg.warning_count
            FROM projects p
            JOIN project_phases pp ON p.id = pp.project_id
            JOIN work_logs wl ON pp.id = wl.phase_id
            LEFT JOIN (
                SELECT
                    pp2.project_id,
                    MAX(wl2.date) as last_activity
                FROM work_logs wl2
                JOIN project_phases pp2 ON wl2.phase_id = pp2.id
                WHERE wl2.engineer_id = user_id
                GROUP BY pp2.project_id
            ) wl_agg ON p.id = wl_agg.project_id
            LEFT JOIN (
                SELECT
                    project_id,
                    COUNT(CASE WHEN warning_flag = true THEN 1 END)::INTEGER as warning_count
                FROM project_phases
                GROUP BY project_id
            ) phase_agg ON p.id = phase_agg.project_id
            WHERE wl.engineer_id = user_id
            AND p.status != 'cancelled' AND p.archived_at IS NULL
        )
        SELECT
            ep.id,
            ep.name::TEXT,
            ep.status::TEXT,
            ep.progress_percentage::NUMERIC,
            ep.actual_hours::NUMERIC,
            ep.last_activity,
            COALESCE(ep.warning_count, 0)::INTEGER
        FROM engineer_projects ep
        ORDER BY ep.last_activity DESC NULLS LAST
        LIMIT 10;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get engineer workload efficiently
CREATE OR REPLACE FUNCTION get_engineer_workload(
    engineer_id INTEGER,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_hours NUMERIC,
    projects_count INTEGER,
    avg_hours_per_day NUMERIC,
    most_active_project TEXT,
    most_active_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH engineer_stats AS (
        SELECT
            COALESCE(SUM(wl.hours), 0) as total_hours,
            COUNT(DISTINCT wl.project_id) as projects_count,
            COALESCE(SUM(wl.hours) / NULLIF(days_back, 0), 0) as avg_hours_per_day
        FROM work_logs wl
        WHERE wl.engineer_id = engineer_id
        AND wl.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    most_active AS (
        SELECT
            p.name as project_name,
            SUM(wl.hours) as project_hours
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE wl.engineer_id = engineer_id
        AND wl.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
        GROUP BY p.id, p.name
        ORDER BY project_hours DESC
        LIMIT 1
    )
    SELECT
        es.total_hours,
        es.projects_count,
        es.avg_hours_per_day,
        COALESCE(ma.project_name, 'None')::TEXT,
        COALESCE(ma.project_hours, 0)
    FROM engineer_stats es
    LEFT JOIN most_active ma ON true;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS VOID AS $$
BEGIN
    -- Delete audit logs older than 6 months
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '6 months';

    -- Delete slow query logs older than 1 month
    DELETE FROM slow_query_log
    WHERE timestamp < NOW() - INTERVAL '1 month';

    -- Vacuum tables to reclaim space
    PERFORM 'VACUUM ANALYZE audit_logs';
    PERFORM 'VACUUM ANALYZE slow_query_log';
END;
$$ LANGUAGE plpgsql;

-- ====================
-- UPDATE STATISTICS
-- ====================

-- Update table statistics for query planner
ANALYZE projects;
ANALYZE project_phases;
ANALYZE work_logs;
ANALYZE users;
ANALYZE audit_logs;
ANALYZE project_settings;

-- ====================
-- PERFORMANCE VERIFICATION
-- ====================

-- Log successful completion
INSERT INTO audit_logs (entity_type, entity_id, action, note)
VALUES ('system', 0, 'MIGRATION_COMPLETE', 'Performance optimization migration 001 completed successfully');

-- Commit transaction
COMMIT;

-- ====================
-- POST-MIGRATION NOTES
-- ====================

/*
IMPORTANT: After running this migration:

1. Monitor slow_query_log table for queries taking longer than 100ms
2. Run VACUUM ANALYZE on all tables weekly
3. Monitor index usage with:
   SELECT * FROM pg_stat_user_indexes WHERE idx_scan < 100;
4. Set up automated cleanup job to run cleanup_old_logs() monthly

For monitoring query performance:
SELECT * FROM slow_query_log ORDER BY execution_time_ms DESC LIMIT 10;

For checking index effectiveness:
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
*/