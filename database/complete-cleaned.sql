--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-10-10 18:35:58

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 17475)
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
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Complete history of all system changes';


--
-- TOC entry 227 (class 1259 OID 17474)
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
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 227
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 242 (class 1259 OID 17690)
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
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE critical_path_analysis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.critical_path_analysis IS 'Project critical path optimization and bottleneck identification';


--
-- TOC entry 241 (class 1259 OID 17689)
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
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 241
-- Name: critical_path_analysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.critical_path_analysis_id_seq OWNED BY public.critical_path_analysis.id;


--
-- TOC entry 224 (class 1259 OID 17419)
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
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE project_phases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_phases IS 'Selected phases for each project with workflow status';


--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.status IS 'Workflow status: not_started -> ready -> in_progress -> submitted -> approved -> completed';


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.delay_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.delay_reason IS 'Delay attribution: none, client, company';


--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.early_access_granted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted IS 'Whether supervisor has granted early access to this phase';


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.early_access_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_status IS 'Work status for early access: not_accessible, accessible, in_progress, work_completed';


--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.early_access_granted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted_by IS 'Supervisor who granted early access permission';


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.early_access_granted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_granted_at IS 'Timestamp when early access was granted';


--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.early_access_note; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.early_access_note IS 'Supervisor note explaining reason for early access';


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.submitted_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.submitted_date IS 'Date when the phase was submitted to the client for review';


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN project_phases.approved_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_phases.approved_date IS 'Date when the client approved the phase';


--
-- TOC entry 222 (class 1259 OID 17398)
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
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.projects IS 'Main projects table with timeline and hour tracking';


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN projects.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.status IS 'Overall project status: active, on_hold, completed, cancelled';


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN projects.archived_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.archived_at IS 'Timestamp when project was archived by supervisor';


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN projects.archived_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.archived_by IS 'ID of supervisor who archived the project';


--
-- TOC entry 218 (class 1259 OID 17371)
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
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'System users - engineers and supervisors';


--
-- TOC entry 226 (class 1259 OID 17446)
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
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE work_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.work_logs IS 'Engineer time tracking entries per phase';


--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN work_logs.hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.work_logs.hours IS 'Hours worked (max 24 per day)';


--
-- TOC entry 236 (class 1259 OID 17603)
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
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE phase_dependencies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.phase_dependencies IS 'Phase relationship mapping for connected intelligence and cascade analysis';


--
-- TOC entry 235 (class 1259 OID 17602)
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
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 235
-- Name: phase_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.phase_dependencies_id_seq OWNED BY public.phase_dependencies.id;


--
-- TOC entry 220 (class 1259 OID 17384)
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
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE predefined_phases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.predefined_phases IS 'Architecture-specific predefined project phases';


--
-- TOC entry 219 (class 1259 OID 17383)
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
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 219
-- Name: predefined_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.predefined_phases_id_seq OWNED BY public.predefined_phases.id;


--
-- TOC entry 250 (class 1259 OID 27021)
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
-- TOC entry 249 (class 1259 OID 27020)
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
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 249
-- Name: progress_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.progress_adjustments_id_seq OWNED BY public.progress_adjustments.id;


--
-- TOC entry 223 (class 1259 OID 17418)
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
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 223
-- Name: project_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_phases_id_seq OWNED BY public.project_phases.id;


--
-- TOC entry 230 (class 1259 OID 17490)
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
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE project_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_settings IS 'Per-project configuration settings';


--
-- TOC entry 229 (class 1259 OID 17489)
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
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 229
-- Name: project_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_settings_id_seq OWNED BY public.project_settings.id;


--
-- TOC entry 240 (class 1259 OID 17665)
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
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE project_timeline_forecasts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_timeline_forecasts IS 'Predictive project completion analysis with risk factors';


--
-- TOC entry 239 (class 1259 OID 17664)
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
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 239
-- Name: project_timeline_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_timeline_forecasts_id_seq OWNED BY public.project_timeline_forecasts.id;


--
-- TOC entry 221 (class 1259 OID 17397)
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
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 221
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- TOC entry 238 (class 1259 OID 17633)
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
-- TOC entry 5322 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE resource_predictions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.resource_predictions IS 'ML-powered resource forecasting with confidence intervals';


--
-- TOC entry 237 (class 1259 OID 17632)
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
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 237
-- Name: resource_predictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resource_predictions_id_seq OWNED BY public.resource_predictions.id;


--
-- TOC entry 244 (class 1259 OID 17711)
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
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE smart_notification_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.smart_notification_rules IS 'Configurable intelligent notification rules engine';


--
-- TOC entry 243 (class 1259 OID 17710)
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
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 243
-- Name: smart_notification_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.smart_notification_rules_id_seq OWNED BY public.smart_notification_rules.id;


--
-- TOC entry 248 (class 1259 OID 26740)
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
-- TOC entry 247 (class 1259 OID 26739)
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
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 247
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 246 (class 1259 OID 26701)
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
-- TOC entry 245 (class 1259 OID 26700)
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
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 245
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- TOC entry 217 (class 1259 OID 17370)
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
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 234 (class 1259 OID 17572)
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
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE warning_analytics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.warning_analytics IS 'Advanced warning system with confidence scoring and predictive analysis';


--
-- TOC entry 233 (class 1259 OID 17571)
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
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 233
-- Name: warning_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warning_analytics_id_seq OWNED BY public.warning_analytics.id;


--
-- TOC entry 225 (class 1259 OID 17445)
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
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 225
-- Name: work_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_logs_id_seq OWNED BY public.work_logs.id;


--
-- TOC entry 4853 (class 2604 OID 17478)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 4887 (class 2604 OID 17693)
-- Name: critical_path_analysis id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.critical_path_analysis ALTER COLUMN id SET DEFAULT nextval('public.critical_path_analysis_id_seq'::regclass);


--
-- TOC entry 4870 (class 2604 OID 17606)
-- Name: phase_dependencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phase_dependencies ALTER COLUMN id SET DEFAULT nextval('public.phase_dependencies_id_seq'::regclass);


