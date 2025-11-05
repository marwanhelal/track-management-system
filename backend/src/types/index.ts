// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  job_description?: string;
  is_active: boolean;
  is_super_admin?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  job_description?: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  is_active?: boolean;
  job_description?: string;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  start_date: Date;
  planned_total_weeks: number;
  predicted_hours: number;
  actual_hours: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  // Extended project details
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  bua?: string;
  client_name?: string;
}

export interface ProjectCreateInput {
  name: string;
  start_date?: Date;
  planned_total_weeks: number;
  predicted_hours: number;
  selectedPhases: ProjectPhaseInput[];
  // Extended project details
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  bua?: string;
  client_name?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  start_date?: Date;
  planned_total_weeks?: number;
  predicted_hours?: number;
  status?: 'active' | 'on_hold' | 'completed' | 'cancelled';
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  client_name?: string;
}

// Predefined Phase Types
export interface PredefinedPhase {
  id: number;
  name: string;
  description?: string;
  typical_duration_weeks: number;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}

// Project Phase Types
export interface ProjectPhase {
  id: number;
  project_id: number;
  phase_order: number;
  phase_name: string;
  is_custom: boolean;
  planned_weeks: number;
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  status: 'not_started' | 'ready' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  delay_reason: 'none' | 'client' | 'company';
  warning_flag: boolean;
  predicted_hours?: number;
  actual_hours: number;
  // Early Access Support
  early_access_granted: boolean;
  early_access_status: 'not_accessible' | 'accessible' | 'in_progress' | 'work_completed';
  early_access_granted_by?: number;
  early_access_granted_at?: Date;
  early_access_note?: string;
  // Progress Tracking
  calculated_progress: number;
  actual_progress: number;
  progress_variance: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectPhaseInput {
  phase_name: string;
  is_custom: boolean;
  planned_weeks: number;
  predicted_hours?: number;
}

export interface ProjectPhaseUpdateInput {
  status?: 'not_started' | 'ready' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  delay_reason?: 'none' | 'client' | 'company';
  warning_flag?: boolean;
  actual_start_date?: Date;
  actual_end_date?: Date;
  predicted_hours?: number;
}

// Early Access Types
export interface EarlyAccessGrantInput {
  note?: string;
}

export interface EarlyAccessRevokeInput {
  note?: string;
}

export interface EarlyAccessOverview {
  project_id: number;
  phases_with_early_access: ProjectPhase[];
  total_early_access_phases: number;
  active_early_access_phases: number;
}

// Work Log Types
export interface WorkLog {
  id: string;
  project_id: string;
  phase_id: string;
  engineer_id: string;
  date: Date;
  hours: number;
  description?: string;
  supervisor_approved: boolean;
  manual_progress_percentage?: number;
  progress_notes?: string;
  progress_adjusted_by?: string;
  progress_adjusted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WorkLogCreateInput {
  phase_id: string;
  date?: Date;
  hours: number;
  description?: string;
}

export interface WorkLogUpdateInput {
  date?: Date;
  hours?: number;
  description?: string;
  supervisor_approved?: boolean;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  user_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  note?: string;
  timestamp: Date;
}

// Project Settings Types
export interface ProjectSettings {
  id: number;
  project_id: number;
  auto_advance_enabled: boolean;
  allow_timeline_mismatch: boolean;
  created_at: Date;
  updated_at: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  iat: number;
  exp: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  job_description?: string;
}

// Dashboard Types
export interface ProjectOverview {
  id: number;
  name: string;
  start_date: Date;
  planned_total_weeks: number;
  predicted_hours: number;
  actual_hours: number;
  status: string;
  created_by_name: string;
  total_phases: number;
  completed_phases: number;
  completion_percentage: number;
  delay_status: 'on_schedule' | 'warning' | 'client_delayed' | 'company_delayed';
  current_phase?: string;
}

export interface EngineerWorkSummary {
  engineer_id: number;
  engineer_name: string;
  project_id: number;
  project_name: string;
  phase_id: number;
  phase_name: string;
  total_hours: number;
  log_entries: number;
  first_log_date: Date;
  last_log_date: Date;
}

// Smart Warning System Types
export interface WarningAnalytics {
  id: number;
  project_id: number;
  warning_type: 'timeline_deviation' | 'budget_overrun' | 'resource_conflict' |
                'quality_gate_violation' | 'client_approval_delay' | 'dependency_blockage' |
                'skill_gap' | 'capacity_overload' | 'early_access_abuse';
  severity: 'critical' | 'urgent' | 'warning' | 'advisory';
  confidence_score: number;
  risk_probability: number;
  predicted_impact_days: number;
  predicted_impact_cost: number;
  warning_data: Record<string, any>;
  is_active: boolean;
  resolved_at?: Date;
  resolved_by?: number;
  resolution_note?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PhaseDependency {
  id: number;
  project_id: number;
  predecessor_phase_id: number;
  successor_phase_id: number;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  is_critical_path: boolean;
  weight_factor: number;
  created_at: Date;
}

export interface ResourcePrediction {
  id: number;
  engineer_id: number;
  project_id?: number;
  phase_id?: number;
  prediction_type: 'workload_forecast' | 'burnout_risk' | 'efficiency_trend' |
                   'skill_match_score' | 'availability_conflict' | 'performance_trajectory';
  predicted_value: number;
  confidence_level: number;
  prediction_horizon_days: number;
  historical_accuracy: number;
  algorithm_version: string;
  prediction_data: Record<string, any>;
  created_at: Date;
  expires_at: Date;
}

export interface ProjectTimelineForecast {
  id: number;
  project_id: string;
  forecast_type: 'optimistic' | 'realistic' | 'pessimistic' | 'monte_carlo';
  predicted_completion_date: Date;
  predicted_total_hours: number;
  predicted_budget_variance: number;
  confidence_interval_lower?: Date;
  confidence_interval_upper?: Date;
  risk_factors: string[];
  assumptions: string[];
  model_accuracy: number;
  created_by?: string;
  created_at: Date;
}

export interface CriticalPathAnalysis {
  id: number;
  project_id: number;
  analysis_date: Date;
  critical_phases: number[];
  total_project_duration_days: number;
  float_analysis: Record<string, any>;
  bottleneck_phases: number[];
  optimization_suggestions: string[];
  risk_mitigation_plans: string[];
  created_at: Date;
}

// Enhanced Warning Intelligence Types
export interface SmartWarningResponse {
  warnings: EnhancedWarning[];
  analytics: WarningAnalytics[];
  predictions: ResourcePrediction[];
  critical_paths: CriticalPathAnalysis[];
  total_risk_score: number;
  recommendations: SmartRecommendation[];
}

export interface EnhancedWarning {
  id: string;
  type: string;
  severity: 'critical' | 'urgent' | 'warning' | 'advisory';
  title: string;
  message: string;
  context: string;
  confidence_score: number;
  risk_probability: number;
  predicted_impact: {
    days: number;
    cost: number;
    resources_affected: number;
  };
  cascade_effects: CascadeEffect[];
  recovery_suggestions: RecoverySuggestion[];
  project_id: number;
  phase_ids: number[];
  affected_engineers: number[];
  action_required: boolean;
  escalation_level: number;
  timestamp: Date;
  expires_at: Date;
}

export interface CascadeEffect {
  affected_phase_id: number;
  phase_name: string;
  impact_type: 'delay' | 'cost' | 'resource' | 'quality';
  impact_magnitude: number;
  propagation_probability: number;
  mitigation_urgency: 'immediate' | 'within_24h' | 'within_week' | 'monitor';
}

export interface RecoverySuggestion {
  id: string;
  title: string;
  description: string;
  strategy_type: 'resource_reallocation' | 'timeline_adjustment' | 'scope_modification' | 'early_access' | 'parallel_execution';
  effort_required: 'low' | 'medium' | 'high';
  success_probability: number;
  estimated_recovery_days: number;
  cost_impact: number;
  prerequisites: string[];
  implementation_steps: string[];
  risks: string[];
}

export interface SmartRecommendation {
  id: string;
  category: 'optimization' | 'prevention' | 'recovery' | 'strategic';
  title: string;
  description: string;
  priority_score: number;
  confidence: number;
  business_impact: 'low' | 'medium' | 'high' | 'critical';
  implementation_complexity: 'simple' | 'moderate' | 'complex';
  expected_benefits: string[];
  success_metrics: string[];
  timeline_estimate: string;
  resource_requirements: string[];
}

// Professional Intelligence Analysis Types
export interface ProjectHealthAnalysis {
  project_id: number;
  health_score: number; // 0-100
  risk_factors: RiskFactor[];
  performance_metrics: PerformanceMetric[];
  trend_analysis: TrendAnalysis;
  benchmarking: BenchmarkComparison;
  strategic_insights: StrategicInsight[];
}

export interface RiskFactor {
  factor_type: string;
  severity: number; // 0-10
  probability: number; // 0-100
  impact_areas: string[];
  mitigation_actions: string[];
  monitoring_indicators: string[];
}

export interface PerformanceMetric {
  metric_name: string;
  current_value: number;
  target_value: number;
  variance_percentage: number;
  trend_direction: 'improving' | 'stable' | 'declining';
  benchmark_percentile: number;
}

export interface TrendAnalysis {
  velocity_trend: 'accelerating' | 'steady' | 'decelerating';
  quality_trend: 'improving' | 'stable' | 'declining';
  resource_efficiency_trend: 'optimizing' | 'stable' | 'deteriorating';
  predicted_trajectory: 'on_track' | 'at_risk' | 'off_track';
  inflection_points: Date[];
}

export interface BenchmarkComparison {
  industry_percentile: number;
  company_historical_percentile: number;
  similar_projects_rank: number;
  performance_gaps: string[];
  excellence_areas: string[];
}

export interface StrategicInsight {
  insight_type: 'opportunity' | 'threat' | 'strength' | 'weakness';
  title: string;
  description: string;
  business_value: number;
  urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  stakeholder_impact: string[];
  recommended_actions: string[];
}

// API Request/Response Types
export interface SmartWarningRequest {
  project_id?: number;
  severity_filter?: string[];
  type_filter?: string[];
  include_predictions?: boolean;
  include_cascade_analysis?: boolean;
  include_recovery_suggestions?: boolean;
  time_horizon_days?: number;
  confidence_threshold?: number;
}

export interface ProjectIntelligenceRequest {
  project_id: number;
  analysis_depth: 'basic' | 'comprehensive' | 'executive_summary';
  include_benchmarking?: boolean;
  include_predictions?: boolean;
  forecast_horizon_days?: number;
}

// Filter and Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectFilters extends PaginationParams {
  status?: string;
  created_by?: string;
  delay_status?: string;
  search?: string;
}

export interface WorkLogFilters extends PaginationParams {
  project_id?: number;
  phase_id?: number;
  engineer_id?: number;
  date_from?: Date;
  date_to?: Date;
  supervisor_approved?: boolean;
}

// Socket.IO Types
export interface SocketEvents {
  'project:updated': Project;
  'phase:updated': ProjectPhase;
  'phase:approved': { phase: ProjectPhase; project_id: number };
  'phase:unlocked': { phase: ProjectPhase; project_id: number };
  'early_access:granted': { phase: ProjectPhase; project_id: number; granted_by: number };
  'early_access:revoked': { phase: ProjectPhase; project_id: number; revoked_by: number };
  'work_log:created': WorkLog;
  'work_log:updated': WorkLog;
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Request Types (Express with authentication)
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    email: string;
    role: 'supervisor' | 'engineer' | 'administrator';
  };
}

// Database Health Check
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  details?: any;
}

