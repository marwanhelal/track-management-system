--
-- PostgreSQL database dump
--

\restrict L3Rp8ZTwDeluixajzEUBz6dULqGuKAZbOojV8AOWBkSeeOpJlb9nwt3aduqNGJ1

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit_table_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_table_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.audit_table_changes() OWNER TO postgres;

--
-- Name: calculate_hours_based_progress(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_hours_based_progress(p_phase_id integer, p_engineer_id integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
      DECLARE
        v_total_hours DECIMAL;
        v_predicted_hours DECIMAL;
        v_progress DECIMAL;
      BEGIN
        SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
        FROM work_logs
        WHERE phase_id = p_phase_id AND engineer_id = p_engineer_id;

        SELECT COALESCE(predicted_hours, 1) INTO v_predicted_hours
        FROM project_phases WHERE id = p_phase_id;

        IF v_predicted_hours = 0 THEN
          v_predicted_hours := 1;
        END IF;

        v_progress := LEAST((v_total_hours / v_predicted_hours) * 100, 100);

        RETURN ROUND(v_progress, 2);
      END;
      $$;


ALTER FUNCTION public.calculate_hours_based_progress(p_phase_id integer, p_engineer_id integer) OWNER TO postgres;

--
-- Name: calculate_phase_impact_score(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_phase_impact_score(phase_id integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_phase_impact_score(phase_id integer) OWNER TO postgres;

--
-- Name: FUNCTION calculate_phase_impact_score(phase_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calculate_phase_impact_score(phase_id integer) IS 'Calculates weighted impact score considering dependencies and critical path';


--
-- Name: cleanup_expired_notifications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_notifications() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_notifications() OWNER TO postgres;

--
-- Name: generate_smart_warning(integer, character varying, character varying, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_smart_warning(p_project_id integer, p_warning_type character varying, p_severity character varying, p_confidence numeric DEFAULT 85.0, p_data jsonb DEFAULT '{}'::jsonb) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_smart_warning(p_project_id integer, p_warning_type character varying, p_severity character varying, p_confidence numeric, p_data jsonb) OWNER TO postgres;

--
-- Name: FUNCTION generate_smart_warning(p_project_id integer, p_warning_type character varying, p_severity character varying, p_confidence numeric, p_data jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generate_smart_warning(p_project_id integer, p_warning_type character varying, p_severity character varying, p_confidence numeric, p_data jsonb) IS 'Smart warning generation with duplicate prevention and confidence scoring';


--
-- Name: get_actual_progress(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_actual_progress(p_phase_id integer, p_engineer_id integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
      DECLARE
        v_manual_progress DECIMAL;
      BEGIN
        -- ONLY check progress_adjustments table
        SELECT manual_progress_percentage INTO v_manual_progress
        FROM progress_adjustments
        WHERE phase_id = p_phase_id
          AND engineer_id = p_engineer_id
          AND adjustment_type = 'phase_overall'
        ORDER BY created_at DESC
        LIMIT 1;

        -- If found, return it
        IF v_manual_progress IS NOT NULL THEN
          RETURN v_manual_progress;
        END IF;

        -- Otherwise return calculated
        RETURN calculate_hours_based_progress(p_phase_id, p_engineer_id);
      END;
      $$;


ALTER FUNCTION public.get_actual_progress(p_phase_id integer, p_engineer_id integer) OWNER TO postgres;

--
-- Name: predict_project_completion(integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.predict_project_completion(project_id integer, forecast_type character varying DEFAULT 'realistic'::character varying) RETURNS date
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.predict_project_completion(project_id integer, forecast_type character varying) OWNER TO postgres;

--
-- Name: FUNCTION predict_project_completion(project_id integer, forecast_type character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.predict_project_completion(project_id integer, forecast_type character varying) IS 'AI-powered project completion date prediction with multiple scenario support';


--
-- Name: sync_phase_progress(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_phase_progress(p_phase_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
      DECLARE
        v_avg_calculated DECIMAL;
        v_avg_actual DECIMAL;
        v_variance DECIMAL;
      BEGIN
        SELECT COALESCE(AVG(calculate_hours_based_progress(p_phase_id, u.id)), 0)
        INTO v_avg_calculated
        FROM users u
        WHERE u.role = 'engineer'
          AND EXISTS (SELECT 1 FROM work_logs WHERE phase_id = p_phase_id AND engineer_id = u.id);

        SELECT COALESCE(AVG(get_actual_progress(p_phase_id, u.id)), 0)
        INTO v_avg_actual
        FROM users u
        WHERE u.role = 'engineer'
          AND EXISTS (SELECT 1 FROM work_logs WHERE phase_id = p_phase_id AND engineer_id = u.id);

        v_variance := v_avg_actual - v_avg_calculated;

        UPDATE project_phases
        SET calculated_progress = ROUND(v_avg_calculated, 2),
            actual_progress = ROUND(v_avg_actual, 2),
            progress_variance = ROUND(v_variance, 2),
            updated_at = NOW()
        WHERE id = p_phase_id;
      END;
      $$;


ALTER FUNCTION public.sync_phase_progress(p_phase_id integer) OWNER TO postgres;

--
-- Name: trigger_budget_warning(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_budget_warning() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_budget_warning() OWNER TO postgres;

--
-- Name: update_project_actual_hours(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_project_actual_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_project_actual_hours() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_user_notification_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_notification_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_notification_settings_updated_at() OWNER TO postgres;

--
-- Name: update_user_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_preferences_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(100) NOT NULL,
    user_id integer,
    old_values jsonb,
    new_values jsonb,
    note text,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Complete history of all system changes';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: critical_path_analysis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.critical_path_analysis (
    id integer NOT NULL,
    project_id integer NOT NULL,
    analysis_date date DEFAULT CURRENT_DATE NOT NULL,
    critical_phases jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_project_duration_days integer NOT NULL,
    float_analysis jsonb DEFAULT '{}'::jsonb,
    bottleneck_phases jsonb DEFAULT '[]'::jsonb,
    optimization_suggestions jsonb DEFAULT '[]'::jsonb,
    risk_mitigation_plans jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.critical_path_analysis OWNER TO postgres;

--
-- Name: TABLE critical_path_analysis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.critical_path_analysis IS 'Project critical path optimization and bottleneck identification';


--
-- Name: critical_path_analysis_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.critical_path_analysis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.critical_path_analysis_id_seq OWNER TO postgres;

--
-- Name: critical_path_analysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.critical_path_analysis_id_seq OWNED BY public.critical_path_analysis.id;


--
-- Name: project_phases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_phases (
    id integer NOT NULL,
    project_id integer NOT NULL,
    phase_order integer NOT NULL,
    phase_name character varying(100) NOT NULL,
    is_custom boolean DEFAULT false,
    planned_weeks integer NOT NULL,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    status character varying(20) DEFAULT 'not_started'::character varying,
    delay_reason character varying(20) DEFAULT 'none'::character varying,
    warning_flag boolean DEFAULT false,
    predicted_hours integer,
    actual_hours integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    early_access_granted boolean DEFAULT false,
    early_access_status character varying(20) DEFAULT 'not_accessible'::character varying,
    early_access_granted_by integer,
    early_access_granted_at timestamp without time zone,
    early_access_note text,
    calculated_progress numeric(5,2) DEFAULT 0,
    actual_progress numeric(5,2) DEFAULT 0,
    progress_variance numeric(6,2) DEFAULT 0,
    submitted_date date,
    approved_date date,
    CONSTRAINT project_phases_actual_hours_check CHECK ((actual_hours >= 0)),
    CONSTRAINT project_phases_actual_progress_check CHECK (((actual_progress >= (0)::numeric) AND (actual_progress <= (100)::numeric))),
    CONSTRAINT project_phases_calculated_progress_check CHECK (((calculated_progress >= (0)::numeric) AND (calculated_progress <= (100)::numeric))),
    CONSTRAINT project_phases_delay_reason_check CHECK (((delay_reason)::text = ANY ((ARRAY['none'::character varying, 'client'::character varying, 'company'::character varying])::text[]))),
    CONSTRAINT project_phases_early_access_status_check CHECK (((early_access_status)::text = ANY ((ARRAY['not_accessible'::character varying, 'accessible'::character varying, 'in_progress'::character varying, 'work_completed'::character varying])::text[]))),
    CONSTRAINT project_phases_phase_order_check CHECK ((phase_order > 0)),
    CONSTRAINT project_phases_planned_weeks_check CHECK ((planned_weeks > 0)),
    CONSTRAINT project_phases_predicted_hours_check CHECK ((predicted_hours >= 0)),
    CONSTRAINT project_phases_status_check CHECK (((status)::text = ANY ((ARRAY['not_started'::character varying, 'ready'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'approved'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.project_phases OWNER TO postgres;

--
-- Name: TABLE project_phases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_phases IS 'Selected phases for each project with workflow status';


--
-- Name: COLUMN project_phases.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.status IS 'Workflow status: not_started -> ready -> in_progress -> submitted -> approved -> completed';


--
-- Name: COLUMN project_phases.delay_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.delay_reason IS 'Delay attribution: none, client, company';


--
-- Name: COLUMN project_phases.early_access_granted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted IS 'Whether supervisor has granted early access to this phase';


--
-- Name: COLUMN project_phases.early_access_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_status IS 'Work status for early access: not_accessible, accessible, in_progress, work_completed';


--
-- Name: COLUMN project_phases.early_access_granted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted_by IS 'Supervisor who granted early access permission';


--
-- Name: COLUMN project_phases.early_access_granted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted_at IS 'Timestamp when early access was granted';


--
-- Name: COLUMN project_phases.early_access_note; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_note IS 'Supervisor note explaining reason for early access';


--
-- Name: COLUMN project_phases.submitted_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.submitted_date IS 'Date when the phase was submitted to the client for review';


--
-- Name: COLUMN project_phases.approved_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.approved_date IS 'Date when the client approved the phase';


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    planned_total_weeks integer NOT NULL,
    predicted_hours integer NOT NULL,
    actual_hours integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    archived_at timestamp without time zone,
    archived_by integer,
    CONSTRAINT projects_actual_hours_check CHECK ((actual_hours >= 0)),
    CONSTRAINT projects_planned_total_weeks_check CHECK ((planned_total_weeks > 0)),
    CONSTRAINT projects_predicted_hours_check CHECK ((predicted_hours > 0)),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_hold'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.projects IS 'Main projects table with timeline and hour tracking';


--
-- Name: COLUMN projects.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.status IS 'Overall project status: active, on_hold, completed, cancelled';


--
-- Name: COLUMN projects.archived_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.archived_at IS 'Timestamp when project was archived by supervisor';


--
-- Name: COLUMN projects.archived_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.archived_by IS 'ID of supervisor who archived the project';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_super_admin boolean DEFAULT false,
    job_description character varying(100),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['supervisor'::character varying, 'engineer'::character varying, 'administrator'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'System users - engineers and supervisors';


--
-- Name: work_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_logs (
    id integer NOT NULL,
    project_id integer NOT NULL,
    phase_id integer NOT NULL,
    engineer_id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    hours numeric(4,2) NOT NULL,
    description text,
    supervisor_approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT work_logs_hours_check CHECK ((hours > (0)::numeric))
);


ALTER TABLE public.work_logs OWNER TO postgres;

--
-- Name: TABLE work_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.work_logs IS 'Engineer time tracking entries per phase';


--
-- Name: COLUMN work_logs.hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.work_logs.hours IS 'Hours worked (max 24 per day)';


--
-- Name: engineer_work_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.engineer_work_summary AS
 SELECT u.id AS engineer_id,
    u.name AS engineer_name,
    p.id AS project_id,
    p.name AS project_name,
    pp.id AS phase_id,
    pp.phase_name,
    sum(wl.hours) AS total_hours,
    count(wl.id) AS log_entries,
    min(wl.date) AS first_log_date,
    max(wl.date) AS last_log_date
   FROM (((public.users u
     LEFT JOIN public.work_logs wl ON ((u.id = wl.engineer_id)))
     LEFT JOIN public.projects p ON ((wl.project_id = p.id)))
     LEFT JOIN public.project_phases pp ON ((wl.phase_id = pp.id)))
  WHERE ((u.role)::text = 'engineer'::text)
  GROUP BY u.id, u.name, p.id, p.name, pp.id, pp.phase_name;


ALTER VIEW public.engineer_work_summary OWNER TO postgres;

--
-- Name: VIEW engineer_work_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.engineer_work_summary IS 'Engineer productivity and work allocation summary';


--
-- Name: phase_dependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phase_dependencies (
    id integer NOT NULL,
    project_id integer NOT NULL,
    predecessor_phase_id integer NOT NULL,
    successor_phase_id integer NOT NULL,
    dependency_type character varying(20) NOT NULL,
    lag_days integer DEFAULT 0,
    is_critical_path boolean DEFAULT false,
    weight_factor numeric(3,2) DEFAULT 1.0,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT phase_dependencies_dependency_type_check CHECK (((dependency_type)::text = ANY ((ARRAY['finish_to_start'::character varying, 'start_to_start'::character varying, 'finish_to_finish'::character varying, 'start_to_finish'::character varying])::text[]))),
    CONSTRAINT phase_dependencies_weight_factor_check CHECK (((weight_factor >= 0.1) AND (weight_factor <= 2.0)))
);


ALTER TABLE public.phase_dependencies OWNER TO postgres;

--
-- Name: TABLE phase_dependencies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.phase_dependencies IS 'Phase relationship mapping for connected intelligence and cascade analysis';


--
-- Name: phase_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.phase_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.phase_dependencies_id_seq OWNER TO postgres;

--
-- Name: phase_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.phase_dependencies_id_seq OWNED BY public.phase_dependencies.id;


--
-- Name: predefined_phases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.predefined_phases (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    typical_duration_weeks integer DEFAULT 1,
    display_order integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.predefined_phases OWNER TO postgres;

--
-- Name: TABLE predefined_phases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.predefined_phases IS 'Architecture-specific predefined project phases';


--
-- Name: predefined_phases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.predefined_phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.predefined_phases_id_seq OWNER TO postgres;

--
-- Name: predefined_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.predefined_phases_id_seq OWNED BY public.predefined_phases.id;


--
-- Name: progress_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_adjustments (
    id integer NOT NULL,
    phase_id integer NOT NULL,
    engineer_id integer NOT NULL,
    work_log_id integer,
    adjustment_type character varying(20) NOT NULL,
    hours_logged numeric(10,2) NOT NULL,
    hours_based_progress numeric(5,2) NOT NULL,
    manual_progress_percentage numeric(5,2) NOT NULL,
    adjustment_reason text NOT NULL,
    adjusted_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT progress_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY ((ARRAY['work_log_entry'::character varying, 'phase_overall'::character varying])::text[]))),
    CONSTRAINT progress_adjustments_hours_based_progress_check CHECK (((hours_based_progress >= (0)::numeric) AND (hours_based_progress <= (100)::numeric))),
    CONSTRAINT progress_adjustments_hours_logged_check CHECK ((hours_logged >= (0)::numeric)),
    CONSTRAINT progress_adjustments_manual_progress_percentage_check CHECK (((manual_progress_percentage >= (0)::numeric) AND (manual_progress_percentage <= (100)::numeric)))
);


ALTER TABLE public.progress_adjustments OWNER TO postgres;

--
-- Name: progress_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.progress_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.progress_adjustments_id_seq OWNER TO postgres;

--
-- Name: progress_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.progress_adjustments_id_seq OWNED BY public.progress_adjustments.id;


--
-- Name: project_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.project_overview AS
 SELECT p.id,
    p.name,
    p.start_date,
    p.planned_total_weeks,
    p.predicted_hours,
    p.actual_hours,
    p.status,
    u.name AS created_by_name,
    count(pp.id) AS total_phases,
    count(
        CASE
            WHEN ((pp.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_phases,
    round((((count(
        CASE
            WHEN ((pp.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (count(pp.id))::numeric), 2) AS completion_percentage,
        CASE
            WHEN (count(
            CASE
                WHEN (pp.warning_flag = true) THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'warning'::text
            WHEN (count(
            CASE
                WHEN ((pp.delay_reason)::text = 'client'::text) THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'client_delayed'::text
            WHEN (count(
            CASE
                WHEN ((pp.delay_reason)::text = 'company'::text) THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'company_delayed'::text
            ELSE 'on_schedule'::text
        END AS delay_status,
    ( SELECT pp2.phase_name
           FROM public.project_phases pp2
          WHERE ((pp2.project_id = p.id) AND ((pp2.status)::text = ANY ((ARRAY['ready'::character varying, 'in_progress'::character varying, 'submitted'::character varying])::text[])))
          ORDER BY pp2.phase_order
         LIMIT 1) AS current_phase
   FROM ((public.projects p
     LEFT JOIN public.users u ON ((p.created_by = u.id)))
     LEFT JOIN public.project_phases pp ON ((p.id = pp.project_id)))
  GROUP BY p.id, p.name, p.start_date, p.planned_total_weeks, p.predicted_hours, p.actual_hours, p.status, u.name;


ALTER VIEW public.project_overview OWNER TO postgres;

--
-- Name: VIEW project_overview; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.project_overview IS 'Comprehensive project overview for dashboard display';


--
-- Name: project_phases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_phases_id_seq OWNER TO postgres;

--
-- Name: project_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_phases_id_seq OWNED BY public.project_phases.id;


--
-- Name: project_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_settings (
    id integer NOT NULL,
    project_id integer NOT NULL,
    auto_advance_enabled boolean DEFAULT true,
    allow_timeline_mismatch boolean DEFAULT false,
    notification_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.project_settings OWNER TO postgres;

--
-- Name: TABLE project_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_settings IS 'Per-project configuration settings';


--
-- Name: project_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_settings_id_seq OWNER TO postgres;

--
-- Name: project_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_settings_id_seq OWNED BY public.project_settings.id;


--
-- Name: project_timeline_forecasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_timeline_forecasts (
    id integer NOT NULL,
    project_id integer NOT NULL,
    forecast_type character varying(25) NOT NULL,
    predicted_completion_date date NOT NULL,
    predicted_total_hours numeric(10,2) NOT NULL,
    predicted_budget_variance numeric(8,2) DEFAULT 0,
    confidence_interval_lower date,
    confidence_interval_upper date,
    risk_factors jsonb DEFAULT '[]'::jsonb,
    assumptions jsonb DEFAULT '[]'::jsonb,
    model_accuracy numeric(5,2) DEFAULT 0.0,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT project_timeline_forecasts_forecast_type_check CHECK (((forecast_type)::text = ANY ((ARRAY['optimistic'::character varying, 'realistic'::character varying, 'pessimistic'::character varying, 'monte_carlo'::character varying])::text[])))
);


ALTER TABLE public.project_timeline_forecasts OWNER TO postgres;

--
-- Name: TABLE project_timeline_forecasts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_timeline_forecasts IS 'Predictive project completion analysis with risk factors';


--
-- Name: project_timeline_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_timeline_forecasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_timeline_forecasts_id_seq OWNER TO postgres;

--
-- Name: project_timeline_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_timeline_forecasts_id_seq OWNED BY public.project_timeline_forecasts.id;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: resource_predictions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_predictions (
    id integer NOT NULL,
    engineer_id integer NOT NULL,
    project_id integer,
    phase_id integer,
    prediction_type character varying(30) NOT NULL,
    predicted_value numeric(10,3) NOT NULL,
    confidence_level numeric(5,2) DEFAULT 0.0,
    prediction_horizon_days integer NOT NULL,
    historical_accuracy numeric(5,2) DEFAULT 0.0,
    algorithm_version character varying(20) DEFAULT 'v1.0'::character varying,
    prediction_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    CONSTRAINT resource_predictions_confidence_level_check CHECK (((confidence_level >= (0)::numeric) AND (confidence_level <= (100)::numeric))),
    CONSTRAINT resource_predictions_prediction_horizon_days_check CHECK ((prediction_horizon_days > 0)),
    CONSTRAINT resource_predictions_prediction_type_check CHECK (((prediction_type)::text = ANY ((ARRAY['workload_forecast'::character varying, 'burnout_risk'::character varying, 'efficiency_trend'::character varying, 'skill_match_score'::character varying, 'availability_conflict'::character varying, 'performance_trajectory'::character varying])::text[])))
);


ALTER TABLE public.resource_predictions OWNER TO postgres;

--
-- Name: TABLE resource_predictions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.resource_predictions IS 'ML-powered resource forecasting with confidence intervals';


--
-- Name: resource_predictions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resource_predictions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_predictions_id_seq OWNER TO postgres;

--
-- Name: resource_predictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resource_predictions_id_seq OWNED BY public.resource_predictions.id;


--
-- Name: smart_notification_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.smart_notification_rules (
    id integer NOT NULL,
    rule_name character varying(100) NOT NULL,
    rule_type character varying(30) NOT NULL,
    target_roles character varying(50)[] DEFAULT ARRAY['supervisor'::text],
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    action_template jsonb DEFAULT '{}'::jsonb NOT NULL,
    escalation_rules jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    priority_weight integer DEFAULT 50,
    cooldown_minutes integer DEFAULT 60,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT smart_notification_rules_priority_weight_check CHECK (((priority_weight >= 1) AND (priority_weight <= 100))),
    CONSTRAINT smart_notification_rules_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['threshold_based'::character varying, 'pattern_based'::character varying, 'predictive'::character varying, 'cascade_triggered'::character varying])::text[])))
);


ALTER TABLE public.smart_notification_rules OWNER TO postgres;

--
-- Name: TABLE smart_notification_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.smart_notification_rules IS 'Configurable intelligent notification rules engine';


--
-- Name: smart_notification_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.smart_notification_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.smart_notification_rules_id_seq OWNER TO postgres;

--
-- Name: smart_notification_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.smart_notification_rules_id_seq OWNED BY public.smart_notification_rules.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_updates boolean DEFAULT true,
    project_status_changes boolean DEFAULT true,
    phase_completions boolean DEFAULT true,
    phase_approvals boolean DEFAULT true,
    phase_submissions boolean DEFAULT true,
    smart_warnings boolean DEFAULT true,
    warning_criticality_threshold character varying(20) DEFAULT 'medium'::character varying,
    team_activity boolean DEFAULT true,
    engineer_assignments boolean DEFAULT true,
    engineer_work_logs boolean DEFAULT true,
    team_performance_reports boolean DEFAULT false,
    work_log_reminders boolean DEFAULT true,
    work_log_reminder_time time without time zone DEFAULT '16:00:00'::time without time zone,
    daily_work_summary boolean DEFAULT false,
    deadline_alerts boolean DEFAULT true,
    deadline_alert_days_before integer DEFAULT 3,
    phase_start_reminders boolean DEFAULT true,
    early_access_granted boolean DEFAULT true,
    early_access_requests boolean DEFAULT true,
    system_maintenance boolean DEFAULT true,
    feature_updates boolean DEFAULT false,
    security_alerts boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    browser_push_enabled boolean DEFAULT false,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_notification_settings_warning_criticality_threshold_check CHECK (((warning_criticality_threshold)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.user_notification_settings OWNER TO postgres;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notification_settings_id_seq OWNER TO postgres;

--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    theme_mode character varying(20) DEFAULT 'light'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    date_format character varying(20) DEFAULT 'MM/DD/YYYY'::character varying,
    notification_email boolean DEFAULT true,
    notification_in_app boolean DEFAULT true,
    notification_digest_frequency character varying(20) DEFAULT 'instant'::character varying,
    default_view character varying(50) DEFAULT 'grid'::character varying,
    items_per_page integer DEFAULT 20,
    auto_refresh_enabled boolean DEFAULT true,
    auto_refresh_interval integer DEFAULT 30,
    default_export_format character varying(10) DEFAULT 'pdf'::character varying,
    default_time_entry_format character varying(20) DEFAULT 'decimal'::character varying,
    quick_time_shortcuts jsonb DEFAULT '[]'::jsonb,
    work_log_reminders boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_preferences_default_export_format_check CHECK (((default_export_format)::text = ANY ((ARRAY['pdf'::character varying, 'csv'::character varying, 'excel'::character varying])::text[]))),
    CONSTRAINT user_preferences_notification_digest_frequency_check CHECK (((notification_digest_frequency)::text = ANY ((ARRAY['instant'::character varying, 'daily'::character varying, 'weekly'::character varying, 'never'::character varying])::text[]))),
    CONSTRAINT user_preferences_theme_mode_check CHECK (((theme_mode)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::text[])))
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_preferences_id_seq OWNER TO postgres;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warning_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warning_analytics (
    id integer NOT NULL,
    project_id integer NOT NULL,
    warning_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    confidence_score numeric(5,2) DEFAULT 0.0,
    risk_probability numeric(5,2) DEFAULT 0.0,
    predicted_impact_days integer DEFAULT 0,
    predicted_impact_cost numeric(10,2) DEFAULT 0,
    warning_data jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    resolved_at timestamp without time zone,
    resolved_by integer,
    resolution_note text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT warning_analytics_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (100)::numeric))),
    CONSTRAINT warning_analytics_risk_probability_check CHECK (((risk_probability >= (0)::numeric) AND (risk_probability <= (100)::numeric))),
    CONSTRAINT warning_analytics_severity_check CHECK (((severity)::text = ANY ((ARRAY['critical'::character varying, 'urgent'::character varying, 'warning'::character varying, 'advisory'::character varying])::text[]))),
    CONSTRAINT warning_analytics_warning_type_check CHECK (((warning_type)::text = ANY ((ARRAY['timeline_deviation'::character varying, 'budget_overrun'::character varying, 'resource_conflict'::character varying, 'quality_gate_violation'::character varying, 'client_approval_delay'::character varying, 'dependency_blockage'::character varying, 'skill_gap'::character varying, 'capacity_overload'::character varying, 'early_access_abuse'::character varying])::text[])))
);


ALTER TABLE public.warning_analytics OWNER TO postgres;

--
-- Name: TABLE warning_analytics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.warning_analytics IS 'Advanced warning system with confidence scoring and predictive analysis';


--
-- Name: warning_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warning_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warning_analytics_id_seq OWNER TO postgres;

--
-- Name: warning_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warning_analytics_id_seq OWNED BY public.warning_analytics.id;


--
-- Name: work_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_logs_id_seq OWNER TO postgres;

--
-- Name: work_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_logs_id_seq OWNED BY public.work_logs.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: critical_path_analysis id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critical_path_analysis ALTER COLUMN id SET DEFAULT nextval('public.critical_path_analysis_id_seq'::regclass);


--
-- Name: phase_dependencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies ALTER COLUMN id SET DEFAULT nextval('public.phase_dependencies_id_seq'::regclass);


--
-- Name: predefined_phases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.predefined_phases ALTER COLUMN id SET DEFAULT nextval('public.predefined_phases_id_seq'::regclass);


--
-- Name: progress_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments ALTER COLUMN id SET DEFAULT nextval('public.progress_adjustments_id_seq'::regclass);


--
-- Name: project_phases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases ALTER COLUMN id SET DEFAULT nextval('public.project_phases_id_seq'::regclass);


--
-- Name: project_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_settings ALTER COLUMN id SET DEFAULT nextval('public.project_settings_id_seq'::regclass);


--
-- Name: project_timeline_forecasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline_forecasts ALTER COLUMN id SET DEFAULT nextval('public.project_timeline_forecasts_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: resource_predictions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions ALTER COLUMN id SET DEFAULT nextval('public.resource_predictions_id_seq'::regclass);


--
-- Name: smart_notification_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_notification_rules ALTER COLUMN id SET DEFAULT nextval('public.smart_notification_rules_id_seq'::regclass);


--
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warning_analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warning_analytics ALTER COLUMN id SET DEFAULT nextval('public.warning_analytics_id_seq'::regclass);


--
-- Name: work_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs ALTER COLUMN id SET DEFAULT nextval('public.work_logs_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") FROM stdin;
34	users	12	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-18 17:16:24.533407
35	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:37.733844
36	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:46.198411
37	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:50.605413
38	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:51.564709
39	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:52.59143
40	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:16:56.407674
41	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:21:44.922493
42	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-18 17:44:58.390836
43	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 17:45:01.88338
44	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-18 17:45:07.742695
46	users	12	LOGIN	12	\N	\N	User logged in	2025-09-18 22:21:25.992868
47	projects	3	CREATE	12	\N	\N	Project created with 10 phases	2025-09-18 22:28:44.650671
48	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 04:01:08.806325
49	projects	3	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:33:05.126753
50	projects	2	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:33:08.63509
51	projects	1	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:33:11.583369
52	projects	3	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:33:26.423896
53	projects	3	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:33:49.513622
54	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-19 19:35:08.887746
55	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 19:35:11.089311
56	projects	2	DELETE	12	\N	\N	Project soft deleted (status set to cancelled)	2025-09-19 19:36:51.150459
57	projects	4	CREATE	12	\N	\N	Project created with 5 phases	2025-09-19 19:38:35.968854
58	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-19 19:41:29.544646
59	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 19:41:54.354452
60	project_phases	24	START	12	\N	\N	Phase started	2025-09-19 20:12:35.244054
61	project_phases	24	SUBMIT	12	\N	\N	Phase submitted to client	2025-09-19 20:12:44.339119
62	project_phases	25	UNLOCK	12	\N	\N	Phase unlocked after phase 1 approval	2025-09-19 20:13:12.37524
63	project_phases	24	APPROVE	12	\N	\N	Phase approved after client acceptance	2025-09-19 20:13:12.37524
64	users	5	DELETE	12	\N	\N	User account deactivated: emily.wilson@trackms.com	2025-09-19 20:14:00.656255
65	users	5	REACTIVATE	12	\N	\N	User account reactivated: emily.wilson@trackms.com	2025-09-19 20:18:08.940899
66	users	4	DELETE	12	\N	\N	User account permanently deleted: mike.davis@trackms.com	2025-09-19 20:18:33.860734
67	users	5	DELETE	12	\N	\N	User account permanently deleted: emily.wilson@trackms.com	2025-09-19 20:24:48.421396
68	users	3	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: sarah.johnson@trackms.com	2025-09-19 20:28:33.365869
69	users	14	CREATE_ENGINEER	12	\N	\N	Engineer account created for: zico@gmail.com	2025-09-19 20:29:12.859691
70	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-19 20:29:22.899238
71	users	14	LOGIN	14	\N	\N	User logged in	2025-09-19 20:29:24.825596
72	project_phases	25	START	14	\N	\N	Phase started automatically when first work log was created	2025-09-19 20:30:18.924434
73	work_logs	6	CREATE	14	\N	\N	Logged 3 hours on Concept Generation	2025-09-19 20:30:18.925779
74	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-19 20:30:41.033635
75	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 20:30:46.407479
76	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-19 20:37:29.686267
77	users	14	LOGIN	14	\N	\N	User logged in	2025-09-19 20:37:33.616536
1	projects	1	INSERT	12	\N	\N	Sample project created during system setup	2025-09-17 15:29:13.902681
2	project_phases	1	INSERT	12	\N	\N	Initial project phases setup	2025-09-17 15:29:13.902681
6	users	7	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-17 15:54:09.786676
7	projects	2	CREATE	12	\N	\N	Project created with 3 phases	2025-09-17 15:59:09.510429
12	users	9	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-17 19:52:09.85309
13	users	9	LOGIN	12	\N	\N	User logged in	2025-09-17 19:52:19.237112
14	users	9	LOGIN	12	\N	\N	User logged in	2025-09-17 19:53:31.476065
78	work_logs	6	CREATE	14	\N	\N	Logged 24 hours on Concept Generation	2025-09-19 20:37:58.215677
79	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-19 20:38:02.677886
80	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 20:38:06.090676
81	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-19 20:55:45.472516
82	users	14	LOGIN	14	\N	\N	User logged in	2025-09-19 20:55:50.906378
83	work_logs	6	CREATE	14	\N	\N	Logged 5 hours on Concept Generation	2025-09-19 20:56:05.700185
84	work_logs	6	CREATE	14	\N	\N	Logged 8 hours on Concept Generation	2025-09-19 20:56:44.326428
85	work_logs	6	CREATE	14	\N	\N	Logged 8 hours on Concept Generation	2025-09-19 20:57:04.831604
86	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-19 21:10:32.44156
87	users	12	LOGIN	12	\N	\N	User logged in	2025-09-19 21:10:35.916265
88	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 04:45:28.003113
89	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 04:45:32.00365
90	work_logs	12	CREATE	14	\N	\N	Logged 4 hours on Concept Generation	2025-09-20 04:45:41.572816
91	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 04:45:46.979379
92	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 04:45:58.312315
93	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 04:58:34.473693
94	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 04:58:41.665232
95	work_logs	12	DELETE	14	\N	\N	Work log deleted: 4.00 hours on Sat Sep 20 2025 00:00:00 GMT+0300 (Eastern European Summer Time)	2025-09-20 05:24:25.886795
96	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 05:25:26.730627
97	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 05:25:29.939148
98	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 05:25:53.553343
99	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 05:25:57.944867
100	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 05:33:39.989694
101	users	8	UPDATE	12	\N	\N	User updated: name, email, is_active	2025-09-20 05:43:19.057058
102	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 19:41:55.643677
103	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 19:42:05.751402
104	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 19:42:09.606266
105	users	8	REACTIVATE	12	\N	\N	User account reactivated: testsupervisor@test.com	2025-09-20 19:45:58.181885
106	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 20:13:54.220948
107	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 20:28:45.076291
108	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 20:29:13.494718
109	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 20:29:49.084268
110	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 20:30:25.323675
111	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 20:30:38.71639
112	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 20:30:44.044279
113	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 20:35:51.779396
114	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 22:24:56.336012
115	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 22:25:15.702682
116	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 22:25:46.110446
117	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 22:27:09.503136
118	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 22:27:19.966679
119	work_logs	13	CREATE	14	\N	\N	Logged 5 hours on Concept Generation	2025-09-20 22:28:02.565386
120	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 22:31:27.197382
121	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 22:31:36.228589
122	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 22:37:49.771416
123	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 22:37:57.29822
124	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 22:42:43.388532
125	work_logs	13	CREATE	14	\N	\N	Logged 1 hours on Concept Generation	2025-09-20 22:43:41.744481
126	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 22:44:19.904221
127	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 22:44:25.121548
128	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 23:46:43.512852
129	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 23:49:40.57151
130	projects	5	CREATE	12	\N	\N	Project created with 10 phases	2025-09-20 23:52:24.368553
131	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 23:52:33.397435
132	users	14	LOGIN	14	\N	\N	User logged in	2025-09-20 23:52:40.912934
133	project_phases	29	START	14	\N	\N	Phase started automatically when first work log was created	2025-09-20 23:53:52.648201
134	work_logs	14	CREATE	14	\N	\N	Logged 8 hours on Preconcept Design	2025-09-20 23:53:52.652086
135	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-20 23:57:57.383041
136	users	12	LOGIN	12	\N	\N	User logged in	2025-09-20 23:58:03.432282
137	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-20 23:59:57.323176
138	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 00:00:11.424323
139	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 00:29:02.663136
140	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 00:32:04.017379
141	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 00:33:26.889385
142	users	14	LOGIN	14	\N	\N	User logged in	2025-09-21 00:33:31.015858
143	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-21 00:35:07.561022
144	users	14	LOGIN	14	\N	\N	User logged in	2025-09-21 00:36:36.128568
145	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-21 00:36:39.2643
146	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 00:36:42.974652
147	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 00:40:13.468892
148	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 00:45:54.211492
149	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 00:53:15.407269
150	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 00:54:48.242534
151	users	2	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: john.smith@trackms.com	2025-09-21 01:01:43.934695
152	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:01:58.451937
153	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:02:00.748733
154	users	8	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: testsupervisor@test.com	2025-09-21 01:07:31.019712
155	users	6	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: test@example.com	2025-09-21 01:07:48.959966
156	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:37:30.51977
157	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:38:12.683186
158	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:54:14.34111
159	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:54:48.459068
160	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:55:03.326126
161	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:55:19.609899
162	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:57:42.264675
163	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:58:21.963044
164	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 01:58:43.291386
165	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 01:59:50.842621
166	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 02:04:24.033088
167	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 02:06:19.066435
168	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 02:07:36.317816
169	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 02:07:48.268625
170	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 02:10:25.774523
171	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 02:11:32.697171
172	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 02:14:43.23304
173	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 02:14:58.791884
174	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 02:17:59.92104
175	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 02:18:16.928538
176	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 16:19:35.897868
177	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 16:20:03.889291
178	projects	5	UPDATE	12	\N	\N	Project updated: name, status, planned_total_weeks, predicted_hours, start_date	2025-09-21 16:20:39.528765
179	projects	5	UPDATE	12	\N	\N	Project updated: name, status, planned_total_weeks, predicted_hours, start_date	2025-09-21 16:21:14.853667
180	projects	5	UPDATE	12	\N	\N	Project updated: name, status, planned_total_weeks, predicted_hours, start_date	2025-09-21 16:21:36.411227
181	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 17:04:54.727979
182	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 17:06:24.074654
183	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 23:45:20.099916
184	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 23:47:38.101659
185	projects	6	CREATE	12	\N	\N	Project created with 10 phases	2025-09-21 23:47:58.546157
186	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-21 23:49:27.112868
187	users	14	LOGIN	14	\N	\N	User logged in	2025-09-21 23:49:33.33215
188	project_phases	39	START	14	\N	\N	Phase started automatically when first work log was created	2025-09-21 23:50:38.049592
189	work_logs	15	CREATE	14	\N	\N	Logged 4 hours on Preconcept Design	2025-09-21 23:50:38.05735
190	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-21 23:51:08.722803
191	users	12	LOGIN	12	\N	\N	User logged in	2025-09-21 23:51:13.43733
192	project_phases	39	SUBMIT	12	\N	\N	Phase submitted to client	2025-09-22 00:58:23.624475
193	project_phases	40	UNLOCK	12	\N	\N	Phase unlocked after phase 1 approval	2025-09-22 00:58:30.038337
194	project_phases	39	APPROVE	12	\N	\N	Phase approved after client acceptance	2025-09-22 00:58:30.038337
195	project_phases	39	WARNING_ADD	12	\N	\N	Warning added	2025-09-22 00:58:33.820168
196	project_phases	39	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-22 00:58:41.776193
197	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 03:23:18.586563
198	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 03:23:20.984071
199	project_phases	25	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_6_1758500601018	2025-09-22 03:23:30.024655
200	project_phases	25	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_8_1758500601018	2025-09-22 03:23:30.138009
201	project_phases	25	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_9_1758500601018	2025-09-22 03:23:30.26193
202	project_phases	25	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_10_1758500601018	2025-09-22 03:23:30.360138
203	project_phases	26	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_11_1758500601018	2025-09-22 03:23:30.427653
204	project_phases	25	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_13_1758500601018	2025-09-22 03:23:30.492923
205	project_phases	29	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_14_1758500601018	2025-09-22 03:23:30.563696
206	project_phases	39	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_15_1758500601018	2025-09-22 03:23:30.621942
207	project_phases	25	NOTIFICATION_READ	12	\N	\N	User read notification: approval_10_1758500601018	2025-09-22 03:23:35.584525
208	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_6_1758500601018	2025-09-22 03:23:44.755393
209	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_8_1758500601018	2025-09-22 03:23:44.946002
210	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_9_1758500601018	2025-09-22 03:23:45.09282
211	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_10_1758500601018	2025-09-22 03:23:45.169215
212	project_phases	26	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_11_1758500601018	2025-09-22 03:23:45.248926
213	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_13_1758500601018	2025-09-22 03:23:45.319493
214	project_phases	29	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_14_1758500601018	2025-09-22 03:23:45.386468
215	project_phases	39	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_15_1758500601018	2025-09-22 03:23:45.452143
216	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_6_1758500601018	2025-09-22 03:23:48.503388
217	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_8_1758500601018	2025-09-22 03:23:48.654959
218	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_9_1758500601018	2025-09-22 03:23:48.752605
219	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_10_1758500601018	2025-09-22 03:23:48.822461
220	project_phases	26	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_11_1758500601018	2025-09-22 03:23:48.888318
221	project_phases	25	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_13_1758500601018	2025-09-22 03:23:48.956316
222	project_phases	29	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_14_1758500601018	2025-09-22 03:23:49.03268
223	project_phases	39	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_15_1758500601018	2025-09-22 03:23:49.105387
224	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 03:23:55.402215
225	users	14	LOGIN	14	\N	\N	User logged in	2025-09-22 03:23:59.316284
226	project_phases	40	START	14	\N	\N	Phase started automatically when first work log was created	2025-09-22 03:24:23.206456
227	work_logs	16	CREATE	14	\N	\N	Logged 8 hours on Concept Generation	2025-09-22 03:24:23.215056
228	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-22 03:24:33.450287
229	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 03:24:37.665501
230	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 15:58:32.367813
231	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:00:05.14822
232	projects	6	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 16:00:31.382094
233	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:02:10.772013
234	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:02:13.894968
235	projects	5	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 16:02:22.699738
236	projects	4	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 16:02:26.559657
237	projects	7	CREATE	12	\N	\N	Project created with 6 phases	2025-09-22 16:03:45.149161
238	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:03:57.42489
239	users	14	LOGIN	14	\N	\N	User logged in	2025-09-22 16:04:04.401234
240	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-22 16:06:46.41873
241	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:07:32.716545
242	projects	7	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 16:07:48.791243
243	projects	8	CREATE	12	\N	\N	Project created with 10 phases	2025-09-22 16:08:44.017592
244	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:08:52.988312
245	users	14	LOGIN	14	\N	\N	User logged in	2025-09-22 16:08:57.104584
246	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-22 16:09:27.539624
247	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:09:33.680401
248	projects	8	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 16:09:41.789971
249	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:09:45.186543
250	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:10:12.698518
251	projects	9	CREATE	12	\N	\N	Project created with 6 phases	2025-09-22 16:11:10.599542
252	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:11:26.077815
253	users	14	LOGIN	14	\N	\N	User logged in	2025-09-22 16:11:30.481031
254	project_phases	65	START	14	\N	\N	Phase started automatically when first work log was created	2025-09-22 16:13:12.292943
255	work_logs	17	CREATE	14	\N	\N	Logged 5 hours on Preconcept Design	2025-09-22 16:13:12.294098
256	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-22 16:15:50.468529
257	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:15:56.850695
258	project_phases	65	SUBMIT	12	\N	\N	Phase submitted to client	2025-09-22 16:20:00.715304
259	project_phases	66	UNLOCK	12	\N	\N	Phase unlocked after phase 1 approval	2025-09-22 16:20:07.560707
260	project_phases	65	APPROVE	12	\N	\N	Phase approved after client acceptance	2025-09-22 16:20:07.560707
261	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:20:13.944261
262	users	14	LOGIN	14	\N	\N	User logged in	2025-09-22 16:20:17.964246
263	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-22 16:29:36.955653
264	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:29:44.018779
265	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:29:50.091693
266	users	15	REGISTER	15	\N	\N	User registered with role: engineer	2025-09-22 16:30:30.932768
267	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 16:33:08.334577
268	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 16:33:25.722605
269	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 16:33:30.781607
270	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 16:36:07.424729
271	project_phases	66	START	15	\N	\N	Phase started automatically when first work log was created	2025-09-22 16:36:19.058158
272	work_logs	18	CREATE	15	\N	\N	Logged 8 hours on Concept Generation	2025-09-22 16:36:19.061426
273	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 16:36:22.435411
274	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:36:27.518379
275	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 16:37:59.331994
276	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 16:38:09.080559
277	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 18:09:28.300667
278	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 18:09:33.499126
279	database	0	MIGRATION	\N	\N	\N	Added early access support to project_phases table	2025-09-22 18:36:21.257046
281	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 19:07:05.243049
282	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 19:07:21.885249
283	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 19:27:18.854788
284	project_phases	70	EARLY_ACCESS_GRANT	12	\N	\N	Early access granted for Working Drawings by mazen	2025-09-22 19:27:41.445457
285	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 19:27:48.858909
286	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 19:28:09.724559
287	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 19:28:29.474845
288	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 19:29:03.306232
289	project_phases	70	START	12	\N	\N	Starting phase with early access	2025-09-22 19:29:14.15481
290	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 19:29:27.291156
291	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 19:29:31.173271
292	work_logs	19	CREATE	15	\N	\N	Logged 5 hours on Working Drawings	2025-09-22 19:29:43.437815
293	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 19:29:46.88769
294	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 19:30:10.962371
295	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 19:37:53.914135
296	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 19:37:56.993883
297	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 20:10:26.324453
298	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 20:11:24.361224
299	projects	9	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-22 20:12:23.327891
300	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 20:13:48.230337
301	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 20:15:48.247214
302	projects	10	CREATE	12	\N	\N	Project created with 6 phases	2025-09-22 20:17:08.444664
303	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 20:19:23.397101
304	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 20:19:31.550294
305	project_phases	71	START	15	\N	\N	Phase started automatically when first work log was created	2025-09-22 20:20:06.865802
306	work_logs	20	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-22 20:20:06.866999
307	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 20:20:11.658186
308	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 20:20:14.958772
309	project_phases	75	EARLY_ACCESS_GRANT	12	\N	\N	Early access granted for Schematic Design by mazen	2025-09-22 20:21:18.642096
310	project_phases	75	START	12	\N	\N	Starting phase with early access	2025-09-22 20:21:25.186046
311	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 20:21:28.705564
312	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 20:21:32.290888
313	work_logs	21	CREATE	15	\N	\N	Logged 8 hours on Schematic Design	2025-09-22 20:21:40.224684
314	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 20:21:44.561807
315	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 20:21:47.41649
316	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-22 20:28:23.863772
317	users	15	LOGIN	15	\N	\N	User logged in	2025-09-22 20:28:27.584571
318	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-22 20:30:23.165492
319	users	12	LOGIN	12	\N	\N	User logged in	2025-09-22 20:30:29.891492
320	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-24 18:12:49.361117
321	database	0	MIGRATION	\N	\N	\N	Enhanced smart professional warning system with predictive analytics	2025-09-25 01:11:07.403135
322	users	12	LOGIN	12	\N	\N	User logged in	2025-09-25 02:08:53.920593
323	project_phases	72	WARNING_ADD	12	\N	\N	Warning added	2025-09-25 02:09:08.160333
324	project_phases	71	WARNING_ADD	12	\N	\N	Warning added	2025-09-25 02:09:11.479886
325	project_phases	71	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_20_1758755334016	2025-09-25 02:09:40.643352
326	project_phases	75	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_21_1758755334016	2025-09-25 02:09:40.652608
327	project_phases	71	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_20_1758755334016	2025-09-25 02:09:46.834569
328	project_phases	71	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_20_1758755334016	2025-09-25 02:09:49.116409
329	project_phases	71	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_20_1758755334016	2025-09-25 02:09:54.433929
330	project_phases	71	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_20_1758755410904	2025-09-25 02:10:14.941064
331	project_phases	75	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: approval_21_1758755410904	2025-09-25 02:10:14.948405
333	project_phases	72	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-25 13:01:03.857423
334	project_phases	71	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-25 13:16:31.668237
335	project_phases	72	WARNING_ADD	12	\N	\N	Warning added	2025-09-25 17:11:29.977291
336	project_phases	72	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-25 17:11:39.918599
337	project_phases	72	WARNING_ADD	12	\N	\N	Warning added	2025-09-25 17:53:14.564739
338	users	12	LOGIN	12	\N	\N	User logged in	2025-09-25 18:03:27.120591
344	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 01:04:55.401824
346	projects	11	CREATE	12	\N	\N	Project created with 10 phases	2025-09-26 01:34:10.181547
347	project_phases	71	SUBMIT	12	\N	\N	Phase submitted to client	2025-09-26 01:38:35.23385
348	project_phases	72	UNLOCK	12	\N	\N	Phase unlocked after phase 1 approval	2025-09-26 01:38:38.000929
349	project_phases	71	APPROVE	12	\N	\N	Phase approved after client acceptance	2025-09-26 01:38:38.000929
350	project_phases	71	COMPLETE	12	\N	\N	Phase marked as completed - final handover	2025-09-26 01:38:40.772092
351	projects	11	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-26 05:20:40.585011
352	projects	12	CREATE	12	\N	\N	Project created with 2 phases	2025-09-26 05:24:08.530257
353	project_phases	87	START	12	\N	\N	Starting phase normally	2025-09-26 05:24:47.774824
354	project_phases	87	NOTIFICATION_DISMISSED	12	\N	\N	User dismissed notification: deadline_87_1758853544412	2025-09-26 05:26:32.977253
355	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 05:31:54.951406
356	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 05:32:01.198201
357	work_logs	22	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-26 05:32:40.910711
358	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 05:32:44.897728
359	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 05:32:50.837343
360	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: deadline_87_1758854057815	2025-09-26 05:39:56.927297
361	project_phases	71	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_20_1758854057819	2025-09-26 05:39:57.249211
362	project_phases	75	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_21_1758854057819	2025-09-26 05:39:57.272634
363	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_22_1758854057819	2025-09-26 05:39:57.295666
364	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: deadline_87_1758854990650	2025-09-26 05:50:55.451494
365	project_phases	71	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_20_1758854990664	2025-09-26 05:50:55.479914
366	project_phases	75	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_21_1758854990664	2025-09-26 05:50:55.513109
367	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_22_1758854990664	2025-09-26 05:50:55.543592
368	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: deadline_87_1758855195645	2025-09-26 05:53:22.793649
369	project_phases	71	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_20_1758855195657	2025-09-26 05:53:22.821237
370	project_phases	75	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_21_1758855195657	2025-09-26 05:53:22.927406
371	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_22_1758855195657	2025-09-26 05:53:22.950313
372	project_phases	87	NOTIFICATION_VIEWED	12	\N	\N	User viewed notification: deadline_87_1758855265737	2025-09-26 05:54:47.990026
373	project_phases	87	NOTIFICATION_VIEWED	12	\N	\N	User viewed notification: approval_22_1758855265755	2025-09-26 05:55:50.30697
379	projects	3	DELETE	12	\N	\N	Project permanently deleted from database	2025-09-26 05:57:20.048548
384	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: deadline_87_1758855435116	2025-09-26 06:02:56.340552
385	project_phases	71	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_20_1758855435125	2025-09-26 06:02:56.666839
386	project_phases	75	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_21_1758855435125	2025-09-26 06:02:56.748204
387	project_phases	87	NOTIFICATION_BULK_DISMISSED	12	\N	\N	User bulk_dismissed notification: approval_22_1758855435125	2025-09-26 06:02:56.783281
388	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 13:59:42.778526
389	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 13:59:47.577951
390	work_logs	22	CREATE	15	\N	\N	Logged 10 hours on Preconcept Design	2025-09-26 14:00:08.062089
391	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 14:00:13.576526
392	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 14:00:17.352808
393	project_phases	88	WARNING_ADD	12	\N	\N	Warning added	2025-09-26 14:03:50.840678
394	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 14:28:06.277178
395	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 14:28:09.792907
396	work_logs	23	CREATE	15	\N	\N	Logged 6 hours on Schematic Design	2025-09-26 14:28:18.891399
397	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 14:28:21.643236
398	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 14:28:25.233207
399	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 14:29:25.224469
400	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 14:29:29.289354
401	project_phases	72	START	15	\N	\N	Phase started automatically when first work log was created	2025-09-26 14:29:40.990843
402	work_logs	24	CREATE	15	\N	\N	Logged 7 hours on Concept Generation	2025-09-26 14:29:41.063968
403	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 14:29:47.520672
404	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 14:29:50.683702
405	project_phases	88	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-26 14:41:38.047916
406	project_phases	88	WARNING_ADD	12	\N	\N	Warning added	2025-09-26 14:41:40.588151
407	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 14:41:48.352517
408	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 14:41:51.348583
409	work_logs	22	CREATE	15	\N	\N	Logged 1 hours on Preconcept Design	2025-09-26 14:42:00.418416
410	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 14:42:03.710161
411	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 14:42:07.556125
412	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 18:19:47.305918
413	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 18:19:50.696612
414	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 18:28:46.399693
415	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 18:28:49.082918
416	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 18:45:47.572108
417	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 18:45:51.899805
418	work_logs	22	CREATE	15	\N	\N	Logged 4 hours on Preconcept Design	2025-09-26 18:46:07.621376
419	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 18:46:12.092942
420	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 18:46:19.035138
421	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 19:11:59.760581
422	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 19:12:04.429156
423	work_logs	22	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-26 19:12:12.289143
424	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 19:12:15.249981
425	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 19:12:19.494013
426	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 11 notifications: notif-001, notif-007, notif-002, notif-004, notif-003, notif-005, approval_10_1758903067244, approval_12_1758903067239, approval_10_1758903067236, approval_10_1758903067179, notif-008	2025-09-26 19:12:54.712933
427	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 4 notifications: approval_10_1758903176895, approval_12_1758903176892, approval_10_1758903176888, approval_10_1758903176883	2025-09-26 19:13:01.306518
428	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-26 19:13:17.536415
429	users	15	LOGIN	15	\N	\N	User logged in	2025-09-26 19:13:21.627368
430	work_logs	22	CREATE	15	\N	\N	Logged 4 hours on Preconcept Design	2025-09-26 19:13:29.565924
431	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-26 19:13:38.720004
432	users	12	LOGIN	12	\N	\N	User logged in	2025-09-26 19:13:43.171711
433	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 4 notifications: approval_10_1758903223277, approval_12_1758903223276, approval_10_1758903223274, approval_10_1758903223219	2025-09-26 19:14:11.177788
434	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 4 notifications: approval_10_1758903253879, approval_12_1758903253877, approval_10_1758903253875, approval_10_1758903253871	2025-09-26 19:14:18.246091
435	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 05:15:55.759648
436	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 05:16:00.972547
437	work_logs	25	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-27 05:16:39.639821
438	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 05:16:49.307483
439	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 05:16:53.291926
440	notifications	12	NOTIFICATION_CLEAR_ALL	12	\N	\N	User cleared all unread notifications	2025-09-27 05:42:17.664659
441	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 05:42:35.306806
442	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 05:42:39.693691
443	work_logs	25	CREATE	15	\N	\N	Logged 4 hours on Preconcept Design	2025-09-27 05:42:48.473576
444	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 05:42:52.862401
377	users	20	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-26 05:56:52.642619
378	users	20	LOGIN	12	\N	\N	User logged in	2025-09-26 05:56:52.916713
445	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 05:42:57.862471
446	project_phases	87	WARNING_ADD	12	\N	\N	Warning added	2025-09-27 05:49:51.918411
447	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 05:55:18.334423
448	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 05:55:26.754943
449	work_logs	25	CREATE	15	\N	\N	Logged 8 hours on Preconcept Design	2025-09-27 05:55:38.248614
450	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 05:55:41.699717
451	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 05:55:55.706464
452	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 17:50:08.382074
453	notifications	12	NOTIFICATION_READ	12	\N	\N	User marked notification as read: 54c95d1f-20d9-4a11-afdd-efaad004dcb4	2025-09-27 17:50:32.10556
454	notifications	12	NOTIFICATION_READ	12	\N	\N	User marked notification as read: c894e833-ff6a-4113-a9e2-afcd7ba9b87a	2025-09-27 17:50:42.975145
455	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:00:32.355445
456	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:00:36.251965
457	work_logs	25	CREATE	15	\N	\N	Logged 4 hours on Preconcept Design	2025-09-27 18:00:42.918236
458	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:00:45.441089
459	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:00:49.033048
460	notifications	12	NOTIFICATION_READ	12	\N	\N	User marked notification as read: 93817d7d-a247-4643-bdbd-fe863a03fb10	2025-09-27 18:01:25.025399
461	project_phases	87	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-27 18:03:49.808051
462	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:03:58.936214
463	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:04:02.558613
464	work_logs	25	CREATE	15	\N	\N	Logged 10 hours on Preconcept Design	2025-09-27 18:04:09.457034
465	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:04:12.120981
466	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:04:15.567107
467	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:04:47.270524
468	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:04:50.189191
469	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:04:53.236801
470	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:04:57.223702
471	projects	13	CREATE	12	\N	\N	Project created with 10 phases	2025-09-27 18:05:05.227811
472	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:05:09.442294
473	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:05:12.394869
474	project_phases	89	START	15	\N	\N	Phase started automatically when first work log was created	2025-09-27 18:05:24.122052
475	work_logs	26	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-27 18:05:24.124558
476	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:05:29.412307
477	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:07:05.917395
478	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:07:25.455291
479	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:07:29.16379
480	work_logs	26	CREATE	15	\N	\N	Logged 2 hours on Preconcept Design	2025-09-27 18:07:49.374946
481	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:07:52.844851
482	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:07:56.340333
483	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:08:55.698517
484	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:09:08.853407
485	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:09:43.044197
486	users	14	LOGIN	14	\N	\N	User logged in	2025-09-27 18:09:56.568077
487	work_logs	27	CREATE	14	\N	\N	Logged 5 hours on Preconcept Design	2025-09-27 18:10:05.123748
488	users	14	LOGOUT	14	\N	\N	User logged out	2025-09-27 18:10:09.426298
489	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:10:13.084811
490	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-27 18:17:39.043521
491	users	15	LOGIN	15	\N	\N	User logged in	2025-09-27 18:17:50.46663
492	work_logs	26	CREATE	15	\N	\N	Logged 1 hours on Preconcept Design	2025-09-27 18:18:00.97797
493	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-27 18:18:07.975151
494	users	12	LOGIN	12	\N	\N	User logged in	2025-09-27 18:18:16.303476
495	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 00:09:23.29176
496	users	15	LOGIN	15	\N	\N	User logged in	2025-09-28 00:09:27.542285
497	work_logs	31	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-28 00:10:47.778111
498	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-28 00:10:51.13488
499	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 00:10:55.754335
500	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 00:11:53.881278
501	users	15	LOGIN	15	\N	\N	User logged in	2025-09-28 00:11:59.651072
502	work_logs	31	CREATE	15	\N	\N	Logged 2 hours on Preconcept Design	2025-09-28 00:12:04.979883
503	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-28 00:12:11.635062
504	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 00:12:16.174606
505	notifications	12	NOTIFICATION_READ	12	\N	\N	User marked notification as read: deadline_12_1759007455798	2025-09-28 00:14:03.757237
506	project_phases	88	WARNING_REMOVE	12	\N	\N	Warning removed	2025-09-28 00:14:30.4922
507	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 17 notifications: deadline_12_1759007455798, 88747bdd-4c58-43dc-9b6e-15b9728652b5, 7d3a602a-d69c-4d16-8c7a-2b1bbfa104fa, fc873acb-8e07-4bd4-8128-c7e0fc5ec0d8, 7cc20ebd-d5fe-4c45-9608-02490987b9cc, ba693961-b446-47d1-9fc9-d06ee23d6d67, ef81c22c-fa68-43ef-af57-b8aece9d14bf, 93ed455b-f2a7-4542-baf9-423631326c54, 1beb5e7e-e96c-4955-b29c-c11361e5ad6d, 655ef169-ae0a-4ad5-94da-5837825ccee4, 9851f3c2-ec9b-4c29-af28-7d5793f7020c, 4bf29d94-3af0-46c5-80fa-7b23dbcc2c60, 3e17fecd-007f-463d-9241-ebf174eb33ab, 47e502ba-7904-4bf9-b104-89f04e85314e, 50246d83-6e4e-4840-bc7d-d53e2a362444, approval_13_1759007455881, approval_13_1758985813132	2025-09-28 00:18:32.544338
508	notifications	0	NOTIFICATION_BULK_DELETED	12	\N	\N	User deleted 4 notifications: deadline_12_1759007914779, approval_13_1759007914794, approval_13_1759007914791, approval_13_1759007914789	2025-09-28 00:18:38.45651
509	notifications	12	NOTIFICATION_DELETED	12	\N	\N	User deleted notification: approval_13_1759007920443	2025-09-28 00:18:48.179345
510	notifications	12	NOTIFICATION_DELETED	12	\N	\N	User deleted notification: approval_13_1759007920339	2025-09-28 00:18:52.047808
511	project_phases	89	WARNING_ADD	12	\N	\N	Warning added	2025-09-28 00:57:01.85836
512	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 01:03:37.916424
513	users	15	LOGIN	15	\N	\N	User logged in	2025-09-28 01:03:42.094443
514	work_logs	31	CREATE	15	\N	\N	Logged 1 hours on Preconcept Design	2025-09-28 01:03:52.281457
515	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-28 01:03:55.969621
516	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 01:04:00.951046
519	work_logs	31	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-09-28 01:05:02.564512
520	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-28 01:05:05.528699
521	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 01:05:12.840024
522	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 01:10:59.847204
517	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 01:04:48.798063
518	users	15	LOGIN	15	\N	\N	User logged in	2025-09-28 01:04:53.473703
523	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 04:58:05.959498
524	project_phases	98	DELETE	12	\N	\N	Phase "Licenses Drawing" deleted	2025-09-28 13:01:32.00043
525	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-28 17:29:49.957642
526	projects	13	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-28 17:30:25.250469
527	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-28 17:30:36.412319
528	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-28 17:31:53.479704
529	users	15	LOGIN	15	\N	\N	User logged in	2025-09-28 17:31:58.349106
530	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-28 17:32:04.990283
531	users	12	LOGIN	12	\N	\N	User logged in	2025-09-28 17:32:08.493378
532	projects	13	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-28 17:45:37.138966
533	projects	10	ARCHIVE	12	\N	\N	Project archived	2025-09-28 18:30:51.350326
534	projects	10	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-28 18:30:59.0739
535	project_phases	90	WARNING_ADD	12	\N	\N	Warning added	2025-09-29 02:22:38.073387
536	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-29 03:26:48.612647
537	projects	13	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-29 03:27:12.767832
538	users	19	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: engineer-1758855411588@test.com	2025-09-29 15:07:15.999616
539	users	18	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: test-1758855411071@example.com	2025-09-29 15:07:22.770804
540	users	22	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: health-check-1758855634758@test.com	2025-09-29 15:07:28.454761
541	users	21	DELETE	12	\N	\N	User account and all associated work logs permanently deleted: frontend-test-1758855526843@test.com	2025-09-29 15:07:34.353224
542	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-29 18:13:27.349741
543	users	12	LOGIN	12	\N	\N	User logged in	2025-09-29 18:13:30.367907
544	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-29 18:23:06.967955
545	users	12	LOGIN	12	\N	\N	User logged in	2025-09-29 18:23:10.265442
546	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-29 19:07:34.549248
547	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-30 19:05:01.718573
548	projects	13	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-30 19:05:12.030913
549	projects	13	ARCHIVE	12	\N	\N	Project archived	2025-09-30 19:06:03.395465
550	projects	14	CREATE	12	\N	\N	Project created with 10 phases	2025-09-30 19:36:17.978762
551	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-30 23:32:20.582634
552	users	15	LOGIN	15	\N	\N	User logged in	2025-09-30 23:32:26.136595
553	project_phases	99	START	15	\N	\N	Phase started automatically when first work log was created	2025-09-30 23:32:49.294125
554	work_logs	32	CREATE	15	\N	\N	Logged 8 hours on Preconcept Design	2025-09-30 23:32:49.299473
555	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-30 23:32:54.410879
556	users	12	LOGIN	12	\N	\N	User logged in	2025-09-30 23:32:58.335527
557	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-30 23:33:04.602929
558	users	15	LOGIN	15	\N	\N	User logged in	2025-09-30 23:33:10.725892
559	work_logs	32	CREATE	15	\N	\N	Logged 2 hours on Preconcept Design	2025-09-30 23:33:25.240881
560	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-30 23:33:42.904423
561	users	12	LOGIN	12	\N	\N	User logged in	2025-09-30 23:33:48.015315
562	users	12	LOGOUT	12	\N	\N	User logged out	2025-09-30 23:34:01.422802
563	users	15	LOGIN	15	\N	\N	User logged in	2025-09-30 23:34:05.972233
564	users	15	LOGOUT	15	\N	\N	User logged out	2025-09-30 23:35:14.334936
565	users	12	LOGIN	12	\N	\N	User logged in	2025-09-30 23:35:20.257873
566	projects	13	UNARCHIVE	12	\N	\N	Project unarchived	2025-09-30 23:53:22.481724
567	project_phases	99	WARNING_ADD	12	\N	\N	Warning added	2025-10-01 00:17:07.837317
15	users	9	LOGIN	12	\N	\N	User logged in	2025-09-17 19:53:42.030689
16	users	10	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-17 19:55:22.163831
17	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:41.705974
18	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:45.362656
19	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:56.004718
20	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:57.013265
21	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:57.756855
22	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:55:58.675391
23	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:56:15.937661
24	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:57:04.328092
25	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 19:57:05.312488
26	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 20:03:53.795158
27	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 20:03:55.09528
28	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 20:14:43.188247
29	users	10	LOGIN	12	\N	\N	User logged in	2025-09-17 20:14:44.321124
30	users	11	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-18 16:48:30.617151
31	users	11	LOGIN	12	\N	\N	User logged in	2025-09-18 16:51:31.316304
32	users	11	LOGIN	12	\N	\N	User logged in	2025-09-18 16:51:36.233715
33	users	11	LOGIN	12	\N	\N	User logged in	2025-09-18 16:53:56.594466
280	users	11	LOGIN	12	\N	\N	User logged in	2025-09-22 19:07:00.401142
332	users	16	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-25 12:49:26.537166
339	users	17	REGISTER	12	\N	\N	User registered with role: supervisor	2025-09-26 00:46:03.808537
340	users	17	LOGIN	12	\N	\N	User logged in	2025-09-26 00:46:11.304973
341	users	17	LOGIN	12	\N	\N	User logged in	2025-09-26 00:50:14.6047
342	users	17	LOGIN	12	\N	\N	User logged in	2025-09-26 00:54:57.692284
343	users	17	LOGIN	12	\N	\N	User logged in	2025-09-26 01:03:50.962556
345	users	17	LOGIN	12	\N	\N	User logged in	2025-09-26 01:11:32.587298
568	users	12	LOGOUT	12	\N	\N	User logged out	2025-10-01 00:46:15.543342
569	users	12	LOGIN	12	\N	\N	User logged in	2025-10-01 00:46:19.66405
570	users	12	LOGOUT	12	\N	\N	User logged out	2025-10-01 00:46:30.592497
571	users	23	LOGIN	23	\N	\N	User logged in	2025-10-01 00:46:56.787354
572	users	24	REGISTER	24	\N	\N	User registered with role: supervisor	2025-10-01 19:42:29.059725
573	users	24	LOGIN	24	\N	\N	User logged in	2025-10-01 19:42:43.309693
735	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 16:59:39.978123
575	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-01 20:56:28.236659
576	users	15	LOGIN	15	\N	\N	User logged in	2025-10-01 20:56:32.719597
577	users	15	PASSWORD_CHANGE	15	\N	\N	User changed password	2025-10-02 01:13:22.634034
578	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-02 01:13:31.309419
579	users	15	LOGIN	15	\N	\N	User logged in	2025-10-02 01:13:42.816089
580	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-02 01:18:57.598241
581	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 01:19:03.438569
582	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 17:47:28.509854
583	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 17:50:23.03094
584	projects	15	CREATE	23	\N	\N	Project created with 6 phases	2025-10-02 17:52:00.469016
585	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 17:52:09.164636
586	users	15	LOGIN	15	\N	\N	User logged in	2025-10-02 17:52:16.173568
587	project_phases	109	START	15	\N	\N	Phase started automatically when first work log was created	2025-10-02 17:52:37.244383
588	work_logs	33	CREATE	15	\N	\N	Logged 5 hours on Preconcept Design	2025-10-02 17:52:37.249908
589	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-02 17:52:53.652761
590	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 17:52:58.313588
591	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 18:31:47.748763
592	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 18:31:53.017833
593	projects	16	CREATE	23	\N	\N	Project created with 6 phases	2025-10-02 18:32:17.176284
594	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 18:32:25.050236
595	users	14	LOGIN	14	\N	\N	User logged in	2025-10-02 18:32:30.306326
596	project_phases	115	START	14	\N	\N	Phase started automatically when first work log was created	2025-10-02 18:32:44.461296
597	work_logs	34	CREATE	14	\N	\N	Logged 5 hours on Preconcept Design	2025-10-02 18:32:44.467043
598	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-02 18:32:47.820018
599	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 18:32:53.168642
600	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 18:33:36.699058
601	users	14	LOGIN	14	\N	\N	User logged in	2025-10-02 18:33:42.928116
602	work_logs	34	CREATE	14	\N	\N	Logged 15 hours on Preconcept Design	2025-10-02 18:34:02.951561
603	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-02 18:34:22.978322
604	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 18:34:28.678996
605	project_phases	119	WARNING_ADD	23	\N	\N	Warning added	2025-10-02 18:40:07.903018
606	project_phases	115	SUBMIT	23	\N	\N	Phase submitted to client	2025-10-02 18:41:23.972829
607	project_phases	116	UNLOCK	23	\N	\N	Phase unlocked after phase 1 approval	2025-10-02 18:41:32.631166
608	project_phases	115	APPROVE	23	\N	\N	Phase approved after client acceptance	2025-10-02 18:41:32.631166
609	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-02 18:41:43.592547
610	users	14	LOGIN	14	\N	\N	User logged in	2025-10-02 18:41:49.190167
611	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-02 18:42:03.365996
612	users	23	LOGIN	23	\N	\N	User logged in	2025-10-02 18:42:07.368362
613	projects	16	UPDATE	23	\N	\N	Project updated: name, start_date, planned_total_weeks, predicted_hours, status	2025-10-02 18:45:43.354036
614	projects	16	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-02 18:45:53.201587
615	projects	17	CREATE	23	\N	\N	Project created with 10 phases	2025-10-03 13:51:12.112656
616	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-03 13:51:27.763088
617	users	15	LOGIN	15	\N	\N	User logged in	2025-10-03 13:51:33.409239
618	project_phases	121	START	15	\N	\N	Phase started automatically when first work log was created	2025-10-03 13:51:48.289698
619	work_logs	35	CREATE	15	\N	\N	Logged 13 hours on Preconcept Design	2025-10-03 13:51:48.291087
620	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-03 13:51:52.183726
621	users	23	LOGIN	23	\N	\N	User logged in	2025-10-03 13:51:58.309892
622	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-03 18:55:13.29114
623	users	15	LOGIN	15	\N	\N	User logged in	2025-10-03 18:55:18.012976
624	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-03 18:55:28.249932
625	users	23	LOGIN	23	\N	\N	User logged in	2025-10-03 18:55:33.203537
626	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-03 22:33:29.487987
627	users	23	LOGIN	23	\N	\N	User logged in	2025-10-03 22:34:05.670755
628	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-03 22:49:38.126601
629	users	14	LOGIN	14	\N	\N	User logged in	2025-10-03 22:49:56.250356
630	work_logs	36	CREATE	14	\N	\N	Logged 8 hours on Preconcept Design	2025-10-03 22:50:29.263238
631	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-03 22:50:34.986012
632	users	23	LOGIN	23	\N	\N	User logged in	2025-10-03 22:50:40.321925
633	project_phases	122	WARNING_ADD	23	\N	\N	Warning added	2025-10-03 22:56:20.052795
634	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-03 23:13:10.651272
635	users	23	LOGIN	23	\N	\N	User logged in	2025-10-03 23:15:19.752977
636	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-04 15:43:02.668209
637	users	23	LOGIN	23	\N	\N	User logged in	2025-10-04 15:45:54.444021
638	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-04 15:46:11.412897
639	users	23	LOGIN	23	\N	\N	User logged in	2025-10-04 15:46:53.179344
640	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-04 16:47:52.698181
641	users	15	LOGIN	15	\N	\N	User logged in	2025-10-04 16:47:57.799341
642	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-04 17:40:08.846326
643	users	23	LOGIN	23	\N	\N	User logged in	2025-10-04 17:40:13.662412
644	project_phases	131	COMPLETE	23	\N	\N	Phase marked as completed - final handover	2025-10-04 21:47:12.658338
645	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-04 23:47:56.863869
646	users	23	LOGIN	23	\N	\N	User logged in	2025-10-04 23:48:26.223909
647	projects	2	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-05 14:06:15.784305
648	projects	3	CREATE	23	\N	\N	Project created with 6 phases	2025-10-05 14:08:21.356333
649	projects	3	UPDATE	23	\N	\N	Project updated: name, start_date, planned_total_weeks, predicted_hours, status	2025-10-05 14:09:42.994962
650	project_phases	137	START	23	\N	\N	Starting phase normally	2025-10-05 14:13:46.743816
651	project_phases	137	SUBMIT	23	\N	\N	Phase submitted to client	2025-10-05 14:13:51.131445
652	project_phases	138	UNLOCK	23	\N	\N	Phase unlocked after phase 1 approval	2025-10-05 14:14:02.360881
653	project_phases	137	APPROVE	23	\N	\N	Phase approved after client acceptance	2025-10-05 14:14:02.360881
654	project_phases	138	START	23	\N	\N	Starting phase normally	2025-10-05 14:14:47.709574
655	projects	3	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-05 14:19:58.209391
656	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 18:42:21.477508
657	users	54	LOGIN	54	\N	\N	User logged in	2025-10-05 18:43:36.146527
658	users	54	LOGOUT	54	\N	\N	User logged out	2025-10-05 18:43:51.365358
659	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 18:43:53.735778
660	projects	4	CREATE	23	\N	\N	Project created with 10 phases	2025-10-05 18:44:01.499984
661	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 18:44:05.293825
662	users	54	LOGIN	54	\N	\N	User logged in	2025-10-05 18:44:28.452097
663	users	54	LOGOUT	54	\N	\N	User logged out	2025-10-05 18:49:06.895439
664	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 18:49:09.752279
665	users	13	DELETE	23	\N	\N	User account and all associated work logs permanently deleted: a@gmail.com	2025-10-05 18:51:20.458491
666	project_phases	144	UPDATE	23	\N	\N	Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date	2025-10-05 18:52:40.157294
667	project_phases	143	UPDATE	23	\N	\N	Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date	2025-10-05 18:54:23.451547
668	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 18:55:11.511537
669	users	54	LOGIN	54	\N	\N	User logged in	2025-10-05 18:57:52.262686
670	users	54	LOGOUT	54	\N	\N	User logged out	2025-10-05 18:59:45.284156
671	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 18:59:49.520352
672	project_phases	143	UPDATE	23	\N	\N	Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date	2025-10-05 19:09:31.872376
673	project_phases	152	DELETE	23	\N	\N	Phase "Licenses Drawing" deleted	2025-10-05 19:11:13.715661
674	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 19:30:23.779085
675	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 19:31:34.26116
676	users	25	DELETE	23	\N	\N	User account and all associated work logs permanently deleted: testengineer@test.com	2025-10-05 19:31:51.724878
677	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 19:32:02.858886
678	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 19:33:30.17757
679	users	42	LOGIN	42	\N	\N	User logged in	2025-10-05 19:34:04.401711
680	users	43	LOGIN	43	\N	\N	User logged in	2025-10-05 19:34:04.470019
681	users	44	LOGIN	44	\N	\N	User logged in	2025-10-05 19:34:04.533921
682	users	45	LOGIN	45	\N	\N	User logged in	2025-10-05 19:34:04.598086
683	users	46	LOGIN	46	\N	\N	User logged in	2025-10-05 19:34:04.660675
684	users	47	LOGIN	47	\N	\N	User logged in	2025-10-05 19:34:04.718648
685	users	48	LOGIN	48	\N	\N	User logged in	2025-10-05 19:34:04.779316
686	users	49	LOGIN	49	\N	\N	User logged in	2025-10-05 19:34:04.836297
687	users	50	LOGIN	50	\N	\N	User logged in	2025-10-05 19:34:04.895012
688	users	51	LOGIN	51	\N	\N	User logged in	2025-10-05 19:34:04.956588
689	users	52	LOGIN	52	\N	\N	User logged in	2025-10-05 19:34:05.015603
690	users	53	LOGIN	53	\N	\N	User logged in	2025-10-05 19:34:05.074973
691	users	54	LOGIN	54	\N	\N	User logged in	2025-10-05 19:34:05.137077
692	users	55	LOGIN	55	\N	\N	User logged in	2025-10-05 19:34:05.195413
693	users	56	LOGIN	56	\N	\N	User logged in	2025-10-05 19:34:05.253378
694	users	57	LOGIN	57	\N	\N	User logged in	2025-10-05 19:34:05.31141
695	users	42	LOGIN	42	\N	\N	User logged in	2025-10-05 19:34:46.149446
696	users	43	LOGIN	43	\N	\N	User logged in	2025-10-05 19:34:46.224098
697	users	44	LOGIN	44	\N	\N	User logged in	2025-10-05 19:34:46.321164
698	users	45	LOGIN	45	\N	\N	User logged in	2025-10-05 19:34:46.379314
699	users	46	LOGIN	46	\N	\N	User logged in	2025-10-05 19:34:46.43665
700	users	47	LOGIN	47	\N	\N	User logged in	2025-10-05 19:34:46.494446
701	users	48	LOGIN	48	\N	\N	User logged in	2025-10-05 19:34:46.551598
702	users	49	LOGIN	49	\N	\N	User logged in	2025-10-05 19:34:46.608912
703	users	50	LOGIN	50	\N	\N	User logged in	2025-10-05 19:34:46.666927
704	users	51	LOGIN	51	\N	\N	User logged in	2025-10-05 19:34:46.783523
705	users	52	LOGIN	52	\N	\N	User logged in	2025-10-05 19:34:46.839317
706	users	53	LOGIN	53	\N	\N	User logged in	2025-10-05 19:34:46.899584
707	users	54	LOGIN	54	\N	\N	User logged in	2025-10-05 19:34:46.955645
708	users	55	LOGIN	55	\N	\N	User logged in	2025-10-05 19:34:47.012419
709	users	56	LOGIN	56	\N	\N	User logged in	2025-10-05 19:34:47.068285
710	users	57	LOGIN	57	\N	\N	User logged in	2025-10-05 19:34:47.124127
711	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 19:35:41.730261
712	users	47	LOGIN	47	\N	\N	User logged in	2025-10-05 19:36:01.329407
713	users	47	LOGOUT	47	\N	\N	User logged out	2025-10-05 19:36:16.342134
714	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 19:36:21.597245
715	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-05 19:36:42.632007
716	users	47	LOGIN	47	\N	\N	User logged in	2025-10-05 19:37:11.097745
717	users	47	LOGOUT	47	\N	\N	User logged out	2025-10-05 19:37:23.108461
718	users	23	LOGIN	23	\N	\N	User logged in	2025-10-05 19:37:27.66038
719	projects	4	ARCHIVE	23	\N	\N	Project archived	2025-10-05 19:43:07.631699
720	projects	4	UNARCHIVE	23	\N	\N	Project unarchived	2025-10-05 19:43:13.66901
721	project_phases	153	CREATE	23	\N	\N	Custom phase "mmmmm" created	2025-10-05 19:50:14.204862
722	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 01:31:09.989797
723	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 01:32:38.36403
724	projects	5	CREATE	23	\N	\N	Project created with 2 phases	2025-10-06 16:17:12.863105
725	projects	6	CREATE	23	\N	\N	Project created with 2 phases	2025-10-06 16:17:23.945015
726	projects	4	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 16:29:47.390626
727	projects	5	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 16:29:49.974819
728	projects	6	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 16:29:53.209524
729	projects	7	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 16:30:40.696773
730	projects	8	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 16:37:07.209402
731	projects	9	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 16:37:32.05715
732	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 16:37:52.924424
733	users	14	LOGIN	14	\N	\N	User logged in	2025-10-06 16:37:59.23562
734	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-06 16:59:34.899133
736	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 17:07:01.163865
737	users	14	LOGIN	14	\N	\N	User logged in	2025-10-06 17:07:06.09653
738	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-06 17:08:10.930229
739	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 17:19:26.330802
740	projects	9	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 17:30:05.219884
741	projects	7	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 17:37:18.341646
742	projects	8	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 17:37:22.176111
743	projects	10	CREATE	23	\N	\N	Project created with 6 phases	2025-10-06 18:09:03.953933
744	projects	11	CREATE	23	\N	\N	Project created with 6 phases	2025-10-06 18:09:07.836311
745	projects	12	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 18:14:12.87419
746	projects	10	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 21:21:09.631273
747	projects	11	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 21:21:12.69341
748	projects	12	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 21:21:17.376826
749	projects	13	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 21:27:04.422166
750	project_phases	174	SUBMIT	23	\N	\N	Phase submitted to client	2025-10-06 21:36:50.113442
751	projects	13	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 21:58:41.513899
752	projects	14	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 21:59:08.849393
753	project_phases	175	SUBMIT	23	\N	\N	Phase submitted to client	2025-10-06 22:18:14.74397
754	projects	15	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 22:19:07.701403
755	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 22:25:51.456193
756	users	15	LOGIN	15	\N	\N	User logged in	2025-10-06 22:26:08.464001
757	work_logs	58	CREATE	15	\N	\N	Logged 5 hours on hhhh	2025-10-06 22:27:16.763513
758	users	15	LOGOUT	15	\N	\N	User logged out	2025-10-06 22:27:31.404937
759	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 22:27:38.938557
760	projects	14	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 22:27:46.461311
761	projects	15	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 22:27:49.375066
762	projects	16	CREATE	23	\N	\N	Project created with 1 phases	2025-10-06 22:28:32.225079
763	project_phases	177	SUBMIT	23	\N	\N	Phase submitted to client	2025-10-06 22:28:45.704869
764	project_phases	177	APPROVE	23	\N	\N	Phase approved after client acceptance	2025-10-06 22:28:52.642869
765	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 22:31:13.525861
766	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 22:31:20.78779
767	projects	17	CREATE	23	\N	\N	Project created with 2 phases	2025-10-06 22:32:11.950219
768	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 22:32:16.168723
769	users	14	LOGIN	14	\N	\N	User logged in	2025-10-06 22:32:20.483174
770	work_logs	61	CREATE	14	\N	\N	Logged 14.25 hours on jhjhjhj	2025-10-06 22:32:48.50458
771	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-06 22:34:15.160705
772	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 22:34:19.480086
773	projects	18	CREATE	23	\N	\N	Project created with 2 phases	2025-10-06 22:35:14.884241
774	users	23	LOGOUT	23	\N	\N	User logged out	2025-10-06 22:35:26.518845
775	users	14	LOGIN	14	\N	\N	User logged in	2025-10-06 22:35:35.89985
776	users	14	LOGOUT	14	\N	\N	User logged out	2025-10-06 22:35:55.024948
777	users	23	LOGIN	23	\N	\N	User logged in	2025-10-06 22:38:08.208171
778	projects	18	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 22:38:18.891859
779	projects	17	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 22:38:21.673981
780	projects	16	DELETE	23	\N	\N	Project permanently deleted from database	2025-10-06 22:38:28.561544
\.


--
-- Data for Name: critical_path_analysis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.critical_path_analysis (id, project_id, analysis_date, critical_phases, total_project_duration_days, float_analysis, bottleneck_phases, optimization_suggestions, risk_mitigation_plans, created_at) FROM stdin;
\.


--
-- Data for Name: phase_dependencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.phase_dependencies (id, project_id, predecessor_phase_id, successor_phase_id, dependency_type, lag_days, is_critical_path, weight_factor, created_at) FROM stdin;
\.


--
-- Data for Name: predefined_phases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) FROM stdin;
1	Preconcept Design	Initial conceptual planning and feasibility analysis	2	1	t	2025-09-17 15:29:13.902681
2	Concept Generation	Creative concept development and idea exploration	3	2	t	2025-09-17 15:29:13.902681
3	Principle Project	Core project principles establishment and design brief	4	3	t	2025-09-17 15:29:13.902681
4	Design Development	Detailed design evolution and refinement	4	4	t	2025-09-17 15:29:13.902681
5	Schematic Design	Technical schematic creation and system design	3	5	t	2025-09-17 15:29:13.902681
6	Working Drawings	Construction-ready detailed drawings and specifications	6	6	t	2025-09-17 15:29:13.902681
7	BOQ	Bill of Quantities - cost estimation and materials quantification	1	7	t	2025-09-17 15:29:13.902681
8	IFT	Issued for Tender - tender documentation preparation	1	8	t	2025-09-17 15:29:13.902681
9	IFC	Issued for Construction - final construction documentation	2	9	t	2025-09-17 15:29:13.902681
10	Licenses Drawing	Regulatory approval drawings and permit submissions	2	10	t	2025-09-17 15:29:13.902681
\.


--
-- Data for Name: progress_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.progress_adjustments (id, phase_id, engineer_id, work_log_id, adjustment_type, hours_logged, hours_based_progress, manual_progress_percentage, adjustment_reason, adjusted_by, created_at) FROM stdin;
\.


--
-- Data for Name: project_phases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) FROM stdin;
\.


--
-- Data for Name: project_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_settings (id, project_id, auto_advance_enabled, allow_timeline_mismatch, notification_settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_timeline_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_timeline_forecasts (id, project_id, forecast_type, predicted_completion_date, predicted_total_hours, predicted_budget_variance, confidence_interval_lower, confidence_interval_upper, risk_factors, assumptions, model_accuracy, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, start_date, planned_total_weeks, predicted_hours, actual_hours, status, created_by, created_at, updated_at, archived_at, archived_by) FROM stdin;
\.


--
-- Data for Name: resource_predictions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource_predictions (id, engineer_id, project_id, phase_id, prediction_type, predicted_value, confidence_level, prediction_horizon_days, historical_accuracy, algorithm_version, prediction_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: smart_notification_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.smart_notification_rules (id, rule_name, rule_type, target_roles, conditions, action_template, escalation_rules, is_active, priority_weight, cooldown_minutes, created_at) FROM stdin;
1	Critical Timeline Deviation	threshold_based	{supervisor}	{"severity": "critical", "warning_type": "timeline_deviation", "threshold_days": 3}	{"title": "Critical Timeline Alert", "urgency": "immediate", "escalation_hours": 2}	{}	t	50	60	2025-09-25 01:11:07.403135
2	Budget Overrun Prevention	predictive	{supervisor}	{"confidence_minimum": 80, "utilization_threshold": 85}	{"title": "Budget Risk Alert", "urgency": "high", "include_suggestions": true}	{}	t	50	60	2025-09-25 01:11:07.403135
3	Resource Conflict Detection	pattern_based	{supervisor}	{"workload_threshold": 40, "concurrent_projects": 2}	{"title": "Resource Conflict Warning", "urgency": "medium", "auto_suggest_reallocation": true}	{}	t	50	60	2025-09-25 01:11:07.403135
\.


--
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) FROM stdin;
1	12	t	t	t	t	t	t	medium	t	t	t	f	t	16:00:00	f	t	3	t	t	t	t	f	t	t	t	f	f	22:00:00	08:00:00	2025-10-01 20:24:43.205097+03	2025-10-01 20:24:43.205097+03
3	14	t	t	t	t	t	t	medium	t	t	t	f	t	16:00:00	f	t	3	t	t	t	t	f	t	t	t	f	f	22:00:00	08:00:00	2025-10-01 20:24:43.205097+03	2025-10-01 20:24:43.205097+03
4	15	t	t	t	t	t	t	medium	t	t	t	f	t	16:00:00	f	t	3	t	t	t	t	f	t	t	t	f	f	22:00:00	08:00:00	2025-10-01 20:24:43.205097+03	2025-10-01 20:24:43.205097+03
6	24	t	t	t	t	t	t	medium	t	t	t	f	t	16:00:00	f	t	3	t	t	t	t	f	t	t	t	f	f	22:00:00	08:00:00	2025-10-01 20:24:43.205097+03	2025-10-01 20:24:43.205097+03
5	23	t	t	t	t	t	t	medium	t	t	t	f	t	16:00:00	f	t	1	t	t	t	t	f	t	t	t	f	f	22:00:00	08:00:00	2025-10-01 20:24:43.205097+03	2025-10-02 01:30:02.508797+03
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) FROM stdin;
1	12	light	en	UTC	MM/DD/YYYY	t	t	instant	grid	20	t	30	pdf	decimal	[]	t	2025-10-01 20:24:42.806047+03	2025-10-01 20:24:42.806047+03
3	14	light	en	UTC	MM/DD/YYYY	t	t	instant	grid	20	t	30	pdf	decimal	[]	t	2025-10-01 20:24:42.806047+03	2025-10-01 20:24:42.806047+03
6	24	light	en	UTC	MM/DD/YYYY	t	t	instant	grid	20	t	30	pdf	decimal	[]	t	2025-10-01 20:24:42.806047+03	2025-10-01 20:24:42.806047+03
4	15	dark	en	UTC	MM/DD/YYYY	t	t	instant	grid	20	t	30	pdf	decimal	[]	t	2025-10-01 20:24:42.806047+03	2025-10-02 01:18:31.232918+03
5	23	light	en	UTC	MM/DD/YYYY	t	t	instant	team	20	t	30	pdf	decimal	[]	t	2025-10-01 20:24:42.806047+03	2025-10-02 01:20:51.71332+03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) FROM stdin;
12	mazen	mazenhelal15@gmail.com	$2b$12$8z1Dc.bzUPOcMZ4tKr7WUOz8n6QvJdIyps95fbqrYVlQJ/xa4kf.q	supervisor	t	2025-09-18 17:16:24.224118	2025-10-05 18:30:22.981225	f	Manager
41	Asmaa	asmaa@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
14	zico	zico@gmail.com	$2b$12$d0IaOgb61Y.K3/T6UvucwuH3eyP93mDpHIcKWwnIxajhX5Wv/gCU.	engineer	t	2025-09-19 20:29:12.508076	2025-10-05 18:30:22.981225	f	Engineer
23	Marwan Helal	marwanhelal15@gmail.com	$2b$12$TdjL65O1IuUYu6S/w20vQu/I/WzkZ4qjC713p4uwT28hK7t2gucGy	supervisor	t	2025-10-01 00:42:04.642195	2025-10-05 18:30:22.981225	t	Manager
56	Mr. Mohamed Ahmed	mohamed.ahmed@criteria.com	$2b$10$PHrCmFIQypSJM2GvzaGpdeNztTu7cRdplxbSIPtXHH5KIJeYihyvK	administrator	t	2025-10-05 18:37:46.522999	2025-10-05 18:37:46.522999	f	Administrator
24	Test Supervisor	testsupervisor@test.com	$2b$12$.0J/dQBtoRDFmtZULEohQexwjxQTHdKAcB.VcSq6vWYkf9kxPMpkG	supervisor	t	2025-10-01 19:42:28.932934	2025-10-05 18:30:22.981225	f	Manager
15	kkk	d@gmail.com	$2b$12$Qu5vqXkJVwAnl.nd1PP1hOrnbgcP0SbV8tZOAEGZ.1SMrnuxWo7hy	engineer	t	2025-09-22 16:30:30.621275	2025-10-05 18:30:22.981225	f	Engineer
34	Fakharany	fakharany@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
35	Baloumy	baloumy@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
36	Consultant	consultant@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
37	Rostom	rostom@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
38	Mourhan	mourhan@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
39	Nourhan	nourhan@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
40	serag	serag@mall.com	$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO	engineer	t	2025-10-04 17:39:06.185128	2025-10-05 18:30:22.981225	f	Engineer
42	Hesham Helal	hesham.helal@criteria.com	$2b$10$o7gNPTfJtZGdVzED454jcOK9KrCIIlmuRVsX5LWCAdx7wHUkI8JfC	supervisor	t	2025-10-05 18:37:45.766117	2025-10-05 18:37:45.766117	f	Chairman of the Board
43	Eng. Marwa Farrag	marwa.farrag@criteria.com	$2b$10$YBOJNiKnZvdn6gnaQCinyepQyvWueUhW47YF5cOK8ZD33IlhvgQ82	supervisor	t	2025-10-05 18:37:45.829035	2025-10-05 18:37:45.829035	f	Manager
44	Dr. Rania Fouad	rania.fouad@criteria.com	$2b$10$rN8o5RhBx5SJ.dkjh7rQvu5pts/nS1GJ7444U4GJF6Yum82PEjsDK	supervisor	t	2025-10-05 18:37:45.884435	2025-10-05 18:37:45.884435	f	Manager
45	Eng. Nehal Al Lithy	nehal.allithy@criteria.com	$2b$10$W7lse6iuqe2KF3826IPaMOhgWMNkxDfh2PMD8BPXAr1LN1OgqTxIS	supervisor	t	2025-10-05 18:37:45.937493	2025-10-05 18:37:45.937493	f	Manager
46	Eng. Rehab Ali	rehab.ali@criteria.com	$2b$10$FJYcaxxxSE0pQiPU9zq5OuOUWdLH/WWAhcXXMCPmvF6ZgKm3ceFUa	supervisor	t	2025-10-05 18:37:45.990161	2025-10-05 18:37:45.990161	f	Manager
47	Eng. Mohamed El Fakhrany	mohamed.elfakhrany@criteria.com	$2b$10$5NjqGm9bJa/5zAZ7NBUIkuT9W82NjMt/gqcLUi.FsoJgFSQHdDLoC	engineer	t	2025-10-05 18:37:46.044542	2025-10-05 18:37:46.044542	f	Engineer
48	Eng. Mahmoud Mourad	mahmoud.mourad@criteria.com	$2b$10$ANVzcuAA9G6eHgRWFi05DuyKnu5YMAUPwUmBZsUher7/DkZvz3ILi	engineer	t	2025-10-05 18:37:46.098282	2025-10-05 18:37:46.098282	f	Engineer
49	Eng. Omar Tarek	omar.tarek@criteria.com	$2b$10$pHWcuAoc.i6UDPlTiMY2.eqq1x0mjzld7eEtYsypDWRFeXJQSBpGC	engineer	t	2025-10-05 18:37:46.150917	2025-10-05 18:37:46.150917	f	Engineer
50	Eng. Simon Samy	simon.samy@criteria.com	$2b$10$ezgwBKOQ1uh5LNNyInmF1OnzRLNJmOAFOMv8uZSInebWxN/00L7h6	engineer	t	2025-10-05 18:37:46.203752	2025-10-05 18:37:46.203752	f	Engineer
51	Eng. Asmaa Farouk	asmaa.farouk@criteria.com	$2b$10$Bw29qrNUnrdm5bagU53rE.YsLH8xdv3kKuYfvDJWY3yScdvk6loYi	engineer	t	2025-10-05 18:37:46.256322	2025-10-05 18:37:46.256322	f	Engineer
52	Eng. Norhan Said	norhan.said@criteria.com	$2b$10$MQ/8MQMVC3QFvO4R21JTV.RqsKdGmrQCQ2o4juteC/cHlOE1OP9Ni	engineer	t	2025-10-05 18:37:46.30991	2025-10-05 18:37:46.30991	f	Engineer
53	Eng. Mohamed Baiumy	mohamed.baiumy@criteria.com	$2b$10$IHiZ/D2YUp8XmI04tWKn.uUMfaqnn13TBz2U3Kzy6xQ3meZqazLZW	engineer	t	2025-10-05 18:37:46.361853	2025-10-05 18:37:46.361853	f	Engineer
54	Mrs. Amany Adham	amany.adham@criteria.com	$2b$10$G9iPuKrFBYenXJ536kbpY.616iJbLbzrIo62hyd9.UBYQ96SyqonG	administrator	t	2025-10-05 18:37:46.414731	2025-10-05 18:37:46.414731	f	Administrator
55	Mr. Ramy Saria	ramy.saria@criteria.com	$2b$10$xZQJAb3gLfKwMuZ0IesFQuujqsacFsCb/2wwpH6rUfli2eo5llZVa	administrator	t	2025-10-05 18:37:46.467758	2025-10-05 18:37:46.467758	f	Administrator
57	Mrs. Hadeer Mahmoud	hadeer.mahmoud@criteria.com	$2b$10$ivGac6PO0gh3Adaiop2Yu.9NYPU1May.YujnCYYLnHQkTB.ljFB6S	administrator	t	2025-10-05 18:37:46.57869	2025-10-05 18:37:46.57869	f	Administrator
\.


--
-- Data for Name: warning_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warning_analytics (id, project_id, warning_type, severity, confidence_score, risk_probability, predicted_impact_days, predicted_impact_cost, warning_data, is_active, resolved_at, resolved_by, resolution_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) FROM stdin;
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 780, true);


--
-- Name: critical_path_analysis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.critical_path_analysis_id_seq', 1, false);


--
-- Name: phase_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phase_dependencies_id_seq', 1, false);


--
-- Name: predefined_phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.predefined_phases_id_seq', 10, true);


--
-- Name: progress_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.progress_adjustments_id_seq', 6, true);


--
-- Name: project_phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_phases_id_seq', 181, true);


--
-- Name: project_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_settings_id_seq', 33, true);


--
-- Name: project_timeline_forecasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_timeline_forecasts_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 18, true);


--
-- Name: resource_predictions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resource_predictions_id_seq', 1, false);


--
-- Name: smart_notification_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.smart_notification_rules_id_seq', 3, true);


--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 7, true);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_preferences_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 57, true);


--
-- Name: warning_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warning_analytics_id_seq', 1, false);


--
-- Name: work_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_logs_id_seq', 62, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: critical_path_analysis critical_path_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critical_path_analysis
    ADD CONSTRAINT critical_path_analysis_pkey PRIMARY KEY (id);


--
-- Name: phase_dependencies phase_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies
    ADD CONSTRAINT phase_dependencies_pkey PRIMARY KEY (id);


--
-- Name: phase_dependencies phase_dependencies_predecessor_phase_id_successor_phase_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies
    ADD CONSTRAINT phase_dependencies_predecessor_phase_id_successor_phase_id_key UNIQUE (predecessor_phase_id, successor_phase_id);


--
-- Name: predefined_phases predefined_phases_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.predefined_phases
    ADD CONSTRAINT predefined_phases_name_key UNIQUE (name);


--
-- Name: predefined_phases predefined_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.predefined_phases
    ADD CONSTRAINT predefined_phases_pkey PRIMARY KEY (id);


--
-- Name: progress_adjustments progress_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments
    ADD CONSTRAINT progress_adjustments_pkey PRIMARY KEY (id);


--
-- Name: project_phases project_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases
    ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);


--
-- Name: project_phases project_phases_project_id_phase_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases
    ADD CONSTRAINT project_phases_project_id_phase_order_key UNIQUE (project_id, phase_order);


--
-- Name: project_settings project_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_settings
    ADD CONSTRAINT project_settings_pkey PRIMARY KEY (id);


--
-- Name: project_settings project_settings_project_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_settings
    ADD CONSTRAINT project_settings_project_id_key UNIQUE (project_id);


--
-- Name: project_timeline_forecasts project_timeline_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline_forecasts
    ADD CONSTRAINT project_timeline_forecasts_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: resource_predictions resource_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions
    ADD CONSTRAINT resource_predictions_pkey PRIMARY KEY (id);


--
-- Name: smart_notification_rules smart_notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_notification_rules
    ADD CONSTRAINT smart_notification_rules_pkey PRIMARY KEY (id);


--
-- Name: smart_notification_rules smart_notification_rules_rule_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_notification_rules
    ADD CONSTRAINT smart_notification_rules_rule_name_key UNIQUE (rule_name);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warning_analytics warning_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warning_analytics
    ADD CONSTRAINT warning_analytics_pkey PRIMARY KEY (id);


--
-- Name: work_logs work_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_critical_path_analysis_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_critical_path_analysis_date ON public.critical_path_analysis USING btree (project_id, analysis_date DESC);


--
-- Name: idx_phase_dependencies_critical_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phase_dependencies_critical_path ON public.phase_dependencies USING btree (project_id, is_critical_path);


--
-- Name: idx_progress_adjustments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_adjustments_created_at ON public.progress_adjustments USING btree (created_at DESC);


--
-- Name: idx_progress_adjustments_engineer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_adjustments_engineer ON public.progress_adjustments USING btree (engineer_id);


--
-- Name: idx_progress_adjustments_phase; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_adjustments_phase ON public.progress_adjustments USING btree (phase_id);


--
-- Name: idx_progress_adjustments_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_adjustments_type ON public.progress_adjustments USING btree (adjustment_type);


--
-- Name: idx_progress_adjustments_work_log; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_adjustments_work_log ON public.progress_adjustments USING btree (work_log_id) WHERE (work_log_id IS NOT NULL);


--
-- Name: idx_project_phases_early_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_early_access ON public.project_phases USING btree (project_id, early_access_granted);


--
-- Name: idx_project_phases_early_access_granted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_early_access_granted_by ON public.project_phases USING btree (early_access_granted_by) WHERE (early_access_granted_by IS NOT NULL);


--
-- Name: idx_project_phases_early_access_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_early_access_status ON public.project_phases USING btree (early_access_status) WHERE (early_access_granted = true);


--
-- Name: idx_project_phases_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_order ON public.project_phases USING btree (project_id, phase_order);


--
-- Name: idx_project_phases_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_project_id ON public.project_phases USING btree (project_id);


--
-- Name: idx_project_phases_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_phases_status ON public.project_phases USING btree (status);


--
-- Name: idx_projects_archived_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_archived_at ON public.projects USING btree (archived_at) WHERE (archived_at IS NOT NULL);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_projects_status_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status_archived ON public.projects USING btree (status, archived_at);


--
-- Name: idx_resource_predictions_engineer_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resource_predictions_engineer_type ON public.resource_predictions USING btree (engineer_id, prediction_type, expires_at);


--
-- Name: idx_timeline_forecasts_project_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timeline_forecasts_project_confidence ON public.project_timeline_forecasts USING btree (project_id, forecast_type, created_at DESC);


--
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_active ON public.users USING btree (role, is_active);


--
-- Name: idx_warning_analytics_project_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warning_analytics_project_severity ON public.warning_analytics USING btree (project_id, severity, is_active);


--
-- Name: idx_warning_analytics_type_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warning_analytics_type_confidence ON public.warning_analytics USING btree (warning_type, confidence_score DESC);


--
-- Name: idx_work_logs_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_logs_date ON public.work_logs USING btree (date);


--
-- Name: idx_work_logs_engineer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_logs_engineer ON public.work_logs USING btree (engineer_id);


--
-- Name: idx_work_logs_project_phase; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_logs_project_phase ON public.work_logs USING btree (project_id, phase_id);


--
-- Name: work_logs smart_budget_warning_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER smart_budget_warning_trigger AFTER INSERT OR UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.trigger_budget_warning();


--
-- Name: user_notification_settings trigger_update_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_notification_settings_updated_at();


--
-- Name: user_preferences trigger_update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_preferences_updated_at();


--
-- Name: work_logs update_project_hours_on_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_hours_on_delete AFTER DELETE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.update_project_actual_hours();


--
-- Name: work_logs update_project_hours_on_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_hours_on_insert AFTER INSERT ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.update_project_actual_hours();


--
-- Name: work_logs update_project_hours_on_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_hours_on_update AFTER UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.update_project_actual_hours();


--
-- Name: project_phases update_project_phases_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON public.project_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_settings update_project_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_settings_updated_at BEFORE UPDATE ON public.project_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: work_logs update_work_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: critical_path_analysis critical_path_analysis_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critical_path_analysis
    ADD CONSTRAINT critical_path_analysis_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: phase_dependencies phase_dependencies_predecessor_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies
    ADD CONSTRAINT phase_dependencies_predecessor_phase_id_fkey FOREIGN KEY (predecessor_phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;


--
-- Name: phase_dependencies phase_dependencies_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies
    ADD CONSTRAINT phase_dependencies_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: phase_dependencies phase_dependencies_successor_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies
    ADD CONSTRAINT phase_dependencies_successor_phase_id_fkey FOREIGN KEY (successor_phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;


--
-- Name: progress_adjustments progress_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments
    ADD CONSTRAINT progress_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id);


--
-- Name: progress_adjustments progress_adjustments_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments
    ADD CONSTRAINT progress_adjustments_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: progress_adjustments progress_adjustments_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments
    ADD CONSTRAINT progress_adjustments_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;


--
-- Name: progress_adjustments progress_adjustments_work_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments
    ADD CONSTRAINT progress_adjustments_work_log_id_fkey FOREIGN KEY (work_log_id) REFERENCES public.work_logs(id) ON DELETE SET NULL;


--
-- Name: project_phases project_phases_early_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases
    ADD CONSTRAINT project_phases_early_access_granted_by_fkey FOREIGN KEY (early_access_granted_by) REFERENCES public.users(id);


--
-- Name: project_phases project_phases_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases
    ADD CONSTRAINT project_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_settings project_settings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_settings
    ADD CONSTRAINT project_settings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_timeline_forecasts project_timeline_forecasts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline_forecasts
    ADD CONSTRAINT project_timeline_forecasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: project_timeline_forecasts project_timeline_forecasts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline_forecasts
    ADD CONSTRAINT project_timeline_forecasts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: resource_predictions resource_predictions_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions
    ADD CONSTRAINT resource_predictions_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resource_predictions resource_predictions_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions
    ADD CONSTRAINT resource_predictions_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;


--
-- Name: resource_predictions resource_predictions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions
    ADD CONSTRAINT resource_predictions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: warning_analytics warning_analytics_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warning_analytics
    ADD CONSTRAINT warning_analytics_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: warning_analytics warning_analytics_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warning_analytics
    ADD CONSTRAINT warning_analytics_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: work_logs work_logs_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(id);


--
-- Name: work_logs work_logs_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;


--
-- Name: work_logs work_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict L3Rp8ZTwDeluixajzEUBz6dULqGuKAZbOojV8AOWBkSeeOpJlb9nwt3aduqNGJ1

