import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse, PredefinedPhase, ProjectPhase, EarlyAccessGrantInput, EarlyAccessRevokeInput, EarlyAccessOverview } from '@/types';
import { emitEarlyAccessGranted, emitEarlyAccessRevoked, emitEarlyAccessPhaseStarted } from '@/services/socketEvents';

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

// Submit phase (supervisor delivers to client)
export const submitPhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note } = req.body;

    // Only supervisors can submit phases
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can submit phases'
      });
      return;
    }

    // Check if phase exists and is in correct status
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Phase must be in progress to be submitted
    if (phase.status !== 'in_progress') {
      res.status(400).json({
        success: false,
        error: `Phase must be in progress to submit. Current status: ${phase.status}`
      });
      return;
    }

    // Update phase status to submitted and set submitted_date
    await query(
      'UPDATE project_phases SET status = $1, submitted_date = CURRENT_DATE, updated_at = NOW() WHERE id = $2',
      ['submitted', phaseId]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'SUBMIT', authReq.user.id, note || 'Phase submitted to client']
    );

    const response: ApiResponse = {
      success: true,
      message: 'Phase submitted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Submit phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Approve phase (supervisor approves after client acceptance)
export const approvePhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note } = req.body;

    // Only supervisors can approve phases
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can approve phases'
      });
      return;
    }

    // Use transaction to ensure data consistency
    await transaction(async (client) => {
      // Check if phase exists and is in correct status
      const phaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      if (phaseResult.rows.length === 0) {
        throw new Error('Phase not found');
      }

      const phase = phaseResult.rows[0];

      // Phase must be submitted to be approved
      if (phase.status !== 'submitted') {
        throw new Error(`Phase must be submitted to approve. Current status: ${phase.status}`);
      }

      // Update phase status to approved and set actual end date and approved_date
      await client.query(
        'UPDATE project_phases SET status = $1, actual_end_date = NOW(), approved_date = CURRENT_DATE, updated_at = NOW() WHERE id = $2',
        ['approved', phaseId]
      );

      // Find and unlock the next phase
      const nextPhaseResult = await client.query(
        `SELECT * FROM project_phases
         WHERE project_id = $1 AND phase_order = $2`,
        [phase.project_id, phase.phase_order + 1]
      );

      if (nextPhaseResult.rows.length > 0) {
        const nextPhase = nextPhaseResult.rows[0];

        // Only unlock if next phase is not_started
        if (nextPhase.status === 'not_started') {
          await client.query(
            'UPDATE project_phases SET status = $1, updated_at = NOW() WHERE id = $2',
            ['ready', nextPhase.id]
          );

          // Log next phase unlock
          await client.query(
            'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
            ['project_phases', nextPhase.id, 'UNLOCK', authReq.user.id, `Phase unlocked after phase ${phase.phase_order} approval`]
          );
        }
      }

      // Log approval audit event
      await client.query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['project_phases', phaseId, 'APPROVE', authReq.user.id, note || 'Phase approved after client acceptance']
      );
    });

    const response: ApiResponse = {
      success: true,
      message: 'Phase approved successfully and next phase unlocked'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Approve phase error:', error);

    if (error instanceof Error && (error.message === 'Phase not found' || error.message.includes('Current status:'))) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};

