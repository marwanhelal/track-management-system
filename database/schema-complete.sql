-- Track Management System Database Schema - COMPLETE
-- PostgreSQL Database Setup with All Migrations Included
-- This file combines the base schema with all migration changes
-- Version: Production-ready for Coolify/VPS deployment

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS progress_adjustments CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS predefined_phases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (Engineers, Supervisors, and Administrators)
-- Includes: administrator role and job_description from migration 004
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('supervisor', 'engineer', 'administrator')),
    job_description VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Predefined Phases (Architecture-specific phases)
CREATE TABLE predefined_phases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    typical_duration_weeks INTEGER DEFAULT 1,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    planned_total_weeks INTEGER NOT NULL CHECK (planned_total_weeks > 0),
    predicted_hours INTEGER NOT NULL CHECK (predicted_hours > 0),
    actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Phases (Selected phases for each project)
-- Includes columns from migrations 001, 003, and 005
CREATE TABLE project_phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL CHECK (phase_order > 0),
    phase_name VARCHAR(100) NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    planned_weeks INTEGER NOT NULL CHECK (planned_weeks > 0),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'ready', 'in_progress', 'submitted', 'approved', 'completed')),
    delay_reason VARCHAR(20) DEFAULT 'none' CHECK (delay_reason IN ('none', 'client', 'company')),
    warning_flag BOOLEAN DEFAULT false,
    predicted_hours INTEGER CHECK (predicted_hours >= 0),
    actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
    -- Early Access columns (migration 001)
    early_access_granted BOOLEAN DEFAULT false,
    early_access_status VARCHAR(20) DEFAULT 'not_accessible' CHECK (early_access_status IN ('not_accessible', 'accessible', 'in_progress', 'work_completed')),
    early_access_granted_by INTEGER REFERENCES users(id),
    early_access_granted_at TIMESTAMP,
    early_access_note TEXT,
    -- Progress Tracking columns (migration 003)
    calculated_progress DECIMAL(5,2) DEFAULT 0 CHECK (calculated_progress >= 0 AND calculated_progress <= 100),
    actual_progress DECIMAL(5,2) DEFAULT 0 CHECK (actual_progress >= 0 AND actual_progress <= 100),
    progress_variance DECIMAL(6,2) DEFAULT 0,
    -- Submitted/Approved dates (migration 005)
    submitted_date DATE,
    approved_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, phase_order)
);

-- Work Logs (Engineer time tracking)
-- Includes progress tracking columns (migration 003)
CREATE TABLE work_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    engineer_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(10,2) NOT NULL CHECK (hours > 0),
    description TEXT,
    supervisor_approved BOOLEAN DEFAULT false,
    -- Progress tracking columns (migration 003)
    manual_progress_percentage DECIMAL(5,2) CHECK (manual_progress_percentage >= 0 AND manual_progress_percentage <= 100),
    progress_notes TEXT,
    progress_adjusted_by INTEGER REFERENCES users(id),
    progress_adjusted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Progress Adjustments table (migration 003)
-- Tracks all manual progress modifications by supervisors
CREATE TABLE progress_adjustments (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    engineer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_log_id INTEGER REFERENCES work_logs(id) ON DELETE SET NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('work_log_entry', 'phase_overall')),
    hours_logged DECIMAL(10,2) NOT NULL CHECK (hours_logged >= 0),
    hours_based_progress DECIMAL(5,2) NOT NULL CHECK (hours_based_progress >= 0 AND hours_based_progress <= 100),
    manual_progress_percentage DECIMAL(5,2) NOT NULL CHECK (manual_progress_percentage >= 0 AND manual_progress_percentage <= 100),
    adjustment_reason TEXT NOT NULL,
    adjusted_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Timer Sessions table (migration 008)
