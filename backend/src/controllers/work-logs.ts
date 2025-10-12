import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse, WorkLog, WorkLogCreateInput } from '@/types';
import app from '@/app';

// Get work logs for a specific phase
export const getPhaseWorkLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phaseId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(`
      SELECT
        wl.*,
        u.name as engineer_name,
        pp.phase_name,
        p.name as project_name,
        editor.name as last_edited_by_name
      FROM work_logs wl
      JOIN users u ON wl.engineer_id = u.id
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      LEFT JOIN users editor ON wl.last_edited_by = editor.id
      WHERE wl.phase_id = $1 AND wl.deleted_at IS NULL
      ORDER BY wl.date DESC, wl.created_at DESC
      LIMIT $2 OFFSET $3
    `, [phaseId, limit, offset]);

    // Get total count for pagination (exclude soft-deleted)
    const countResult = await query(
      'SELECT COUNT(*) FROM work_logs WHERE phase_id = $1 AND deleted_at IS NULL',
      [phaseId]
    );

    const response: ApiResponse<{
      workLogs: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    }> = {
      success: true,
      data: {
        workLogs: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / Number(limit)),
          totalItems: Number(countResult.rows[0].count),
          itemsPerPage: Number(limit)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get phase work logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get engineer's work logs (their own or all if supervisor)
export const getEngineerWorkLogs = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { engineerId } = req.params;
    const { startDate, endDate, projectId, page = 1, limit = 50 } = req.query;

    // Engineers can only see their own logs, supervisors can see any
    if (authReq.user.role === 'engineer' && authReq.user.id !== Number(engineerId)) {
      res.status(403).json({
        success: false,
        error: 'Engineers can only view their own work logs'
      });
      return;
    }

    let whereConditions = ['wl.engineer_id = $1'];
    let params: any[] = [engineerId];
    let paramIndex = 2;

    if (startDate) {
      whereConditions.push(`wl.date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`wl.date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (projectId) {
      whereConditions.push(`pp.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(limit, offset);

    // Add deleted_at filter
    whereConditions.push('wl.deleted_at IS NULL');

    const result = await query(`
      SELECT
        wl.*,
        u.name as engineer_name,
        pp.phase_name,
        p.name as project_name,
        p.id as project_id,
        editor.name as last_edited_by_name
      FROM work_logs wl
      JOIN users u ON wl.engineer_id = u.id
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      LEFT JOIN users editor ON wl.last_edited_by = editor.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY wl.date DESC, wl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Get total count (exclude soft-deleted)
    const countResult = await query(`
      SELECT COUNT(*)
      FROM work_logs wl
      JOIN project_phases pp ON wl.phase_id = pp.id
      WHERE ${whereConditions.join(' AND ')}
    `, params.slice(0, -2));

    const response: ApiResponse<{
      workLogs: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    }> = {
      success: true,
      data: {
        workLogs: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / Number(limit)),
          totalItems: Number(countResult.rows[0].count),
          itemsPerPage: Number(limit)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get engineer work logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Create work log entry
export const createWorkLog = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const {
      phase_id,
      hours,
      description,
      date
    }: WorkLogCreateInput = req.body;

    // Validate phase exists and engineer can work on it
    const phaseResult = await query(`
      SELECT pp.*, p.name as project_name
      FROM project_phases pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1
    `, [phase_id]);

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Check if phase is in a state where work can be logged
    const allowedStatuses = ['ready', 'in_progress', 'submitted'];
    if (!allowedStatuses.includes(phase.status)) {
      res.status(403).json({
        success: false,
        error: `Cannot log time on this phase. Phase status: ${phase.status}. Phase must be ready, in progress, or submitted.`
      });
      return;
    }

    // Validate hours (positive number, no upper limit to allow catch-up logging)
    if (hours <= 0) {
      res.status(400).json({
        success: false,
        error: 'Hours must be greater than 0'
      });
      return;
    }

    // Check if engineer already has work log for this phase on this date
    const existingLogResult = await query(`
      SELECT id, hours FROM work_logs
      WHERE engineer_id = $1 AND phase_id = $2 AND date = $3
    `, [authReq.user.id, phase_id, date || new Date().toISOString().split('T')[0]]);

    let workLog;

    if (existingLogResult.rows.length > 0) {
      // Update existing log by adding hours
      const existingLog = existingLogResult.rows[0];
      const newTotalHours = parseFloat(existingLog.hours) + hours;

      const updateResult = await query(`
        UPDATE work_logs
        SET hours = $1, description = CASE
          WHEN description IS NULL OR description = '' THEN $2
          ELSE description || '; ' || $2
        END, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [newTotalHours, description, existingLog.id]);

      workLog = updateResult.rows[0];
    } else {
      // Create new work log
      const result = await query(`
        INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, description, date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        phase.project_id,
        authReq.user.id,
        phase_id,
        hours,
        description,
        date || new Date().toISOString().split('T')[0]
      ]);

      workLog = result.rows[0];
    }

    // Update phase status to in_progress if it was ready
    if (phase.status === 'ready') {
      await query(
        'UPDATE project_phases SET status = $1, actual_start_date = COALESCE(actual_start_date, NOW()), updated_at = NOW() WHERE id = $2',
        ['in_progress', phase_id]
      );

      // Log audit event for phase status change
      await query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['project_phases', phase_id, 'START', authReq.user.id, 'Phase started automatically when first work log was created']
      );
    }

    // Log audit event for work log
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['work_logs', workLog.id, 'CREATE', authReq.user.id, `Logged ${hours} hours on ${phase.phase_name}`]
    );

    const response: ApiResponse<{ workLog: WorkLog; message: string }> = {
      success: true,
      message: existingLogResult.rows.length > 0 ? 'Work log updated successfully' : 'Work log created successfully',
      data: {
        workLog,
        message: existingLogResult.rows.length > 0 ? 'Work log updated successfully' : 'Work log created successfully'
      }
    };

    res.status(existingLogResult.rows.length > 0 ? 200 : 201).json(response);
  } catch (error) {
    console.error('Create work log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update work log - Enhanced with edit tracking
export const updateWorkLog = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { hours, description, date } = req.body;

    // Check if work log exists and is not deleted
    const existingLogResult = await query(
      'SELECT * FROM work_logs WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existingLogResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Work log not found'
      });
      return;
    }

    const existingLog = existingLogResult.rows[0];

    // Engineers can only update their own logs, supervisors can update any
    if (authReq.user.role === 'engineer' && authReq.user.id !== existingLog.engineer_id) {
      res.status(403).json({
        success: false,
        error: 'Engineers can only update their own work logs'
      });
      return;
    }

    // Validate hours if provided
    if (hours !== undefined && hours <= 0) {
      res.status(400).json({
        success: false,
        error: 'Hours must be greater than 0'
      });
      return;
    }

    // Build update query safely using whitelist approach (prevents SQL injection)
    const allowedFields = ['hours', 'description', 'date'] as const;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Use whitelist to safely construct query - only known safe field names
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Field names are from a controlled whitelist, safe to use directly
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(req.body[field]);
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

    // Add edit tracking fields
    updateFields.push(`last_edited_at = NOW()`);
    updateFields.push(`last_edited_by = $${paramIndex}`);
    updateValues.push(authReq.user.id);
    paramIndex++;

    updateFields.push(`edit_count = COALESCE(edit_count, 0) + 1`);
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `
      UPDATE work_logs
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['work_logs', id, 'UPDATE', authReq.user.id, `Work log updated: ${Object.keys(req.body).join(', ')}`]
    );

    // Emit Socket.IO event for real-time updates
    try {
      app.emitToProject(existingLog.project_id, 'work_log_updated', {
        workLogId: id,
        phaseId: existingLog.phase_id,
        projectId: existingLog.project_id,
        updatedBy: authReq.user.name,
        updatedFields: Object.keys(req.body)
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
      // Continue even if socket fails
    }

    const response: ApiResponse<{ workLog: WorkLog }> = {
      success: true,
      message: 'Work log updated successfully',
      data: { workLog: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update work log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete work log - Permanent hard delete
export const deleteWorkLog = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { delete_note } = req.body;

    // Check if work log exists
    const existingLogResult = await query(
      'SELECT * FROM work_logs WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existingLogResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Work log not found'
      });
      return;
    }

    const existingLog = existingLogResult.rows[0];

    // Engineers can only delete their own logs, supervisors can delete any
    if (authReq.user.role === 'engineer' && authReq.user.id !== existingLog.engineer_id) {
      res.status(403).json({
        success: false,
        error: 'Engineers can only delete their own work logs'
      });
      return;
    }

    // Log audit event BEFORE deleting (important for audit trail)
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note, old_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        'work_logs',
        id,
        'DELETE',
        authReq.user.id,
        `Work log permanently deleted: ${existingLog.hours} hours on ${existingLog.date}. Reason: ${delete_note || 'No reason provided'}`,
        JSON.stringify(existingLog)
      ]
    );

    // HARD DELETE - Permanently remove from database
    await query('DELETE FROM work_logs WHERE id = $1', [id]);

    // Emit Socket.IO event for real-time updates
    try {
      app.emitToProject(existingLog.project_id, 'work_log_deleted', {
        workLogId: id,
        phaseId: existingLog.phase_id,
        projectId: existingLog.project_id,
        deletedBy: authReq.user.name,
        hours: existingLog.hours
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
      // Continue even if socket fails
    }

    const response: ApiResponse = {
      success: true,
      message: 'Work log deleted permanently'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete work log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get work logs summary for dashboard
export const getWorkLogsSummary = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { projectId, startDate, endDate } = req.query;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Engineers can only see their own summary, supervisors can see all
    if (authReq.user.role === 'engineer') {
      whereConditions.push(`wl.engineer_id = $${paramIndex}`);
      params.push(authReq.user.id);
      paramIndex++;
    }

    if (projectId) {
      whereConditions.push(`pp.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`wl.date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`wl.date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get summary by project and engineer
    const summaryResult = await query(`
      SELECT
        p.id as project_id,
        p.name as project_name,
        u.id as engineer_id,
        u.name as engineer_name,
        SUM(wl.hours) as total_hours,
        COUNT(DISTINCT wl.date) as days_worked,
        COUNT(wl.id) as total_entries,
        MIN(wl.date) as first_entry_date,
        MAX(wl.date) as last_entry_date
      FROM work_logs wl
      JOIN users u ON wl.engineer_id = u.id
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, u.id, u.name
      ORDER BY p.name, u.name
    `, params);

    // Get summary by phase
    const phaseSummaryResult = await query(`
      SELECT
        pp.id as phase_id,
        pp.phase_name,
        pp.project_id,
        p.name as project_name,
        SUM(wl.hours) as total_hours,
        COUNT(DISTINCT wl.engineer_id) as engineers_count,
        COUNT(wl.id) as total_entries
      FROM work_logs wl
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      ${whereClause}
      GROUP BY pp.id, pp.phase_name, pp.phase_order, pp.project_id, p.name
      ORDER BY p.name, pp.phase_order
    `, params);

    // Get detailed phase-by-engineer breakdown
    const phaseEngineerDetailResult = await query(`
      SELECT
        pp.id as phase_id,
        pp.phase_name,
        pp.project_id,
        p.name as project_name,
        u.id as engineer_id,
        u.name as engineer_name,
        SUM(wl.hours) as engineer_hours,
        COUNT(wl.id) as engineer_entries,
        COUNT(DISTINCT wl.date) as engineer_days_worked,
        MIN(wl.date) as first_entry_date,
        MAX(wl.date) as last_entry_date
      FROM work_logs wl
      JOIN users u ON wl.engineer_id = u.id
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      ${whereClause}
      GROUP BY pp.id, pp.phase_name, pp.phase_order, pp.project_id, p.name, u.id, u.name
      ORDER BY p.name, pp.phase_order, u.name
    `, params);

    const response: ApiResponse<{
      projectSummary: any[];
      phaseSummary: any[];
      phaseEngineerDetail: any[];
    }> = {
      success: true,
      data: {
        projectSummary: summaryResult.rows,
        phaseSummary: phaseSummaryResult.rows,
        phaseEngineerDetail: phaseEngineerDetailResult.rows
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get work logs summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Admin endpoint for creating work logs with specified engineer_id (for historical imports)
export const createWorkLogAdmin = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const {
      engineer_id,
      phase_id,
      hours,
      description,
      date
    } = req.body;

    // Only supervisors and administrators can create work logs for other engineers
    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors and administrators can create work logs for other engineers'
      });
      return;
    }

    // Validate engineer exists
    const engineerResult = await query('SELECT * FROM users WHERE id = $1 AND role = $2', [engineer_id, 'engineer']);
    if (engineerResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Engineer not found'
      });
      return;
    }

    // Validate phase exists
    const phaseResult = await query(`
      SELECT pp.*, p.name as project_name
      FROM project_phases pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1
    `, [phase_id]);

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Validate hours (no upper limit for historical imports - can be cumulative hours across many days)
    if (hours <= 0) {
      res.status(400).json({
        success: false,
        error: 'Hours must be greater than 0'
      });
      return;
    }

    const workDate = date || new Date().toISOString().split('T')[0];

    // Create work log
    const result = await query(`
      INSERT INTO work_logs (
        project_id,
        phase_id,
        engineer_id,
        date,
        hours,
        description,
        supervisor_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      phase.project_id,
      phase_id,
      engineer_id,
      workDate,
      hours,
      description || '',
      true  // Auto-approve for historical imports
    ]);

    const workLog = result.rows[0];

    // Fetch engineer name for response
    const engineer = engineerResult.rows[0];
    workLog.engineer_name = engineer.name;
    workLog.phase_name = phase.phase_name;
    workLog.project_name = phase.project_name;

    const response: ApiResponse<{ workLog: any }> = {
      success: true,
      data: { workLog }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create work log admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get work log history - Shows all edits and deletions
export const getWorkLogHistory = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    // Check if work log exists
    const workLogResult = await query(
      'SELECT wl.*, u.name as engineer_name FROM work_logs wl JOIN users u ON wl.engineer_id = u.id WHERE wl.id = $1',
      [id]
    );

    if (workLogResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Work log not found'
      });
      return;
    }

    const workLog = workLogResult.rows[0];

    // Get history from work_log_history table
    const historyResult = await query(`
      SELECT
        wlh.*,
        u.name as changed_by_name,
        u.role as changed_by_role
      FROM work_log_history wlh
      JOIN users u ON wlh.changed_by = u.id
      WHERE wlh.work_log_id = $1
      ORDER BY wlh.changed_at DESC
    `, [id]);

    const response: ApiResponse<{
      workLog: any;
      history: any[];
    }> = {
      success: true,
      data: {
        workLog,
        history: historyResult.rows
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get work log history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};