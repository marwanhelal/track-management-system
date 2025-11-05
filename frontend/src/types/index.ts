// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  job_description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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

// Project Types
export interface Project {
  id: number;
  name: string;
  start_date: string;
  planned_total_weeks: number;
  predicted_hours: number;
  actual_hours: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  archived_at?: string | null;
  archived_by?: number | null;
  is_archived?: boolean;
  // Additional project details
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  bua?: string;
  client_name?: string;
}

export interface ProjectCreateInput {
  name: string;
  start_date?: string;
  planned_total_weeks: number;
  predicted_hours: number;
  selectedPhases: ProjectPhaseInput[];
}

// Predefined Phase Types
export interface PredefinedPhase {
  id: number;
  name: string;
  description?: string;
  typical_duration_weeks: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// Project Phase Types
export interface ProjectPhase {
  id: number;
  project_id: number;
  phase_order: number;
  phase_name: string;
  is_custom: boolean;
  planned_weeks: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: 'not_started' | 'ready' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  delay_reason: 'none' | 'client' | 'company';
  warning_flag: boolean;
  predicted_hours?: number;
  actual_hours: number;
  // Early Access Support
  early_access_granted: boolean;
  early_access_status: 'not_accessible' | 'accessible' | 'in_progress' | 'work_completed';
  early_access_granted_by?: number;
  early_access_granted_at?: string;
  early_access_note?: string;
  // Progress Tracking
  calculated_progress: number;
  actual_progress: number;
  progress_variance: number;
  // Submitted/Approved Dates
  submitted_date?: string;
  approved_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhaseInput {
  phase_name: string;
  is_custom: boolean;
  planned_weeks: number;
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
  id: number;
  project_id: number;
  phase_id: number;
  engineer_id: number;
  date: string;
  hours: number;
  description?: string;
  supervisor_approved: boolean;
  manual_progress_percentage?: number;
  progress_notes?: string;
  progress_adjusted_by?: number;
  progress_adjusted_at?: string;
  created_at: string;
  updated_at: string;
  engineer_name?: string;
  phase_name?: string;
  project_name?: string;
}

export interface WorkLogCreateInput {
  phase_id: number;
  date?: string;
  hours: number;
  description?: string;
}

// Timer Session Types (Start/Stop Only)
export interface TimerSession {
  id: number;
  engineer_id: number;
  phase_id: number;
  project_id: number;
  start_time: string;
  elapsed_time_ms: number;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Joined data
  project_name?: string;
  phase_name?: string;
  engineer_name?: string;
}

export interface TimerSessionCreateInput {
  phase_id: number;
  description: string;
}

export interface TimerSessionResponse {
  session: TimerSession;
  project_name: string;
  phase_name: string;
}

// Dashboard Types
export interface ProjectOverview {
  id: number;
  name: string;
  start_date: string;
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

export interface WorkLogSummary {
  project_id: number;
  project_name: string;
  engineer_id: number;
  engineer_name: string;
  total_hours: string;
  days_worked: string;
  total_entries: string;
  first_entry_date: string;
  last_entry_date: string;
}

export interface PhaseSummary {
  phase_id: number;
  phase_name: string;
  project_id: number;
  project_name: string;
  total_hours: string;
  engineers_count: string;
  total_entries: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Socket.IO Types
export interface SocketEvents {
  'project:created': Project;
  'project:updated': Project;
  'project_updated': Project;
  'project:archived': { projectId: number };
  'project:unarchived': { projectId: number };
  'phase:updated': ProjectPhase;
  'phase_updated': ProjectPhase;
  'work_log_added': WorkLog;
  'phase:approved': { phase: ProjectPhase; project_id: number };
  'phase:unlocked': { phase: ProjectPhase; project_id: number };
  'early_access:granted': { phase: ProjectPhase; project_id: number; granted_by: number };
  'early_access:revoked': { phase: ProjectPhase; project_id: number; revoked_by: number };
  'early_access_granted': {
    type: string;
    projectId: number;
    phase: ProjectPhase;
    grantedBy: User;
    timestamp: Date;
  };
  'early_access_revoked': {
    type: string;
    projectId: number;
    phase: ProjectPhase;
    revokedBy: User;
    timestamp: Date;
  };
  'early_access_phase_started': {
    type: string;
    projectId: number;
    phase: ProjectPhase;
    startedBy: User;
    timestamp: Date;
  };
  'work_log:created': WorkLog;
  'work_log:updated': WorkLog;
}

// UI State Types
export interface LoadingState {
  projects: boolean;
  phases: boolean;
  workLogs: boolean;
  auth: boolean;
}

export interface ErrorState {
  projects: string | null;
  phases: string | null;
  workLogs: string | null;
  auth: string | null;
}

// Filter Types
export interface ProjectFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkLogFilters {
  project_id?: number;
  phase_id?: number;
  engineer_id?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
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
    last_log_date: string;
  }>;
  total_hours: number;
}

export interface DeadlineInfo {
  phase_id: number;
  phase_name: string;
  planned_end_date: string;
  days_until_deadline: number;
  is_overdue: boolean;
  severity: 'critical' | 'warning' | 'normal';
}

export interface ComprehensiveOverviewData {
  project_id: number;
  project_name: string;
  project_status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string;
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
  last_activity_date: string;
  estimated_completion_date: string;
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
  phase_id: number;
  engineer_id: number;
  work_log_id?: number;
  adjustment_type: 'work_log_entry' | 'phase_overall';
  hours_logged: number;
  hours_based_progress: number;
  manual_progress_percentage: number;
  adjustment_reason: string;
  adjusted_by: number;
  adjusted_by_name?: string;
  engineer_name?: string;
  phase_name?: string;
  created_at: string;
}

export interface ProgressAdjustmentInput {
  manual_progress_percentage: number;
  adjustment_reason: string;
}

export interface ProgressSummary {
  phase_id: number;
  phase_name: string;
  engineer_id: number;
  engineer_name: string;
  total_hours_logged: number;
  predicted_hours: number;
  calculated_progress: number;
  actual_progress: number;
  variance: number;
  last_adjustment?: string;
  last_adjustment_by?: string;
  adjustment_count: number;
}

export interface ProgressBreakdown {
  phase_id: number;
  phase_name: string;
  engineer_id: number;
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
  phase_id: number;
  phase_name: string;
  predicted_hours: number;
  calculated_progress: number;
  actual_progress: number;
  progress_variance: number;
  engineers: EngineerProgressDetail[];
}

export interface EngineerProgressDetail {
  engineer_id: number;
  engineer_name: string;
  hours_logged: number;
  calculated_progress: number;
  actual_progress: number;
  variance: number;
  last_work_log_date?: string;
  adjustment_count: number;
  has_manual_adjustments: boolean;
}

export interface ProjectDetailsInput {
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  bua?: string;
  client_name?: string;
}

export interface ProjectWithDetails extends Project {
  land_area?: string;
  building_type?: string;
  floors_count?: number;
  location?: string;
  bua?: string;
  client_name?: string;
}

// ============================================================================
// CHECKLIST SYSTEM TYPES
// ============================================================================

// Phase name enum
export type ChecklistPhaseName = 'VIS' | 'DD' | 'License' | 'Working' | 'BOQ';

// Checklist Template (for predefined tasks)
export interface ChecklistTemplate {
  id: number;
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Engineer approval info
export interface EngineerApproval {
  engineer_id: number;
  engineer_name: string;
  approved_at: string;
}

// Project Checklist Item (instance of template for a specific project)
export interface ProjectChecklistItem {
  id: number;
  project_id: number;
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;

