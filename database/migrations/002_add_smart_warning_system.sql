-- Migration: Smart Professional Warning System Enhancement
-- Description: Adds advanced warning intelligence, predictive analytics, and connected phase logic
-- Author: Professional Track Management System
-- Date: 2024

-- Enhanced Warning Analytics Table
CREATE TABLE warning_analytics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    warning_type VARCHAR(50) NOT NULL CHECK (warning_type IN (
        'timeline_deviation', 'budget_overrun', 'resource_conflict',
        'quality_gate_violation', 'client_approval_delay', 'dependency_blockage',
        'skill_gap', 'capacity_overload', 'early_access_abuse'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'urgent', 'warning', 'advisory')),
    confidence_score DECIMAL(5,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_probability DECIMAL(5,2) DEFAULT 0.0 CHECK (risk_probability >= 0 AND risk_probability <= 100),
    predicted_impact_days INTEGER DEFAULT 0,
    predicted_impact_cost DECIMAL(10,2) DEFAULT 0,
    warning_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Phase Dependencies Table (Connected Logic)
CREATE TABLE phase_dependencies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    predecessor_phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    successor_phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lag_days INTEGER DEFAULT 0,
    is_critical_path BOOLEAN DEFAULT false,
    weight_factor DECIMAL(3,2) DEFAULT 1.0 CHECK (weight_factor >= 0.1 AND weight_factor <= 2.0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(predecessor_phase_id, successor_phase_id)
);

-- Resource Predictions Table (Smart Analytics)
CREATE TABLE resource_predictions (
    id SERIAL PRIMARY KEY,
    engineer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER REFERENCES project_phases(id) ON DELETE CASCADE,
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN (
        'workload_forecast', 'burnout_risk', 'efficiency_trend',
        'skill_match_score', 'availability_conflict', 'performance_trajectory'
    )),
    predicted_value DECIMAL(10,3) NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 0.0 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    prediction_horizon_days INTEGER NOT NULL CHECK (prediction_horizon_days > 0),
    historical_accuracy DECIMAL(5,2) DEFAULT 0.0,
    algorithm_version VARCHAR(20) DEFAULT 'v1.0',
    prediction_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Project Timeline Forecasts (Predictive Intelligence)
CREATE TABLE project_timeline_forecasts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    forecast_type VARCHAR(25) NOT NULL CHECK (forecast_type IN ('optimistic', 'realistic', 'pessimistic', 'monte_carlo')),
    predicted_completion_date DATE NOT NULL,
    predicted_total_hours DECIMAL(10,2) NOT NULL,
    predicted_budget_variance DECIMAL(8,2) DEFAULT 0,
    confidence_interval_lower DATE,
    confidence_interval_upper DATE,
    risk_factors JSONB DEFAULT '[]',
    assumptions JSONB DEFAULT '[]',
    model_accuracy DECIMAL(5,2) DEFAULT 0.0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Critical Path Analysis (Connected Intelligence)
CREATE TABLE critical_path_analysis (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    critical_phases JSONB NOT NULL DEFAULT '[]',
    total_project_duration_days INTEGER NOT NULL,
    float_analysis JSONB DEFAULT '{}',
    bottleneck_phases JSONB DEFAULT '[]',
    optimization_suggestions JSONB DEFAULT '[]',
    risk_mitigation_plans JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart Notification Rules (Professional Logic)
CREATE TABLE smart_notification_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN (
        'threshold_based', 'pattern_based', 'predictive', 'cascade_triggered'
    )),
    target_roles VARCHAR(50)[] DEFAULT ARRAY['supervisor'],
    conditions JSONB NOT NULL DEFAULT '{}',
    action_template JSONB NOT NULL DEFAULT '{}',
    escalation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority_weight INTEGER DEFAULT 50 CHECK (priority_weight >= 1 AND priority_weight <= 100),
    cooldown_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes for Smart Queries
CREATE INDEX idx_warning_analytics_project_severity ON warning_analytics(project_id, severity, is_active);
CREATE INDEX idx_warning_analytics_type_confidence ON warning_analytics(warning_type, confidence_score DESC);
CREATE INDEX idx_phase_dependencies_critical_path ON phase_dependencies(project_id, is_critical_path);
CREATE INDEX idx_resource_predictions_engineer_type ON resource_predictions(engineer_id, prediction_type, expires_at);
CREATE INDEX idx_timeline_forecasts_project_confidence ON project_timeline_forecasts(project_id, forecast_type, created_at DESC);
CREATE INDEX idx_critical_path_analysis_date ON critical_path_analysis(project_id, analysis_date DESC);

-- Smart Functions for Connected Intelligence

-- Function: Calculate Phase Impact Score
CREATE OR REPLACE FUNCTION calculate_phase_impact_score(phase_id INTEGER)
RETURNS DECIMAL(8,3) AS $$
DECLARE
    impact_score DECIMAL(8,3) := 0;
    phase_record project_phases%ROWTYPE;
    dependency_count INTEGER;
    critical_path_weight DECIMAL(3,2);
BEGIN
    -- Get phase details
    SELECT * INTO phase_record FROM project_phases WHERE id = phase_id;

    -- Base impact from phase hours and duration
    impact_score := COALESCE(phase_record.predicted_hours, 0) * 0.1;

    -- Add dependency multiplier
    SELECT COUNT(*) INTO dependency_count
    FROM phase_dependencies
    WHERE predecessor_phase_id = phase_id;

    impact_score := impact_score * (1 + (dependency_count * 0.2));

    -- Critical path multiplier
    SELECT COALESCE(AVG(weight_factor), 1.0) INTO critical_path_weight
    FROM phase_dependencies
    WHERE predecessor_phase_id = phase_id AND is_critical_path = true;

    impact_score := impact_score * critical_path_weight;

    RETURN impact_score;
END;
$$ LANGUAGE plpgsql;

-- Function: Predict Project Completion Date
CREATE OR REPLACE FUNCTION predict_project_completion(project_id INTEGER, forecast_type VARCHAR DEFAULT 'realistic')
RETURNS DATE AS $$
DECLARE
    completion_date DATE;
    total_remaining_hours DECIMAL(10,2);
    average_daily_velocity DECIMAL(8,3);
    risk_buffer_days INTEGER := 0;
BEGIN
    -- Calculate remaining work
    SELECT COALESCE(SUM(GREATEST(predicted_hours - actual_hours, 0)), 0)
    INTO total_remaining_hours
    FROM project_phases
    WHERE project_id = $1 AND status NOT IN ('completed', 'approved');

    -- Calculate team velocity (last 30 days)
    SELECT COALESCE(AVG(daily_hours), 1.0) INTO average_daily_velocity
    FROM (
        SELECT DATE(created_at) as work_date, SUM(hours) as daily_hours
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE pp.project_id = $1
        AND wl.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
    ) daily_work;

    -- Apply forecast type adjustments
    CASE forecast_type
        WHEN 'optimistic' THEN
            average_daily_velocity := average_daily_velocity * 1.3;
            risk_buffer_days := 5;
        WHEN 'pessimistic' THEN
            average_daily_velocity := average_daily_velocity * 0.7;
            risk_buffer_days := 21;
        ELSE -- realistic
            risk_buffer_days := 10;
    END CASE;

    -- Calculate completion date
    completion_date := CURRENT_DATE +
        INTERVAL '1 day' * CEILING(total_remaining_hours / GREATEST(average_daily_velocity, 0.1)) +
        INTERVAL '1 day' * risk_buffer_days;

    RETURN completion_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Smart Warning
CREATE OR REPLACE FUNCTION generate_smart_warning(
    p_project_id INTEGER,
    p_warning_type VARCHAR,
    p_severity VARCHAR,
    p_confidence DECIMAL DEFAULT 85.0,
    p_data JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    warning_id INTEGER;
    existing_count INTEGER;
BEGIN
    -- Check for duplicate recent warnings (within 1 hour)
    SELECT COUNT(*) INTO existing_count
    FROM warning_analytics
    WHERE project_id = p_project_id
    AND warning_type = p_warning_type
    AND is_active = true
    AND created_at >= NOW() - INTERVAL '1 hour';

    -- Only create if no recent duplicate
    IF existing_count = 0 THEN
        INSERT INTO warning_analytics (
            project_id, warning_type, severity, confidence_score, warning_data
        ) VALUES (
            p_project_id, p_warning_type, p_severity, p_confidence, p_data
        ) RETURNING id INTO warning_id;

        RETURN warning_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Automatic Warning Generation

-- Trigger: Detect Budget Overruns
CREATE OR REPLACE FUNCTION trigger_budget_warning()
RETURNS TRIGGER AS $$
DECLARE
    project_utilization DECIMAL(5,2);
    project_predicted_hours DECIMAL(10,2);
BEGIN
    -- Get project predicted hours
    SELECT predicted_hours INTO project_predicted_hours
    FROM projects WHERE id = NEW.project_id;

    -- Calculate current utilization
    SELECT (SUM(wl.hours) / project_predicted_hours) * 100
    INTO project_utilization
    FROM work_logs wl
    JOIN project_phases pp ON wl.phase_id = pp.id
    WHERE pp.project_id = NEW.project_id;

    -- Generate warnings based on utilization
    IF project_utilization >= 100 THEN
        PERFORM generate_smart_warning(NEW.project_id, 'budget_overrun', 'critical', 95.0,
            json_build_object('utilization', project_utilization, 'trigger', 'work_log_update'));
    ELSIF project_utilization >= 90 THEN
        PERFORM generate_smart_warning(NEW.project_id, 'budget_overrun', 'urgent', 88.0,
            json_build_object('utilization', project_utilization, 'trigger', 'work_log_update'));
    ELSIF project_utilization >= 80 THEN
        PERFORM generate_smart_warning(NEW.project_id, 'budget_overrun', 'warning', 75.0,
            json_build_object('utilization', project_utilization, 'trigger', 'work_log_update'));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER smart_budget_warning_trigger
    AFTER INSERT OR UPDATE ON work_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_budget_warning();

-- Insert Default Smart Notification Rules
INSERT INTO smart_notification_rules (rule_name, rule_type, conditions, action_template) VALUES
('Critical Timeline Deviation', 'threshold_based',
 '{"threshold_days": 3, "severity": "critical", "warning_type": "timeline_deviation"}',
 '{"title": "Critical Timeline Alert", "urgency": "immediate", "escalation_hours": 2}'),

('Budget Overrun Prevention', 'predictive',
 '{"utilization_threshold": 85, "confidence_minimum": 80}',
 '{"title": "Budget Risk Alert", "urgency": "high", "include_suggestions": true}'),

('Resource Conflict Detection', 'pattern_based',
 '{"concurrent_projects": 2, "workload_threshold": 40}',
 '{"title": "Resource Conflict Warning", "urgency": "medium", "auto_suggest_reallocation": true}');

-- Comments for Professional Documentation
COMMENT ON TABLE warning_analytics IS 'Advanced warning system with confidence scoring and predictive analysis';
COMMENT ON TABLE phase_dependencies IS 'Phase relationship mapping for connected intelligence and cascade analysis';
COMMENT ON TABLE resource_predictions IS 'ML-powered resource forecasting with confidence intervals';
COMMENT ON TABLE project_timeline_forecasts IS 'Predictive project completion analysis with risk factors';
COMMENT ON TABLE critical_path_analysis IS 'Project critical path optimization and bottleneck identification';
COMMENT ON TABLE smart_notification_rules IS 'Configurable intelligent notification rules engine';

COMMENT ON FUNCTION calculate_phase_impact_score(INTEGER) IS 'Calculates weighted impact score considering dependencies and critical path';
COMMENT ON FUNCTION predict_project_completion(INTEGER, VARCHAR) IS 'AI-powered project completion date prediction with multiple scenario support';
COMMENT ON FUNCTION generate_smart_warning(INTEGER, VARCHAR, VARCHAR, DECIMAL, JSONB) IS 'Smart warning generation with duplicate prevention and confidence scoring';

-- Audit Log Entry
INSERT INTO audit_logs (entity_type, entity_id, action, note, timestamp)
VALUES ('database', 0, 'MIGRATION', 'Enhanced smart professional warning system with predictive analytics', NOW());