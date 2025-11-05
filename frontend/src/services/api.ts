import axios from 'axios';
import {
  ApiResponse,
  LoginInput,
  RegisterInput,
  User,
  AuthTokens,
  Project,
  ProjectCreateInput,
  PredefinedPhase,
  ProjectPhase,
  WorkLog,
  WorkLogCreateInput,
  WorkLogSummary,
  PhaseSummary,
  ComprehensiveOverviewResponse,
  ProfileUpdateInput,
  ChangePasswordInput,
  ChecklistTemplate,
  ProjectChecklistItem,
  ChecklistStatistics,
  ChecklistProgressOverview,
  ChecklistTemplateInput,
  ProjectChecklistItemInput,
  ChecklistEngineerApprovalInput,
  ChecklistSupervisorApprovalInput,
  ChecklistClientNotesInput,
  ChecklistToggleCompletionInput,
  ChecklistPhaseName
} from '../types';

class ApiService {
  private api: any;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/v1';

    // TODO: Re-enable HTTPS enforcement after SSL certificate is configured
    // const isProduction = process.env.NODE_ENV === 'production';
    // if (isProduction && !this.baseURL.startsWith('https://')) {
    //   console.error('SECURITY WARNING: API URL must use HTTPS in production');
    //   // Auto-upgrade to HTTPS in production for security
    //   this.baseURL = this.baseURL.replace('http://', 'https://');
    // }

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Ensure SSL certificates are validated properly
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config: any) => {
        const token = sessionStorage.getItem('accessToken');
        if (token) {
          if (!config.headers) {
            config.headers = {};
          }
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors with retry protection
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;

        // Check for critical backend errors that require page refresh
        const isCriticalError = this.isCriticalBackendError(error);

        if (isCriticalError) {
          console.error('❌ Critical backend error detected:', error.message);
          this.handleCriticalError(error);
          return Promise.reject(error);
        }

        // Handle 401 authentication errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._isRefreshRequest) {
          originalRequest._retry = true;

          try {
            const refreshToken = sessionStorage.getItem('refreshToken');
            if (refreshToken) {
              // Mark this as a refresh request to prevent recursion
              const refreshResponse = await axios.post(`${this.baseURL}/auth/refresh`,
                { refreshToken },
                {
                  headers: { 'Content-Type': 'application/json' },
                  timeout: 10000, // 10 second timeout for refresh requests
                  _isRefreshRequest: true
                } as any
              );

              if (refreshResponse.data?.success && refreshResponse.data?.data?.tokens) {
                const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data.tokens;

                // Update stored tokens
                sessionStorage.setItem('accessToken', accessToken);
                if (newRefreshToken) {
                  sessionStorage.setItem('refreshToken', newRefreshToken);
                }

                // Retry original request with new token
                if (!originalRequest.headers) {
                  originalRequest.headers = {};
                }
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return this.api(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and let route protection handle navigation
            console.error('Token refresh failed:', refreshError);
            this.logout();
            // Don't force navigation here - let React Router and AuthContext handle it naturally
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Detect critical backend errors that require page refresh
  private isCriticalBackendError(error: any): boolean {
    // Network errors (backend not reachable)
    if (!error.response) {
      // No response means network failure, timeout, or backend crash
      const isNetworkError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ERR_NETWORK' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout');

      return isNetworkError;
    }

    // HTTP error codes indicating backend issues
    const status = error.response.status;
    const isCriticalStatus =
      status === 500 ||  // Internal Server Error
      status === 502 ||  // Bad Gateway
      status === 503 ||  // Service Unavailable
      status === 504;    // Gateway Timeout

    return isCriticalStatus;
  }

  // Handle critical errors - Log but don't auto-refresh (ConnectionMonitor handles recovery)
  private handleCriticalError(error: any): void {
    // Log the error for debugging
    console.error('⚠️ Critical backend error detected:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
      message: error.message,
      url: error.config?.url
    });

    // Store error info for ConnectionMonitor to access
    sessionStorage.setItem('lastCriticalError', JSON.stringify({
      timestamp: Date.now(),
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    }));

    // Don't auto-refresh here - ConnectionMonitor will:
    // 1. Show red banner with "Try Again" button for engineers
    // 2. Auto-refresh only after multiple failures (giving PM2 time to restart)
    // 3. Allow manual recovery without needing to call support
    console.log('💡 Use the "Try Again" button in the banner to reconnect without refreshing');
  }

  // Authentication
  async login(credentials: LoginInput): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  // SECURITY: Public registration is DISABLED
  // Only supervisors/administrators can create accounts via Team Management
  // async register(userData: RegisterInput): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
  //   const response = await this.api.post('/auth/register', userData);
  //   return response.data;
  // }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    const response = await this.api.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
    }
  }

  // Projects
  async getProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    const response = await this.api.get('/projects');
    return response.data;
  }

  async getProject(id: number): Promise<ApiResponse<{ project: Project; phases: ProjectPhase[]; workLogs: any[]; settings: any }>> {
    const response = await this.api.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(projectData: ProjectCreateInput): Promise<ApiResponse<{ project: Project; phases: ProjectPhase[] }>> {
    const response = await this.api.post('/projects', projectData);
    return response.data;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    const response = await this.api.put(`/projects/${id}`, updateData);
    return response.data;
  }

  async deleteProject(id: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/projects/${id}`);
    return response.data;
  }

  // Phases
  async getPredefinedPhases(): Promise<ApiResponse<{ phases: PredefinedPhase[] }>> {
    const response = await this.api.get('/phases/predefined');
    return response.data;
  }

  async getProjectPhases(projectId: number): Promise<ApiResponse<{ phases: ProjectPhase[] }>> {
    const response = await this.api.get(`/phases/project/${projectId}`);
    return response.data;
  }

  async startPhase(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/start`, { note });
    return response.data;
  }

  async submitPhase(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/submit`, { note });
    return response.data;
  }

  async approvePhase(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/approve`, { note });
    return response.data;
  }

  async completePhase(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/complete`, { note });
    return response.data;
  }

  async markPhaseWarning(phaseId: number, warningFlag: boolean, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/warning`, { warning_flag: warningFlag, note });
    return response.data;
  }

  async handlePhaseDelay(phaseId: number, delayData: {
    delay_reason: 'client' | 'company';
    note?: string;
    additional_weeks?: number;
    new_end_date?: string;
  }): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/delay`, delayData);
    return response.data;
  }

  // Work Logs
  async getPhaseWorkLogs(phaseId: number, page: number = 1, limit: number = 50): Promise<ApiResponse<{ workLogs: WorkLog[]; pagination: any }>> {
    const response = await this.api.get(`/work-logs/phase/${phaseId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getEngineerWorkLogs(engineerId: number, filters?: {
    startDate?: string;
    endDate?: string;
    projectId?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ workLogs: WorkLog[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await this.api.get(`/work-logs/engineer/${engineerId}?${params.toString()}`);
    return response.data;
  }

  async createWorkLog(workLogData: WorkLogCreateInput): Promise<ApiResponse<{ workLog: WorkLog }>> {
    const response = await this.api.post('/work-logs', workLogData);
    return response.data;
  }

  async createWorkLogAdmin(workLogData: {
    engineer_id: number;
    phase_id: number;
    hours: number;
    date: string;
    description?: string;
  }): Promise<ApiResponse<{ workLog: WorkLog }>> {
    const response = await this.api.post('/work-logs/admin', workLogData);
    return response.data;
  }

  async updateWorkLog(id: number, updateData: Partial<WorkLogCreateInput>): Promise<ApiResponse<{ workLog: WorkLog }>> {
    const response = await this.api.put(`/work-logs/${id}`, updateData);
    return response.data;
  }

  async deleteWorkLog(id: number, delete_note?: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/work-logs/${id}`, {
      data: { delete_note }
    });
    return response.data;
  }

  async getWorkLogsSummary(filters?: {
    projectId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ projectSummary: WorkLogSummary[]; phaseSummary: PhaseSummary[] }>> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await this.api.get(`/work-logs/summary?${params.toString()}`);
    return response.data;
  }

  async approveWorkLog(workLogId: number): Promise<ApiResponse<{ workLog: WorkLog }>> {
    const response = await this.api.put(`/work-logs/${workLogId}/approve`);
    return response.data;
  }

  // Timer Sessions
  async startTimerSession(data: { phase_id: number; description: string }): Promise<ApiResponse<{ session: any; project_name: string; phase_name: string }>> {
    const response = await this.api.post('/timer-sessions', data);
    return response.data;
  }

  async stopTimerSession(sessionId: number, elapsed_time_ms: number): Promise<ApiResponse<{ workLog: any; hours: number }>> {
    const response = await this.api.put(`/timer-sessions/${sessionId}/stop`, { elapsed_time_ms });
    return response.data;
  }

  async getActiveTimerSession(): Promise<ApiResponse<{ session: any | null }>> {
    const response = await this.api.get('/timer-sessions/active');
    return response.data;
  }

  async cancelTimerSession(sessionId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/timer-sessions/${sessionId}`);
    return response.data;
  }

  async getTimerSessionHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<{ sessions: any[]; pagination: any }>> {
    const response = await this.api.get(`/timer-sessions/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Users (Team Management)
  async getUsers(): Promise<ApiResponse<{ users: any[] }>> {
    const response = await this.api.get('/users');
    return response.data;
  }

  async getUser(id: number): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.get(`/users/${id}`);
    return response.data;
  }

  async getUserProjectBreakdown(id: number): Promise<ApiResponse<{
    user: { id: number; name: string; email: string; role: string };
    summary: { total_projects: number; total_phases: number; total_work_logs: number; total_hours: number };
    projects: Array<{
      project_id: number;
      project_name: string;
      project_status: string;
      total_hours: number;
      work_log_count: number;
      phases: Array<{
        phase_id: number;
        phase_name: string;
        phase_status: string;
        total_hours: number;
        work_log_count: number;
      }>;
    }>;
  }>> {
    const response = await this.api.get(`/users/${id}/project-breakdown`);
    return response.data;
  }

  async createEngineer(userData: { name: string; email: string; password: string }): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.post('/users/engineers', userData);
    return response.data;
  }

  async createSupervisor(userData: { name: string; email: string; password: string }): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.post('/users/supervisors', userData);
    return response.data;
  }

  async createAdministrator(userData: { name: string; email: string; password: string }): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.post('/users/administrators', userData);
    return response.data;
  }

  // Check if current user is super admin
  isSuperAdmin(): boolean {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return false;

    try {
      const user = JSON.parse(userStr);
      return user.email === 'marwanhelal15@gmail.com';
    } catch {
      return false;
    }
  }

  async updateUser(id: number, updateData: any): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.put(`/users/${id}`, updateData);
    return response.data;
  }

  async deactivateUser(id: number): Promise<ApiResponse> {
    const response = await this.api.post(`/users/${id}/deactivate`);
    return response.data;
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/users/${id}`);
    return response.data;
  }

  async reactivateUser(id: number): Promise<ApiResponse> {
    const response = await this.api.post(`/users/${id}/reactivate`);
    return response.data;
  }

  // Enhanced Project Settings & Management


  async archiveProject(projectId: number): Promise<ApiResponse> {
    const response = await this.api.post(`/projects/${projectId}/archive`);
    return response.data;
  }

  async unarchiveProject(projectId: number): Promise<ApiResponse> {
    const response = await this.api.post(`/projects/${projectId}/unarchive`);
    return response.data;
  }

  async getArchivedProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    const response = await this.api.get('/projects/archived');
    return response.data;
  }

  async exportProject(projectId: number, options?: {
    format?: 'json' | 'csv' | 'pdf';
    dateFrom?: string;
    dateTo?: string;
    phases?: number[];
  }): Promise<any> {
    const params = new URLSearchParams();

    if (options?.format) {
      params.append('format', options.format);
    }
    if (options?.dateFrom) {
      params.append('dateFrom', options.dateFrom);
    }
    if (options?.dateTo) {
      params.append('dateTo', options.dateTo);
    }
    if (options?.phases && options.phases.length > 0) {
      params.append('phases', options.phases.join(','));
    }

    const queryString = params.toString();
    const url = `/projects/${projectId}/export${queryString ? `?${queryString}` : ''}`;

    // Handle different response types based on format
    if (options?.format === 'csv' || options?.format === 'pdf') {
      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      return response.data; // Return blob directly
    } else {
      const response = await this.api.get(url);
      return response.data;
    }
  }

  // Enhanced Phase Management
  async createPhase(projectId: number, phaseData: any): Promise<ApiResponse<{ phase: ProjectPhase }>> {
    const response = await this.api.post(`/phases/project/${projectId}`, phaseData);
    return response.data;
  }

  async updatePhase(phaseId: number, updateData: any): Promise<ApiResponse<{ phase: ProjectPhase }>> {
    const response = await this.api.put(`/phases/${phaseId}`, updateData);
    return response.data;
  }

  async updatePhaseHistorical(phaseId: number, updateData: any): Promise<ApiResponse<{ phase: ProjectPhase }>> {
    const response = await this.api.put(`/phases/${phaseId}/historical`, updateData);
    return response.data;
  }

  async updatePhaseStatus(phaseId: number, status: string): Promise<ApiResponse<{ phase: ProjectPhase }>> {
    const response = await this.api.put(`/phases/${phaseId}/status`, { status });
    return response.data;
  }

  async deletePhase(phaseId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/phases/${phaseId}`);
    return response.data;
  }

  // Team Analytics & Reports
  async getTeamAnalytics(projectId?: number, filters?: any): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await this.api.get(`/analytics/team?${params.toString()}`);
    return response.data;
  }

  async exportTeamReport(projectId: number, format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/projects/${projectId}/team/export?format=${format}`);
    return response.data;
  }

  // Project Health Monitoring
  async getProjectHealth(projectId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/projects/${projectId}/health`);
    return response.data;
  }

  async getProjectMetrics(projectId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/projects/${projectId}/metrics`);
    return response.data;
  }


  // Advanced Search & Filtering
  async searchProjects(query: string, filters?: any): Promise<ApiResponse<{ projects: Project[] }>> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.createdBy) params.append('createdBy', filters.createdBy.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await this.api.get(`/projects/search?${params.toString()}`);
    return response.data;
  }

  async searchTeamMembers(projectId: number, query: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/projects/${projectId}/team/search?q=${query}`);
    return response.data;
  }

  // Backup & Restore
  async backupProject(projectId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/projects/${projectId}/backup`);
    return response.data;
  }

  async restoreProject(projectId: number, backupData: any): Promise<ApiResponse> {
    const response = await this.api.post(`/projects/${projectId}/restore`, backupData);
    return response.data;
  }



  // Early Access Management
  async grantEarlyAccess(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/grant-early-access`, { note });
    return response.data;
  }

  async revokeEarlyAccess(phaseId: number, note?: string): Promise<ApiResponse> {
    const response = await this.api.post(`/phases/${phaseId}/revoke-early-access`, { note });
    return response.data;
  }

  async getEarlyAccessOverview(projectId: number): Promise<ApiResponse<{ overview: any }>> {
    const response = await this.api.get(`/phases/project/${projectId}/early-access-overview`);
    return response.data;
  }

  // CEO Comprehensive Overview
  async getComprehensiveOverview(): Promise<ComprehensiveOverviewResponse> {
    const response = await this.api.get('/projects/comprehensive-overview');
    return response.data;
  }

  // Profile methods
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/profile');
    return response.data;
  }

  async updateProfile(data: ProfileUpdateInput): Promise<ApiResponse<User>> {
    const response = await this.api.put('/profile', data);
    return response.data;
  }

  // Change password (already exists in auth controller)
  async changePassword(data: ChangePasswordInput): Promise<ApiResponse<any>> {
    const response = await this.api.post('/auth/change-password', data);
    return response.data;
  }

  // Progress Management
  async setWorkLogProgress(workLogId: number, data: { manual_progress_percentage: number; adjustment_reason: string }): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/progress/work-log/${workLogId}`, data);
    return response.data;
  }

  async setPhaseEngineerProgress(phaseId: number, engineerId: number, data: { manual_progress_percentage: number; adjustment_reason: string }): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/progress/phase/${phaseId}/engineer/${engineerId}`, data);
    return response.data;
  }

  async getProgressHistory(phaseId: number, engineerId?: number): Promise<ApiResponse<{ history: any[] }>> {
    const url = engineerId
      ? `/progress/phase/${phaseId}/history?engineerId=${engineerId}`
      : `/progress/phase/${phaseId}/history`;
    const response = await this.api.get(url);
    return response.data;
  }

  async getPhaseProgressSummary(phaseId: number): Promise<ApiResponse<{ summary: any[] }>> {
    const response = await this.api.get(`/progress/phase/${phaseId}/summary`);
    return response.data;
  }

  async getEngineerProgressBreakdown(phaseId: number, engineerId: number): Promise<ApiResponse<{ breakdown: any }>> {
    const response = await this.api.get(`/progress/phase/${phaseId}/engineer/${engineerId}`);
    return response.data;
  }

  async getPhaseProgressDetail(phaseId: number): Promise<ApiResponse<{ detail: any }>> {
    const response = await this.api.get(`/progress/phase/${phaseId}/detail`);
    return response.data;
  }

  async calculateProgress(hoursLogged: number, predictedHours: number): Promise<ApiResponse<{ progress: number }>> {
    const response = await this.api.post('/progress/calculate', {
      hours_logged: hoursLogged,
      predicted_hours: predictedHours
    });
    return response.data;
  }

  // Engineer Activity endpoints
  async getDailyEngineerActivity(date?: string): Promise<ApiResponse<any>> {
    const url = date ? `/engineer-activity/daily?date=${date}` : '/engineer-activity/daily';
    const response = await this.api.get(url);
    return response.data;
  }

  async getEngineerActivitySummary(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/engineer-activity/summary?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  }

  async exportEngineerActivityExcel(date?: string): Promise<Blob> {
    const url = date ? `/engineer-activity/export/excel?date=${date}` : '/engineer-activity/export/excel';
    const response = await this.api.get(url, { responseType: 'blob' });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // ========================================
  // PROJECT DETAILS METHODS
  // ========================================
  async updateProjectDetails(projectId: number, data: {
    land_area?: string;
    building_type?: string;
    floors_count?: number;
    location?: string;
    bua?: string;
    client_name?: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/projects/${projectId}`, data);
    return response.data;
  }

  // ============================================================================
  // CHECKLIST SYSTEM METHODS
  // ============================================================================

  // ========================================
  // CHECKLIST TEMPLATES (Supervisor Only)
  // ========================================

  /**
   * Get all checklist templates or filter by phase
   */
  async getChecklistTemplates(phase_name?: ChecklistPhaseName): Promise<ApiResponse<{ templates: ChecklistTemplate[] }>> {
    const url = phase_name ? `/checklist/templates?phase_name=${phase_name}` : '/checklist/templates';
    const response = await this.api.get(url);
    return response.data;
  }

  /**
   * Get templates grouped by phase and section
   */
  async getChecklistTemplatesGrouped(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/checklist/templates/grouped');
    return response.data;
  }

  /**
   * Create a new checklist template (supervisor only)
   */
  async createChecklistTemplate(data: ChecklistTemplateInput): Promise<ApiResponse<{ template: ChecklistTemplate }>> {
    const response = await this.api.post('/checklist/templates', data);
    return response.data;
  }

  /**
   * Update an existing checklist template (supervisor only)
   */
  async updateChecklistTemplate(id: number, data: Partial<ChecklistTemplateInput>): Promise<ApiResponse<{ template: ChecklistTemplate }>> {
    const response = await this.api.put(`/checklist/templates/${id}`, data);
    return response.data;
  }

  /**
   * Delete a checklist template (supervisor only)
   */
  async deleteChecklistTemplate(id: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/checklist/templates/${id}`);
    return response.data;
  }

  // ========================================
  // PROJECT CHECKLIST ITEMS
  // ========================================

  /**
   * Generate checklist for a project from templates (called during project creation)
   */
  async generateProjectChecklist(project_id: number): Promise<ApiResponse<{ items: ProjectChecklistItem[]; count: number }>> {
    const response = await this.api.post(`/checklist/projects/${project_id}/generate`);
    return response.data;
  }

  /**
   * Get all checklist items for a project (can filter by phase)
   */
  async getProjectChecklistItems(project_id: number, phase_name?: ChecklistPhaseName): Promise<ApiResponse<{ items: ProjectChecklistItem[] }>> {
    const url = phase_name
      ? `/checklist/projects/${project_id}?phase_name=${phase_name}`
      : `/checklist/projects/${project_id}`;
    const response = await this.api.get(url);
    return response.data;
  }

  /**
   * Get project checklist grouped by phase with statistics
   */
  async getProjectChecklistGrouped(project_id: number): Promise<ApiResponse<ChecklistProgressOverview>> {
    const response = await this.api.get(`/checklist/projects/${project_id}/grouped`);
    return response.data;
  }

  /**
   * Get statistics for a specific phase
   */
  async getChecklistStatistics(project_id: number, phase_name: ChecklistPhaseName): Promise<ApiResponse<{ statistics: ChecklistStatistics }>> {
    const response = await this.api.get(`/checklist/projects/${project_id}/phases/${phase_name}/statistics`);
    return response.data;
  }

  /**
   * Create new checklist item for project (supervisor only - mainly for BOQ phase)
   */
  async createProjectChecklistItem(project_id: number, data: ProjectChecklistItemInput): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.post(`/checklist/projects/${project_id}/items`, data);
    return response.data;
  }

  /**
   * Update checklist item (supervisor only for most fields, engineers can toggle completion)
   */
  async updateProjectChecklistItem(id: number, data: Partial<ProjectChecklistItemInput>): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.put(`/checklist/items/${id}`, data);
    return response.data;
  }

  /**
   * Delete checklist item (supervisor only)
   */
  async deleteProjectChecklistItem(id: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/checklist/items/${id}`);
    return response.data;
  }

  // ========================================
  // TASK COMPLETION & APPROVAL WORKFLOW
  // ========================================

  /**
   * Toggle task completion status (engineers can check/uncheck tasks)
   */
  async toggleItemCompletion(id: number, is_completed: boolean): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.post(`/checklist/items/${id}/toggle-completion`, { is_completed });
    return response.data;
  }

  /**
   * Engineer approval - Level 1 (engineers only)
   * Batch approve multiple items
   */
  async engineerApproval(data: ChecklistEngineerApprovalInput): Promise<ApiResponse<{ items: ProjectChecklistItem[]; count: number }>> {
    const response = await this.api.post('/checklist/approve/engineer', data);
    return response.data;
  }

  /**
   * Supervisor approval - Levels 1, 2, 3 (supervisors only)
   * Batch approve multiple items at specified level
   */
  async supervisorApproval(data: ChecklistSupervisorApprovalInput): Promise<ApiResponse<{ items: ProjectChecklistItem[]; count: number }>> {
    const response = await this.api.post('/checklist/approve/supervisor', data);
    return response.data;
  }

  /**
   * Revoke engineer approval (supervisors only)
   */
  async revokeEngineerApproval(id: number): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.post(`/checklist/items/${id}/revoke-engineer-approval`);
    return response.data;
  }

  /**
   * Revoke supervisor approval (supervisors only)
   * Must specify which level to revoke
   */
  async revokeSupervisorApproval(id: number, level: 1 | 2 | 3): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.post(`/checklist/items/${id}/revoke-supervisor-approval`, { level });
    return response.data;
  }

  // ========================================
  // CLIENT NOTES
  // ========================================

  /**
   * Update client notes (supervisors only)
   */
  async updateChecklistClientNotes(id: number, data: ChecklistClientNotesInput): Promise<ApiResponse<{ item: ProjectChecklistItem }>> {
    const response = await this.api.put(`/checklist/items/${id}/client-notes`, data);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;