// Complete phase (final handover confirmation)
export const completePhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note } = req.body;

    // Only supervisors can complete phases
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can complete phases'
      });
      return;
    }

    // Check if phase exists and is in correct status
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Phase must be approved to be completed
    if (phase.status !== 'approved') {
      res.status(400).json({
        success: false,
        error: `Phase must be approved to complete. Current status: ${phase.status}`
      });
      return;
    }

    // Update phase status to completed
    await query(
      'UPDATE project_phases SET status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', phaseId]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'COMPLETE', authReq.user.id, note || 'Phase marked as completed - final handover']
    );

    const response: ApiResponse = {
      success: true,
      message: 'Phase completed successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Complete phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Mark phase warning
export const markPhaseWarning = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { warning_flag, note } = req.body;

    // Only supervisors can mark warnings
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can mark phase warnings'
      });
      return;
    }

    // Check if phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Update warning flag
    await query(
      'UPDATE project_phases SET warning_flag = $1, updated_at = NOW() WHERE id = $2',
      [warning_flag, phaseId]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, warning_flag ? 'WARNING_ADD' : 'WARNING_REMOVE', authReq.user.id, note || `Warning ${warning_flag ? 'added' : 'removed'}`]
    );

    const response: ApiResponse = {
      success: true,
      message: `Phase warning ${warning_flag ? 'added' : 'removed'} successfully`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Mark phase warning error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Start phase (move from ready to in_progress)
export const startPhase = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note } = req.body;

    // Only supervisors can start phases
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can start phases'
      });
      return;
    }

    // Check if phase exists and is in correct status
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Phase must be ready OR have early access granted to be started
    const canStart = phase.status === 'ready' ||
                    (phase.early_access_granted && phase.early_access_status === 'accessible');

    if (!canStart) {
      if (phase.early_access_granted && phase.early_access_status === 'in_progress') {
        res.status(400).json({
          success: false,
          error: `Phase is already in progress via early access`
        });
      } else {
        res.status(400).json({
          success: false,
          error: `Phase must be ready or have early access granted to start. Current status: ${phase.status}`
        });
      }
      return;
    }

    // Update phase status to in_progress and set actual start date
    // Also update early access status if this is an early access phase
    if (phase.early_access_granted && phase.status !== 'ready') {
      await query(
        `UPDATE project_phases
         SET status = $1, early_access_status = $2, actual_start_date = NOW(), updated_at = NOW()
         WHERE id = $3`,
        ['in_progress', 'in_progress', phaseId]
      );
    } else {
      await query(
        'UPDATE project_phases SET status = $1, actual_start_date = NOW(), updated_at = NOW() WHERE id = $2',
        ['in_progress', phaseId]
      );
    }

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'START', authReq.user.id, note || 'Phase started']
    );

    // Emit socket event if this was an early access phase start
    if (phase.early_access_granted && phase.status !== 'ready') {
      // Get updated phase data
      const updatedPhaseResult = await query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );
      const updatedPhase = updatedPhaseResult.rows[0];

      emitEarlyAccessPhaseStarted(phase.project_id, updatedPhase, authReq.user);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Phase started successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Start phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Handle phase delay (client or company caused)
