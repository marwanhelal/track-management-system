import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, PredefinedPhase, ProjectPhase } from '@/types';

// Get all predefined phases
export const getPredefinedPhases = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, typical_duration_weeks, display_order, is_active
       FROM predefined_phases
       WHERE is_active = true
       ORDER BY display_order ASC`
    );

    const response: ApiResponse<{ phases: PredefinedPhase[] }> = {
      success: true,
      data: { phases: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get predefined phases error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get project phases
export const getProjectPhases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT * FROM project_phases
       WHERE project_id = $1
       ORDER BY phase_order ASC`,
      [projectId]
    );

    const response: ApiResponse<{ phases: ProjectPhase[] }> = {
      success: true,
      data: { phases: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get project phases error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Enhanced Phase Management
export const createPhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { projectId } = req.params;
    const { phase_name, planned_weeks, predicted_hours, phase_order } = req.body;

    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can create phases'
      });
      return;
    }

    // Check if project exists
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Get next phase order if not provided
    let nextOrder = phase_order;
    if (!nextOrder) {
      const maxOrderResult = await query(
        'SELECT COALESCE(MAX(phase_order), 0) + 1 as next_order FROM project_phases WHERE project_id = $1',
        [projectId]
      );
      nextOrder = maxOrderResult.rows[0].next_order;
    }

    const result = await query(`
      INSERT INTO project_phases (
        project_id, phase_order, phase_name, is_custom, planned_weeks,
        predicted_hours, status, planned_start_date, planned_end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '${planned_weeks} weeks')
      RETURNING *
    `, [projectId, nextOrder, phase_name, true, planned_weeks, predicted_hours, 'not_started']);

    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', result.rows[0].id, 'CREATE', authReq.user.id, `Custom phase "${phase_name}" created`]
    );

    res.status(201).json({
      success: true,
      message: 'Phase created successfully',
      data: { phase: result.rows[0] }
    });
  } catch (error) {
    console.error('Create phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updatePhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const updates = req.body;

    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can update phases'
      });
      return;
    }

    // Check if phase exists
    const existingPhase = await query('SELECT * FROM project_phases WHERE id = $1', [phaseId]);
    if (existingPhase.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Build update query safely
    const allowedFields = ['phase_name', 'planned_weeks', 'predicted_hours', 'planned_start_date', 'planned_end_date'] as const;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
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

    updateFields.push('updated_at = NOW()');
    updateValues.push(phaseId);

    const result = await query(`
      UPDATE project_phases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'UPDATE', authReq.user.id, `Phase updated: ${Object.keys(updates).join(', ')}`]
    );

    res.status(200).json({
      success: true,
      message: 'Phase updated successfully',
      data: { phase: result.rows[0] }
    });
  } catch (error) {
    console.error('Update phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const deletePhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;

    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can delete phases'
      });
      return;
    }

    // Check if phase exists and can be deleted
    const phaseResult = await query('SELECT * FROM project_phases WHERE id = $1', [phaseId]);
    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Check if phase has work logs
    const workLogsResult = await query('SELECT COUNT(*) as count FROM work_logs WHERE phase_id = $1', [phaseId]);
    if (parseInt(workLogsResult.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete phase with existing work logs'
      });
      return;
    }

    // Delete phase
    await query('DELETE FROM project_phases WHERE id = $1', [phaseId]);

    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'DELETE', authReq.user.id, `Phase "${phase.phase_name}" deleted`]
    );

    res.status(200).json({
      success: true,
      message: 'Phase deleted successfully'
    });
  } catch (error) {
    console.error('Delete phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update phase for historical import (allows updating actual dates and status)
export const updatePhaseHistorical = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const updates = req.body;

    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors and administrators can update historical phase data'
      });
      return;
    }

    // Check if phase exists
    const existingPhase = await query('SELECT * FROM project_phases WHERE id = $1', [phaseId]);
    if (existingPhase.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Build update query safely - allow more fields for historical import
    const allowedFields = [
      'phase_name',
      'planned_weeks',
      'predicted_hours',
      'planned_start_date',
      'planned_end_date',
      'actual_start_date',
      'actual_end_date',
      'submitted_date',
      'approved_date',
      'status'
    ] as const;

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
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

    updateFields.push('updated_at = NOW()');
    updateValues.push(phaseId);

    const result = await query(`
      UPDATE project_phases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    res.status(200).json({
      success: true,
      data: { phase: result.rows[0] }
    });
  } catch (error) {
    console.error('Update historical phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
