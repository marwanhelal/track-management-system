import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query, transaction } from '@/database/connection';
import {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectOverview,
  ApiResponse,
  ComprehensiveOverviewData,
  ComprehensiveOverviewResponse,
  PhaseDetail,
  EngineerWorkDetail,
  DeadlineInfo
} from '@/types';
import * as csvWriter from 'csv-writer';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Get all projects with filters and pagination
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    // Direct SQL query to get projects (excluding archived)
    const result = await query(`
      SELECT p.*, u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.archived_at IS NULL
      ORDER BY p.created_at DESC
    `);

    const response: ApiResponse<{ projects: any[] }> = {
      success: true,
      data: { projects: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getArchivedProjects = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors can view archived projects
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can view archived projects'
      });
      return;
    }

    const result = await query(`
      SELECT
        p.id,
        p.name,
        p.start_date,
        p.planned_total_weeks,
        p.predicted_hours,
        p.actual_hours,
        p.status,
        p.created_at,
        p.archived_at,
        u.name as created_by_name,
        au.name as archived_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users au ON p.archived_by = au.id
      WHERE p.archived_at IS NOT NULL
      ORDER BY p.archived_at DESC
    `);

    const response: ApiResponse<{ projects: any[] }> = {
      success: true,
      data: { projects: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get archived projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get single project with details
export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id as string, 10);

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
      return;
    }

    // Direct SQL queries to get project, phases, and work logs
    const [projectResult, phasesResult, workLogsResult] = await Promise.all([
      query(`
        SELECT p.*, u.name as created_by_name, ps.auto_advance_enabled, ps.allow_timeline_mismatch
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_settings ps ON p.id = ps.project_id
        WHERE p.id = $1
      `, [projectId]),
      query(`
        SELECT * FROM project_phases
        WHERE project_id = $1
        ORDER BY id
      `, [projectId]),
      query(`
        SELECT wl.*, u.name as engineer_name, pp.phase_name
        FROM work_logs wl
        LEFT JOIN users u ON wl.engineer_id = u.id
        LEFT JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE wl.project_id = $1
        ORDER BY wl.created_at DESC
      `, [projectId])
    ]);

    const project = projectResult.rows[0];

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    const response: ApiResponse<{
      project: Project & { created_by_name: string };
      phases: any[];
      workLogs: any[];
      settings: any;
    }> = {
      success: true,
      data: {
        project: {
          ...project,
          created_by_name: project.created_by_name
        },
        phases: phasesResult.rows,
        workLogs: workLogsResult.rows,
        settings: {
          auto_advance_enabled: project.auto_advance_enabled,
          allow_timeline_mismatch: project.allow_timeline_mismatch
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Create new project with selected phases
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const {
      name,
      start_date,
      planned_total_weeks,
      predicted_hours,
      selectedPhases
    }: ProjectCreateInput = req.body;

    // Validate that supervisor role is creating the project
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can create projects'
      });
      return;
    }

    // Validate timeline consistency (sum of phase weeks vs total weeks)
    const totalPhaseWeeks = selectedPhases.reduce((sum, phase) => sum + phase.planned_weeks, 0);
    const weeksDifference = Math.abs(totalPhaseWeeks - planned_total_weeks);

    if (weeksDifference > 1) { // Allow 1 week tolerance
      res.status(400).json({
        success: false,
        error: `Timeline mismatch: Total phase weeks (${totalPhaseWeeks}) does not match planned total weeks (${planned_total_weeks}). Difference: ${weeksDifference} weeks.`,
        details: {
          totalPhaseWeeks,
          plannedTotalWeeks: planned_total_weeks,
          difference: weeksDifference,
          suggestions: [
            'Auto-adjust planned total weeks to match phases',
            'Proportionally scale phase durations',
            'Manually adjust individual phase durations'
          ]
        }
      });
      return;
    }

    // Create project and phases in a transaction
    const result = await transaction(async (client) => {
      // Insert project
      const projectResult = await client.query(`
        INSERT INTO projects (name, start_date, planned_total_weeks, predicted_hours, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        name,
        start_date || new Date(),
        planned_total_weeks,
        predicted_hours,
        authReq.user.id
      ]);

      const project = projectResult.rows[0];
      const projectStartDate = new Date(project.start_date);

      // Insert project phases
      const phases = [];
      let currentStartDate = new Date(projectStartDate);

      for (let i = 0; i < selectedPhases.length; i++) {
        const phase = selectedPhases[i];
        if (!phase) continue;

        const phaseEndDate = new Date(currentStartDate);
        phaseEndDate.setDate(phaseEndDate.getDate() + (phase.planned_weeks * 7));

        const phaseResult = await client.query(`
          INSERT INTO project_phases (
            project_id, phase_order, phase_name, is_custom, planned_weeks,
            planned_start_date, planned_end_date, status, predicted_hours
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          project.id,
          i + 1,
          phase.phase_name,
          phase.is_custom,
          phase.planned_weeks,
          currentStartDate,
          phaseEndDate,
          i === 0 ? 'ready' : 'not_started', // First phase is ready, others are not_started
          phase.predicted_hours || null
        ]);

        phases.push(phaseResult.rows[0]);
        currentStartDate = new Date(phaseEndDate);
      }

      // Insert default project settings
      await client.query(`
        INSERT INTO project_settings (project_id, auto_advance_enabled, allow_timeline_mismatch)
        VALUES ($1, $2, $3)
      `, [project.id, true, false]);

      // Log audit event
      await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'projects',
        project.id,
        'CREATE',
        authReq.user.id,
        `Project created with ${selectedPhases.length} phases`
      ]);

      return { project, phases };
    });

    const response: ApiResponse<{
      project: Project;
      phases: any[];
      message: string;
    }> = {
      success: true,
      message: 'Project created successfully',
      data: {
        project: result.project,
        phases: result.phases,
        message: 'Project created successfully'
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during project creation'
    });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const updates: ProjectUpdateInput = req.body;

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Only supervisors can update projects
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can update projects'
      });
      return;
    }

    // Build update query safely using whitelist approach (prevents SQL injection)
    const allowedFields = ['name', 'start_date', 'planned_total_weeks', 'predicted_hours', 'status'] as const;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Use whitelist to safely construct query - only known safe field names
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // Field names are from a controlled whitelist, safe to use directly
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['projects', id, 'UPDATE', authReq.user.id, `Project updated: ${Object.keys(updates).join(', ')}`]
    );

    const response: ApiResponse<{ project: Project }> = {
      success: true,
      message: 'Project updated successfully',
      data: { project: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete project (soft delete)
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    // Only supervisors can delete projects
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can delete projects'
      });
      return;
    }

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Permanent delete - remove from database
    await query(
      'DELETE FROM projects WHERE id = $1',
      [id]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['projects', id, 'DELETE', authReq.user.id, 'Project permanently deleted from database']
    );

    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Enhanced Project Settings & Management