  // Completion status
  is_completed: boolean;

  // 4-level approval workflow
  // NEW: Support multiple engineers approving same task
  engineer_approvals?: EngineerApproval[];

  // DEPRECATED: Old single engineer approval (kept for backward compatibility)
  engineer_approved_by?: number;
  engineer_approved_at?: string;
  engineer_approved_name?: string;

  supervisor_1_approved_by?: number;
  supervisor_1_approved_at?: string;
  supervisor_1_approved_name?: string;

  supervisor_2_approved_by?: number;
  supervisor_2_approved_at?: string;
  supervisor_2_approved_name?: string;

  supervisor_3_approved_by?: number;
  supervisor_3_approved_at?: string;
  supervisor_3_approved_name?: string;

  // Client notes
  client_notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// Grouped checklist items by section
export interface ChecklistSection {
  section_name: string | null;
  items: ProjectChecklistItem[];
}

// Checklist statistics for a phase
export interface ChecklistStatistics {
  total_tasks: number;
  completed_tasks: number;
  engineer_approved_tasks: number;
  supervisor_1_approved_tasks: number;
  supervisor_2_approved_tasks: number;
  supervisor_3_approved_tasks: number;
  completion_percentage: number;
}

// Checklist progress overview for a project
export interface ChecklistProgressOverview {
  project_id: number;
  project_name: string;
  phases: {
    phase_name: ChecklistPhaseName;
    statistics: ChecklistStatistics;
    sections: ChecklistSection[];
  }[];
}

// Input types for checklist operations
export interface ChecklistTemplateInput {
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
  is_active?: boolean;
}

export interface ProjectChecklistItemInput {
  phase_name: ChecklistPhaseName;
  section_name?: string;
  task_title_ar: string;
  task_title_en?: string;
  display_order: number;
}

// Approval input types
export interface ChecklistEngineerApprovalInput {
  items: number[]; // Array of item IDs to approve
}

export interface ChecklistSupervisorApprovalInput {
  items: number[]; // Array of item IDs to approve
  level: 1 | 2 | 3; // Supervisor approval level
}

// Client notes update
export interface ChecklistClientNotesInput {
  client_notes: string;
}

// Toggle completion input
export interface ChecklistToggleCompletionInput {
  is_completed: boolean;
}