-- Stores active timer sessions for engineers with pause/resume support and automatic recovery
CREATE TABLE timer_sessions (
    id SERIAL PRIMARY KEY,
    engineer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Timer state
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMP,
    total_paused_ms BIGINT DEFAULT 0 CHECK (total_paused_ms >= 0),
    elapsed_time_ms BIGINT DEFAULT 0 CHECK (elapsed_time_ms >= 0),
    -- Session data
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes for timer_sessions for performance
CREATE INDEX idx_timer_sessions_engineer_id ON timer_sessions(engineer_id);
CREATE INDEX idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX idx_timer_sessions_phase_id ON timer_sessions(phase_id);
CREATE INDEX idx_timer_sessions_created_at ON timer_sessions(created_at DESC);
CREATE INDEX idx_timer_sessions_active_paused ON timer_sessions(engineer_id, status) WHERE status IN ('active', 'paused');

-- Audit Logs (Complete history tracking)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    note TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Project Settings (Configuration per project)
CREATE TABLE project_settings (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    auto_advance_enabled BOOLEAN DEFAULT true,
    allow_timeline_mismatch BOOLEAN DEFAULT false,
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Base indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX idx_project_phases_status ON project_phases(status);
CREATE INDEX idx_project_phases_order ON project_phases(project_id, phase_order);
CREATE INDEX idx_work_logs_project_phase ON work_logs(project_id, phase_id);
CREATE INDEX idx_work_logs_engineer ON work_logs(engineer_id);
CREATE INDEX idx_work_logs_date ON work_logs(date);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Early access indexes (migration 001)
CREATE INDEX idx_project_phases_early_access ON project_phases(project_id, early_access_granted);
CREATE INDEX idx_project_phases_early_access_status ON project_phases(early_access_status) WHERE early_access_granted = true;
CREATE INDEX idx_project_phases_early_access_granted_by ON project_phases(early_access_granted_by) WHERE early_access_granted_by IS NOT NULL;

-- Progress tracking indexes (migration 003)
CREATE INDEX idx_progress_adjustments_phase ON progress_adjustments(phase_id);
CREATE INDEX idx_progress_adjustments_engineer ON progress_adjustments(engineer_id);
CREATE INDEX idx_progress_adjustments_work_log ON progress_adjustments(work_log_id) WHERE work_log_id IS NOT NULL;
CREATE INDEX idx_progress_adjustments_type ON progress_adjustments(adjustment_type);
CREATE INDEX idx_progress_adjustments_created_at ON progress_adjustments(created_at DESC);
CREATE INDEX idx_work_logs_progress ON work_logs(phase_id, engineer_id) WHERE manual_progress_percentage IS NOT NULL;
CREATE INDEX idx_project_phases_progress ON project_phases(project_id, actual_progress);

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically update project actual_hours when work_logs change
CREATE OR REPLACE FUNCTION update_project_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Update phase actual_hours
    UPDATE project_phases
    SET actual_hours = (
        SELECT COALESCE(SUM(hours), 0)
        FROM work_logs
        WHERE phase_id = COALESCE(NEW.phase_id, OLD.phase_id)
    )
    WHERE id = COALESCE(NEW.phase_id, OLD.phase_id);

    -- Update project actual_hours
    UPDATE projects
    SET actual_hours = (
        SELECT COALESCE(SUM(hours), 0)
        FROM work_logs
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    )
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to audit table changes
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_values, new_values)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.updated_by
            ELSE NEW.updated_by
        END,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Progress tracking functions (migration 003)
CREATE OR REPLACE FUNCTION calculate_hours_based_progress(
    p_phase_id INTEGER,
    p_engineer_id INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_total_hours DECIMAL;
    v_predicted_hours DECIMAL;
    v_progress DECIMAL;
BEGIN
    -- Get total hours logged by engineer for this phase
    SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
    FROM work_logs
    WHERE phase_id = p_phase_id AND engineer_id = p_engineer_id;

    -- Get predicted hours for this phase
    SELECT COALESCE(predicted_hours, 1) INTO v_predicted_hours
    FROM project_phases WHERE id = p_phase_id;

    -- Avoid division by zero
    IF v_predicted_hours = 0 THEN
        v_predicted_hours := 1;
    END IF;

    -- Calculate progress percentage (cap at 100%)
    v_progress := LEAST((v_total_hours / v_predicted_hours) * 100, 100);

    RETURN ROUND(v_progress, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_actual_progress(
    p_phase_id INTEGER,
    p_engineer_id INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_manual_progress DECIMAL;
    v_calculated_progress DECIMAL;
BEGIN
    -- Check for most recent phase-level manual adjustment
    SELECT manual_progress_percentage INTO v_manual_progress
    FROM progress_adjustments
    WHERE phase_id = p_phase_id
      AND engineer_id = p_engineer_id
      AND adjustment_type = 'phase_overall'
    ORDER BY created_at DESC
    LIMIT 1;

    -- If phase-level adjustment exists, return it
    IF v_manual_progress IS NOT NULL THEN
        RETURN v_manual_progress;
    END IF;

    -- Otherwise, check for work log level adjustments (sum them up)
    SELECT SUM(COALESCE(manual_progress_percentage, 0)) INTO v_manual_progress
    FROM work_logs
    WHERE phase_id = p_phase_id
      AND engineer_id = p_engineer_id
      AND manual_progress_percentage IS NOT NULL;

    -- If work log adjustments exist, return the sum
    IF v_manual_progress IS NOT NULL AND v_manual_progress > 0 THEN
        RETURN LEAST(v_manual_progress, 100);
    END IF;

    -- Otherwise, return calculated progress
    v_calculated_progress := calculate_hours_based_progress(p_phase_id, p_engineer_id);
    RETURN v_calculated_progress;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_phase_progress(
    p_phase_id INTEGER
) RETURNS VOID AS $$
DECLARE
    v_avg_calculated DECIMAL;
    v_avg_actual DECIMAL;
    v_variance DECIMAL;
BEGIN
    -- Calculate average calculated progress across all engineers
    SELECT COALESCE(AVG(calculate_hours_based_progress(p_phase_id, u.id)), 0)
    INTO v_avg_calculated
    FROM users u
    WHERE u.role = 'engineer'
      AND EXISTS (SELECT 1 FROM work_logs WHERE phase_id = p_phase_id AND engineer_id = u.id);

    -- Calculate average actual progress across all engineers
    SELECT COALESCE(AVG(get_actual_progress(p_phase_id, u.id)), 0)
    INTO v_avg_actual
    FROM users u
    WHERE u.role = 'engineer'
      AND EXISTS (SELECT 1 FROM work_logs WHERE phase_id = p_phase_id AND engineer_id = u.id);

    -- Calculate variance
    v_variance := v_avg_actual - v_avg_calculated;

    -- Update project_phases table
    UPDATE project_phases
    SET calculated_progress = ROUND(v_avg_calculated, 2),
        actual_progress = ROUND(v_avg_actual, 2),
        progress_variance = ROUND(v_variance, 2),
        updated_at = NOW()
    WHERE id = p_phase_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_phase_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM sync_phase_progress(OLD.phase_id);
        RETURN OLD;
    ELSE
        PERFORM sync_phase_progress(NEW.phase_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_phase_progress(NEW.phase_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_settings_updated_at BEFORE UPDATE ON project_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for automatic actual_hours updates
CREATE TRIGGER update_project_hours_on_insert AFTER INSERT ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();
CREATE TRIGGER update_project_hours_on_update AFTER UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();
CREATE TRIGGER update_project_hours_on_delete AFTER DELETE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();

-- Triggers for progress tracking (migration 003)
CREATE TRIGGER auto_sync_work_log_progress
    AFTER INSERT OR UPDATE OR DELETE ON work_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_phase_progress();

CREATE TRIGGER auto_sync_adjustment_progress
    AFTER INSERT ON progress_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_on_adjustment();

-- ============================================================================
-- DOCUMENTATION COMMENTS
-- ============================================================================

-- Table comments
COMMENT ON TABLE users IS 'System users - engineers, supervisors, and administrators';
COMMENT ON TABLE predefined_phases IS 'Architecture-specific predefined project phases';
COMMENT ON TABLE projects IS 'Main projects table with timeline and hour tracking';
COMMENT ON TABLE project_phases IS 'Selected phases for each project with workflow status';
COMMENT ON TABLE work_logs IS 'Engineer time tracking entries per phase';
COMMENT ON TABLE progress_adjustments IS 'Tracks all manual progress adjustments made by supervisors';
COMMENT ON TABLE audit_logs IS 'Complete history of all system changes';
COMMENT ON TABLE project_settings IS 'Per-project configuration settings';

-- Column comments
COMMENT ON COLUMN users.role IS 'System role: supervisor (full access), engineer (time logging), administrator (read-only + export)';
COMMENT ON COLUMN users.job_description IS 'Job title/description in English (e.g., Manager, Engineer, Administrator, Chairman of the Board)';
COMMENT ON COLUMN project_phases.status IS 'Workflow status: not_started -> ready -> in_progress -> submitted -> approved -> completed';
COMMENT ON COLUMN project_phases.delay_reason IS 'Delay attribution: none, client, company';
COMMENT ON COLUMN project_phases.early_access_granted IS 'Whether supervisor has granted early access to this phase';
COMMENT ON COLUMN project_phases.early_access_status IS 'Work status for early access: not_accessible, accessible, in_progress, work_completed';
COMMENT ON COLUMN project_phases.early_access_granted_by IS 'Supervisor who granted early access permission';
COMMENT ON COLUMN project_phases.early_access_granted_at IS 'Timestamp when early access was granted';
COMMENT ON COLUMN project_phases.early_access_note IS 'Supervisor note explaining reason for early access';
COMMENT ON COLUMN project_phases.calculated_progress IS 'Automatic progress based on hours logged';
COMMENT ON COLUMN project_phases.actual_progress IS 'Actual progress (manual override or calculated)';
COMMENT ON COLUMN project_phases.progress_variance IS 'Difference between actual and calculated progress';
COMMENT ON COLUMN project_phases.submitted_date IS 'Date when the phase was submitted to the client for review';
COMMENT ON COLUMN project_phases.approved_date IS 'Date when the client approved the phase';
COMMENT ON COLUMN work_logs.hours IS 'Hours worked - for regular entries max 24/day recommended, for historical imports cumulative hours allowed';
COMMENT ON COLUMN work_logs.manual_progress_percentage IS 'Manual progress override for this work log entry';
COMMENT ON COLUMN work_logs.progress_notes IS 'Reason for progress adjustment';
COMMENT ON COLUMN progress_adjustments.adjustment_type IS 'Type of adjustment: work_log_entry (per log) or phase_overall (entire phase)';
COMMENT ON COLUMN progress_adjustments.hours_based_progress IS 'Calculated progress at time of adjustment';
COMMENT ON COLUMN progress_adjustments.manual_progress_percentage IS 'Supervisor-set manual progress';
COMMENT ON COLUMN projects.status IS 'Overall project status: active, on_hold, completed, cancelled';

-- Function comments
COMMENT ON FUNCTION calculate_hours_based_progress IS 'Calculates automatic progress percentage based on hours logged vs predicted';
COMMENT ON FUNCTION get_actual_progress IS 'Gets actual progress (manual override if exists, otherwise calculated)';
COMMENT ON FUNCTION sync_phase_progress IS 'Aggregates progress from all engineers and updates phase progress';

-- Schema setup complete
SELECT 'Track Management System - Complete Schema with All Migrations - Ready for Production' as status;