// CEO Comprehensive Overview Types
export interface PhaseDetail {
  id: number;
  phase_name: string;
  status: 'not_started' | 'ready' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  planned_weeks: number;
  actual_hours: number;
  predicted_hours: number;
  warning_flag: boolean;
  delay_reason: 'none' | 'client' | 'company';
  progress_percentage: number;
  actual_progress?: number;
  assigned_engineers: EngineerInfo[];
}

export interface EngineerInfo {
  id: number;
  name: string;
  hours_logged: number;
}

export interface EngineerWorkDetail {
  engineer_id: number;
  engineer_name: string;
  phases: Array<{
    phase_id: number;
    phase_name: string;
    hours_logged: number;
    last_log_date: Date;
  }>;
  total_hours: number;
}

export interface DeadlineInfo {
  phase_id: number;
  phase_name: string;
  planned_end_date: Date;
  days_until_deadline: number;
  is_overdue: boolean;
  severity: 'critical' | 'warning' | 'normal';
}

export interface ComprehensiveOverviewData {
  project_id: number;
  project_name: string;
  project_status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: Date;
  planned_total_weeks: number;
  predicted_hours: number;
  actual_hours: number;
  created_by_name: string;
  current_phases: PhaseDetail[];
  engineer_breakdown: EngineerWorkDetail[];
  total_active_phases: number;
  completed_phases: number;
  progress_percentage: number;
  actual_progress?: number;
  health_score: number;
  warnings_count: number;
  approaching_deadlines: DeadlineInfo[];
  last_activity_date: Date;
  estimated_completion_date: Date;
}

