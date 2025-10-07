-- Migration: Add Manual Progress Tracking System
-- Description: Adds comprehensive manual progress adjustment feature allowing supervisors
--              to override automatic hour-based progress calculations with quality-based assessments

-- 1. Create work_logs table if it doesn't exist (core dependency)
CREATE TABLE IF NOT EXISTS work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    engineer_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description TEXT,
    supervisor_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for work_logs if they don't exist
CREATE INDEX IF NOT EXISTS idx_work_logs_project ON work_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_phase ON work_logs(phase_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_engineer ON work_logs(engineer_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(date DESC);

-- 2. Create progress_adjustments table to track all manual progress modifications
CREATE TABLE IF NOT EXISTS progress_adjustments (
    id SERIAL PRIMARY KEY,
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    engineer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_log_id UUID REFERENCES work_logs(id) ON DELETE SET NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('work_log_entry', 'phase_overall')),
    hours_logged DECIMAL(10,2) NOT NULL CHECK (hours_logged >= 0),
    hours_based_progress DECIMAL(5,2) NOT NULL CHECK (hours_based_progress >= 0 AND hours_based_progress <= 100),
    manual_progress_percentage DECIMAL(5,2) NOT NULL CHECK (manual_progress_percentage >= 0 AND manual_progress_percentage <= 100),
    adjustment_reason TEXT NOT NULL,
    adjusted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add progress tracking columns to work_logs table
ALTER TABLE work_logs
ADD COLUMN IF NOT EXISTS manual_progress_percentage DECIMAL(5,2) CHECK (manual_progress_percentage >= 0 AND manual_progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS progress_adjusted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS progress_adjusted_at TIMESTAMP;

-- 4. Add progress tracking columns to project_phases table
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS calculated_progress DECIMAL(5,2) DEFAULT 0 CHECK (calculated_progress >= 0 AND calculated_progress <= 100),
ADD COLUMN IF NOT EXISTS actual_progress DECIMAL(5,2) DEFAULT 0 CHECK (actual_progress >= 0 AND actual_progress <= 100),
ADD COLUMN IF NOT EXISTS progress_variance DECIMAL(6,2) DEFAULT 0;

-- 5. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_phase ON progress_adjustments(phase_id);
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_engineer ON progress_adjustments(engineer_id);
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_work_log ON progress_adjustments(work_log_id) WHERE work_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_type ON progress_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_created_at ON progress_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_progress ON work_logs(phase_id, engineer_id) WHERE manual_progress_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_phases_progress ON project_phases(project_id, actual_progress);

-- 6. Create function to calculate hours-based progress for a phase and engineer
CREATE OR REPLACE FUNCTION calculate_hours_based_progress(
    p_phase_id UUID,
    p_engineer_id UUID
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

-- 7. Create function to get actual progress (manual override or calculated)
CREATE OR REPLACE FUNCTION get_actual_progress(
    p_phase_id UUID,
    p_engineer_id UUID
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

-- 8. Create function to sync phase progress (aggregate from all engineers)
CREATE OR REPLACE FUNCTION sync_phase_progress(
    p_phase_id UUID
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

-- 9. Create trigger to auto-sync phase progress when work logs change
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

DROP TRIGGER IF EXISTS auto_sync_work_log_progress ON work_logs;
CREATE TRIGGER auto_sync_work_log_progress
    AFTER INSERT OR UPDATE OR DELETE ON work_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_phase_progress();

-- 10. Create trigger to auto-sync when progress adjustments are made
CREATE OR REPLACE FUNCTION trigger_sync_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_phase_progress(NEW.phase_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_sync_adjustment_progress ON progress_adjustments;
CREATE TRIGGER auto_sync_adjustment_progress
    AFTER INSERT ON progress_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_on_adjustment();

-- 11. Backfill existing phases with calculated progress
DO $$
DECLARE
    phase_record RECORD;
BEGIN
    FOR phase_record IN
        SELECT DISTINCT id FROM project_phases
    LOOP
        PERFORM sync_phase_progress(phase_record.id);
    END LOOP;
END $$;

-- 12. Add comments for documentation
COMMENT ON TABLE work_logs IS 'Engineer time tracking for project phases';
COMMENT ON TABLE progress_adjustments IS 'Tracks all manual progress adjustments made by supervisors';
COMMENT ON COLUMN progress_adjustments.adjustment_type IS 'Type of adjustment: work_log_entry (per log) or phase_overall (entire phase)';
COMMENT ON COLUMN progress_adjustments.hours_based_progress IS 'Calculated progress at time of adjustment';
COMMENT ON COLUMN progress_adjustments.manual_progress_percentage IS 'Supervisor-set manual progress';

COMMENT ON COLUMN work_logs.manual_progress_percentage IS 'Manual progress override for this work log entry';
COMMENT ON COLUMN work_logs.progress_notes IS 'Reason for progress adjustment';

COMMENT ON COLUMN project_phases.calculated_progress IS 'Automatic progress based on hours logged';
COMMENT ON COLUMN project_phases.actual_progress IS 'Actual progress (manual override or calculated)';
COMMENT ON COLUMN project_phases.progress_variance IS 'Difference between actual and calculated progress';

COMMENT ON FUNCTION calculate_hours_based_progress IS 'Calculates automatic progress percentage based on hours logged vs predicted';
COMMENT ON FUNCTION get_actual_progress IS 'Gets actual progress (manual override if exists, otherwise calculated)';
COMMENT ON FUNCTION sync_phase_progress IS 'Aggregates progress from all engineers and updates phase progress';

-- 13. Add audit log entry for migration (if audit_logs table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, note)
        VALUES ('database', 0, 'MIGRATION', 'Added manual progress tracking system with supervisor override capability');
    END IF;
END $$;

-- Migration complete
SELECT 'Migration 003: Manual Progress Tracking - Completed Successfully' as status;