export const handlePhaseDelay = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { delay_reason, note, additional_weeks, new_end_date } = req.body;

    // Only supervisors can handle delays
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can handle phase delays'
      });
      return;
    }

    // Validate delay reason
    if (!['client', 'company'].includes(delay_reason)) {
      res.status(400).json({
        success: false,
        error: 'Delay reason must be either "client" or "company"'
      });
      return;
    }

    await transaction(async (client) => {
      // Check if phase exists
      const phaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      if (phaseResult.rows.length === 0) {
        throw new Error('Phase not found');
      }

      const phase = phaseResult.rows[0];

      let newEndDate = new_end_date;

      // Calculate new end date if additional weeks provided
      if (additional_weeks && !new_end_date) {
        const currentEndDate = new Date(phase.planned_end_date);
        currentEndDate.setDate(currentEndDate.getDate() + (additional_weeks * 7));
        newEndDate = currentEndDate.toISOString().split('T')[0];
      }

      // Update phase with delay information
      await client.query(
        `UPDATE project_phases
         SET delay_reason = $1, planned_end_date = COALESCE($2, planned_end_date), updated_at = NOW()
         WHERE id = $3`,
        [delay_reason, newEndDate, phaseId]
      );

      // If client delay, shift subsequent phases forward
      if (delay_reason === 'client' && newEndDate) {
        const originalEndDate = new Date(phase.planned_end_date);
        const adjustedEndDate = new Date(newEndDate);
        const daysDifference = Math.floor((adjustedEndDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDifference > 0) {
          // Shift all subsequent phases by the same amount (using parameterized query to prevent SQL injection)
          await client.query(
            `UPDATE project_phases
             SET planned_start_date = planned_start_date + INTERVAL $3 DAY,
                 planned_end_date = planned_end_date + INTERVAL $3 DAY,
                 updated_at = NOW()
             WHERE project_id = $1 AND phase_order > $2`,
            [phase.project_id, phase.phase_order, daysDifference]
          );
        }
      }

      // Log audit event with detailed note
      const auditNote = `${delay_reason === 'client' ? 'Client' : 'Company'} delay: ${note || 'No additional details'}${additional_weeks ? ` (+${additional_weeks} weeks)` : ''}`;

      await client.query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['project_phases', phaseId, 'DELAY_' + delay_reason.toUpperCase(), authReq.user.id, auditNote]
      );
    });

    const response: ApiResponse = {
      success: true,
      message: `${delay_reason === 'client' ? 'Client' : 'Company'} delay processed successfully${delay_reason === 'client' ? ' and timeline adjusted' : ''}`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Handle phase delay error:', error);

    if (error instanceof Error && error.message === 'Phase not found') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
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

// Early Access Management
export const grantEarlyAccess = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note }: EarlyAccessGrantInput = req.body;

    // Only supervisors can grant early access
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can grant early access to phases'
      });
      return;
    }

    await transaction(async (client) => {
      // Check if phase exists
      const phaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      if (phaseResult.rows.length === 0) {
        throw new Error('Phase not found');
      }

      const phase = phaseResult.rows[0];

      // Cannot grant early access to phases that are already ready or in progress
      if (['ready', 'in_progress', 'submitted', 'approved', 'completed'].includes(phase.status)) {
        throw new Error(`Cannot grant early access to phase with status: ${phase.status}`);
      }

      // Check if early access is already granted
      if (phase.early_access_granted) {
        throw new Error('Early access already granted for this phase');
      }

      // Grant early access
      await client.query(
        `UPDATE project_phases
         SET early_access_granted = true,
             early_access_status = 'accessible',
             early_access_granted_by = $1,
             early_access_granted_at = NOW(),
             early_access_note = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [authReq.user.id, note || 'Early access granted for trusted client', phaseId]
      );

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['project_phases', phaseId, 'EARLY_ACCESS_GRANT', authReq.user.id, note || `Early access granted to phase: ${phase.phase_name}`]
      );

      // Get updated phase for socket event
      const updatedPhaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      const updatedPhase = updatedPhaseResult.rows[0];

      // Emit socket event for real-time updates
      emitEarlyAccessGranted(phase.project_id, updatedPhase, authReq.user);
    });

    const response: ApiResponse = {
      success: true,
      message: 'Early access granted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Grant early access error:', error);

    if (error instanceof Error && (
      error.message === 'Phase not found' ||
      error.message.includes('Cannot grant early access') ||
      error.message.includes('already granted')
    )) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};

export const revokeEarlyAccess = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { note }: EarlyAccessRevokeInput = req.body;

    // Only supervisors can revoke early access
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can revoke early access to phases'
      });
      return;
    }

    await transaction(async (client) => {
      // Check if phase exists
      const phaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      if (phaseResult.rows.length === 0) {
        throw new Error('Phase not found');
      }

      const phase = phaseResult.rows[0];

      // Check if early access is granted
      if (!phase.early_access_granted) {
        throw new Error('Early access not granted for this phase');
      }

      // Cannot revoke if work has already started
      if (phase.early_access_status === 'in_progress') {
        throw new Error('Cannot revoke early access - work has already started on this phase');
      }

      // Check if there are any work logs for this phase (extra safety check)
      const workLogsResult = await client.query(
        'SELECT COUNT(*) as count FROM work_logs WHERE phase_id = $1',
        [phaseId]
      );

      if (parseInt(workLogsResult.rows[0].count) > 0) {
        throw new Error('Cannot revoke early access - work logs exist for this phase');
      }

      // Revoke early access
      await client.query(
        `UPDATE project_phases
         SET early_access_granted = false,
             early_access_status = 'not_accessible',
             early_access_granted_by = NULL,
             early_access_granted_at = NULL,
             early_access_note = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [phaseId]
      );

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['project_phases', phaseId, 'EARLY_ACCESS_REVOKE', authReq.user.id, note || `Early access revoked from phase: ${phase.phase_name}`]
      );

      // Get updated phase for socket event
      const updatedPhaseResult = await client.query(
        'SELECT * FROM project_phases WHERE id = $1',
        [phaseId]
      );

      const updatedPhase = updatedPhaseResult.rows[0];

      // Emit socket event for real-time updates
      emitEarlyAccessRevoked(phase.project_id, updatedPhase, authReq.user);
    });

    const response: ApiResponse = {
      success: true,
      message: 'Early access revoked successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Revoke early access error:', error);

    if (error instanceof Error && (
      error.message === 'Phase not found' ||
      error.message.includes('Early access not granted') ||
      error.message.includes('Cannot revoke early access')
    )) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};

export const getEarlyAccessOverview = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { projectId } = req.params;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
      return;
    }

    // Only supervisors can view early access overview
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can view early access overview'
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

    // Get phases with early access
    const phasesResult = await query(
      `SELECT * FROM project_phases
       WHERE project_id = $1 AND early_access_granted = true
       ORDER BY phase_order ASC`,
      [projectId]
    );

    const phases = phasesResult.rows;
    const activePhases = phases.filter((phase: ProjectPhase) =>
      phase.early_access_status === 'in_progress' || phase.early_access_status === 'accessible'
    );

    const overview: EarlyAccessOverview = {
      project_id: parseInt(projectId, 10),
      phases_with_early_access: phases,
      total_early_access_phases: phases.length,
      active_early_access_phases: activePhases.length
    };

    const response: ApiResponse<{ overview: EarlyAccessOverview }> = {
      success: true,
      data: { overview }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get early access overview error:', error);
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