export interface ComprehensiveOverviewResponse {
  success: boolean;
  data: {
    projects: ComprehensiveOverviewData[];
    summary: {
      total_projects: number;
      active_projects: number;
      total_engineers: number;
      total_hours_logged: number;
      projects_with_warnings: number;
      overall_health_score: number;
    };
  };
}

// Profile Update Types
export interface ProfileUpdateInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Progress Tracking Types
export interface ProgressAdjustment {
  id: number;
  phase_id: string;
  engineer_id: string;
  work_log_id?: string;
  adjustment_type: 'work_log_entry' | 'phase_overall';
  hours_logged: number;
  hours_based_progress: number;
  manual_progress_percentage: number;
  adjustment_reason: string;
  adjusted_by: string;
  adjusted_by_name?: string;
  engineer_name?: string;
  phase_name?: string;
  created_at: Date;
}

export interface ProgressAdjustmentInput {
  manual_progress_percentage: number;
  adjustment_reason: string;
}

export interface WorkLogProgressInput {
  work_log_id: string;
  manual_progress_percentage: number;
  adjustment_reason: string;
}

export interface PhaseEngineerProgressInput {
  phase_id: string;
  engineer_id: string;
  manual_progress_percentage: number;
  adjustment_reason: string;
}

export interface ProgressSummary {
  phase_id: string;
  phase_name: string;
  engineer_id: string;
  engineer_name: string;
  total_hours_logged: number;
  predicted_hours: number;
  calculated_progress: number;
  actual_progress: number;
  variance: number;
  last_adjustment?: Date;
  last_adjustment_by?: string;
  adjustment_count: number;
}