export const archiveProject = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can archive projects'
      });
      return;
    }

    await query(
      'UPDATE projects SET archived_at = NOW(), archived_by = $1, updated_at = NOW() WHERE id = $2',
      [authReq.user.id, id]
    );

    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['projects', id, 'ARCHIVE', authReq.user.id, 'Project archived']
    );

    res.status(200).json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const unarchiveProject = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can unarchive projects'
      });
      return;
    }

    // Check if project is archived
    const projectResult = await query(
      'SELECT id, status, archived_at FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    const project = projectResult.rows[0];
    if (!project.archived_at) {
      res.status(400).json({
        success: false,
        error: 'Project is not archived'
      });
      return;
    }

    await query(
      'UPDATE projects SET archived_at = NULL, archived_by = NULL, updated_at = NOW() WHERE id = $1',
      [id]
    );

    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['projects', id, 'UNARCHIVE', authReq.user.id, 'Project unarchived']
    );

    res.status(200).json({
      success: true,
      message: 'Project unarchived successfully'
    });
  } catch (error) {
    console.error('Unarchive project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Helper function to generate CSV export
const generateCSVExport = async (exportData: any): Promise<string> => {
  const { project, phases, workLogs, teamAnalytics, summary } = exportData;

  let csvContent = '';

  // Project Summary Section
  csvContent += 'PROJECT SUMMARY\n';
  csvContent += 'Field,Value\n';
  csvContent += `Project Name,"${project.name}"\n`;
  csvContent += `Status,"${project.status}"\n`;
  csvContent += `Start Date,"${project.start_date}"\n`;
  csvContent += `End Date,"${project.end_date || 'Not set'}"\n`;
  csvContent += `Total Hours,"${summary.totalHours}"\n`;
  csvContent += `Predicted Hours,"${project.predicted_hours}"\n`;
  csvContent += `Budget Utilization,"${summary.budgetUtilization}%"\n`;
  csvContent += `Progress,"${summary.progressPercentage}%"\n`;
  csvContent += `Team Size,"${summary.teamSize}"\n`;
  csvContent += `Created By,"${project.created_by_name}"\n`;
  csvContent += `Exported At,"${summary.exportedAt}"\n`;

  // Phases Section
  csvContent += '\n\nPHASES\n';
  csvContent += 'Phase Name,Status,Order,Hours,Engineers,Work Logs,Start Date,End Date,Warning Flag\n';
  phases.forEach((phase: any) => {
    csvContent += `"${phase.phase_name}","${phase.status}",${phase.phase_order},${phase.total_hours},${phase.engineers_count},${phase.work_logs_count},"${phase.start_date || ''}","${phase.end_date || ''}","${phase.warning_flag || 'No'}"\n`;
  });

  // Work Logs Section
  csvContent += '\n\nWORK LOGS\n';
  csvContent += 'Date,Engineer,Phase,Hours,Task Description,Notes\n';
  workLogs.forEach((log: any) => {
    csvContent += `"${log.date}","${log.engineer_name}","${log.phase_name}",${log.hours},"${log.task_description || ''}","${log.notes || ''}"\n`;
  });

  // Team Analytics Section
  csvContent += '\n\nTEAM ANALYTICS\n';
  csvContent += 'Engineer Name,Email,Total Hours,Work Logs,Phases Worked,Avg Hours/Log,First Log,Last Log\n';
  teamAnalytics.forEach((member: any) => {
    csvContent += `"${member.name}","${member.email}",${member.total_hours},${member.work_logs_count},${member.phases_worked},${parseFloat(member.avg_hours_per_log).toFixed(2)},"${member.first_log_date || ''}","${member.last_log_date || ''}"\n`;
  });

  return csvContent;
};

// Helper function to generate PDF export
const generatePDFExport = async (exportData: any): Promise<Buffer> => {
  try {
    const { project, phases, workLogs, teamAnalytics, summary } = exportData;

    // Validate required data
    if (!project) {
      throw new Error('Project data is required for PDF generation');
    }

    // Ensure arrays are properly initialized
    const safePhases = Array.isArray(phases) ? phases : [];
    const safeWorkLogs = Array.isArray(workLogs) ? workLogs : [];
    const safeTeamAnalytics = Array.isArray(teamAnalytics) ? teamAnalytics : [];
    const safeSummary = summary || {};

  // Enhanced data formatting and validation
  const formatDate = (date: string | null) => {
    return date ? new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : 'N/A';
  };

  const formatNumber = (num: number | string) => {
    if (num === null || num === undefined || isNaN(Number(num))) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (numValue === 0) return '0';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: numValue % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 2
    });
  };

  const formatHours = (hours: number | string) => {
    const numHours = parseFloat(String(hours)) || 0;
    return `${formatNumber(numHours)}h`;
  };

  const formatPercentage = (percent: number | string) => {
    const numPercent = parseFloat(String(percent)) || 0;
    return `${Math.round(numPercent)}%`;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = parseFloat(String(amount)) || 0;
    return `$${formatNumber(numAmount)}`;
  };

  // Helper function to format project names professionally
  const formatProjectName = (name: string) => {
    if (!name) return 'Project Name Not Available';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#4caf50';
      case 'in_progress': return '#ff9800';
      case 'pending': return '#757575';
      case 'active': return '#2196F3';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '✓';
      case 'in_progress': return '⟳';
      case 'pending': return '○';
      case 'active': return '▶';
      default: return '○';
    }
  };

  // Calculate phase duration safely
  const calculateDuration = (phase: any) => {
    if (!phase.first_log_date || !phase.last_log_date) {
      if (phase.status === 'completed') return 'Completed';
      if (phase.status === 'in_progress') return 'In Progress';
      return 'Not Started';
    }
    const start = new Date(phase.first_log_date);
    const end = new Date(phase.last_log_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks`;
    return `${Math.round(diffDays / 30)} months`;
  };

  // Company logo as base64 PNG
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  const logoSvg = `data:image/png;base64,${logoBase64}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Report - ${project.name || 'Untitled Project'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          font-size: 11px;
        }

        .page {
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #e3f2fd;
          position: relative;
          background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
          border-radius: 8px 8px 0 0;
          padding: 25px;
          margin: -40px -40px 40px -40px;
        }

        .header::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 25px;
          width: 80px;
          height: 3px;
          background: linear-gradient(135deg, #1565C0, #0D47A1);
          border-radius: 2px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo {
          width: 160px;
          height: auto;
          max-height: 50px;
        }

        .company-info {
          color: #666;
          font-size: 9px;
          line-height: 1.4;
        }

        .report-info {
          text-align: right;
          color: #666;
          font-size: 10px;
        }

        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 5px;
        }

        .report-date {
          color: #666;
          font-size: 10px;
        }

        /* Project Title */
        .project-header {
          text-align: center;
          margin-bottom: 35px;
          padding: 30px;
          background: linear-gradient(135deg, #f8fbff 0%, #e3f2fd 100%);
          border-radius: 12px;
          border-left: 5px solid #1565C0;
          box-shadow: 0 2px 10px rgba(21, 101, 192, 0.1);
        }

        .project-title {
          font-size: 28px;
          font-weight: 700;
          color: #0D47A1;
          margin-bottom: 12px;
          text-transform: capitalize;
          letter-spacing: 0.5px;
        }

        .project-subtitle {
          color: #666;
          font-size: 12px;
          font-weight: 400;
        }

        /* Sections */
        .section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #2196F3;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e8f4fd;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-icon {
          width: 16px;
          height: 16px;
          background: #2196F3;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        }

        /* Summary Grid */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 18px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }

        .summary-card:hover {
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.1);
          border-color: #2196F3;
        }

        .summary-label {
          font-size: 9px;
          font-weight: 500;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .summary-trend {
          font-size: 8px;
          color: #4caf50;
          font-weight: 500;
        }

        /* Progress Bars */
        .progress-container {
          margin-top: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #f0f0f0;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #45a049);
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Tables */
        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e1e8ed;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        th {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          font-weight: 600;
          padding: 12px 10px;
          text-align: left;
          font-size: 9px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #f5f5f5;
          vertical-align: middle;
        }

        tr:nth-child(even) {
          background: #fafbfc;
        }

        tr:hover {
          background: #f8fbff;
        }

        /* Status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-completed {
          background: #e8f5e8;
          color: #2e7d32;
          border: 1px solid #c8e6c9;
        }

        .status-in_progress {
          background: #fff3e0;
          color: #ef6c00;
          border: 1px solid #ffcc02;
        }

        .status-pending {
          background: #f5f5f5;
          color: #616161;
          border: 1px solid #e0e0e0;
        }

        .status-active {
          background: #e3f2fd;
          color: #1976d2;
          border: 1px solid #90caf9;
        }

        /* Numbers and metrics */
        .metric {
          font-weight: 600;
          color: #1a1a1a;
        }

        .metric-hours {
          color: #2196F3;
        }

        .metric-percentage {
          color: #4caf50;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e1e8ed;
          text-align: center;
          color: #666;
          font-size: 9px;
        }

        .footer-logo {
          width: 80px;
          height: 26px;
          margin: 0 auto 10px;
        }

        /* Charts placeholder */
        .chart-placeholder {
          height: 120px;
          background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 10px;
          border: 1px solid #e1e8ed;
          margin: 15px 0;
        }

        /* Responsive adjustments */
        @media print {
          .page {
            box-shadow: none;
            margin: 0;
            padding: 20px;
          }

          .section {
            page-break-inside: avoid;
          }

          .progress-fill::after {
            display: none;
          }
        }

        /* Utility classes */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 600; }
        .text-sm { font-size: 9px; }
        .text-xs { font-size: 8px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-3 { margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <header class="header">
          <div class="logo-section">
            <img src="${logoSvg}" alt="Criteria Design Group" class="logo">
            <div class="company-info">
              <strong>CRITERIA DESIGN GROUP</strong><br>
              URBAN - ARCHITECTURE - INTERIOR<br>
              <div style="margin-top: 8px; font-size: 10px; color: #666;">
                Arch. HESHAM HELAL | System Engineer: Marwan Helal
              </div>
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">PROJECT ANALYSIS REPORT</div>
            <div class="report-date">Generated: ${formatDate(safeSummary.exportedAt)}</div>
            <div class="text-xs" style="margin-top: 5px;">
              Document ID: RPT-${project.id || 'XXX'}-${new Date().getFullYear()}
            </div>
          </div>
        </header>

        <!-- Project Header -->
        <div class="project-header">
          <h1 class="project-title">${formatProjectName(project.name)}</h1>
          <p class="project-subtitle">
            ${project.description || 'Comprehensive project analysis and performance metrics'}
          </p>
        </div>

        <!-- Executive Summary -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">📊</span>
            Executive Summary
          </h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Project Status</div>
              <div class="summary-value" style="color: ${getStatusColor(project.status)}">
                ${getStatusIcon(project.status)} ${(project.status || 'Unknown').toUpperCase()}
              </div>
              <div class="summary-trend">
                ${project.status === 'completed' ? '✓ Project Delivered' :
                  project.status === 'active' ? '▶ In Progress' : '○ Pending Start'}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Overall Progress</div>
              <div class="summary-value metric-percentage">${formatPercentage(safeSummary.progressPercentage || 0)}</div>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${safeSummary.progressPercentage || 0}%"></div>
                </div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Budget Utilization</div>
              <div class="summary-value" style="color: ${safeSummary.budgetUtilization > 100 ? '#f44336' : safeSummary.budgetUtilization > 80 ? '#ff9800' : '#4caf50'}">
                ${formatPercentage(safeSummary.budgetUtilization || 0)}
              </div>
              <div class="summary-trend">
                ${safeSummary.budgetUtilization > 100 ? '⚠ Over Budget' :
                  safeSummary.budgetUtilization > 80 ? '⚡ Near Limit' : '✓ On Track'}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Hours Logged</div>
              <div class="summary-value metric-hours">${formatHours(safeSummary.totalHours || 0)}</div>
              <div class="summary-trend">
                Predicted: ${formatHours(safeSummary.predictedHours || 0)}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Team Size</div>
              <div class="summary-value">${safeSummary.teamSize || 0}</div>
              <div class="summary-trend">Active Engineers</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Phase Completion</div>
              <div class="summary-value">${safeSummary.completedPhases || 0}/${safeSummary.totalPhases || 0}</div>
              <div class="summary-trend">
                ${safeSummary.totalPhases ? Math.round((safeSummary.completedPhases / safeSummary.totalPhases) * 100) : 0}% Complete
              </div>
            </div>
          </div>
        </section>

        <!-- Project Timeline -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">📅</span>
            Project Timeline & Phases
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Phase Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Hours</th>
                  <th>Engineers</th>
                  <th>Work Logs</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${safePhases && safePhases.length > 0 ? safePhases.map((phase: any) => `
                  <tr>
                    <td class="font-bold">${phase.phase_name || 'Unnamed Phase'}</td>
                    <td>
                      <span class="status-badge status-${(phase.status || 'pending').replace(' ', '_')}">
                        ${getStatusIcon(phase.status)} ${(phase.status || 'Pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div class="progress-bar" style="width: 60px; height: 4px;">
                        <div class="progress-fill" style="width: ${phase.progress || 0}%"></div>
                      </div>
                    </td>
                    <td class="metric metric-hours">${formatHours(phase.total_hours || 0)}</td>
                    <td class="metric">${formatNumber(phase.engineers_count || 0)}</td>
                    <td class="metric">${formatNumber(phase.work_logs_count || 0)}</td>
                    <td class="text-sm">${calculateDuration(phase)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #666;">
                      No phases data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Team Performance -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">👥</span>
            Team Performance Analysis
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Engineer</th>
                  <th>Total Hours</th>
                  <th>Work Sessions</th>
                  <th>Phases Worked</th>
                  <th>Avg Hours/Session</th>
                  <th>Active Period</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                ${safeTeamAnalytics && safeTeamAnalytics.length > 0 ? safeTeamAnalytics.map((member: any) => {
                  const contributionPercent = safeSummary.totalHours > 0 ?
                    Math.round((member.total_hours / safeSummary.totalHours) * 100) : 0;
                  return `
                    <tr>
                      <td class="font-bold">
                        <div>${member.name || 'Unknown Engineer'}</div>
                        <div class="text-xs" style="color: #666;">${member.email || ''}</div>
                      </td>
                      <td class="metric metric-hours">${formatHours(member.total_hours || 0)}</td>
                      <td class="metric">${formatNumber(member.work_logs_count || 0)}</td>
                      <td class="metric">${formatNumber(member.phases_worked || 0)}</td>
                      <td class="metric">${formatHours(member.avg_hours_per_log || 0)}</td>
                      <td class="text-sm">
                        ${member.first_log_date && member.last_log_date ?
                          `${formatDate(member.first_log_date)} - ${formatDate(member.last_log_date)}` :
                          'N/A'}
                      </td>
                      <td>
                        <div class="progress-bar" style="width: 50px; height: 4px;">
                          <div class="progress-fill" style="width: ${contributionPercent}%"></div>
                        </div>
                        <div class="text-xs">${formatPercentage(contributionPercent)}</div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #666;">
                      No team performance data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Recent Activity -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">⚡</span>
            Recent Work Activity
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Engineer</th>
                  <th>Phase</th>
                  <th>Hours</th>
                  <th>Task Description</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${workLogs && workLogs.length > 0 ? workLogs.slice(0, 15).map((log: any) => `
                  <tr>
                    <td class="text-sm">${formatDate(log.date)}</td>
                    <td class="font-bold">${log.engineer_name || 'Unknown'}</td>
                    <td class="text-sm">${log.phase_name || 'N/A'}</td>
                    <td class="metric metric-hours">${formatNumber(log.hours || 0)}h</td>
                    <td class="text-sm">${(log.task_description || 'No description').substring(0, 40)}${(log.task_description || '').length > 40 ? '...' : ''}</td>
                    <td class="text-xs" style="color: #666;">
                      ${(log.notes || 'No notes').substring(0, 30)}${(log.notes || '').length > 30 ? '...' : ''}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" class="text-center" style="padding: 20px; color: #666;">
                      No work log data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
          ${workLogs && workLogs.length > 15 ? `
            <div class="text-center text-sm" style="margin-top: 10px; color: #666;">
              <em>Showing latest 15 entries. Total work logs: ${workLogs.length}</em>
            </div>
          ` : ''}
        </section>

        <!-- Footer -->
        <footer class="footer">
          <img src="${logoSvg}" alt="Criteria Design Group" class="footer-logo">
          <div style="margin-top: 10px;">
            <strong>CRITERIA DESIGN GROUP</strong><br>
            URBAN - ARCHITECTURE - INTERIOR | This report contains confidential information.<br>
            Generated on ${formatDate(summary.exportedAt)} | Arch. HESHAM HELAL
          </div>
        </footer>
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();
    return Buffer.from(pdfBuffer);

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  } catch (error) {
    console.error('PDF export data processing error:', error);
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Data processing error'}`);
  }
};

export const exportProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { format = 'json', dateFrom, dateTo, phases: phaseFilter } = req.query;

    // Type cast query parameters
    const formatStr = format as string;
    const dateFromStr = dateFrom as string | undefined;
    const dateToStr = dateTo as string | undefined;
    const phaseFilterStr = phaseFilter as string | undefined;

    // Get complete project data with enhanced queries
    const projectResult = await query(`
      SELECT p.*, u.name as created_by_name,
             COUNT(DISTINCT pp.id) as total_phases,
             COUNT(DISTINCT CASE WHEN pp.status IN ('completed', 'approved') THEN pp.id END) as completed_phases,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(DISTINCT wl.engineer_id) as team_size
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `, [id]);

    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Enhanced phases query with additional metrics
    const phasesResult = await query(`
      SELECT pp.*,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(DISTINCT wl.engineer_id) as engineers_count,
             COUNT(wl.id) as work_logs_count,
             MIN(wl.date) as first_log_date,
             MAX(wl.date) as last_log_date
      FROM project_phases pp
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE pp.project_id = $1
      ${phaseFilterStr ? 'AND pp.id = ANY($2)' : ''}
      GROUP BY pp.id
      ORDER BY pp.phase_order ASC
    `, phaseFilterStr ? [id, (phaseFilterStr as string).split(',').map(Number)] : [id]);

    // Enhanced work logs query with filters
    let workLogsQuery = `
      SELECT wl.*, u.name as engineer_name, u.email as engineer_email,
             pp.phase_name, pp.phase_order
      FROM work_logs wl
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN users u ON wl.engineer_id = u.id
      WHERE pp.project_id = $1
    `;
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (dateFromStr) {
      workLogsQuery += ` AND wl.date >= $${paramIndex}`;
      queryParams.push(dateFromStr);
      paramIndex++;
    }
    if (dateToStr) {
      workLogsQuery += ` AND wl.date <= $${paramIndex}`;
      queryParams.push(dateToStr);
      paramIndex++;
    }
    if (phaseFilterStr) {
      workLogsQuery += ` AND pp.id = ANY($${paramIndex})`;
      queryParams.push((phaseFilterStr as string).split(',').map(Number));
    }

    workLogsQuery += ' ORDER BY wl.created_at DESC';
    const workLogsResult = await query(workLogsQuery, queryParams);

    // Get team analytics
    const teamAnalyticsResult = await query(`
      SELECT u.name, u.email, u.role,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(wl.id) as work_logs_count,
             COUNT(DISTINCT pp.id) as phases_worked,
             COALESCE(AVG(wl.hours), 0) as avg_hours_per_log,
             MIN(wl.date) as first_log_date,
             MAX(wl.date) as last_log_date
      FROM users u
      LEFT JOIN work_logs wl ON u.id = wl.engineer_id
      LEFT JOIN project_phases pp ON wl.phase_id = pp.id
      WHERE pp.project_id = $1 AND u.role = 'engineer' AND u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_hours DESC
    `, [id]);

    const project = projectResult.rows[0];
    const phases = phasesResult.rows;
    const workLogs = workLogsResult.rows;
    const teamAnalytics = teamAnalyticsResult.rows;

    // Calculate additional metrics with proper validation
    const progressPercentage = project.total_phases > 0 ?
      Math.round((project.completed_phases / project.total_phases) * 100) : 0;

    // Fix budget utilization calculation - ensure we use consistent total hours
    const actualTotalHours = parseFloat(project.total_hours) || 0;
    const predictedHours = parseFloat(project.predicted_hours) || 0;
    const budgetUtilization = predictedHours > 0 ?
      Math.round((actualTotalHours / predictedHours) * 100) : 0;

    // Calculate phase progress more accurately
    const phasesWithProgress = phases.map((phase: any) => {
      // Calculate individual phase progress based on status and hours
      let progress = 0;
      if (phase.status === 'completed') {
        progress = 100;
      } else if (phase.status === 'in_progress') {
        // Estimate progress based on hours logged vs expected
        const expectedHours = parseFloat(phase.estimated_hours) || 0;
        const actualHours = parseFloat(phase.total_hours) || 0;
        if (expectedHours > 0) {
          progress = Math.min(95, Math.round((actualHours / expectedHours) * 100));
        } else {
          progress = 50; // Default for in-progress without hour estimates
        }
      } else if (phase.status === 'approved') {
        progress = 75; // Approved phases are significantly complete
      } else if (phase.status === 'ready') {
        progress = 25; // Ready phases have some preparation done
      } else if (phase.status === 'pending' || phase.status === 'not started') {
        progress = 0; // Not started phases
      }
      return { ...phase, progress };
    });

    // Recalculate overall progress based on individual phase progress
    const weightedProgress = phasesWithProgress.length > 0 ?
      Math.round(phasesWithProgress.reduce((sum: number, phase: any) => sum + phase.progress, 0) / phasesWithProgress.length) : 0;

    const exportData = {
      project: {
        ...project,
        progress_percentage: weightedProgress,
        budget_utilization: budgetUtilization
      },
      phases: phasesWithProgress,
      workLogs,
      teamAnalytics,
      summary: {
        totalHours: actualTotalHours,
        totalPhases: parseInt(project.total_phases) || 0,
        completedPhases: parseInt(project.completed_phases) || 0,
        teamSize: parseInt(project.team_size) || 0,
        progressPercentage: weightedProgress,
        budgetUtilization,
        predictedHours,
        actualHours: actualTotalHours,
        hoursVariance: actualTotalHours - predictedHours,
        hoursVariancePercent: predictedHours > 0 ? Math.round(((actualTotalHours - predictedHours) / predictedHours) * 100) : 0,
        exportedAt: new Date().toISOString(),
        exportFilters: {
          dateFrom: dateFromStr,
          dateTo: dateToStr,
          phases: phaseFilterStr
        }
      }
    };

    // Handle different export formats
    switch (formatStr) {
      case 'csv':
        const csvData = await generateCSVExport(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="project-${project.name}-export.csv"`);
        res.send(csvData);
        break;

      case 'pdf':
        const pdfBuffer = await generatePDFExport(exportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="project-${project.name}-report.pdf"`);
        res.send(pdfBuffer);
        break;

      default: // json
        res.status(200).json({
          success: true,
          data: exportData
        });
    }
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Project Health Monitoring
export const getProjectHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get project with calculated health metrics
    const healthResult = await query(`
      SELECT
        p.*,
        COALESCE(SUM(wl.hours), 0) as actual_hours,
        COUNT(DISTINCT pp.id) as total_phases,
        COUNT(DISTINCT CASE WHEN pp.status IN ('completed', 'approved') THEN pp.id END) as completed_phases,
        COUNT(DISTINCT CASE WHEN pp.warning_flag = true THEN pp.id END) as warning_phases,
        COUNT(DISTINCT CASE WHEN pp.delay_reason IS NOT NULL THEN pp.id END) as delayed_phases
      FROM projects p
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (healthResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    const project = healthResult.rows[0];
    const progress = project.total_phases > 0 ? (project.completed_phases / project.total_phases) * 100 : 0;
    const hoursUtilization = project.predicted_hours > 0 ? (project.actual_hours / project.predicted_hours) * 100 : 0;

    const health = {
      overall: 'good' as string,
      progress: progress,
      hoursUtilization: hoursUtilization,
      warningCount: project.warning_phases,
      delayCount: project.delayed_phases,
      onTime: project.delayed_phases === 0,
      onBudget: hoursUtilization <= 110,
      risks: [] as string[]
    };

    if (hoursUtilization > 110) {
      health.overall = 'warning';
      health.risks.push('Over budget on hours');
    }

    if (project.warning_phases > 0) {
      health.overall = 'warning';
      health.risks.push(`${project.warning_phases} phases have warnings`);
    }

    if (project.delayed_phases > 0) {
      health.overall = 'critical';
      health.risks.push(`${project.delayed_phases} phases are delayed`);
    }

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Get project health error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getProjectMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const metricsResult = await query(`
      SELECT
        p.*,
        COUNT(DISTINCT wl.engineer_id) as team_size,
        COALESCE(SUM(wl.hours), 0) as total_logged_hours,
        COALESCE(AVG(wl.hours), 0) as avg_daily_hours,
        COUNT(DISTINCT wl.id) as total_work_logs,
        COUNT(DISTINCT pp.id) as total_phases,
        COUNT(DISTINCT CASE WHEN pp.status = 'completed' THEN pp.id END) as completed_phases
      FROM projects p
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (metricsResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    const metrics = metricsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        teamSize: metrics.team_size,
        totalLoggedHours: parseFloat(metrics.total_logged_hours),
        avgDailyHours: parseFloat(metrics.avg_daily_hours),
        totalWorkLogs: metrics.total_work_logs,
        totalPhases: metrics.total_phases,
        completedPhases: metrics.completed_phases,
        completionRate: metrics.total_phases > 0 ? (metrics.completed_phases / metrics.total_phases) * 100 : 0,
        hoursUtilization: metrics.predicted_hours > 0 ? (parseFloat(metrics.total_logged_hours) / metrics.predicted_hours) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Get project metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Advanced Search & Filtering
export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, status, createdBy, startDate, endDate } = req.query;

    let whereConditions = ['p.status != \'cancelled\''];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (q) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      queryParams.push(`%${q}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (createdBy) {
      whereConditions.push(`p.created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`p.start_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`p.start_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const result = await query(`
      SELECT
        p.id,
        p.name,
        p.start_date,
        p.planned_total_weeks,
        p.predicted_hours,
        p.actual_hours,
        p.status,
        p.created_at,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT 100
    `, queryParams);

    res.status(200).json({
      success: true,
      data: { projects: result.rows }
    });
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const searchTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { q } = req.query;

    const result = await query(`
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(SUM(wl.hours), 0) as total_hours,
        COUNT(DISTINCT wl.id) as work_log_count
      FROM users u
      LEFT JOIN work_logs wl ON u.id = wl.engineer_id
      LEFT JOIN project_phases pp ON wl.phase_id = pp.id
      WHERE pp.project_id = $1
        AND u.role = 'engineer'
        AND (u.name ILIKE $2 OR u.email ILIKE $2)
        AND u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name ASC
    `, [id, `%${q}%`]);

    res.status(200).json({
      success: true,
      data: { teamMembers: result.rows }
    });
  } catch (error) {
    console.error('Search team members error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Team Analytics & Reports
export const getTeamAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, startDate, endDate } = req.query;

    let whereConditions = ['u.role = \'engineer\'', 'u.is_active = true'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      whereConditions.push(`pp.project_id = $${paramIndex}`);
      queryParams.push(projectId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`wl.date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`wl.date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const result = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(SUM(wl.hours), 0) as total_hours,
        COUNT(DISTINCT wl.id) as work_log_count,
        COUNT(DISTINCT pp.project_id) as projects_worked,
        COALESCE(AVG(wl.hours), 0) as avg_daily_hours,
        MAX(wl.date) as last_activity
      FROM users u
      LEFT JOIN work_logs wl ON u.id = wl.engineer_id
      LEFT JOIN project_phases pp ON wl.phase_id = pp.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY u.id, u.name, u.email
      ORDER BY total_hours DESC
    `, queryParams);

    res.status(200).json({
      success: true,
      data: { analytics: result.rows }
    });
  } catch (error) {
    console.error('Get team analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// CEO Comprehensive Overview - Get all active projects with detailed information
export const getComprehensiveOverview = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Supervisors and administrators can access comprehensive overview
    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Access denied. Only supervisors and administrators can access comprehensive overview'
      });
      return;
    }

    // Get all active projects (excluding archived ones)
    const projectsResult = await query(`
      SELECT
        p.id,
        p.name,
        p.status,
        p.start_date,
        p.planned_total_weeks,
        p.predicted_hours,
        p.actual_hours,
        p.created_at,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.status != 'cancelled' AND p.archived_at IS NULL
      ORDER BY p.created_at DESC
    `);

    const overviewData: ComprehensiveOverviewData[] = [];

    for (const project of projectsResult.rows) {
      // Get phases for this project
      const phasesResult = await query(`
        SELECT
          pp.id,
          pp.phase_name,
          pp.status,
          pp.planned_weeks,
          pp.actual_hours,
          pp.predicted_hours,
          pp.warning_flag,
          pp.delay_reason,
          pp.planned_end_date,
          pp.phase_order,
          pp.actual_progress
        FROM project_phases pp
        WHERE pp.project_id = $1
        ORDER BY pp.phase_order ASC
      `, [project.id]);

      // Calculate phase details with engineer assignments
      const currentPhases: PhaseDetail[] = [];
      let completedPhases = 0;
      const approachingDeadlines: DeadlineInfo[] = [];

      for (const phase of phasesResult.rows) {
        // Get engineers working on this phase
        const engineersResult = await query(`
          SELECT DISTINCT
            u.id,
            u.name,
            COALESCE(SUM(wl.hours), 0) as hours_logged
          FROM users u
          LEFT JOIN work_logs wl ON u.id = wl.engineer_id AND wl.phase_id = $1
          WHERE u.role = 'engineer' AND u.is_active = true
          GROUP BY u.id, u.name
          HAVING COALESCE(SUM(wl.hours), 0) > 0
          ORDER BY hours_logged DESC
        `, [phase.id]);

        const assignedEngineers = engineersResult.rows.map((eng: { id: number; name: string; hours_logged: string }) => ({
          id: eng.id,
          name: eng.name,
          hours_logged: parseFloat(eng.hours_logged || '0')
        }));

        // Calculate progress percentage for phase
        const progressPercentage = phase.predicted_hours > 0
          ? Math.min(100, (phase.actual_hours / phase.predicted_hours) * 100)
          : phase.status === 'completed' ? 100 : 0;

        currentPhases.push({
          id: phase.id,
          phase_name: phase.phase_name,
          status: phase.status,
          planned_weeks: phase.planned_weeks,
          actual_hours: parseFloat(phase.actual_hours || 0),
          predicted_hours: parseFloat(phase.predicted_hours || 0),
          warning_flag: phase.warning_flag,
          delay_reason: phase.delay_reason,
          progress_percentage: Math.round(progressPercentage),
          actual_progress: phase.actual_progress !== null && phase.actual_progress !== undefined ? parseFloat(phase.actual_progress) : undefined,
          assigned_engineers: assignedEngineers
        });

        if (phase.status === 'completed') {
          completedPhases++;
        }

        // Check for approaching deadlines
        if (phase.planned_end_date && phase.status !== 'completed') {
          const endDate = new Date(phase.planned_end_date);
          const today = new Date();
          const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let severity: 'critical' | 'warning' | 'normal' = 'normal';
          if (daysDiff < 0) severity = 'critical';
          else if (daysDiff <= 3) severity = 'critical';
          else if (daysDiff <= 7) severity = 'warning';

          if (severity !== 'normal' || daysDiff <= 14) {
            approachingDeadlines.push({
              phase_id: phase.id,
              phase_name: phase.phase_name,
              planned_end_date: endDate,
              days_until_deadline: daysDiff,
              is_overdue: daysDiff < 0,
              severity
            });
          }
        }
      }

      // Get engineer breakdown for this project
      const engineerBreakdownResult = await query(`
        SELECT
          u.id as engineer_id,
          u.name as engineer_name,
          pp.id as phase_id,
          pp.phase_name,
          COALESCE(SUM(wl.hours), 0) as hours_logged,
          MAX(wl.date) as last_log_date
        FROM users u
        JOIN work_logs wl ON u.id = wl.engineer_id
        JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE pp.project_id = $1 AND u.role = 'engineer'
        GROUP BY u.id, u.name, pp.id, pp.phase_name
        ORDER BY u.name, pp.phase_order
      `, [project.id]);

      // Group by engineer
      const engineerMap: { [key: number]: EngineerWorkDetail } = {};
      engineerBreakdownResult.rows.forEach((row: { engineer_id: number; engineer_name: string; phase_id: number; phase_name: string; hours_logged: string; last_log_date: string }) => {
        if (!engineerMap[row.engineer_id]) {
          engineerMap[row.engineer_id] = {
            engineer_id: row.engineer_id,
            engineer_name: row.engineer_name,
            phases: [],
            total_hours: 0
          };
        }
        engineerMap[row.engineer_id]!.phases.push({
          phase_id: row.phase_id,
          phase_name: row.phase_name,
          hours_logged: parseFloat(row.hours_logged),
          last_log_date: new Date(row.last_log_date)
        });
        engineerMap[row.engineer_id]!.total_hours += parseFloat(row.hours_logged);
      });

      const engineerBreakdown = Object.values(engineerMap);

      // Calculate overall progress percentage
      const totalPhases = currentPhases.length;
      const overallProgress = totalPhases > 0
        ? Math.round(((completedPhases / totalPhases) * 60) +
          ((project.actual_hours / project.predicted_hours) * 40))
        : 0;

      // Calculate health score (0-100)
      let healthScore = 100;
      healthScore -= (approachingDeadlines.length * 10); // Reduce for approaching deadlines
      healthScore -= (currentPhases.filter(p => p.warning_flag).length * 15); // Reduce for warnings
      if (project.actual_hours > project.predicted_hours) {
        healthScore -= 20; // Reduce for budget overrun
      }
      healthScore = Math.max(0, Math.min(100, healthScore));

      // Get last activity date
      const lastActivityResult = await query(`
        SELECT MAX(wl.date) as last_activity
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE pp.project_id = $1
      `, [project.id]);

      const lastActivityDate = lastActivityResult.rows[0]?.last_activity
        ? new Date(lastActivityResult.rows[0].last_activity)
        : project.created_at;

      // Estimate completion date (simple calculation)
      const remainingHours = project.predicted_hours - project.actual_hours;
      const avgHoursPerWeek = project.actual_hours > 0
        ? (project.actual_hours / ((Date.now() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7)))
        : 40; // Default 40 hours/week
      const weeksRemaining = avgHoursPerWeek > 0 ? remainingHours / avgHoursPerWeek : project.planned_total_weeks;
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + (weeksRemaining * 7));

      // Calculate overall actual_progress (average of phases with actual_progress set)
      const phasesWithActualProgress = currentPhases.filter(p => p.actual_progress !== null && p.actual_progress !== undefined);
      const overallActualProgress = phasesWithActualProgress.length > 0
        ? phasesWithActualProgress.reduce((sum, p) => sum + (p.actual_progress || 0), 0) / phasesWithActualProgress.length
        : undefined;

      overviewData.push({
        project_id: project.id,
        project_name: project.name,
        project_status: project.status,
        start_date: new Date(project.start_date),
        planned_total_weeks: project.planned_total_weeks,
        predicted_hours: parseFloat(project.predicted_hours),
        actual_hours: parseFloat(project.actual_hours),
        created_by_name: project.created_by_name,
        current_phases: currentPhases,
        engineer_breakdown: engineerBreakdown,
        total_active_phases: currentPhases.filter(p => p.status !== 'completed').length,
        completed_phases: completedPhases,
        progress_percentage: overallProgress,
        actual_progress: overallActualProgress,
        health_score: healthScore,
        warnings_count: currentPhases.filter(p => p.warning_flag).length + approachingDeadlines.length,
        approaching_deadlines: approachingDeadlines,
        last_activity_date: lastActivityDate,
        estimated_completion_date: estimatedCompletion
      });
    }

    // Calculate summary statistics
    const totalProjects = overviewData.length;
    const activeProjects = overviewData.filter(p => p.project_status === 'active').length;
    const uniqueEngineers = new Set(
      overviewData.flatMap(p => p.engineer_breakdown.map(e => e.engineer_id))
    ).size;
    const totalHoursLogged = overviewData.reduce((sum, p) => sum + p.actual_hours, 0);
    const projectsWithWarnings = overviewData.filter(p => p.warnings_count > 0).length;
    const overallHealthScore = totalProjects > 0
      ? Math.round(overviewData.reduce((sum, p) => sum + p.health_score, 0) / totalProjects)
      : 100;

    const response: ComprehensiveOverviewResponse = {
      success: true,
      data: {
        projects: overviewData,
        summary: {
          total_projects: totalProjects,
          active_projects: activeProjects,
          total_engineers: uniqueEngineers,
          total_hours_logged: totalHoursLogged,
          projects_with_warnings: projectsWithWarnings,
          overall_health_score: overallHealthScore
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get comprehensive overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
