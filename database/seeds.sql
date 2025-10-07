-- Track Management System Seed Data
-- Initial data setup for the application

-- Insert predefined architecture phases (your specific phases)
INSERT INTO predefined_phases (name, description, typical_duration_weeks, display_order) VALUES
('Preconcept Design', 'Initial conceptual planning and feasibility analysis', 2, 1),
('Concept Generation', 'Creative concept development and idea exploration', 3, 2),
('Principle Project', 'Core project principles establishment and design brief', 4, 3),
('Design Development', 'Detailed design evolution and refinement', 4, 4),
('Schematic Design', 'Technical schematic creation and system design', 3, 5),
('Working Drawings', 'Construction-ready detailed drawings and specifications', 6, 6),
('BOQ', 'Bill of Quantities - cost estimation and materials quantification', 1, 7),
('IFT', 'Issued for Tender - tender documentation preparation', 1, 8),
('IFC', 'Issued for Construction - final construction documentation', 2, 9),
('Licenses Drawing', 'Regulatory approval drawings and permit submissions', 2, 10);

-- Insert default supervisor user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES
('System Administrator', 'admin@trackms.com', '$2b$10$8K4Q5Z1QN.L2M3Y5R.7gKe.WjH8.FnE2.D4X1V.M8L.Q9P3S.6Y7', 'supervisor');

-- Insert sample engineer users for testing (password: engineer123)
INSERT INTO users (name, email, password_hash, role) VALUES
('John Smith', 'john.smith@trackms.com', '$2b$10$9L5R6A2SO.M3N4Z6S.8hLf.XkI9.GoF3.E5Y2W.N9M.R0Q4T.7Z8', 'engineer'),
('Sarah Johnson', 'sarah.johnson@trackms.com', '$2b$10$0M6S7B3TP.N4O5A7T.9iMg.YlJ0.HpG4.F6Z3X.O0N.S1R5U.8A9', 'engineer'),
('Mike Davis', 'mike.davis@trackms.com', '$2b$10$1N7T8C4UQ.O5P6B8U.0jNh.ZmK1.IqH5.G7A4Y.P1O.T2S6V.9B0', 'engineer'),
('Emily Wilson', 'emily.wilson@trackms.com', '$2b$10$2O8U9D5VR.P6Q7C9V.1kOi.AnL2.JrI6.H8B5Z.Q2P.U3T7W.0C1', 'engineer');

-- Insert a sample project for demonstration
INSERT INTO projects (name, start_date, planned_total_weeks, predicted_hours, created_by) VALUES
('Residential Complex A', CURRENT_DATE, 22, 500, 1);