export interface ProgressBreakdown {
  phase_id: string;
  phase_name: string;
  engineer_id: string;
  engineer_name: string;
  hours_logged: number;
  predicted_hours: number;
  hours_based_progress: number;
  manual_adjustments: ProgressAdjustment[];
  actual_progress: number;
  variance: number;
  adjustment_history_count: number;
}

export interface PhaseProgressDetail {
  phase_id: string;
  phase_name: string;
  predicted_hours: number;
  calculated_progress: number;
  actual_progress: number;
  progress_variance: number;
  engineers: EngineerProgressDetail[];
}

export interface EngineerProgressDetail {
  engineer_id: string;
  engineer_name: string;
  hours_logged: number;
  calculated_progress: number;
  actual_progress: number;
  variance: number;
  last_work_log_date?: Date;
  adjustment_count: number;
  has_manual_adjustments: boolean;
}

// Timer Session Types (Start/Stop Only)
export interface TimerSession {
  id: number;
  engineer_id: number;
  phase_id: number;
  project_id: number;
  start_time: Date;
  elapsed_time_ms: number;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  // Joined data
  project_name?: string;
  phase_name?: string;
  engineer_name?: string;
}

export interface TimerSessionCreateInput {
  phase_id: number;
  description: string;
}

export interface TimerSessionUpdateInput {
  description?: string;
  elapsed_time_ms?: number;
}

