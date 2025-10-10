import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse } from '@/types';
import { emitEarlyAccessPhaseStarted } from '@/services/socketEvents';

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
