import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse, ProjectPhase, EarlyAccessGrantInput, EarlyAccessRevokeInput, EarlyAccessOverview } from '@/types';
import { emitEarlyAccessGranted, emitEarlyAccessRevoked } from '@/services/socketEvents';

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