export interface TimerSessionResponse {
  session: TimerSession;
  project_name: string;
  phase_name: string;
}

export interface ProjectDetailsInput {
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  client_name?: string;
}

// Enhanced Project Type with Details
export interface ProjectWithDetails extends Project {
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  client_name?: string;
}

// Project Creation with Details
export interface ProjectCreateWithDetailsInput extends ProjectCreateInput {
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  client_name?: string;
  bua?: string;
}

// ============================================================================
// CHECKLIST SYSTEM TYPES
// ============================================================================

// Checklist Phase Names
export type ChecklistPhaseName = 'VIS' | 'DD' | 'License' | 'Working' | 'BOQ';

// Checklist Template Types
export interface ChecklistTemplate {
  id: number;
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ChecklistTemplateCreateInput {
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
}

export interface ChecklistTemplateUpdateInput {
  section_name?: string;
  task_title_ar?: string;
  task_title_en?: string;
  display_order?: number;
  is_active?: boolean;
}

// Project Checklist Item Types
export interface ProjectChecklistItem {
  id: number;
  project_id: number;
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;

  // Completion and approval tracking
  is_completed: boolean;

  // 4-level approval workflow
  engineer_approved_by?: number;
  engineer_approved_at?: Date;

  supervisor_1_approved_by?: number;
  supervisor_1_approved_at?: Date;

  supervisor_2_approved_by?: number;
  supervisor_2_approved_at?: Date;

  supervisor_3_approved_by?: number;
  supervisor_3_approved_at?: Date;

  // Client notes
  client_notes?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;

  // Joined data (optional)
  engineer_approved_name?: string;
  supervisor_1_approved_name?: string;
  supervisor_2_approved_name?: string;
  supervisor_3_approved_name?: string;
}

export interface ProjectChecklistItemCreateInput {
  project_id: number;
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
}

export interface ProjectChecklistItemUpdateInput {
  task_title_ar?: string;
  task_title_en?: string;
  section_name?: string;
  display_order?: number;
  is_completed?: boolean;
  client_notes?: string;
}

// Approval Input Types
export interface ChecklistEngineerApprovalInput {
  items: number[]; // Array of checklist item IDs to approve
}

export interface ChecklistSupervisorApprovalInput {
  items: number[]; // Array of checklist item IDs to approve
  level: 1 | 2 | 3; // Supervisor approval level (1, 2, or 3)
}

// Checklist Statistics Types
export interface ChecklistStatistics {
  project_id: number;
  phase_name: ChecklistPhaseName;
  total_tasks: number;
  completed_tasks: number;
  engineer_approved_tasks: number;
  supervisor_1_approved_tasks: number;
  supervisor_2_approved_tasks: number;
  supervisor_3_approved_tasks: number;
  completion_percentage: number;
}

// Checklist Progress Overview
export interface ChecklistProgressOverview {
  project_id: number;
  project_name: string;
  phases: {
    phase_name: ChecklistPhaseName;
    statistics: ChecklistStatistics;
    items: ProjectChecklistItem[];
  }[];
  overall_completion: number;
}

// Checklist Filter Types
export interface ChecklistFilters {
  project_id?: number;
  phase_name?: ChecklistPhaseName;
  section_name?: string;
  is_completed?: boolean;
  engineer_approved?: boolean;
  supervisor_approved_level?: 1 | 2 | 3;
}

// Socket.IO Events for Checklist
export interface ChecklistSocketEvents {
  'checklist:item_completed': { item: ProjectChecklistItem; project_id: number };
  'checklist:item_approved': { item: ProjectChecklistItem; project_id: number; approval_level: number };
  'checklist:phase_completed': { project_id: number; phase_name: ChecklistPhaseName };
  'checklist:item_updated': { item: ProjectChecklistItem; project_id: number };
}

// Extended Project Creation with Checklist
export interface ProjectCreateWithChecklistInput extends ProjectCreateWithDetailsInput {
  generate_checklist?: boolean; // Whether to auto-generate checklist from templates
}
