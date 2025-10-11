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
COMMENT ON COLUMN work_logs.hours IS 'Hours worked (max 24 per day)';
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

