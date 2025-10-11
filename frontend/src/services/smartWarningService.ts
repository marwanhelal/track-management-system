// Smart Warning Service - Professional API Integration
export interface SmartWarning {
  id: string;
  type: string;
  severity: 'critical' | 'urgent' | 'warning' | 'advisory';
  phase_name: string;
  message: string;
  days_overdue?: number;
  days_until_due?: number;
  due_date?: string;
  timestamp: string;
}

export interface SmartWarningResponse {
  success: boolean;
  data: {
    project_id: number;
    total_phases: number;
    warnings: SmartWarning[];
    total_warnings: number;
    total_risk_score: number;
    health_score?: number;
    completion_percentage?: number;
    project_velocity?: number;
    estimated_completion_weeks?: number | null;
    analysis_timestamp: string;
    summary: {
      delays: number;
      approaching_due_dates: number;
      overdue: number;
      flagged: number;
    };
    performance_metrics?: {
      completed_phases: number;
      in_progress_phases: number;
      not_started_phases: number;
      completion_percentage: number;
    };
    recommendations?: Array<{
      id: string;
      category: string;
      priority: number;
      title: string;
      description: string;
      action_items?: string[];
    }>;
    risk_assessment?: {
      level: string;
      description: string;
      mitigation_required: boolean;
    };
  };
  message: string;
  error?: string;
}

export interface Project {
  id: number;
  name: string;
  status: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: {
    projects: Project[];
  };
  message: string;
  error?: string;
}

class SmartWarningService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/v1';

  /**
   * Get authorization headers with JWT token
   */
  private getAuthHeaders(): HeadersInit {
    const token = sessionStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get all projects for dropdown selection
   */
  async getAllProjects(): Promise<ProjectsResponse> {
    try {
      const fullURL = `${this.baseURL}/smart-test/projects`;
      const response = await fetch(fullURL, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Projects Service Error:', error);
      return {
        success: false,
        data: { projects: [] },
        message: 'Failed to fetch projects',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get smart warnings for a specific project
   */
  async getProjectWarnings(projectId: number): Promise<SmartWarningResponse> {
    try {
      const response = await fetch(`${this.baseURL}/smart-test/delays?project_id=${projectId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Smart Warning Service Error:', error);
      return {
        success: false,
        data: {
          project_id: projectId,
          total_phases: 0,
          warnings: [],
          total_warnings: 0,
          total_risk_score: 0,
          analysis_timestamp: new Date().toISOString(),
          summary: {
            delays: 0,
            approaching_due_dates: 0,
            overdue: 0,
            flagged: 0,
          },
        },
        message: 'Failed to fetch smart warnings',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get severity color for Material-UI components
   */
  getSeverityColor(severity: string): 'error' | 'warning' | 'info' | 'success' {
    switch (severity) {
      case 'critical': return 'error';
      case 'urgent': return 'warning';
      case 'warning': return 'warning';
      case 'advisory': return 'info';
      default: return 'info';
    }
  }

  /**
   * Get risk level description based on risk score
   */
  getRiskLevel(score: number): { level: string; color: 'error' | 'warning' | 'info' | 'success'; description: string } {
    if (score >= 70) {
      return { level: 'Critical', color: 'error', description: 'Immediate attention required' };
    } else if (score >= 40) {
      return { level: 'High', color: 'warning', description: 'Action needed soon' };
    } else if (score >= 20) {
      return { level: 'Medium', color: 'info', description: 'Monitor closely' };
    } else if (score > 0) {
      return { level: 'Low', color: 'info', description: 'Minor concerns' };
    } else {
      return { level: 'Healthy', color: 'success', description: 'On track' };
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Get warning icon based on type
   */
  getWarningIcon(type: string): string {
    switch (type) {
      case 'phase_delay': return '⏱️';
      case 'approaching_due_date': return '⏰';
      case 'overdue': return '🔥';
      case 'warning_flag': return '⚠️';
      case 'progress_risk': return '📊'; // Professional progress-based warning
      default: return '📋';
    }
  }

  /**
   * Get progress risk description based on gap percentage
   */
  getProgressRiskDescription(progressGap: number, riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return `Critical: ${progressGap}% behind schedule - Immediate intervention required`;
      case 'high': return `High Risk: ${progressGap}% behind schedule - Urgent action needed`;
      case 'medium': return `Medium Risk: ${progressGap}% behind schedule - Enhanced focus required`;
      default: return `Progress monitoring: ${progressGap}% variance detected`;
    }
  }
}

export const smartWarningService = new SmartWarningService();
export default smartWarningService;