--
-- TOC entry 4825 (class 2604 OID 17387)
-- Name: predefined_phases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.predefined_phases ALTER COLUMN id SET DEFAULT nextval('public.predefined_phases_id_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 27024)
-- Name: progress_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_adjustments ALTER COLUMN id SET DEFAULT nextval('public.progress_adjustments_id_seq'::regclass);


--
-- TOC entry 4835 (class 2604 OID 17422)
-- Name: project_phases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_phases ALTER COLUMN id SET DEFAULT nextval('public.project_phases_id_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 17493)
-- Name: project_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_settings ALTER COLUMN id SET DEFAULT nextval('public.project_settings_id_seq'::regclass);


--
-- TOC entry 4881 (class 2604 OID 17668)
-- Name: project_timeline_forecasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline_forecasts ALTER COLUMN id SET DEFAULT nextval('public.project_timeline_forecasts_id_seq'::regclass);


--
-- TOC entry 4829 (class 2604 OID 17401)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 4875 (class 2604 OID 17636)
-- Name: resource_predictions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_predictions ALTER COLUMN id SET DEFAULT nextval('public.resource_predictions_id_seq'::regclass);


--
-- TOC entry 4895 (class 2604 OID 17714)
-- Name: smart_notification_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_notification_rules ALTER COLUMN id SET DEFAULT nextval('public.smart_notification_rules_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 26743)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 4904 (class 2604 OID 26704)
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- TOC entry 4820 (class 2604 OID 17374)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4861 (class 2604 OID 17575)
-- Name: warning_analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warning_analytics ALTER COLUMN id SET DEFAULT nextval('public.warning_analytics_id_seq'::regclass);


--
-- TOC entry 4848 (class 2604 OID 17449)
-- Name: work_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs ALTER COLUMN id SET DEFAULT nextval('public.work_logs_id_seq'::regclass);


--
-- TOC entry 5264 (class 0 OID 17475)
-- Dependencies: 228
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (34, 'users', 12, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-18 17:16:24.533407');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (35, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:37.733844');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (36, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:46.198411');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (37, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:50.605413');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (38, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:51.564709');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (39, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:52.59143');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (40, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:16:56.407674');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (41, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:21:44.922493');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (42, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-18 17:44:58.390836');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (43, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 17:45:01.88338');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (44, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-18 17:45:07.742695');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (46, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 22:21:25.992868');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (47, 'projects', 3, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-18 22:28:44.650671');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (48, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 04:01:08.806325');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (49, 'projects', 3, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:33:05.126753');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (50, 'projects', 2, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:33:08.63509');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (51, 'projects', 1, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:33:11.583369');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (52, 'projects', 3, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:33:26.423896');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (53, 'projects', 3, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:33:49.513622');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (54, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-19 19:35:08.887746');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (55, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 19:35:11.089311');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (56, 'projects', 2, 'DELETE', 12, NULL, NULL, 'Project soft deleted (status set to cancelled)', '2025-09-19 19:36:51.150459');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (57, 'projects', 4, 'CREATE', 12, NULL, NULL, 'Project created with 5 phases', '2025-09-19 19:38:35.968854');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (58, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-19 19:41:29.544646');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (59, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 19:41:54.354452');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (60, 'project_phases', 24, 'START', 12, NULL, NULL, 'Phase started', '2025-09-19 20:12:35.244054');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (61, 'project_phases', 24, 'SUBMIT', 12, NULL, NULL, 'Phase submitted to client', '2025-09-19 20:12:44.339119');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (62, 'project_phases', 25, 'UNLOCK', 12, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-09-19 20:13:12.37524');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (63, 'project_phases', 24, 'APPROVE', 12, NULL, NULL, 'Phase approved after client acceptance', '2025-09-19 20:13:12.37524');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (64, 'users', 5, 'DELETE', 12, NULL, NULL, 'User account deactivated: emily.wilson@trackms.com', '2025-09-19 20:14:00.656255');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (65, 'users', 5, 'REACTIVATE', 12, NULL, NULL, 'User account reactivated: emily.wilson@trackms.com', '2025-09-19 20:18:08.940899');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (66, 'users', 4, 'DELETE', 12, NULL, NULL, 'User account permanently deleted: mike.davis@trackms.com', '2025-09-19 20:18:33.860734');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (67, 'users', 5, 'DELETE', 12, NULL, NULL, 'User account permanently deleted: emily.wilson@trackms.com', '2025-09-19 20:24:48.421396');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (68, 'users', 3, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: sarah.johnson@trackms.com', '2025-09-19 20:28:33.365869');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (69, 'users', 14, 'CREATE_ENGINEER', 12, NULL, NULL, 'Engineer account created for: zico@gmail.com', '2025-09-19 20:29:12.859691');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (70, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-19 20:29:22.899238');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (71, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-19 20:29:24.825596');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (72, 'project_phases', 25, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-19 20:30:18.924434');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (73, 'work_logs', 6, 'CREATE', 14, NULL, NULL, 'Logged 3 hours on Concept Generation', '2025-09-19 20:30:18.925779');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (74, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-19 20:30:41.033635');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (75, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 20:30:46.407479');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (76, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-19 20:37:29.686267');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (77, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-19 20:37:33.616536');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (1, 'projects', 1, 'INSERT', 12, NULL, NULL, 'Sample project created during system setup', '2025-09-17 15:29:13.902681');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (2, 'project_phases', 1, 'INSERT', 12, NULL, NULL, 'Initial project phases setup', '2025-09-17 15:29:13.902681');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (6, 'users', 7, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-17 15:54:09.786676');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (7, 'projects', 2, 'CREATE', 12, NULL, NULL, 'Project created with 3 phases', '2025-09-17 15:59:09.510429');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (12, 'users', 9, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-17 19:52:09.85309');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (13, 'users', 9, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:52:19.237112');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (14, 'users', 9, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:53:31.476065');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (78, 'work_logs', 6, 'CREATE', 14, NULL, NULL, 'Logged 24 hours on Concept Generation', '2025-09-19 20:37:58.215677');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (79, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-19 20:38:02.677886');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (80, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 20:38:06.090676');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (81, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-19 20:55:45.472516');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (82, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-19 20:55:50.906378');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (83, 'work_logs', 6, 'CREATE', 14, NULL, NULL, 'Logged 5 hours on Concept Generation', '2025-09-19 20:56:05.700185');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (84, 'work_logs', 6, 'CREATE', 14, NULL, NULL, 'Logged 8 hours on Concept Generation', '2025-09-19 20:56:44.326428');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (85, 'work_logs', 6, 'CREATE', 14, NULL, NULL, 'Logged 8 hours on Concept Generation', '2025-09-19 20:57:04.831604');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (86, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-19 21:10:32.44156');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (87, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-19 21:10:35.916265');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (88, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 04:45:28.003113');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (89, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 04:45:32.00365');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (90, 'work_logs', 12, 'CREATE', 14, NULL, NULL, 'Logged 4 hours on Concept Generation', '2025-09-20 04:45:41.572816');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (91, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 04:45:46.979379');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (92, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 04:45:58.312315');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (93, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 04:58:34.473693');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (94, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 04:58:41.665232');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (95, 'work_logs', 12, 'DELETE', 14, NULL, NULL, 'Work log deleted: 4.00 hours on Sat Sep 20 2025 00:00:00 GMT+0300 (Eastern European Summer Time)', '2025-09-20 05:24:25.886795');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (96, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 05:25:26.730627');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (97, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 05:25:29.939148');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (98, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 05:25:53.553343');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (99, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 05:25:57.944867');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (100, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 05:33:39.989694');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (101, 'users', 8, 'UPDATE', 12, NULL, NULL, 'User updated: name, email, is_active', '2025-09-20 05:43:19.057058');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (102, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 19:41:55.643677');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (103, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 19:42:05.751402');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (104, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 19:42:09.606266');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (105, 'users', 8, 'REACTIVATE', 12, NULL, NULL, 'User account reactivated: testsupervisor@test.com', '2025-09-20 19:45:58.181885');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (106, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 20:13:54.220948');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (107, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 20:28:45.076291');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (108, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 20:29:13.494718');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (109, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 20:29:49.084268');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (110, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 20:30:25.323675');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (111, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 20:30:38.71639');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (112, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 20:30:44.044279');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (113, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 20:35:51.779396');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (114, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 22:24:56.336012');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (115, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 22:25:15.702682');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (116, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 22:25:46.110446');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (117, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 22:27:09.503136');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (118, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 22:27:19.966679');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (119, 'work_logs', 13, 'CREATE', 14, NULL, NULL, 'Logged 5 hours on Concept Generation', '2025-09-20 22:28:02.565386');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (120, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 22:31:27.197382');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (121, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 22:31:36.228589');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (122, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 22:37:49.771416');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (123, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 22:37:57.29822');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (124, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 22:42:43.388532');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (125, 'work_logs', 13, 'CREATE', 14, NULL, NULL, 'Logged 1 hours on Concept Generation', '2025-09-20 22:43:41.744481');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (126, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 22:44:19.904221');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (127, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 22:44:25.121548');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (128, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 23:46:43.512852');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (129, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 23:49:40.57151');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (130, 'projects', 5, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-20 23:52:24.368553');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (131, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 23:52:33.397435');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (132, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-20 23:52:40.912934');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (133, 'project_phases', 29, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-20 23:53:52.648201');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (134, 'work_logs', 14, 'CREATE', 14, NULL, NULL, 'Logged 8 hours on Preconcept Design', '2025-09-20 23:53:52.652086');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (135, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-20 23:57:57.383041');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (136, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-20 23:58:03.432282');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (137, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-20 23:59:57.323176');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (138, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 00:00:11.424323');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (139, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 00:29:02.663136');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (140, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 00:32:04.017379');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (141, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 00:33:26.889385');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (142, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-21 00:33:31.015858');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (143, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-21 00:35:07.561022');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (144, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-21 00:36:36.128568');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (145, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-21 00:36:39.2643');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (146, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 00:36:42.974652');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (147, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 00:40:13.468892');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (148, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 00:45:54.211492');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (149, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 00:53:15.407269');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (150, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 00:54:48.242534');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (151, 'users', 2, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: john.smith@trackms.com', '2025-09-21 01:01:43.934695');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (152, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:01:58.451937');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (153, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:02:00.748733');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (154, 'users', 8, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: testsupervisor@test.com', '2025-09-21 01:07:31.019712');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (155, 'users', 6, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: test@example.com', '2025-09-21 01:07:48.959966');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (156, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:37:30.51977');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (157, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:38:12.683186');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (158, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:54:14.34111');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (159, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:54:48.459068');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (160, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:55:03.326126');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (161, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:55:19.609899');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (162, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:57:42.264675');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (163, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:58:21.963044');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (164, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 01:58:43.291386');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (165, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 01:59:50.842621');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (166, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 02:04:24.033088');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (167, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 02:06:19.066435');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (168, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 02:07:36.317816');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (169, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 02:07:48.268625');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (170, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 02:10:25.774523');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (171, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 02:11:32.697171');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (172, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 02:14:43.23304');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (173, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 02:14:58.791884');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (174, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 02:17:59.92104');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (175, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 02:18:16.928538');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (176, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 16:19:35.897868');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (177, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 16:20:03.889291');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (178, 'projects', 5, 'UPDATE', 12, NULL, NULL, 'Project updated: name, status, planned_total_weeks, predicted_hours, start_date', '2025-09-21 16:20:39.528765');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (179, 'projects', 5, 'UPDATE', 12, NULL, NULL, 'Project updated: name, status, planned_total_weeks, predicted_hours, start_date', '2025-09-21 16:21:14.853667');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (180, 'projects', 5, 'UPDATE', 12, NULL, NULL, 'Project updated: name, status, planned_total_weeks, predicted_hours, start_date', '2025-09-21 16:21:36.411227');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (181, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 17:04:54.727979');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (182, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 17:06:24.074654');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (183, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 23:45:20.099916');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (184, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 23:47:38.101659');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (185, 'projects', 6, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-21 23:47:58.546157');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (186, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-21 23:49:27.112868');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (187, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-21 23:49:33.33215');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (188, 'project_phases', 39, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-21 23:50:38.049592');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (189, 'work_logs', 15, 'CREATE', 14, NULL, NULL, 'Logged 4 hours on Preconcept Design', '2025-09-21 23:50:38.05735');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (190, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-21 23:51:08.722803');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (191, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-21 23:51:13.43733');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (192, 'project_phases', 39, 'SUBMIT', 12, NULL, NULL, 'Phase submitted to client', '2025-09-22 00:58:23.624475');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (193, 'project_phases', 40, 'UNLOCK', 12, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-09-22 00:58:30.038337');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (194, 'project_phases', 39, 'APPROVE', 12, NULL, NULL, 'Phase approved after client acceptance', '2025-09-22 00:58:30.038337');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (195, 'project_phases', 39, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-22 00:58:33.820168');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (196, 'project_phases', 39, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-22 00:58:41.776193');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (197, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 03:23:18.586563');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (198, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 03:23:20.984071');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (199, 'project_phases', 25, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_6_1758500601018', '2025-09-22 03:23:30.024655');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (200, 'project_phases', 25, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_8_1758500601018', '2025-09-22 03:23:30.138009');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (201, 'project_phases', 25, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_9_1758500601018', '2025-09-22 03:23:30.26193');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (202, 'project_phases', 25, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_10_1758500601018', '2025-09-22 03:23:30.360138');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (203, 'project_phases', 26, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_11_1758500601018', '2025-09-22 03:23:30.427653');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (204, 'project_phases', 25, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_13_1758500601018', '2025-09-22 03:23:30.492923');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (205, 'project_phases', 29, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_14_1758500601018', '2025-09-22 03:23:30.563696');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (206, 'project_phases', 39, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_15_1758500601018', '2025-09-22 03:23:30.621942');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (207, 'project_phases', 25, 'NOTIFICATION_READ', 12, NULL, NULL, 'User read notification: approval_10_1758500601018', '2025-09-22 03:23:35.584525');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (208, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_6_1758500601018', '2025-09-22 03:23:44.755393');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (209, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_8_1758500601018', '2025-09-22 03:23:44.946002');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (210, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_9_1758500601018', '2025-09-22 03:23:45.09282');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (211, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_10_1758500601018', '2025-09-22 03:23:45.169215');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (212, 'project_phases', 26, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_11_1758500601018', '2025-09-22 03:23:45.248926');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (213, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_13_1758500601018', '2025-09-22 03:23:45.319493');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (214, 'project_phases', 29, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_14_1758500601018', '2025-09-22 03:23:45.386468');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (215, 'project_phases', 39, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_15_1758500601018', '2025-09-22 03:23:45.452143');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (216, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_6_1758500601018', '2025-09-22 03:23:48.503388');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (217, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_8_1758500601018', '2025-09-22 03:23:48.654959');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (218, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_9_1758500601018', '2025-09-22 03:23:48.752605');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (219, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_10_1758500601018', '2025-09-22 03:23:48.822461');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (220, 'project_phases', 26, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_11_1758500601018', '2025-09-22 03:23:48.888318');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (221, 'project_phases', 25, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_13_1758500601018', '2025-09-22 03:23:48.956316');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (222, 'project_phases', 29, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_14_1758500601018', '2025-09-22 03:23:49.03268');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (223, 'project_phases', 39, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_15_1758500601018', '2025-09-22 03:23:49.105387');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (224, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 03:23:55.402215');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (225, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-22 03:23:59.316284');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (226, 'project_phases', 40, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-22 03:24:23.206456');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (227, 'work_logs', 16, 'CREATE', 14, NULL, NULL, 'Logged 8 hours on Concept Generation', '2025-09-22 03:24:23.215056');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (228, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-22 03:24:33.450287');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (229, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 03:24:37.665501');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (230, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 15:58:32.367813');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (231, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:00:05.14822');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (232, 'projects', 6, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 16:00:31.382094');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (233, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:02:10.772013');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (234, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:02:13.894968');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (235, 'projects', 5, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 16:02:22.699738');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (236, 'projects', 4, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 16:02:26.559657');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (237, 'projects', 7, 'CREATE', 12, NULL, NULL, 'Project created with 6 phases', '2025-09-22 16:03:45.149161');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (238, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:03:57.42489');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (239, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-22 16:04:04.401234');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (240, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-22 16:06:46.41873');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (241, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:07:32.716545');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (242, 'projects', 7, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 16:07:48.791243');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (243, 'projects', 8, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-22 16:08:44.017592');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (244, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:08:52.988312');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (245, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-22 16:08:57.104584');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (246, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-22 16:09:27.539624');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (247, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:09:33.680401');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (248, 'projects', 8, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 16:09:41.789971');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (249, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:09:45.186543');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (250, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:10:12.698518');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (251, 'projects', 9, 'CREATE', 12, NULL, NULL, 'Project created with 6 phases', '2025-09-22 16:11:10.599542');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (252, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:11:26.077815');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (253, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-22 16:11:30.481031');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (254, 'project_phases', 65, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-22 16:13:12.292943');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (255, 'work_logs', 17, 'CREATE', 14, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-22 16:13:12.294098');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (256, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-22 16:15:50.468529');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (257, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:15:56.850695');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (258, 'project_phases', 65, 'SUBMIT', 12, NULL, NULL, 'Phase submitted to client', '2025-09-22 16:20:00.715304');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (259, 'project_phases', 66, 'UNLOCK', 12, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-09-22 16:20:07.560707');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (260, 'project_phases', 65, 'APPROVE', 12, NULL, NULL, 'Phase approved after client acceptance', '2025-09-22 16:20:07.560707');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (261, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:20:13.944261');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (262, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-22 16:20:17.964246');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (263, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-22 16:29:36.955653');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (264, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:29:44.018779');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (265, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:29:50.091693');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (266, 'users', 15, 'REGISTER', 15, NULL, NULL, 'User registered with role: engineer', '2025-09-22 16:30:30.932768');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (267, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 16:33:08.334577');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (268, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 16:33:25.722605');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (269, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 16:33:30.781607');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (270, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 16:36:07.424729');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (271, 'project_phases', 66, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-22 16:36:19.058158');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (272, 'work_logs', 18, 'CREATE', 15, NULL, NULL, 'Logged 8 hours on Concept Generation', '2025-09-22 16:36:19.061426');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (273, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 16:36:22.435411');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (274, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:36:27.518379');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (275, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 16:37:59.331994');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (276, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 16:38:09.080559');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (277, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 18:09:28.300667');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (278, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 18:09:33.499126');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (279, 'database', 0, 'MIGRATION', NULL, NULL, NULL, 'Added early access support to project_phases table', '2025-09-22 18:36:21.257046');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (281, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 19:07:05.243049');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (282, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 19:07:21.885249');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (283, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 19:27:18.854788');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (284, 'project_phases', 70, 'EARLY_ACCESS_GRANT', 12, NULL, NULL, 'Early access granted for Working Drawings by mazen', '2025-09-22 19:27:41.445457');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (285, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 19:27:48.858909');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (286, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 19:28:09.724559');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (287, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 19:28:29.474845');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (288, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 19:29:03.306232');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (289, 'project_phases', 70, 'START', 12, NULL, NULL, 'Starting phase with early access', '2025-09-22 19:29:14.15481');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (290, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 19:29:27.291156');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (291, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 19:29:31.173271');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (292, 'work_logs', 19, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Working Drawings', '2025-09-22 19:29:43.437815');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (293, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 19:29:46.88769');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (294, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 19:30:10.962371');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (295, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 19:37:53.914135');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (296, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 19:37:56.993883');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (297, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 20:10:26.324453');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (298, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 20:11:24.361224');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (299, 'projects', 9, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-22 20:12:23.327891');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (300, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 20:13:48.230337');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (301, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 20:15:48.247214');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (302, 'projects', 10, 'CREATE', 12, NULL, NULL, 'Project created with 6 phases', '2025-09-22 20:17:08.444664');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (303, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 20:19:23.397101');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (304, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 20:19:31.550294');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (305, 'project_phases', 71, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-22 20:20:06.865802');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (306, 'work_logs', 20, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-22 20:20:06.866999');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (307, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 20:20:11.658186');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (308, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 20:20:14.958772');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (309, 'project_phases', 75, 'EARLY_ACCESS_GRANT', 12, NULL, NULL, 'Early access granted for Schematic Design by mazen', '2025-09-22 20:21:18.642096');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (310, 'project_phases', 75, 'START', 12, NULL, NULL, 'Starting phase with early access', '2025-09-22 20:21:25.186046');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (311, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 20:21:28.705564');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (312, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 20:21:32.290888');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (313, 'work_logs', 21, 'CREATE', 15, NULL, NULL, 'Logged 8 hours on Schematic Design', '2025-09-22 20:21:40.224684');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (314, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 20:21:44.561807');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (315, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 20:21:47.41649');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (316, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-22 20:28:23.863772');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (317, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-22 20:28:27.584571');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (318, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-22 20:30:23.165492');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (319, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 20:30:29.891492');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (320, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-24 18:12:49.361117');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (321, 'database', 0, 'MIGRATION', NULL, NULL, NULL, 'Enhanced smart professional warning system with predictive analytics', '2025-09-25 01:11:07.403135');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (322, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-25 02:08:53.920593');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (323, 'project_phases', 72, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-25 02:09:08.160333');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (324, 'project_phases', 71, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-25 02:09:11.479886');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (325, 'project_phases', 71, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_20_1758755334016', '2025-09-25 02:09:40.643352');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (326, 'project_phases', 75, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_21_1758755334016', '2025-09-25 02:09:40.652608');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (327, 'project_phases', 71, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_20_1758755334016', '2025-09-25 02:09:46.834569');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (328, 'project_phases', 71, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_20_1758755334016', '2025-09-25 02:09:49.116409');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (329, 'project_phases', 71, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_20_1758755334016', '2025-09-25 02:09:54.433929');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (330, 'project_phases', 71, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_20_1758755410904', '2025-09-25 02:10:14.941064');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (331, 'project_phases', 75, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: approval_21_1758755410904', '2025-09-25 02:10:14.948405');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (333, 'project_phases', 72, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-25 13:01:03.857423');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (334, 'project_phases', 71, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-25 13:16:31.668237');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (335, 'project_phases', 72, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-25 17:11:29.977291');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (336, 'project_phases', 72, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-25 17:11:39.918599');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (337, 'project_phases', 72, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-25 17:53:14.564739');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (338, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-25 18:03:27.120591');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (344, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 01:04:55.401824');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (346, 'projects', 11, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-26 01:34:10.181547');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (347, 'project_phases', 71, 'SUBMIT', 12, NULL, NULL, 'Phase submitted to client', '2025-09-26 01:38:35.23385');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (348, 'project_phases', 72, 'UNLOCK', 12, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-09-26 01:38:38.000929');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (349, 'project_phases', 71, 'APPROVE', 12, NULL, NULL, 'Phase approved after client acceptance', '2025-09-26 01:38:38.000929');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (350, 'project_phases', 71, 'COMPLETE', 12, NULL, NULL, 'Phase marked as completed - final handover', '2025-09-26 01:38:40.772092');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (351, 'projects', 11, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-26 05:20:40.585011');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (352, 'projects', 12, 'CREATE', 12, NULL, NULL, 'Project created with 2 phases', '2025-09-26 05:24:08.530257');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (353, 'project_phases', 87, 'START', 12, NULL, NULL, 'Starting phase normally', '2025-09-26 05:24:47.774824');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (354, 'project_phases', 87, 'NOTIFICATION_DISMISSED', 12, NULL, NULL, 'User dismissed notification: deadline_87_1758853544412', '2025-09-26 05:26:32.977253');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (355, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 05:31:54.951406');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (356, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 05:32:01.198201');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (357, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-26 05:32:40.910711');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (358, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 05:32:44.897728');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (359, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 05:32:50.837343');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (360, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: deadline_87_1758854057815', '2025-09-26 05:39:56.927297');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (361, 'project_phases', 71, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_20_1758854057819', '2025-09-26 05:39:57.249211');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (362, 'project_phases', 75, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_21_1758854057819', '2025-09-26 05:39:57.272634');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (363, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_22_1758854057819', '2025-09-26 05:39:57.295666');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (364, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: deadline_87_1758854990650', '2025-09-26 05:50:55.451494');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (365, 'project_phases', 71, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_20_1758854990664', '2025-09-26 05:50:55.479914');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (366, 'project_phases', 75, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_21_1758854990664', '2025-09-26 05:50:55.513109');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (367, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_22_1758854990664', '2025-09-26 05:50:55.543592');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (368, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: deadline_87_1758855195645', '2025-09-26 05:53:22.793649');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (369, 'project_phases', 71, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_20_1758855195657', '2025-09-26 05:53:22.821237');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (370, 'project_phases', 75, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_21_1758855195657', '2025-09-26 05:53:22.927406');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (371, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_22_1758855195657', '2025-09-26 05:53:22.950313');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (372, 'project_phases', 87, 'NOTIFICATION_VIEWED', 12, NULL, NULL, 'User viewed notification: deadline_87_1758855265737', '2025-09-26 05:54:47.990026');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (373, 'project_phases', 87, 'NOTIFICATION_VIEWED', 12, NULL, NULL, 'User viewed notification: approval_22_1758855265755', '2025-09-26 05:55:50.30697');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (379, 'projects', 3, 'DELETE', 12, NULL, NULL, 'Project permanently deleted from database', '2025-09-26 05:57:20.048548');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (384, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: deadline_87_1758855435116', '2025-09-26 06:02:56.340552');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (385, 'project_phases', 71, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_20_1758855435125', '2025-09-26 06:02:56.666839');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (386, 'project_phases', 75, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_21_1758855435125', '2025-09-26 06:02:56.748204');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (387, 'project_phases', 87, 'NOTIFICATION_BULK_DISMISSED', 12, NULL, NULL, 'User bulk_dismissed notification: approval_22_1758855435125', '2025-09-26 06:02:56.783281');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (388, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 13:59:42.778526');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (389, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 13:59:47.577951');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (390, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 10 hours on Preconcept Design', '2025-09-26 14:00:08.062089');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (391, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 14:00:13.576526');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (392, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 14:00:17.352808');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (393, 'project_phases', 88, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-26 14:03:50.840678');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (394, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 14:28:06.277178');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (395, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 14:28:09.792907');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (396, 'work_logs', 23, 'CREATE', 15, NULL, NULL, 'Logged 6 hours on Schematic Design', '2025-09-26 14:28:18.891399');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (397, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 14:28:21.643236');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (398, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 14:28:25.233207');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (399, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 14:29:25.224469');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (400, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 14:29:29.289354');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (401, 'project_phases', 72, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-26 14:29:40.990843');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (402, 'work_logs', 24, 'CREATE', 15, NULL, NULL, 'Logged 7 hours on Concept Generation', '2025-09-26 14:29:41.063968');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (403, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 14:29:47.520672');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (404, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 14:29:50.683702');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (405, 'project_phases', 88, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-26 14:41:38.047916');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (406, 'project_phases', 88, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-26 14:41:40.588151');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (407, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 14:41:48.352517');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (408, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 14:41:51.348583');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (409, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 1 hours on Preconcept Design', '2025-09-26 14:42:00.418416');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (410, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 14:42:03.710161');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (411, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 14:42:07.556125');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (412, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 18:19:47.305918');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (413, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 18:19:50.696612');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (414, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 18:28:46.399693');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (415, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 18:28:49.082918');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (416, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 18:45:47.572108');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (417, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 18:45:51.899805');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (418, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 4 hours on Preconcept Design', '2025-09-26 18:46:07.621376');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (419, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 18:46:12.092942');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (420, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 18:46:19.035138');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (421, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 19:11:59.760581');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (422, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 19:12:04.429156');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (423, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-26 19:12:12.289143');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (424, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 19:12:15.249981');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (425, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 19:12:19.494013');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (426, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 11 notifications: notif-001, notif-007, notif-002, notif-004, notif-003, notif-005, approval_10_1758903067244, approval_12_1758903067239, approval_10_1758903067236, approval_10_1758903067179, notif-008', '2025-09-26 19:12:54.712933');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (427, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 4 notifications: approval_10_1758903176895, approval_12_1758903176892, approval_10_1758903176888, approval_10_1758903176883', '2025-09-26 19:13:01.306518');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (428, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-26 19:13:17.536415');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (429, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-26 19:13:21.627368');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (430, 'work_logs', 22, 'CREATE', 15, NULL, NULL, 'Logged 4 hours on Preconcept Design', '2025-09-26 19:13:29.565924');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (431, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-26 19:13:38.720004');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (432, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 19:13:43.171711');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (433, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 4 notifications: approval_10_1758903223277, approval_12_1758903223276, approval_10_1758903223274, approval_10_1758903223219', '2025-09-26 19:14:11.177788');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (434, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 4 notifications: approval_10_1758903253879, approval_12_1758903253877, approval_10_1758903253875, approval_10_1758903253871', '2025-09-26 19:14:18.246091');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (435, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 05:15:55.759648');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (436, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 05:16:00.972547');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (437, 'work_logs', 25, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-27 05:16:39.639821');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (438, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 05:16:49.307483');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (439, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 05:16:53.291926');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (440, 'notifications', 12, 'NOTIFICATION_CLEAR_ALL', 12, NULL, NULL, 'User cleared all unread notifications', '2025-09-27 05:42:17.664659');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (441, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 05:42:35.306806');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (442, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 05:42:39.693691');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (443, 'work_logs', 25, 'CREATE', 15, NULL, NULL, 'Logged 4 hours on Preconcept Design', '2025-09-27 05:42:48.473576');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (444, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 05:42:52.862401');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (377, 'users', 20, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-26 05:56:52.642619');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (378, 'users', 20, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 05:56:52.916713');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (445, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 05:42:57.862471');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (446, 'project_phases', 87, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-27 05:49:51.918411');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (447, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 05:55:18.334423');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (448, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 05:55:26.754943');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (449, 'work_logs', 25, 'CREATE', 15, NULL, NULL, 'Logged 8 hours on Preconcept Design', '2025-09-27 05:55:38.248614');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (450, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 05:55:41.699717');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (451, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 05:55:55.706464');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (452, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 17:50:08.382074');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (453, 'notifications', 12, 'NOTIFICATION_READ', 12, NULL, NULL, 'User marked notification as read: 54c95d1f-20d9-4a11-afdd-efaad004dcb4', '2025-09-27 17:50:32.10556');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (454, 'notifications', 12, 'NOTIFICATION_READ', 12, NULL, NULL, 'User marked notification as read: c894e833-ff6a-4113-a9e2-afcd7ba9b87a', '2025-09-27 17:50:42.975145');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (455, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:00:32.355445');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (456, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:00:36.251965');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (457, 'work_logs', 25, 'CREATE', 15, NULL, NULL, 'Logged 4 hours on Preconcept Design', '2025-09-27 18:00:42.918236');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (458, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:00:45.441089');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (459, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:00:49.033048');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (460, 'notifications', 12, 'NOTIFICATION_READ', 12, NULL, NULL, 'User marked notification as read: 93817d7d-a247-4643-bdbd-fe863a03fb10', '2025-09-27 18:01:25.025399');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (461, 'project_phases', 87, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-27 18:03:49.808051');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (462, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:03:58.936214');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (463, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:04:02.558613');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (464, 'work_logs', 25, 'CREATE', 15, NULL, NULL, 'Logged 10 hours on Preconcept Design', '2025-09-27 18:04:09.457034');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (465, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:04:12.120981');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (466, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:04:15.567107');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (467, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:04:47.270524');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (468, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:04:50.189191');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (469, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:04:53.236801');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (470, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:04:57.223702');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (471, 'projects', 13, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-27 18:05:05.227811');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (472, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:05:09.442294');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (473, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:05:12.394869');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (474, 'project_phases', 89, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-27 18:05:24.122052');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (475, 'work_logs', 26, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-27 18:05:24.124558');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (476, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:05:29.412307');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (477, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:07:05.917395');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (478, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:07:25.455291');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (479, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:07:29.16379');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (480, 'work_logs', 26, 'CREATE', 15, NULL, NULL, 'Logged 2 hours on Preconcept Design', '2025-09-27 18:07:49.374946');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (481, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:07:52.844851');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (482, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:07:56.340333');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (483, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:08:55.698517');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (484, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:09:08.853407');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (485, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:09:43.044197');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (486, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-09-27 18:09:56.568077');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (487, 'work_logs', 27, 'CREATE', 14, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-27 18:10:05.123748');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (488, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-09-27 18:10:09.426298');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (489, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:10:13.084811');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (490, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-27 18:17:39.043521');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (491, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-27 18:17:50.46663');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (492, 'work_logs', 26, 'CREATE', 15, NULL, NULL, 'Logged 1 hours on Preconcept Design', '2025-09-27 18:18:00.97797');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (493, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-27 18:18:07.975151');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (494, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-27 18:18:16.303476');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (495, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 00:09:23.29176');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (496, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-28 00:09:27.542285');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (497, 'work_logs', 31, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-28 00:10:47.778111');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (498, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-28 00:10:51.13488');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (499, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 00:10:55.754335');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (500, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 00:11:53.881278');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (501, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-28 00:11:59.651072');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (502, 'work_logs', 31, 'CREATE', 15, NULL, NULL, 'Logged 2 hours on Preconcept Design', '2025-09-28 00:12:04.979883');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (503, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-28 00:12:11.635062');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (504, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 00:12:16.174606');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (505, 'notifications', 12, 'NOTIFICATION_READ', 12, NULL, NULL, 'User marked notification as read: deadline_12_1759007455798', '2025-09-28 00:14:03.757237');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (506, 'project_phases', 88, 'WARNING_REMOVE', 12, NULL, NULL, 'Warning removed', '2025-09-28 00:14:30.4922');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (507, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 17 notifications: deadline_12_1759007455798, 88747bdd-4c58-43dc-9b6e-15b9728652b5, 7d3a602a-d69c-4d16-8c7a-2b1bbfa104fa, fc873acb-8e07-4bd4-8128-c7e0fc5ec0d8, 7cc20ebd-d5fe-4c45-9608-02490987b9cc, ba693961-b446-47d1-9fc9-d06ee23d6d67, ef81c22c-fa68-43ef-af57-b8aece9d14bf, 93ed455b-f2a7-4542-baf9-423631326c54, 1beb5e7e-e96c-4955-b29c-c11361e5ad6d, 655ef169-ae0a-4ad5-94da-5837825ccee4, 9851f3c2-ec9b-4c29-af28-7d5793f7020c, 4bf29d94-3af0-46c5-80fa-7b23dbcc2c60, 3e17fecd-007f-463d-9241-ebf174eb33ab, 47e502ba-7904-4bf9-b104-89f04e85314e, 50246d83-6e4e-4840-bc7d-d53e2a362444, approval_13_1759007455881, approval_13_1758985813132', '2025-09-28 00:18:32.544338');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (508, 'notifications', 0, 'NOTIFICATION_BULK_DELETED', 12, NULL, NULL, 'User deleted 4 notifications: deadline_12_1759007914779, approval_13_1759007914794, approval_13_1759007914791, approval_13_1759007914789', '2025-09-28 00:18:38.45651');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (509, 'notifications', 12, 'NOTIFICATION_DELETED', 12, NULL, NULL, 'User deleted notification: approval_13_1759007920443', '2025-09-28 00:18:48.179345');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (510, 'notifications', 12, 'NOTIFICATION_DELETED', 12, NULL, NULL, 'User deleted notification: approval_13_1759007920339', '2025-09-28 00:18:52.047808');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (511, 'project_phases', 89, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-28 00:57:01.85836');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (512, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 01:03:37.916424');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (513, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-28 01:03:42.094443');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (514, 'work_logs', 31, 'CREATE', 15, NULL, NULL, 'Logged 1 hours on Preconcept Design', '2025-09-28 01:03:52.281457');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (515, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-28 01:03:55.969621');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (516, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 01:04:00.951046');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (519, 'work_logs', 31, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-09-28 01:05:02.564512');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (520, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-28 01:05:05.528699');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (521, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 01:05:12.840024');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (522, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 01:10:59.847204');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (517, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 01:04:48.798063');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (518, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-28 01:04:53.473703');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (523, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 04:58:05.959498');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (524, 'project_phases', 98, 'DELETE', 12, NULL, NULL, 'Phase "Licenses Drawing" deleted', '2025-09-28 13:01:32.00043');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (525, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-28 17:29:49.957642');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (526, 'projects', 13, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-28 17:30:25.250469');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (527, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-28 17:30:36.412319');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (528, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-28 17:31:53.479704');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (529, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-28 17:31:58.349106');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (530, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-28 17:32:04.990283');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (531, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-28 17:32:08.493378');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (532, 'projects', 13, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-28 17:45:37.138966');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (533, 'projects', 10, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-28 18:30:51.350326');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (534, 'projects', 10, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-28 18:30:59.0739');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (535, 'project_phases', 90, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-09-29 02:22:38.073387');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (536, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-29 03:26:48.612647');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (537, 'projects', 13, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-29 03:27:12.767832');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (538, 'users', 19, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: engineer-1758855411588@test.com', '2025-09-29 15:07:15.999616');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (539, 'users', 18, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: test-1758855411071@example.com', '2025-09-29 15:07:22.770804');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (540, 'users', 22, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: health-check-1758855634758@test.com', '2025-09-29 15:07:28.454761');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (541, 'users', 21, 'DELETE', 12, NULL, NULL, 'User account and all associated work logs permanently deleted: frontend-test-1758855526843@test.com', '2025-09-29 15:07:34.353224');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (542, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-29 18:13:27.349741');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (543, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-29 18:13:30.367907');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (544, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-29 18:23:06.967955');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (545, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-29 18:23:10.265442');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (546, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-29 19:07:34.549248');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (547, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-30 19:05:01.718573');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (548, 'projects', 13, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-30 19:05:12.030913');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (549, 'projects', 13, 'ARCHIVE', 12, NULL, NULL, 'Project archived', '2025-09-30 19:06:03.395465');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (550, 'projects', 14, 'CREATE', 12, NULL, NULL, 'Project created with 10 phases', '2025-09-30 19:36:17.978762');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (551, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-30 23:32:20.582634');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (552, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-30 23:32:26.136595');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (553, 'project_phases', 99, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-09-30 23:32:49.294125');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (554, 'work_logs', 32, 'CREATE', 15, NULL, NULL, 'Logged 8 hours on Preconcept Design', '2025-09-30 23:32:49.299473');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (555, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-30 23:32:54.410879');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (556, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-30 23:32:58.335527');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (557, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-30 23:33:04.602929');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (558, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-30 23:33:10.725892');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (559, 'work_logs', 32, 'CREATE', 15, NULL, NULL, 'Logged 2 hours on Preconcept Design', '2025-09-30 23:33:25.240881');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (560, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-30 23:33:42.904423');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (561, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-30 23:33:48.015315');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (562, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-09-30 23:34:01.422802');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (563, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-09-30 23:34:05.972233');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (564, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-09-30 23:35:14.334936');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (565, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-30 23:35:20.257873');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (566, 'projects', 13, 'UNARCHIVE', 12, NULL, NULL, 'Project unarchived', '2025-09-30 23:53:22.481724');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (567, 'project_phases', 99, 'WARNING_ADD', 12, NULL, NULL, 'Warning added', '2025-10-01 00:17:07.837317');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (15, 'users', 9, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:53:42.030689');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (16, 'users', 10, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-17 19:55:22.163831');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (17, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:41.705974');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (18, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:45.362656');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (19, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:56.004718');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (20, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:57.013265');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (21, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:57.756855');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (22, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:55:58.675391');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (23, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:56:15.937661');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (24, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:57:04.328092');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (25, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 19:57:05.312488');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (26, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 20:03:53.795158');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (27, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 20:03:55.09528');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (28, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 20:14:43.188247');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (29, 'users', 10, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-17 20:14:44.321124');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (30, 'users', 11, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-18 16:48:30.617151');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (31, 'users', 11, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 16:51:31.316304');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (32, 'users', 11, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 16:51:36.233715');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (33, 'users', 11, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-18 16:53:56.594466');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (280, 'users', 11, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-22 19:07:00.401142');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (332, 'users', 16, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-25 12:49:26.537166');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (339, 'users', 17, 'REGISTER', 12, NULL, NULL, 'User registered with role: supervisor', '2025-09-26 00:46:03.808537');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (340, 'users', 17, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 00:46:11.304973');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (341, 'users', 17, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 00:50:14.6047');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (342, 'users', 17, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 00:54:57.692284');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (343, 'users', 17, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 01:03:50.962556');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (345, 'users', 17, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-09-26 01:11:32.587298');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (568, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-10-01 00:46:15.543342');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (569, 'users', 12, 'LOGIN', 12, NULL, NULL, 'User logged in', '2025-10-01 00:46:19.66405');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (570, 'users', 12, 'LOGOUT', 12, NULL, NULL, 'User logged out', '2025-10-01 00:46:30.592497');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (571, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-01 00:46:56.787354');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (572, 'users', 24, 'REGISTER', 24, NULL, NULL, 'User registered with role: supervisor', '2025-10-01 19:42:29.059725');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (573, 'users', 24, 'LOGIN', 24, NULL, NULL, 'User logged in', '2025-10-01 19:42:43.309693');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (735, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 16:59:39.978123');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (575, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-01 20:56:28.236659');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (576, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-01 20:56:32.719597');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (577, 'users', 15, 'PASSWORD_CHANGE', 15, NULL, NULL, 'User changed password', '2025-10-02 01:13:22.634034');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (578, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-02 01:13:31.309419');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (579, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-02 01:13:42.816089');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (580, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-02 01:18:57.598241');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (581, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 01:19:03.438569');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (582, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 17:47:28.509854');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (583, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 17:50:23.03094');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (584, 'projects', 15, 'CREATE', 23, NULL, NULL, 'Project created with 6 phases', '2025-10-02 17:52:00.469016');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (585, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 17:52:09.164636');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (586, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-02 17:52:16.173568');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (587, 'project_phases', 109, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-10-02 17:52:37.244383');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (588, 'work_logs', 33, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-10-02 17:52:37.249908');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (589, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-02 17:52:53.652761');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (590, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 17:52:58.313588');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (591, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 18:31:47.748763');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (592, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 18:31:53.017833');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (593, 'projects', 16, 'CREATE', 23, NULL, NULL, 'Project created with 6 phases', '2025-10-02 18:32:17.176284');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (594, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 18:32:25.050236');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (595, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-02 18:32:30.306326');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (596, 'project_phases', 115, 'START', 14, NULL, NULL, 'Phase started automatically when first work log was created', '2025-10-02 18:32:44.461296');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (597, 'work_logs', 34, 'CREATE', 14, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-10-02 18:32:44.467043');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (598, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-02 18:32:47.820018');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (599, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 18:32:53.168642');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (600, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 18:33:36.699058');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (601, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-02 18:33:42.928116');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (602, 'work_logs', 34, 'CREATE', 14, NULL, NULL, 'Logged 15 hours on Preconcept Design', '2025-10-02 18:34:02.951561');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (603, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-02 18:34:22.978322');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (604, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 18:34:28.678996');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (605, 'project_phases', 119, 'WARNING_ADD', 23, NULL, NULL, 'Warning added', '2025-10-02 18:40:07.903018');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (606, 'project_phases', 115, 'SUBMIT', 23, NULL, NULL, 'Phase submitted to client', '2025-10-02 18:41:23.972829');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (607, 'project_phases', 116, 'UNLOCK', 23, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-10-02 18:41:32.631166');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (608, 'project_phases', 115, 'APPROVE', 23, NULL, NULL, 'Phase approved after client acceptance', '2025-10-02 18:41:32.631166');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (609, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-02 18:41:43.592547');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (610, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-02 18:41:49.190167');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (611, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-02 18:42:03.365996');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (612, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-02 18:42:07.368362');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (613, 'projects', 16, 'UPDATE', 23, NULL, NULL, 'Project updated: name, start_date, planned_total_weeks, predicted_hours, status', '2025-10-02 18:45:43.354036');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (614, 'projects', 16, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-02 18:45:53.201587');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (615, 'projects', 17, 'CREATE', 23, NULL, NULL, 'Project created with 10 phases', '2025-10-03 13:51:12.112656');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (616, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-03 13:51:27.763088');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (617, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-03 13:51:33.409239');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (618, 'project_phases', 121, 'START', 15, NULL, NULL, 'Phase started automatically when first work log was created', '2025-10-03 13:51:48.289698');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (619, 'work_logs', 35, 'CREATE', 15, NULL, NULL, 'Logged 13 hours on Preconcept Design', '2025-10-03 13:51:48.291087');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (620, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-03 13:51:52.183726');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (621, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-03 13:51:58.309892');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (622, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-03 18:55:13.29114');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (623, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-03 18:55:18.012976');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (624, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-03 18:55:28.249932');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (625, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-03 18:55:33.203537');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (626, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-03 22:33:29.487987');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (627, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-03 22:34:05.670755');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (628, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-03 22:49:38.126601');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (629, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-03 22:49:56.250356');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (630, 'work_logs', 36, 'CREATE', 14, NULL, NULL, 'Logged 8 hours on Preconcept Design', '2025-10-03 22:50:29.263238');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (631, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-03 22:50:34.986012');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (632, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-03 22:50:40.321925');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (633, 'project_phases', 122, 'WARNING_ADD', 23, NULL, NULL, 'Warning added', '2025-10-03 22:56:20.052795');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (634, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-03 23:13:10.651272');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (635, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-03 23:15:19.752977');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (636, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-04 15:43:02.668209');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (637, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-04 15:45:54.444021');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (638, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-04 15:46:11.412897');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (639, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-04 15:46:53.179344');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (640, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-04 16:47:52.698181');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (641, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-04 16:47:57.799341');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (642, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-04 17:40:08.846326');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (643, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-04 17:40:13.662412');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (644, 'project_phases', 131, 'COMPLETE', 23, NULL, NULL, 'Phase marked as completed - final handover', '2025-10-04 21:47:12.658338');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (645, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-04 23:47:56.863869');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (646, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-04 23:48:26.223909');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (647, 'projects', 2, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-05 14:06:15.784305');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (648, 'projects', 3, 'CREATE', 23, NULL, NULL, 'Project created with 6 phases', '2025-10-05 14:08:21.356333');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (649, 'projects', 3, 'UPDATE', 23, NULL, NULL, 'Project updated: name, start_date, planned_total_weeks, predicted_hours, status', '2025-10-05 14:09:42.994962');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (650, 'project_phases', 137, 'START', 23, NULL, NULL, 'Starting phase normally', '2025-10-05 14:13:46.743816');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (651, 'project_phases', 137, 'SUBMIT', 23, NULL, NULL, 'Phase submitted to client', '2025-10-05 14:13:51.131445');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (652, 'project_phases', 138, 'UNLOCK', 23, NULL, NULL, 'Phase unlocked after phase 1 approval', '2025-10-05 14:14:02.360881');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (653, 'project_phases', 137, 'APPROVE', 23, NULL, NULL, 'Phase approved after client acceptance', '2025-10-05 14:14:02.360881');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (654, 'project_phases', 138, 'START', 23, NULL, NULL, 'Starting phase normally', '2025-10-05 14:14:47.709574');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (655, 'projects', 3, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-05 14:19:58.209391');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (656, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 18:42:21.477508');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (657, 'users', 54, 'LOGIN', 54, NULL, NULL, 'User logged in', '2025-10-05 18:43:36.146527');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (658, 'users', 54, 'LOGOUT', 54, NULL, NULL, 'User logged out', '2025-10-05 18:43:51.365358');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (659, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 18:43:53.735778');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (660, 'projects', 4, 'CREATE', 23, NULL, NULL, 'Project created with 10 phases', '2025-10-05 18:44:01.499984');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (661, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 18:44:05.293825');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (662, 'users', 54, 'LOGIN', 54, NULL, NULL, 'User logged in', '2025-10-05 18:44:28.452097');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (663, 'users', 54, 'LOGOUT', 54, NULL, NULL, 'User logged out', '2025-10-05 18:49:06.895439');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (664, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 18:49:09.752279');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (665, 'users', 13, 'DELETE', 23, NULL, NULL, 'User account and all associated work logs permanently deleted: a@gmail.com', '2025-10-05 18:51:20.458491');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (666, 'project_phases', 144, 'UPDATE', 23, NULL, NULL, 'Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date', '2025-10-05 18:52:40.157294');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (667, 'project_phases', 143, 'UPDATE', 23, NULL, NULL, 'Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date', '2025-10-05 18:54:23.451547');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (668, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 18:55:11.511537');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (669, 'users', 54, 'LOGIN', 54, NULL, NULL, 'User logged in', '2025-10-05 18:57:52.262686');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (670, 'users', 54, 'LOGOUT', 54, NULL, NULL, 'User logged out', '2025-10-05 18:59:45.284156');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (671, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 18:59:49.520352');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (672, 'project_phases', 143, 'UPDATE', 23, NULL, NULL, 'Phase updated: phase_name, planned_weeks, predicted_hours, planned_start_date, planned_end_date', '2025-10-05 19:09:31.872376');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (673, 'project_phases', 152, 'DELETE', 23, NULL, NULL, 'Phase "Licenses Drawing" deleted', '2025-10-05 19:11:13.715661');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (674, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 19:30:23.779085');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (675, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 19:31:34.26116');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (676, 'users', 25, 'DELETE', 23, NULL, NULL, 'User account and all associated work logs permanently deleted: testengineer@test.com', '2025-10-05 19:31:51.724878');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (677, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 19:32:02.858886');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (678, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 19:33:30.17757');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (679, 'users', 42, 'LOGIN', 42, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.401711');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (680, 'users', 43, 'LOGIN', 43, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.470019');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (681, 'users', 44, 'LOGIN', 44, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.533921');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (682, 'users', 45, 'LOGIN', 45, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.598086');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (683, 'users', 46, 'LOGIN', 46, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.660675');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (684, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.718648');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (685, 'users', 48, 'LOGIN', 48, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.779316');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (686, 'users', 49, 'LOGIN', 49, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.836297');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (687, 'users', 50, 'LOGIN', 50, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.895012');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (688, 'users', 51, 'LOGIN', 51, NULL, NULL, 'User logged in', '2025-10-05 19:34:04.956588');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (689, 'users', 52, 'LOGIN', 52, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.015603');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (690, 'users', 53, 'LOGIN', 53, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.074973');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (691, 'users', 54, 'LOGIN', 54, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.137077');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (692, 'users', 55, 'LOGIN', 55, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.195413');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (693, 'users', 56, 'LOGIN', 56, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.253378');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (694, 'users', 57, 'LOGIN', 57, NULL, NULL, 'User logged in', '2025-10-05 19:34:05.31141');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (695, 'users', 42, 'LOGIN', 42, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.149446');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (696, 'users', 43, 'LOGIN', 43, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.224098');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (697, 'users', 44, 'LOGIN', 44, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.321164');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (698, 'users', 45, 'LOGIN', 45, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.379314');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (699, 'users', 46, 'LOGIN', 46, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.43665');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (700, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.494446');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (701, 'users', 48, 'LOGIN', 48, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.551598');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (702, 'users', 49, 'LOGIN', 49, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.608912');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (703, 'users', 50, 'LOGIN', 50, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.666927');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (704, 'users', 51, 'LOGIN', 51, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.783523');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (705, 'users', 52, 'LOGIN', 52, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.839317');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (706, 'users', 53, 'LOGIN', 53, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.899584');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (707, 'users', 54, 'LOGIN', 54, NULL, NULL, 'User logged in', '2025-10-05 19:34:46.955645');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (708, 'users', 55, 'LOGIN', 55, NULL, NULL, 'User logged in', '2025-10-05 19:34:47.012419');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (709, 'users', 56, 'LOGIN', 56, NULL, NULL, 'User logged in', '2025-10-05 19:34:47.068285');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (710, 'users', 57, 'LOGIN', 57, NULL, NULL, 'User logged in', '2025-10-05 19:34:47.124127');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (711, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 19:35:41.730261');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (712, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-05 19:36:01.329407');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (713, 'users', 47, 'LOGOUT', 47, NULL, NULL, 'User logged out', '2025-10-05 19:36:16.342134');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (714, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 19:36:21.597245');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (715, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-05 19:36:42.632007');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (716, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-05 19:37:11.097745');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (717, 'users', 47, 'LOGOUT', 47, NULL, NULL, 'User logged out', '2025-10-05 19:37:23.108461');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (718, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-05 19:37:27.66038');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (719, 'projects', 4, 'ARCHIVE', 23, NULL, NULL, 'Project archived', '2025-10-05 19:43:07.631699');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (720, 'projects', 4, 'UNARCHIVE', 23, NULL, NULL, 'Project unarchived', '2025-10-05 19:43:13.66901');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (721, 'project_phases', 153, 'CREATE', 23, NULL, NULL, 'Custom phase "mmmmm" created', '2025-10-05 19:50:14.204862');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (722, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 01:31:09.989797');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (723, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 01:32:38.36403');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (724, 'projects', 5, 'CREATE', 23, NULL, NULL, 'Project created with 2 phases', '2025-10-06 16:17:12.863105');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (725, 'projects', 6, 'CREATE', 23, NULL, NULL, 'Project created with 2 phases', '2025-10-06 16:17:23.945015');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (726, 'projects', 4, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 16:29:47.390626');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (727, 'projects', 5, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 16:29:49.974819');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (728, 'projects', 6, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 16:29:53.209524');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (729, 'projects', 7, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 16:30:40.696773');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (730, 'projects', 8, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 16:37:07.209402');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (731, 'projects', 9, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 16:37:32.05715');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (732, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 16:37:52.924424');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (733, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-06 16:37:59.23562');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (734, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-06 16:59:34.899133');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (736, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 17:07:01.163865');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (737, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-06 17:07:06.09653');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (738, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-06 17:08:10.930229');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (739, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 17:19:26.330802');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (740, 'projects', 9, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 17:30:05.219884');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (741, 'projects', 7, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 17:37:18.341646');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (742, 'projects', 8, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 17:37:22.176111');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (743, 'projects', 10, 'CREATE', 23, NULL, NULL, 'Project created with 6 phases', '2025-10-06 18:09:03.953933');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (744, 'projects', 11, 'CREATE', 23, NULL, NULL, 'Project created with 6 phases', '2025-10-06 18:09:07.836311');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (745, 'projects', 12, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 18:14:12.87419');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (746, 'projects', 10, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 21:21:09.631273');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (747, 'projects', 11, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 21:21:12.69341');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (748, 'projects', 12, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 21:21:17.376826');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (749, 'projects', 13, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 21:27:04.422166');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (750, 'project_phases', 174, 'SUBMIT', 23, NULL, NULL, 'Phase submitted to client', '2025-10-06 21:36:50.113442');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (751, 'projects', 13, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 21:58:41.513899');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (752, 'projects', 14, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 21:59:08.849393');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (753, 'project_phases', 175, 'SUBMIT', 23, NULL, NULL, 'Phase submitted to client', '2025-10-06 22:18:14.74397');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (754, 'projects', 15, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 22:19:07.701403');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (755, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 22:25:51.456193');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (756, 'users', 15, 'LOGIN', 15, NULL, NULL, 'User logged in', '2025-10-06 22:26:08.464001');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (757, 'work_logs', 58, 'CREATE', 15, NULL, NULL, 'Logged 5 hours on hhhh', '2025-10-06 22:27:16.763513');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (758, 'users', 15, 'LOGOUT', 15, NULL, NULL, 'User logged out', '2025-10-06 22:27:31.404937');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (759, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 22:27:38.938557');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (760, 'projects', 14, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 22:27:46.461311');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (761, 'projects', 15, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 22:27:49.375066');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (762, 'projects', 16, 'CREATE', 23, NULL, NULL, 'Project created with 1 phases', '2025-10-06 22:28:32.225079');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (763, 'project_phases', 177, 'SUBMIT', 23, NULL, NULL, 'Phase submitted to client', '2025-10-06 22:28:45.704869');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (764, 'project_phases', 177, 'APPROVE', 23, NULL, NULL, 'Phase approved after client acceptance', '2025-10-06 22:28:52.642869');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (765, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 22:31:13.525861');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (766, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 22:31:20.78779');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (767, 'projects', 17, 'CREATE', 23, NULL, NULL, 'Project created with 2 phases', '2025-10-06 22:32:11.950219');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (768, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 22:32:16.168723');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (769, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-06 22:32:20.483174');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (770, 'work_logs', 61, 'CREATE', 14, NULL, NULL, 'Logged 14.25 hours on jhjhjhj', '2025-10-06 22:32:48.50458');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (771, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-06 22:34:15.160705');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (772, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 22:34:19.480086');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (773, 'projects', 18, 'CREATE', 23, NULL, NULL, 'Project created with 2 phases', '2025-10-06 22:35:14.884241');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (774, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-06 22:35:26.518845');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (775, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-06 22:35:35.89985');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (776, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-06 22:35:55.024948');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (777, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-06 22:38:08.208171');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (778, 'projects', 18, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 22:38:18.891859');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (779, 'projects', 17, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 22:38:21.673981');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (780, 'projects', 16, 'DELETE', 23, NULL, NULL, 'Project permanently deleted from database', '2025-10-06 22:38:28.561544');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (781, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 01:41:12.534914');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (782, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 02:15:35.149544');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (783, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 02:32:19.866793');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (784, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 14:10:16.863249');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (785, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 14:10:21.791294');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (786, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 14:11:23.69019');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (787, 'projects', 19, 'CREATE', 23, NULL, NULL, 'Project created with 7 phases', '2025-10-07 14:13:33.875294');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (788, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 14:13:39.780887');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (789, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-07 14:13:48.435213');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (790, 'users', 47, 'LOGOUT', 47, NULL, NULL, 'User logged out', '2025-10-07 14:14:45.763955');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (791, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-07 14:15:01.530257');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (792, 'users', 47, 'LOGOUT', 47, NULL, NULL, 'User logged out', '2025-10-07 14:15:33.939501');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (793, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 14:15:38.83953');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (794, 'project_phases', 186, 'EARLY_ACCESS_GRANT', 23, NULL, NULL, 'Early access granted for Schematic Design by Marwan Helal', '2025-10-07 14:15:45.381063');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (795, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 14:15:50.190295');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (796, 'users', 47, 'LOGIN', 47, NULL, NULL, 'User logged in', '2025-10-07 14:16:06.858813');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (797, 'project_phases', 182, 'START', 47, NULL, NULL, 'Phase started automatically when first work log was created', '2025-10-07 14:16:28.011912');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (798, 'work_logs', 63, 'CREATE', 47, NULL, NULL, 'Logged 5 hours on Preconcept Design', '2025-10-07 14:16:28.01296');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (799, 'users', 47, 'LOGOUT', 47, NULL, NULL, 'User logged out', '2025-10-07 14:16:31.459336');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (800, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 14:16:40.135742');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (801, 'project_phases', 183, 'WARNING_ADD', 23, NULL, NULL, 'Warning added', '2025-10-07 14:18:40.362177');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (802, 'project_phases', 186, 'START', 23, NULL, NULL, 'Starting phase with early access', '2025-10-07 14:49:59.020678');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (803, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 14:50:06.169518');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (804, 'users', 14, 'LOGIN', 14, NULL, NULL, 'User logged in', '2025-10-07 14:50:11.191654');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (805, 'users', 14, 'LOGOUT', 14, NULL, NULL, 'User logged out', '2025-10-07 14:50:24.912989');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (806, 'users', 23, 'LOGIN', 23, NULL, NULL, 'User logged in', '2025-10-07 14:50:29.129758');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (807, 'users', 23, 'LOGOUT', 23, NULL, NULL, 'User logged out', '2025-10-07 14:59:46.91066');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (808, 'users', 43, 'LOGIN', 43, NULL, NULL, 'User logged in', '2025-10-07 15:01:27.622331');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (809, 'projects', 19, 'DELETE', 43, NULL, NULL, 'Project permanently deleted from database', '2025-10-07 15:01:38.558776');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (810, 'projects', 20, 'CREATE', 43, NULL, NULL, 'Project created with 6 phases', '2025-10-07 15:40:01.159536');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (811, 'project_phases', 192, 'SUBMIT', 43, NULL, NULL, 'Phase submitted to client', '2025-10-07 15:43:35.198284');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (812, 'projects', 21, 'CREATE', 43, NULL, NULL, 'Project created with 6 phases', '2025-10-07 16:01:22.2567');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (813, 'projects', 22, 'CREATE', 43, NULL, NULL, 'Project created with 6 phases', '2025-10-07 16:17:03.502176');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (814, 'projects', 22, 'UPDATE', 43, NULL, NULL, 'Project updated: name, start_date, planned_total_weeks, predicted_hours, status', '2025-10-07 16:18:07.485819');
INSERT INTO public.audit_logs (id, entity_type, entity_id, action, user_id, old_values, new_values, note, "timestamp") VALUES (815, 'projects', 21, 'UPDATE', 43, NULL, NULL, 'Project updated: name, start_date, planned_total_weeks, predicted_hours, status', '2025-10-07 16:21:35.123349');


--
-- TOC entry 5276 (class 0 OID 17690)
-- Dependencies: 242
-- Data for Name: critical_path_analysis; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5270 (class 0 OID 17603)
-- Dependencies: 236
-- Data for Name: phase_dependencies; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5256 (class 0 OID 17384)
-- Dependencies: 220
-- Data for Name: predefined_phases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (1, 'Preconcept Design', 'Initial conceptual planning and feasibility analysis', 2, 1, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (2, 'Concept Generation', 'Creative concept development and idea exploration', 3, 2, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (3, 'Principle Project', 'Core project principles establishment and design brief', 4, 3, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (4, 'Design Development', 'Detailed design evolution and refinement', 4, 4, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (5, 'Schematic Design', 'Technical schematic creation and system design', 3, 5, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (6, 'Working Drawings', 'Construction-ready detailed drawings and specifications', 6, 6, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (7, 'BOQ', 'Bill of Quantities - cost estimation and materials quantification', 1, 7, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (8, 'IFT', 'Issued for Tender - tender documentation preparation', 1, 8, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (9, 'IFC', 'Issued for Construction - final construction documentation', 2, 9, true, '2025-09-17 15:29:13.902681');
INSERT INTO public.predefined_phases (id, name, description, typical_duration_weeks, display_order, is_active, created_at) VALUES (10, 'Licenses Drawing', 'Regulatory approval drawings and permit submissions', 2, 10, true, '2025-09-17 15:29:13.902681');


--
-- TOC entry 5284 (class 0 OID 27021)
-- Dependencies: 250
-- Data for Name: progress_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5260 (class 0 OID 17419)
-- Dependencies: 224
-- Data for Name: project_phases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (189, 20, 1, 'Concept Generation', false, 2, '2025-02-25', '2025-03-11', '2025-02-25', '2025-03-21', 'completed', 'none', false, 46, 102, '2025-10-07 15:40:01.159536', '2025-10-07 15:41:22.158006', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, '2025-03-15', '2025-03-21');
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (190, 20, 2, 'Principle project', false, 3, '2025-03-11', '2025-04-01', '2025-03-21', '2025-07-30', 'completed', 'none', false, 76, 84, '2025-10-07 15:40:01.159536', '2025-10-07 15:42:28.519231', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, '2025-07-30', '2025-07-31');
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (191, 20, 3, 'Design Development', false, 3, '2025-04-01', '2025-04-22', '2025-07-31', '2025-09-16', 'completed', 'none', false, 46, 42, '2025-10-07 15:40:01.159536', '2025-10-07 15:43:05.113434', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, '2025-09-15', '2025-09-16');
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (192, 20, 4, 'Schematic Design', false, 2, '2025-04-22', '2025-05-06', '2025-09-17', '2025-09-27', 'submitted', 'none', false, 46, 10, '2025-10-07 15:40:01.159536', '2025-10-07 15:43:50.46882', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, '2025-09-27', NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (196, 21, 2, 'Principle project', false, 3, '2025-10-01', '2025-10-22', '2025-10-02', '2025-10-22', 'not_started', 'none', false, 195, 0, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.603749', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (197, 21, 3, 'Design Development', false, 3, '2025-10-22', '2025-11-12', '2025-10-23', '2025-11-12', 'not_started', 'none', false, 98, 0, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.610096', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (198, 21, 4, 'Schematic Design', false, 2, '2025-11-12', '2025-11-26', '2025-11-13', '2025-11-26', 'not_started', 'none', false, 98, 0, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.616811', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (199, 21, 5, 'Working Drawings', false, 4, '2025-11-26', '2025-12-24', '2025-11-27', '2025-12-24', 'not_started', 'none', false, 163, 0, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.637374', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (200, 21, 6, 'BOQ', false, 2, '2025-12-24', '2026-01-07', '2025-12-25', '2026-01-07', 'not_started', 'none', false, 33, 0, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.65579', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (195, 21, 1, 'Concept Generation', false, 2, '2025-09-17', '2025-10-01', '2025-09-17', '2025-10-01', 'in_progress', 'none', false, 65, 20, '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.668791', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (202, 22, 2, 'Principal Project', false, 3, '2025-10-01', '2025-10-22', '2025-10-02', '2025-10-22', 'not_started', 'none', false, 114, 0, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.041021', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (203, 22, 3, 'Schematic Design', false, 3, '2025-10-22', '2025-11-12', '2025-10-23', '2025-11-12', 'not_started', 'none', false, 57, 0, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.121752', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (204, 22, 4, 'Detailed Design', false, 2, '2025-11-12', '2025-11-26', '2025-11-13', '2025-11-26', 'not_started', 'none', false, 57, 0, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.132371', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (205, 22, 5, 'Working Drawings', false, 4, '2025-11-26', '2025-12-24', '2025-11-27', '2025-12-23', 'not_started', 'none', false, 95, 0, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.143738', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (206, 22, 6, 'BOQ', false, 2, '2025-12-24', '2026-01-07', '2025-12-24', '2026-01-07', 'not_started', 'none', false, 19, 0, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.150132', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (201, 22, 1, 'Principal Idea', false, 2, '2025-09-17', '2025-10-01', '2025-09-17', '2025-10-01', 'in_progress', 'none', false, 38, 52, '2025-10-07 16:17:03.502176', '2025-10-07 16:17:04.169065', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (193, 20, 5, 'Working Drawings', false, 4, '2025-05-06', '2025-06-03', '2025-09-27', '2025-10-20', 'not_started', 'none', false, 74, 0, '2025-10-07 15:40:01.159536', '2025-10-07 15:40:01.94049', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);
INSERT INTO public.project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at, early_access_granted, early_access_status, early_access_granted_by, early_access_granted_at, early_access_note, calculated_progress, actual_progress, progress_variance, submitted_date, approved_date) VALUES (194, 20, 6, 'BOQ', false, 2, '2025-06-03', '2025-06-17', '2025-10-21', '2025-11-10', 'not_started', 'none', false, 15, 0, '2025-10-07 15:40:01.159536', '2025-10-07 15:40:01.947347', false, 'not_accessible', NULL, NULL, NULL, 0.00, 0.00, 0.00, NULL, NULL);


--
-- TOC entry 5266 (class 0 OID 17490)
-- Dependencies: 230
-- Data for Name: project_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.project_settings (id, project_id, auto_advance_enabled, allow_timeline_mismatch, notification_settings, created_at, updated_at) VALUES (35, 20, true, false, '{}', '2025-10-07 15:40:01.159536', '2025-10-07 15:40:01.159536');
INSERT INTO public.project_settings (id, project_id, auto_advance_enabled, allow_timeline_mismatch, notification_settings, created_at, updated_at) VALUES (36, 21, true, false, '{}', '2025-10-07 16:01:22.2567', '2025-10-07 16:01:22.2567');
INSERT INTO public.project_settings (id, project_id, auto_advance_enabled, allow_timeline_mismatch, notification_settings, created_at, updated_at) VALUES (37, 22, true, false, '{}', '2025-10-07 16:17:03.502176', '2025-10-07 16:17:03.502176');


--
-- TOC entry 5274 (class 0 OID 17665)
-- Dependencies: 240
-- Data for Name: project_timeline_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5258 (class 0 OID 17398)
-- Dependencies: 222
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.projects (id, name, start_date, planned_total_weeks, predicted_hours, actual_hours, status, created_by, created_at, updated_at, archived_at, archived_by) VALUES (20, 'mall badr (mirror)', '2025-02-25', 16, 303, 238, 'active', 43, '2025-10-07 15:40:01.159536', '2025-10-07 15:40:02.04097', NULL, NULL);
INSERT INTO public.projects (id, name, start_date, planned_total_weeks, predicted_hours, actual_hours, status, created_by, created_at, updated_at, archived_at, archived_by) VALUES (22, 'OHM MALL', '2025-09-16', 16, 381, 52, 'active', 43, '2025-10-07 16:17:03.502176', '2025-10-07 16:18:07.191064', NULL, NULL);
INSERT INTO public.projects (id, name, start_date, planned_total_weeks, predicted_hours, actual_hours, status, created_by, created_at, updated_at, archived_at, archived_by) VALUES (21, 'cars mall', '2025-09-16', 16, 650, 20, 'active', 43, '2025-10-07 16:01:22.2567', '2025-10-07 16:21:34.823121', NULL, NULL);


--
-- TOC entry 5272 (class 0 OID 17633)
-- Dependencies: 238
-- Data for Name: resource_predictions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5278 (class 0 OID 17711)
-- Dependencies: 244
-- Data for Name: smart_notification_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.smart_notification_rules (id, rule_name, rule_type, target_roles, conditions, action_template, escalation_rules, is_active, priority_weight, cooldown_minutes, created_at) VALUES (1, 'Critical Timeline Deviation', 'threshold_based', '{supervisor}', '{"severity": "critical", "warning_type": "timeline_deviation", "threshold_days": 3}', '{"title": "Critical Timeline Alert", "urgency": "immediate", "escalation_hours": 2}', '{}', true, 50, 60, '2025-09-25 01:11:07.403135');
INSERT INTO public.smart_notification_rules (id, rule_name, rule_type, target_roles, conditions, action_template, escalation_rules, is_active, priority_weight, cooldown_minutes, created_at) VALUES (2, 'Budget Overrun Prevention', 'predictive', '{supervisor}', '{"confidence_minimum": 80, "utilization_threshold": 85}', '{"title": "Budget Risk Alert", "urgency": "high", "include_suggestions": true}', '{}', true, 50, 60, '2025-09-25 01:11:07.403135');
INSERT INTO public.smart_notification_rules (id, rule_name, rule_type, target_roles, conditions, action_template, escalation_rules, is_active, priority_weight, cooldown_minutes, created_at) VALUES (3, 'Resource Conflict Detection', 'pattern_based', '{supervisor}', '{"workload_threshold": 40, "concurrent_projects": 2}', '{"title": "Resource Conflict Warning", "urgency": "medium", "auto_suggest_reallocation": true}', '{}', true, 50, 60, '2025-09-25 01:11:07.403135');


--
-- TOC entry 5282 (class 0 OID 26740)
-- Dependencies: 248
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (1, 12, true, true, true, true, true, true, 'medium', true, true, true, false, true, '16:00:00', false, true, 3, true, true, true, true, false, true, true, true, false, false, '22:00:00', '08:00:00', '2025-10-01 20:24:43.205097+03', '2025-10-01 20:24:43.205097+03');
INSERT INTO public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (3, 14, true, true, true, true, true, true, 'medium', true, true, true, false, true, '16:00:00', false, true, 3, true, true, true, true, false, true, true, true, false, false, '22:00:00', '08:00:00', '2025-10-01 20:24:43.205097+03', '2025-10-01 20:24:43.205097+03');
INSERT INTO public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (4, 15, true, true, true, true, true, true, 'medium', true, true, true, false, true, '16:00:00', false, true, 3, true, true, true, true, false, true, true, true, false, false, '22:00:00', '08:00:00', '2025-10-01 20:24:43.205097+03', '2025-10-01 20:24:43.205097+03');
INSERT INTO public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (6, 24, true, true, true, true, true, true, 'medium', true, true, true, false, true, '16:00:00', false, true, 3, true, true, true, true, false, true, true, true, false, false, '22:00:00', '08:00:00', '2025-10-01 20:24:43.205097+03', '2025-10-01 20:24:43.205097+03');
INSERT INTO public.user_notification_settings (id, user_id, project_updates, project_status_changes, phase_completions, phase_approvals, phase_submissions, smart_warnings, warning_criticality_threshold, team_activity, engineer_assignments, engineer_work_logs, team_performance_reports, work_log_reminders, work_log_reminder_time, daily_work_summary, deadline_alerts, deadline_alert_days_before, phase_start_reminders, early_access_granted, early_access_requests, system_maintenance, feature_updates, security_alerts, email_enabled, in_app_enabled, browser_push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (5, 23, true, true, true, true, true, true, 'medium', true, true, true, false, true, '16:00:00', false, true, 1, true, true, true, true, false, true, true, true, false, false, '22:00:00', '08:00:00', '2025-10-01 20:24:43.205097+03', '2025-10-02 01:30:02.508797+03');


--
-- TOC entry 5280 (class 0 OID 26701)
-- Dependencies: 246
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) VALUES (1, 12, 'light', 'en', 'UTC', 'MM/DD/YYYY', true, true, 'instant', 'grid', 20, true, 30, 'pdf', 'decimal', '[]', true, '2025-10-01 20:24:42.806047+03', '2025-10-01 20:24:42.806047+03');
INSERT INTO public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) VALUES (3, 14, 'light', 'en', 'UTC', 'MM/DD/YYYY', true, true, 'instant', 'grid', 20, true, 30, 'pdf', 'decimal', '[]', true, '2025-10-01 20:24:42.806047+03', '2025-10-01 20:24:42.806047+03');
INSERT INTO public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) VALUES (6, 24, 'light', 'en', 'UTC', 'MM/DD/YYYY', true, true, 'instant', 'grid', 20, true, 30, 'pdf', 'decimal', '[]', true, '2025-10-01 20:24:42.806047+03', '2025-10-01 20:24:42.806047+03');
INSERT INTO public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) VALUES (4, 15, 'dark', 'en', 'UTC', 'MM/DD/YYYY', true, true, 'instant', 'grid', 20, true, 30, 'pdf', 'decimal', '[]', true, '2025-10-01 20:24:42.806047+03', '2025-10-02 01:18:31.232918+03');
INSERT INTO public.user_preferences (id, user_id, theme_mode, language, timezone, date_format, notification_email, notification_in_app, notification_digest_frequency, default_view, items_per_page, auto_refresh_enabled, auto_refresh_interval, default_export_format, default_time_entry_format, quick_time_shortcuts, work_log_reminders, created_at, updated_at) VALUES (5, 23, 'light', 'en', 'UTC', 'MM/DD/YYYY', true, true, 'instant', 'team', 20, true, 30, 'pdf', 'decimal', '[]', true, '2025-10-01 20:24:42.806047+03', '2025-10-02 01:20:51.71332+03');


--
-- TOC entry 5254 (class 0 OID 17371)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (12, 'mazen', 'mazenhelal15@gmail.com', '$2b$12$8z1Dc.bzUPOcMZ4tKr7WUOz8n6QvJdIyps95fbqrYVlQJ/xa4kf.q', 'supervisor', true, '2025-09-18 17:16:24.224118', '2025-10-05 18:30:22.981225', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (41, 'Asmaa', 'asmaa@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (14, 'zico', 'zico@gmail.com', '$2b$12$d0IaOgb61Y.K3/T6UvucwuH3eyP93mDpHIcKWwnIxajhX5Wv/gCU.', 'engineer', true, '2025-09-19 20:29:12.508076', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (23, 'Marwan Helal', 'marwanhelal15@gmail.com', '$2b$12$TdjL65O1IuUYu6S/w20vQu/I/WzkZ4qjC713p4uwT28hK7t2gucGy', 'supervisor', true, '2025-10-01 00:42:04.642195', '2025-10-05 18:30:22.981225', true, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (56, 'Mr. Mohamed Ahmed', 'mohamed.ahmed@criteria.com', '$2b$10$PHrCmFIQypSJM2GvzaGpdeNztTu7cRdplxbSIPtXHH5KIJeYihyvK', 'administrator', true, '2025-10-05 18:37:46.522999', '2025-10-05 18:37:46.522999', false, 'Administrator');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (24, 'Test Supervisor', 'testsupervisor@test.com', '$2b$12$.0J/dQBtoRDFmtZULEohQexwjxQTHdKAcB.VcSq6vWYkf9kxPMpkG', 'supervisor', true, '2025-10-01 19:42:28.932934', '2025-10-05 18:30:22.981225', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (15, 'kkk', 'd@gmail.com', '$2b$12$Qu5vqXkJVwAnl.nd1PP1hOrnbgcP0SbV8tZOAEGZ.1SMrnuxWo7hy', 'engineer', true, '2025-09-22 16:30:30.621275', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (34, 'Fakharany', 'fakharany@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (35, 'Baloumy', 'baloumy@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (36, 'Consultant', 'consultant@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (37, 'Rostom', 'rostom@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (38, 'Mourhan', 'mourhan@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (39, 'Nourhan', 'nourhan@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (40, 'serag', 'serag@mall.com', '$2b$12$CY7YeTfQdUUCl3uAUazyTO6YPksiShLJLKVbirFbGnXBtr17VS3UO', 'engineer', true, '2025-10-04 17:39:06.185128', '2025-10-05 18:30:22.981225', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (42, 'Hesham Helal', 'hesham.helal@criteria.com', '$2b$10$o7gNPTfJtZGdVzED454jcOK9KrCIIlmuRVsX5LWCAdx7wHUkI8JfC', 'supervisor', true, '2025-10-05 18:37:45.766117', '2025-10-05 18:37:45.766117', false, 'Chairman of the Board');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (43, 'Eng. Marwa Farrag', 'marwa.farrag@criteria.com', '$2b$10$YBOJNiKnZvdn6gnaQCinyepQyvWueUhW47YF5cOK8ZD33IlhvgQ82', 'supervisor', true, '2025-10-05 18:37:45.829035', '2025-10-05 18:37:45.829035', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (44, 'Dr. Rania Fouad', 'rania.fouad@criteria.com', '$2b$10$rN8o5RhBx5SJ.dkjh7rQvu5pts/nS1GJ7444U4GJF6Yum82PEjsDK', 'supervisor', true, '2025-10-05 18:37:45.884435', '2025-10-05 18:37:45.884435', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (45, 'Eng. Nehal Al Lithy', 'nehal.allithy@criteria.com', '$2b$10$W7lse6iuqe2KF3826IPaMOhgWMNkxDfh2PMD8BPXAr1LN1OgqTxIS', 'supervisor', true, '2025-10-05 18:37:45.937493', '2025-10-05 18:37:45.937493', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (46, 'Eng. Rehab Ali', 'rehab.ali@criteria.com', '$2b$10$FJYcaxxxSE0pQiPU9zq5OuOUWdLH/WWAhcXXMCPmvF6ZgKm3ceFUa', 'supervisor', true, '2025-10-05 18:37:45.990161', '2025-10-05 18:37:45.990161', false, 'Manager');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (47, 'Eng. Mohamed El Fakhrany', 'mohamed.elfakhrany@criteria.com', '$2b$10$5NjqGm9bJa/5zAZ7NBUIkuT9W82NjMt/gqcLUi.FsoJgFSQHdDLoC', 'engineer', true, '2025-10-05 18:37:46.044542', '2025-10-05 18:37:46.044542', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (48, 'Eng. Mahmoud Mourad', 'mahmoud.mourad@criteria.com', '$2b$10$ANVzcuAA9G6eHgRWFi05DuyKnu5YMAUPwUmBZsUher7/DkZvz3ILi', 'engineer', true, '2025-10-05 18:37:46.098282', '2025-10-05 18:37:46.098282', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (49, 'Eng. Omar Tarek', 'omar.tarek@criteria.com', '$2b$10$pHWcuAoc.i6UDPlTiMY2.eqq1x0mjzld7eEtYsypDWRFeXJQSBpGC', 'engineer', true, '2025-10-05 18:37:46.150917', '2025-10-05 18:37:46.150917', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (50, 'Eng. Simon Samy', 'simon.samy@criteria.com', '$2b$10$ezgwBKOQ1uh5LNNyInmF1OnzRLNJmOAFOMv8uZSInebWxN/00L7h6', 'engineer', true, '2025-10-05 18:37:46.203752', '2025-10-05 18:37:46.203752', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (51, 'Eng. Asmaa Farouk', 'asmaa.farouk@criteria.com', '$2b$10$Bw29qrNUnrdm5bagU53rE.YsLH8xdv3kKuYfvDJWY3yScdvk6loYi', 'engineer', true, '2025-10-05 18:37:46.256322', '2025-10-05 18:37:46.256322', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (52, 'Eng. Norhan Said', 'norhan.said@criteria.com', '$2b$10$MQ/8MQMVC3QFvO4R21JTV.RqsKdGmrQCQ2o4juteC/cHlOE1OP9Ni', 'engineer', true, '2025-10-05 18:37:46.30991', '2025-10-05 18:37:46.30991', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (53, 'Eng. Mohamed Baiumy', 'mohamed.baiumy@criteria.com', '$2b$10$IHiZ/D2YUp8XmI04tWKn.uUMfaqnn13TBz2U3Kzy6xQ3meZqazLZW', 'engineer', true, '2025-10-05 18:37:46.361853', '2025-10-05 18:37:46.361853', false, 'Engineer');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (54, 'Mrs. Amany Adham', 'amany.adham@criteria.com', '$2b$10$G9iPuKrFBYenXJ536kbpY.616iJbLbzrIo62hyd9.UBYQ96SyqonG', 'administrator', true, '2025-10-05 18:37:46.414731', '2025-10-05 18:37:46.414731', false, 'Administrator');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (55, 'Mr. Ramy Saria', 'ramy.saria@criteria.com', '$2b$10$xZQJAb3gLfKwMuZ0IesFQuujqsacFsCb/2wwpH6rUfli2eo5llZVa', 'administrator', true, '2025-10-05 18:37:46.467758', '2025-10-05 18:37:46.467758', false, 'Administrator');
INSERT INTO public.users (id, name, email, password_hash, role, is_active, created_at, updated_at, is_super_admin, job_description) VALUES (57, 'Mrs. Hadeer Mahmoud', 'hadeer.mahmoud@criteria.com', '$2b$10$ivGac6PO0gh3Adaiop2Yu.9NYPU1May.YujnCYYLnHQkTB.ljFB6S', 'administrator', true, '2025-10-05 18:37:46.57869', '2025-10-05 18:37:46.57869', false, 'Administrator');


--
-- TOC entry 5268 (class 0 OID 17572)
-- Dependencies: 234
-- Data for Name: warning_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5262 (class 0 OID 17446)
-- Dependencies: 226
-- Data for Name: work_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (64, 20, 189, 36, '2025-02-25', 40.00, 'Historical import for Concept Generation', true, '2025-10-07 15:40:01.960422', '2025-10-07 15:40:01.960422');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (65, 20, 189, 48, '2025-02-25', 45.00, 'Historical import for Concept Generation', true, '2025-10-07 15:40:01.991907', '2025-10-07 15:40:01.991907');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (66, 20, 189, 51, '2025-02-25', 6.00, 'Historical import for Concept Generation', true, '2025-10-07 15:40:01.998806', '2025-10-07 15:40:01.998806');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (67, 20, 189, 52, '2025-02-25', 8.00, 'Historical import for Concept Generation', true, '2025-10-07 15:40:02.00634', '2025-10-07 15:40:02.00634');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (68, 20, 189, 40, '2025-02-25', 3.00, 'Historical import for Concept Generation', true, '2025-10-07 15:40:02.012676', '2025-10-07 15:40:02.012676');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (69, 20, 190, 47, '2025-03-21', 4.00, 'Historical import for Principle project', true, '2025-10-07 15:40:02.019853', '2025-10-07 15:40:02.019853');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (70, 20, 190, 37, '2025-03-21', 80.00, 'Historical import for Principle project', true, '2025-10-07 15:40:02.026187', '2025-10-07 15:40:02.026187');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (71, 20, 191, 53, '2025-07-31', 42.00, 'Historical import for Design Development', true, '2025-10-07 15:40:02.034941', '2025-10-07 15:40:02.034941');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (72, 20, 192, 53, '2025-09-17', 10.00, 'Historical import for Schematic Design', true, '2025-10-07 15:40:02.04097', '2025-10-07 15:40:02.04097');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (73, 21, 195, 47, '2025-09-17', 20.00, 'Historical import for Concept Generation', true, '2025-10-07 16:01:22.668791', '2025-10-07 16:01:22.668791');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (74, 22, 201, 47, '2025-09-17', 24.00, 'Historical import for Principal Idea', true, '2025-10-07 16:17:04.158518', '2025-10-07 16:17:04.158518');
INSERT INTO public.work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at) VALUES (75, 22, 201, 50, '2025-09-17', 28.00, 'Historical import for Principal Idea', true, '2025-10-07 16:17:04.169065', '2025-10-07 16:17:04.169065');


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 227
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 815, true);


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 241
-- Name: critical_path_analysis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.critical_path_analysis_id_seq', 1, false);


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 235
-- Name: phase_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phase_dependencies_id_seq', 1, false);


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 219
-- Name: predefined_phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.predefined_phases_id_seq', 10, true);


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 249
-- Name: progress_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.progress_adjustments_id_seq', 6, true);


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 223
-- Name: project_phases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_phases_id_seq', 206, true);


--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 229
-- Name: project_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_settings_id_seq', 37, true);


--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 239
-- Name: project_timeline_forecasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_timeline_forecasts_id_seq', 1, false);


--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 221
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 22, true);


--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 237
-- Name: resource_predictions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resource_predictions_id_seq', 1, false);


--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 243
-- Name: smart_notification_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.smart_notification_rules_id_seq', 3, true);


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 247
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 7, true);


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 245
-- Name: user_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_preferences_id_seq', 7, true);


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 57, true);


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 233
-- Name: warning_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warning_analytics_id_seq', 1, false);


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 225
-- Name: work_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_logs_id_seq', 75, true);


-- Completed on 2025-10-10 18:35:59

--
-- PostgreSQL database dump complete
--

\unrestrict cgy4hKPIWXefsCCPMPCmEfSRmbucdABnxA1K1TftFbn4gXgXUeHGo048TDLDuaA

