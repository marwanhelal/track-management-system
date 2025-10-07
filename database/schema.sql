-- Track Management System Database Schema
-- PostgreSQL Database Setup

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS predefined_phases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (Engineers and Supervisors)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('supervisor', 'engineer')),
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, phase_order)
);

-- Work Logs (Engineer time tracking)
CREATE TABLE work_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    engineer_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description TEXT,
    supervisor_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
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

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_settings_updated_at BEFORE UPDATE ON project_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Triggers for automatic actual_hours updates
CREATE TRIGGER update_project_hours_on_insert AFTER INSERT ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();
CREATE TRIGGER update_project_hours_on_update AFTER UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();
CREATE TRIGGER update_project_hours_on_delete AFTER DELETE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_project_actual_hours();

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

-- Comments for documentation
COMMENT ON TABLE users IS 'System users - engineers and supervisors';
COMMENT ON TABLE predefined_phases IS 'Architecture-specific predefined project phases';
COMMENT ON TABLE projects IS 'Main projects table with timeline and hour tracking';
COMMENT ON TABLE project_phases IS 'Selected phases for each project with workflow status';
COMMENT ON TABLE work_logs IS 'Engineer time tracking entries per phase';
COMMENT ON TABLE audit_logs IS 'Complete history of all system changes';
COMMENT ON TABLE project_settings IS 'Per-project configuration settings';

COMMENT ON COLUMN project_phases.status IS 'Workflow status: not_started -> ready -> in_progress -> submitted -> approved -> completed';
COMMENT ON COLUMN project_phases.delay_reason IS 'Delay attribution: none, client, company';
COMMENT ON COLUMN work_logs.hours IS 'Hours worked (max 24 per day)';
COMMENT ON COLUMN projects.status IS 'Overall project status: active, on_hold, completed, cancelled';