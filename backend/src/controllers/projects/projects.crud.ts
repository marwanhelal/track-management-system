import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query, transaction } from '@/database/connection';
import {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  ApiResponse
} from '@/types';

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
      selectedPhases,
      land_area,
      building_type,
      floors_count,
      location,
      bua,
      client_name
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
      // Insert project with extended details
      const projectResult = await client.query(`
        INSERT INTO projects (
          name, start_date, planned_total_weeks, predicted_hours, created_by,
          land_area, building_type, floors_count, location, bua, client_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        name,
        start_date || new Date(),
        planned_total_weeks,
        predicted_hours,
        authReq.user.id,
        land_area,
        building_type,
        floors_count,
        location,
        bua,
        client_name
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
    const allowedFields = ['name', 'start_date', 'planned_total_weeks', 'predicted_hours', 'status', 'land_area', 'building_type', 'floors_count', 'location', 'bua', 'client_name'] as const;
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

// Update project payment information
export const updateProjectPayment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const {
      total_contract_amount,
      down_payment_amount,
      down_payment_date,
      down_payment_notes,
      down_payment_received
    } = req.body;

    // Only supervisors can update project payment information
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can update project payment information'
      });
      return;
    }

    // Check if project exists
    const projectResult = await query(
      'SELECT id FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Validate amounts
    if (total_contract_amount !== undefined && total_contract_amount < 0) {
      res.status(400).json({
        success: false,
        error: 'Total contract amount cannot be negative'
      });
      return;
    }

    if (down_payment_amount !== undefined && down_payment_amount < 0) {
      res.status(400).json({
        success: false,
        error: 'Down payment amount cannot be negative'
      });
      return;
    }

    if (down_payment_amount !== undefined && total_contract_amount !== undefined && down_payment_amount > total_contract_amount) {
      res.status(400).json({
        success: false,
        error: 'Down payment cannot exceed total contract amount'
      });
      return;
    }

    // Update project payment information
    const result = await query(
      `UPDATE projects
       SET total_contract_amount = COALESCE($1, total_contract_amount),
           down_payment_amount = COALESCE($2, down_payment_amount),
           down_payment_date = COALESCE($3, down_payment_date),
           down_payment_notes = COALESCE($4, down_payment_notes),
           down_payment_received = COALESCE($5, down_payment_received),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [total_contract_amount, down_payment_amount, down_payment_date, down_payment_notes, down_payment_received, id]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['projects', id, 'UPDATE_PAYMENT', authReq.user.id, 'Project payment information updated']
    );

    res.status(200).json({
      success: true,
      message: 'Project payment information updated successfully',
      data: { project: result.rows[0] }
    });
  } catch (error) {
    console.error('Update project payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get project payment summary
export const getProjectPaymentSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get project payment summary using the database function
    const result = await query(
      'SELECT * FROM get_project_payment_summary($1)',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    const summary = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        total_contract: parseFloat(summary.total_contract) || 0,
        down_payment: parseFloat(summary.down_payment) || 0,
        sum_of_phases: parseFloat(summary.sum_of_phases) || 0,
        total_phases_paid: parseFloat(summary.total_phases_paid) || 0,
        total_paid: parseFloat(summary.total_paid) || 0,
        total_remaining: parseFloat(summary.total_remaining) || 0,
        is_balanced: summary.is_balanced
      }
    });
  } catch (error) {
    console.error('Get project payment summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
