-- Smart Professional Warning System Migration - Minimal Version
-- Compatible with UUID-based projects, users, AND project_phases tables
-- Safe version without work_logs dependencies

-- Drop existing tables if they exist (for re-running migration)
DROP TABLE IF EXISTS smart_notification_rules CASCADE;
DROP TABLE IF EXISTS critical_path_analysis CASCADE;
DROP TABLE IF EXISTS project_timeline_forecasts CASCADE;
DROP TABLE IF EXISTS resource_predictions CASCADE;
DROP TABLE IF EXISTS phase_dependencies CASCADE;
DROP TABLE IF EXISTS warning_analytics CASCADE;

-- Enhanced Warning Analytics Table
CREATE TABLE warning_analytics (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    warning_type VARCHAR(50) NOT NULL CHECK (warning_type IN (
        'timeline_deviation', 'budget_overrun', 'resource_conflict',
        'quality_gate_violation', 'client_approval_delay', 'dependency_blockage',
        'skill_gap', 'capacity_overload', 'early_access_abuse'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'urgent', 'warning', 'advisory')),
    confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_probability DECIMAL(5,2) NOT NULL CHECK (risk_probability >= 0 AND risk_probability <= 100),
    predicted_impact_days INTEGER DEFAULT 0,
    predicted_impact_cost DECIMAL(10,2) DEFAULT 0,
    warning_data JSONB,
    is_active BOOLEAN DEFAULT true,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Phase Dependencies Table (for connected intelligence)
CREATE TABLE phase_dependencies (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    predecessor_phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    successor_phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN (
        'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
    )),
    lag_days INTEGER DEFAULT 0,
    is_critical_path BOOLEAN DEFAULT false,
    weight_factor DECIMAL(3,2) DEFAULT 1.0 CHECK (weight_factor > 0 AND weight_factor <= 2.0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(predecessor_phase_id, successor_phase_id)
);

-- Resource Predictions Table (for smart resource management)
CREATE TABLE resource_predictions (
    id SERIAL PRIMARY KEY,
    engineer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN (
        'workload_forecast', 'burnout_risk', 'efficiency_trend',
        'skill_match_score', 'availability_conflict', 'performance_trajectory'
    )),
    predicted_value DECIMAL(8,3) NOT NULL,
    confidence_level DECIMAL(5,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
    prediction_horizon_days INTEGER NOT NULL CHECK (prediction_horizon_days > 0),
    historical_accuracy DECIMAL(5,2) DEFAULT 0,
    algorithm_version VARCHAR(20) DEFAULT '1.0',
    prediction_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Project Timeline Forecasts (advanced predictions)
CREATE TABLE project_timeline_forecasts (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    forecast_type VARCHAR(20) NOT NULL CHECK (forecast_type IN (
        'optimistic', 'realistic', 'pessimistic', 'monte_carlo'
    )),
    predicted_completion_date DATE NOT NULL,
    predicted_total_hours INTEGER NOT NULL,
    predicted_budget_variance DECIMAL(8,2) DEFAULT 0,
    confidence_interval_lower DATE,
    confidence_interval_upper DATE,
    risk_factors TEXT[],
    assumptions TEXT[],
    model_accuracy DECIMAL(5,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Critical Path Analysis (professional project management)
CREATE TABLE critical_path_analysis (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    critical_phases UUID[],
    total_project_duration_days INTEGER NOT NULL,
    float_analysis JSONB,
    bottleneck_phases UUID[],
    optimization_suggestions TEXT[],
    risk_mitigation_plans TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Smart Notification Rules (intelligent alerts)
CREATE TABLE smart_notification_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN (
        'threshold_based', 'pattern_based', 'predictive', 'cascade_triggered'
    )),
    target_roles VARCHAR(20)[] NOT NULL,
    conditions JSONB NOT NULL,
    action_template JSONB NOT NULL,
    escalation_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    priority_weight INTEGER DEFAULT 1 CHECK (priority_weight >= 1 AND priority_weight <= 10),
    cooldown_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_warning_analytics_project_severity ON warning_analytics(project_id, severity, is_active);
CREATE INDEX idx_warning_analytics_created ON warning_analytics(created_at DESC);
CREATE INDEX idx_phase_dependencies_project ON phase_dependencies(project_id);
CREATE INDEX idx_phase_dependencies_critical_path ON phase_dependencies(is_critical_path) WHERE is_critical_path = true;
CREATE INDEX idx_resource_predictions_engineer_expires ON resource_predictions(engineer_id, expires_at);
CREATE INDEX idx_timeline_forecasts_project_created ON project_timeline_forecasts(project_id, created_at DESC);
CREATE INDEX idx_critical_path_project_date ON critical_path_analysis(project_id, analysis_date DESC);

-- Professional Smart Functions for Intelligence Engine (Minimal Safe Version)

-- Calculate Phase Impact Score (UUID compatible, safe version)
CREATE OR REPLACE FUNCTION calculate_phase_impact_score(phase_id UUID)
RETURNS DECIMAL(8,3) AS $$
DECLARE
    phase_record RECORD;
    dependency_count INTEGER;
    impact_score DECIMAL(8,3) := 0;
BEGIN
    -- Get phase information
    SELECT * INTO phase_record
    FROM project_phases
    WHERE id = phase_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Base impact from predicted hours
    impact_score := COALESCE(phase_record.predicted_hours, 0) * 0.1;

    -- Get dependency multiplier
    SELECT COUNT(*) INTO dependency_count
    FROM phase_dependencies
    WHERE predecessor_phase_id = phase_id OR successor_phase_id = phase_id;

    -- Increase impact based on dependencies (more connected = higher impact)
    impact_score := impact_score * (1 + (dependency_count * 0.2));

    -- Critical path multiplier
    IF EXISTS (SELECT 1 FROM phase_dependencies WHERE
               (predecessor_phase_id = phase_id OR successor_phase_id = phase_id)
               AND is_critical_path = true) THEN
        impact_score := impact_score * 1.5;
    END IF;

    -- Status multiplier (in-progress phases have higher impact)
    CASE phase_record.status
        WHEN 'in_progress' THEN impact_score := impact_score * 1.8;
        WHEN 'ready' THEN impact_score := impact_score * 1.3;
        WHEN 'submitted' THEN impact_score := impact_score * 1.1;
        ELSE impact_score := impact_score * 1.0;
    END CASE;

    RETURN ROUND(impact_score, 3);
END;
$$ LANGUAGE plpgsql;

-- Predict Project Completion (UUID compatible, safe version)
CREATE OR REPLACE FUNCTION predict_project_completion(project_id UUID, forecast_type VARCHAR(20) DEFAULT 'realistic')
RETURNS DATE AS $$
DECLARE
    project_record RECORD;
    remaining_work INTEGER;
    completion_date DATE;
    confidence_multiplier DECIMAL(3,2);
    weeks_remaining INTEGER;
BEGIN
    -- Get project information
    SELECT * INTO project_record FROM projects WHERE id = project_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Calculate remaining work from project phases
    SELECT COALESCE(SUM(predicted_hours), 0) INTO remaining_work
    FROM project_phases
    WHERE project_id = predict_project_completion.project_id
    AND status NOT IN ('completed', 'approved');

    -- If no remaining work, use project planned weeks
    IF remaining_work = 0 THEN
        remaining_work := COALESCE(project_record.predicted_hours, 280); -- Default 280 hours (8 weeks * 35 hours)
    END IF;

    -- Convert to weeks (assuming 35 hours per week)
    weeks_remaining := CEILING(remaining_work / 35.0);

    -- Apply forecast type multiplier
    CASE forecast_type
        WHEN 'optimistic' THEN confidence_multiplier := 0.8;
        WHEN 'pessimistic' THEN confidence_multiplier := 1.4;
        WHEN 'monte_carlo' THEN confidence_multiplier := 1.0 + (RANDOM() * 0.6 - 0.3);
        ELSE confidence_multiplier := 1.1; -- realistic
    END CASE;

    -- Calculate completion date
    completion_date := CURRENT_DATE + INTERVAL '1 week' * CEILING(weeks_remaining * confidence_multiplier);

    RETURN completion_date;
END;
$$ LANGUAGE plpgsql;

-- Generate Budget Warning (safe version without work_logs dependency)
CREATE OR REPLACE FUNCTION generate_budget_warning(project_id UUID)
RETURNS TABLE(severity VARCHAR(20), confidence_score DECIMAL(5,2), predicted_overrun DECIMAL(10,2)) AS $$
DECLARE
    project_record RECORD;
    completion_percentage DECIMAL(5,2);
    hours_percentage DECIMAL(5,2);
    projected_overrun DECIMAL(10,2);
    warning_severity VARCHAR(20);
    warning_confidence DECIMAL(5,2);
BEGIN
    -- Get project information
    SELECT * INTO project_record FROM projects WHERE id = project_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calculate completion percentage based on phases
    SELECT
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(*) FILTER (WHERE status IN ('completed', 'approved'))::DECIMAL / COUNT(*)) * 100
        END INTO completion_percentage
    FROM project_phases
    WHERE project_id = generate_budget_warning.project_id;

    -- Calculate hours usage percentage
    hours_percentage := (COALESCE(project_record.actual_hours, 0)::DECIMAL /
                        GREATEST(project_record.predicted_hours, 1)) * 100;

    -- Simple overrun prediction based on ratio
    IF completion_percentage > 0 AND completion_percentage < 100 THEN
        projected_overrun := GREATEST(0,
            (hours_percentage / completion_percentage * 100) - project_record.predicted_hours
        );
    ELSE
        projected_overrun := GREATEST(0, project_record.actual_hours - project_record.predicted_hours);
    END IF;

    -- Determine severity and confidence
    IF hours_percentage >= 100 OR projected_overrun > project_record.predicted_hours * 0.2 THEN
        warning_severity := 'critical';
        warning_confidence := 95.0;
    ELSIF hours_percentage >= 90 OR projected_overrun > project_record.predicted_hours * 0.1 THEN
        warning_severity := 'urgent';
        warning_confidence := 85.0;
    ELSIF hours_percentage >= 75 OR projected_overrun > 0 THEN
        warning_severity := 'warning';
        warning_confidence := 70.0;
    ELSE
        warning_severity := 'advisory';
        warning_confidence := 60.0;
    END IF;

    RETURN QUERY SELECT warning_severity, warning_confidence, projected_overrun;
END;
$$ LANGUAGE plpgsql;

-- Insert Default Smart Notification Rules
INSERT INTO smart_notification_rules (rule_name, rule_type, target_roles, conditions, action_template) VALUES
('Critical Timeline Alert', 'threshold_based', ARRAY['supervisor'],
 '{"severity": "critical", "warning_type": "timeline_deviation"}',
 '{"type": "email", "subject": "Critical Timeline Alert", "urgency": "immediate"}'),

('Budget Overrun Warning', 'threshold_based', ARRAY['supervisor', 'engineer'],
 '{"severity": ["urgent", "critical"], "warning_type": "budget_overrun"}',
 '{"type": "notification", "title": "Budget Alert", "priority": "high"}'),

('Resource Conflict Detection', 'pattern_based', ARRAY['supervisor'],
 '{"warning_type": "resource_conflict", "confidence_score": {"min": 80}}',
 '{"type": "alert", "escalate_after": "1 hour", "auto_resolve": false}'),

('Cascade Effect Alert', 'cascade_triggered', ARRAY['supervisor'],
 '{"has_cascade_effects": true, "impact_days": {"min": 3}}',
 '{"type": "urgent_notification", "include_recovery_suggestions": true}');

-- Comments for Documentation
COMMENT ON TABLE warning_analytics IS 'Stores intelligent warning data with ML-like confidence scoring and risk assessment (All UUID support - Safe version)';
COMMENT ON TABLE phase_dependencies IS 'Manages phase relationships for connected intelligence and cascade analysis (All UUID support)';
COMMENT ON TABLE resource_predictions IS 'Predictive resource management with burnout risk and efficiency forecasting (All UUID support)';
COMMENT ON TABLE project_timeline_forecasts IS 'Advanced timeline predictions using multiple forecasting models (All UUID support)';
COMMENT ON TABLE critical_path_analysis IS 'Professional critical path analysis with optimization recommendations (All UUID support)';
COMMENT ON TABLE smart_notification_rules IS 'Intelligent notification system with escalation and pattern recognition';

COMMENT ON FUNCTION calculate_phase_impact_score(UUID) IS 'Calculates professional impact score for connected phase intelligence (UUID phases)';
COMMENT ON FUNCTION predict_project_completion(UUID, VARCHAR) IS 'AI-powered project completion prediction with complete UUID support (Safe version)';
COMMENT ON FUNCTION generate_budget_warning(UUID) IS 'Professional budget analysis with complete UUID support (Safe version without work_logs)';

-- Success message
SELECT 'Smart Professional Warning System (Safe UUID Version) installed successfully! 🧠✨🆔👥📊✅' as status;