-- Insert sample project phases for the demo project
INSERT INTO project_phases (project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, status, predicted_hours) VALUES
(1, 1, 'Preconcept Design', false, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 weeks', 'ready', 40),
(1, 2, 'Concept Generation', false, 3, CURRENT_DATE + INTERVAL '2 weeks', CURRENT_DATE + INTERVAL '5 weeks', 'not_started', 60),
(1, 3, 'Design Development', false, 4, CURRENT_DATE + INTERVAL '5 weeks', CURRENT_DATE + INTERVAL '9 weeks', 'not_started', 80),
(1, 4, 'Schematic Design', false, 3, CURRENT_DATE + INTERVAL '9 weeks', CURRENT_DATE + INTERVAL '12 weeks', 'not_started', 60),
(1, 5, 'Working Drawings', false, 6, CURRENT_DATE + INTERVAL '12 weeks', CURRENT_DATE + INTERVAL '18 weeks', 'not_started', 120),
(1, 6, 'BOQ', false, 1, CURRENT_DATE + INTERVAL '18 weeks', CURRENT_DATE + INTERVAL '19 weeks', 'not_started', 20),
(1, 7, 'IFT', false, 1, CURRENT_DATE + INTERVAL '19 weeks', CURRENT_DATE + INTERVAL '20 weeks', 'not_started', 20),
(1, 8, 'IFC', false, 2, CURRENT_DATE + INTERVAL '20 weeks', CURRENT_DATE + INTERVAL '22 weeks', 'not_started', 40),
(1, 9, 'Licenses Drawing', false, 2, CURRENT_DATE + INTERVAL '22 weeks', CURRENT_DATE + INTERVAL '24 weeks', 'not_started', 40),
(1, 10, 'Site Survey', true, 1, CURRENT_DATE + INTERVAL '24 weeks', CURRENT_DATE + INTERVAL '25 weeks', 'not_started', 20);

-- Insert default project settings for the demo project
INSERT INTO project_settings (project_id, auto_advance_enabled, allow_timeline_mismatch) VALUES
(1, true, false);

-- Insert sample work logs for demonstration
INSERT INTO work_logs (project_id, phase_id, engineer_id, date, hours, description) VALUES
(1, 1, 2, CURRENT_DATE - INTERVAL '1 day', 8, 'Initial site analysis and feasibility review'),
(1, 1, 3, CURRENT_DATE - INTERVAL '1 day', 6, 'Market research and concept brainstorming'),
(1, 1, 2, CURRENT_DATE, 4, 'Client meeting and requirements gathering');

-- Insert audit log entries for the sample data
INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES
('projects', 1, 'INSERT', 1, 'Sample project created during system setup'),
('project_phases', 1, 'INSERT', 1, 'Initial project phases setup'),
('work_logs', 1, 'INSERT', 2, 'Sample work log entry');

-- Create view for easy project overview (useful for dashboard)
CREATE VIEW project_overview AS
SELECT
    p.id,
    p.name,
    p.start_date,
    p.planned_total_weeks,
    p.predicted_hours,
    p.actual_hours,
    p.status,
    u.name as created_by_name,
    COUNT(pp.id) as total_phases,
    COUNT(CASE WHEN pp.status = 'completed' THEN 1 END) as completed_phases,
    ROUND((COUNT(CASE WHEN pp.status = 'completed' THEN 1 END) * 100.0 / COUNT(pp.id)), 2) as completion_percentage,
    CASE
        WHEN COUNT(CASE WHEN pp.warning_flag = true THEN 1 END) > 0 THEN 'warning'
        WHEN COUNT(CASE WHEN pp.delay_reason = 'client' THEN 1 END) > 0 THEN 'client_delayed'
        WHEN COUNT(CASE WHEN pp.delay_reason = 'company' THEN 1 END) > 0 THEN 'company_delayed'
        ELSE 'on_schedule'
    END as delay_status,
    (SELECT pp2.phase_name
     FROM project_phases pp2
     WHERE pp2.project_id = p.id
     AND pp2.status IN ('ready', 'in_progress', 'submitted')
     ORDER BY pp2.phase_order
     LIMIT 1) as current_phase
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN project_phases pp ON p.id = pp.project_id
GROUP BY p.id, p.name, p.start_date, p.planned_total_weeks, p.predicted_hours, p.actual_hours, p.status, u.name;

-- Create view for engineer work summary
CREATE VIEW engineer_work_summary AS
SELECT
    u.id as engineer_id,
    u.name as engineer_name,
    p.id as project_id,
    p.name as project_name,
    pp.id as phase_id,
    pp.phase_name,
    SUM(wl.hours) as total_hours,
    COUNT(wl.id) as log_entries,
    MIN(wl.date) as first_log_date,
    MAX(wl.date) as last_log_date
FROM users u
LEFT JOIN work_logs wl ON u.id = wl.engineer_id
LEFT JOIN projects p ON wl.project_id = p.id
LEFT JOIN project_phases pp ON wl.phase_id = pp.id
WHERE u.role = 'engineer'
GROUP BY u.id, u.name, p.id, p.name, pp.id, pp.phase_name;

-- Comments for the seed data
COMMENT ON VIEW project_overview IS 'Comprehensive project overview for dashboard display';
COMMENT ON VIEW engineer_work_summary IS 'Engineer productivity and work allocation summary';