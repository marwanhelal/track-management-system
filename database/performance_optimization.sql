-- Database Performance Optimization for Track Management System
-- This file contains additional indexes and optimizations for high-performance operations

-- ====================
-- MISSING INDEXES ANALYSIS
-- ====================

-- 1. Projects table optimizations
-- Add composite index for archived projects query
CREATE INDEX IF NOT EXISTS idx_projects_archived_status ON projects(archived_at, status) WHERE archived_at IS NOT NULL;

-- Add index for active projects filtering
CREATE INDEX IF NOT EXISTS idx_projects_active_created_at ON projects(status, created_at) WHERE status != 'cancelled';

-- Add composite index for project creation date with status
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at ON projects(status, created_at);

-- 2. Work logs table optimizations
-- Add composite index for work logs by engineer and date (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_work_logs_engineer_date ON work_logs(engineer_id, date DESC);

-- Add composite index for work logs by project and date (project timeline queries)
CREATE INDEX IF NOT EXISTS idx_work_logs_project_date ON work_logs(project_id, date DESC);

-- Add composite index for supervisor approval status
CREATE INDEX IF NOT EXISTS idx_work_logs_supervisor_approved ON work_logs(supervisor_approved, engineer_id);

-- Add index for work logs created_at for recent activity queries
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs(created_at DESC);

-- 3. Project phases optimizations
-- Add composite index for project phases status and order
CREATE INDEX IF NOT EXISTS idx_project_phases_status_order ON project_phases(project_id, status, phase_order);

-- Add index for phase status filtering
CREATE INDEX IF NOT EXISTS idx_project_phases_status_project ON project_phases(status, project_id);

-- Add index for phase timeline queries
CREATE INDEX IF NOT EXISTS idx_project_phases_dates ON project_phases(planned_start_date, planned_end_date);

-- 4. Users table optimizations
-- Add composite index for active users by role
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE is_active = true;

-- 5. Audit logs optimizations
-- Add composite index for audit logs by entity and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp DESC);

-- Add index for recent audit activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON audit_logs(timestamp DESC) WHERE timestamp > NOW() - INTERVAL '30 days';

-- 6. Project settings optimizations
-- Add unique index for project settings (should be one per project)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_settings_project_unique ON project_settings(project_id);

-- ====================
-- QUERY OPTIMIZATION VIEWS
-- ====================

-- Create materialized view for project overview statistics (refresh hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_overview_stats AS
SELECT
    p.id as project_id,
    p.name,
    p.status,
    p.start_date,
    p.planned_total_weeks,
    p.predicted_hours,
    p.actual_hours,
    COUNT(pp.id) as total_phases,
    COUNT(CASE WHEN pp.status = 'completed' THEN 1 END) as completed_phases,
    COUNT(CASE WHEN pp.status = 'in_progress' THEN 1 END) as active_phases,
    COUNT(CASE WHEN pp.warning_flag = true THEN 1 END) as warning_phases,
    COALESCE(SUM(wl.hours), 0) as total_logged_hours,
    COUNT(DISTINCT wl.engineer_id) as engineers_count,
    MAX(wl.date) as last_activity_date,
    CASE
        WHEN p.predicted_hours > 0 THEN (p.actual_hours::float / p.predicted_hours * 100)
        ELSE 0
    END as progress_percentage
FROM projects p
LEFT JOIN project_phases pp ON p.id = pp.project_id
LEFT JOIN work_logs wl ON pp.id = wl.phase_id
WHERE p.status != 'cancelled' AND p.archived_at IS NULL
GROUP BY p.id, p.name, p.status, p.start_date, p.planned_total_weeks, p.predicted_hours, p.actual_hours;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_project_overview_stats_status ON project_overview_stats(status);
CREATE INDEX IF NOT EXISTS idx_project_overview_stats_progress ON project_overview_stats(progress_percentage);

-- ====================
-- PERFORMANCE FUNCTIONS
-- ====================

-- Function to get project dashboard data efficiently
CREATE OR REPLACE FUNCTION get_project_dashboard_data(user_id INTEGER, user_role TEXT)
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
        SELECT
            pos.project_id,
            pos.name::TEXT,
            pos.status::TEXT,
            pos.progress_percentage::NUMERIC,
            pos.total_logged_hours::NUMERIC,
            pos.last_activity_date,
            pos.warning_phases::INTEGER
        FROM project_overview_stats pos
        ORDER BY pos.last_activity_date DESC NULLS LAST
        LIMIT 10;
    ELSE
        -- Engineers see only projects they're working on
        RETURN QUERY
        SELECT DISTINCT
            pos.project_id,
            pos.name::TEXT,
            pos.status::TEXT,
            pos.progress_percentage::NUMERIC,
            pos.total_logged_hours::NUMERIC,
            pos.last_activity_date,
            pos.warning_phases::INTEGER
        FROM project_overview_stats pos
        JOIN project_phases pp ON pos.project_id = pp.project_id
        JOIN work_logs wl ON pp.id = wl.phase_id
        WHERE wl.engineer_id = user_id
        ORDER BY pos.last_activity_date DESC NULLS LAST
        LIMIT 10;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get engineer workload efficiently
CREATE OR REPLACE FUNCTION get_engineer_workload(engineer_id INTEGER, days_back INTEGER DEFAULT 30)
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

-- ====================
-- MAINTENANCE TASKS
-- ====================

-- Function to refresh materialized views (call this hourly via cron)
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW project_overview_stats;

    -- Log the refresh
    INSERT INTO audit_logs (entity_type, entity_id, action, note)
    VALUES ('system', 0, 'REFRESH_VIEWS', 'Performance views refreshed');

    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail
        INSERT INTO audit_logs (entity_type, entity_id, action, note)
        VALUES ('system', 0, 'REFRESH_VIEWS_ERROR', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ====================
-- QUERY PERFORMANCE MONITORING
-- ====================

-- Create table to track slow queries (optional - for monitoring)
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_text TEXT,
    execution_time_ms INTEGER,
    called_by TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for slow query analysis
CREATE INDEX IF NOT EXISTS idx_slow_query_log_timestamp ON slow_query_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_log_execution_time ON slow_query_log(execution_time_ms DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(query_text TEXT, execution_time_ms INTEGER, called_by TEXT DEFAULT 'unknown')
RETURNS VOID AS $$
BEGIN
    -- Only log queries that take more than 100ms
    IF execution_time_ms > 100 THEN
        INSERT INTO slow_query_log (query_text, execution_time_ms, called_by)
        VALUES (query_text, execution_time_ms, called_by);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- AUTOMATIC CLEANUP
-- ====================

-- Function to cleanup old audit logs and slow query logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS VOID AS $$
BEGIN
    -- Delete audit logs older than 6 months
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '6 months';

    -- Delete slow query logs older than 1 month
    DELETE FROM slow_query_log
    WHERE timestamp < NOW() - INTERVAL '1 month';

    -- Vacuum tables
    VACUUM ANALYZE audit_logs;
    VACUUM ANALYZE slow_query_log;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- ANALYSIS QUERIES FOR DEBUGGING
-- ====================

-- Query to find table sizes
/*
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
*/

-- Query to find unused indexes
/*
SELECT
    s.schemaname,
    s.tablename,
    s.indexname,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as size
FROM pg_stat_user_indexes s
JOIN pg_index i ON s.indexrelid = i.indexrelid
WHERE s.idx_scan < 100  -- Indexes used less than 100 times
AND NOT i.indisunique   -- Exclude unique indexes
ORDER BY s.idx_scan;
*/