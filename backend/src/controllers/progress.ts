import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, ProgressAdjustmentInput } from '@/types';
import {
  calculateHoursBasedProgress,
  getActualProgress,
  getProgressBreakdown,
  getPhaseProgressSummary,
  getPhaseProgressDetail,
  getProgressHistory,
  syncPhaseProgress,
  calculateProgressForHours
} from '@/services/progressCalculationService';
import { toUUID } from '@/utils/idConverter';

/**
 * Progress Controller
 * Handles all progress adjustment and retrieval endpoints
 */

/**
 * Set manual progress on a specific work log entry
 * POST /api/progress/work-log/:workLogId
 * Supervisor only
 */
export const setWorkLogProgress = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { workLogId } = req.params;
    const { manual_progress_percentage, adjustment_reason }: ProgressAdjustmentInput = req.body;

    // Validate workLogId parameter
    if (!workLogId) {
      res.status(400).json({
        success: false,
        error: 'Work log ID is required'
      });
      return;
    }

    // Only supervisors can adjust progress
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can adjust progress'
      });
      return;
    }

    // Validate progress percentage
    if (manual_progress_percentage < 0 || manual_progress_percentage > 100) {
      res.status(400).json({
        success: false,
        error: 'Progress percentage must be between 0 and 100'
      });
      return;
    }

    // Validate reason is provided
    if (!adjustment_reason || adjustment_reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Adjustment reason is required'
      });
      return;
    }

    // Get work log details
    const workLogResult = await query(
      'SELECT * FROM work_logs WHERE id = $1',
      [workLogId]
    );

    if (workLogResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Work log not found'
      });
      return;
    }

    const workLog = workLogResult.rows[0];

    // Calculate hours-based progress for this engineer on this phase
    const hoursBasedProgress = await calculateHoursBasedProgress(
      workLog.phase_id,
      workLog.engineer_id
    );

    // Create progress adjustment record
    await query(
      `INSERT INTO progress_adjustments (
        phase_id, engineer_id, work_log_id, adjustment_type,
        hours_logged, hours_based_progress, manual_progress_percentage,
        adjustment_reason, adjusted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        workLog.phase_id,
        workLog.engineer_id,
        workLogId,
        'work_log_entry',
        workLog.hours,
        hoursBasedProgress,
        manual_progress_percentage,
        adjustment_reason,
        toUUID(authReq.user.id)
      ]
    );

    // Update work log with manual progress
    await query(
      `UPDATE work_logs
       SET manual_progress_percentage = $1,
           progress_notes = $2,
           progress_adjusted_by = $3,
           progress_adjusted_at = NOW()
       WHERE id = $4`,
      [manual_progress_percentage, adjustment_reason, toUUID(authReq.user.id), workLogId]
    );

    // Sync phase progress (done automatically by trigger, but we return updated info)
    await syncPhaseProgress(workLog.phase_id);

    // Get updated breakdown
    const breakdown = await getProgressBreakdown(workLog.phase_id, workLog.engineer_id);

    const response: ApiResponse = {
      success: true,
      message: 'Progress adjusted successfully',
      data: { breakdown }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Set work log progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Set overall phase progress for an engineer
 * POST /api/progress/phase/:phaseId/engineer/:engineerId
 * Supervisor only
 */
export const setPhaseEngineerProgress = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId, engineerId } = req.params;
    const { manual_progress_percentage, adjustment_reason }: ProgressAdjustmentInput = req.body;

    // Validate parameters
    if (!phaseId || !engineerId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID and Engineer ID are required'
      });
      return;
    }

    // Type assertion: after validation, these are guaranteed to be strings
    const validPhaseId = phaseId as string;
    const validEngineerId = engineerId as string;

    // Only supervisors can adjust progress
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can adjust progress'
      });
      return;
    }

    // Validate progress percentage
    if (manual_progress_percentage < 0 || manual_progress_percentage > 100) {
      res.status(400).json({
        success: false,
        error: 'Progress percentage must be between 0 and 100'
      });
      return;
    }

    // Validate reason is provided
    if (!adjustment_reason || adjustment_reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Adjustment reason is required'
      });
      return;
    }

    // Verify phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [validPhaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Verify engineer exists and has worked on this phase
    const engineerResult = await query(
      `SELECT u.*, COUNT(wl.id) as work_log_count
       FROM users u
       LEFT JOIN work_logs wl ON wl.engineer_id = u.id AND wl.phase_id = $1
       WHERE u.id = $2 AND u.role = 'engineer'
       GROUP BY u.id`,
      [validPhaseId, validEngineerId]
    );

    if (engineerResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Engineer not found'
      });
      return;
    }

    if (parseInt(engineerResult.rows[0].work_log_count) === 0) {
      res.status(400).json({
        success: false,
        error: 'Engineer has not logged any work on this phase'
      });
      return;
    }

    // Get total hours logged by engineer
    const hoursResult = await query(
      'SELECT COALESCE(SUM(hours), 0) as total_hours FROM work_logs WHERE phase_id = $1 AND engineer_id = $2',
      [validPhaseId, validEngineerId]
    );
    const totalHours = parseFloat(hoursResult.rows[0].total_hours);

    // Calculate hours-based progress
    const hoursBasedProgress = await calculateHoursBasedProgress(
      validPhaseId,
      validEngineerId
    );

    // Create progress adjustment record
    await query(
      `INSERT INTO progress_adjustments (
        phase_id, engineer_id, work_log_id, adjustment_type,
        hours_logged, hours_based_progress, manual_progress_percentage,
        adjustment_reason, adjusted_by
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
      [
        validPhaseId,
        validEngineerId,
        'phase_overall',
        totalHours,
        hoursBasedProgress,
        manual_progress_percentage,
        adjustment_reason,
        toUUID(authReq.user.id)
      ]
    );

    // Sync phase progress
    await syncPhaseProgress(validPhaseId);

    // Get updated breakdown
    const breakdown = await getProgressBreakdown(validPhaseId, validEngineerId);

    const response: ApiResponse = {
      success: true,
      message: 'Phase progress adjusted successfully',
      data: { breakdown }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Set phase engineer progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get progress history for a phase (optionally filtered by engineer)
 * GET /api/progress/phase/:phaseId/history?engineerId=123
 */
export const getPhaseProgressHistory = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { engineerId } = req.query;

    if (!phaseId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID is required'
      });
      return;
    }

    // Type assertion: after validation, phaseId is guaranteed to be a string
    const validPhaseId = phaseId as string;

    // Verify phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [validPhaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Get progress history
    const history = await getProgressHistory(
      validPhaseId,
      engineerId as string | undefined
    );

    const response: ApiResponse = {
      success: true,
      data: { history }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get progress history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get progress summary for a phase (all engineers)
 * GET /api/progress/phase/:phaseId/summary
 */
export const getPhaseProgressSummaryController = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;

    if (!phaseId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID is required'
      });
      return;
    }

    // Type assertion: after validation, phaseId is guaranteed to be a string
    const validPhaseId = phaseId as string;

    // Verify phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [validPhaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Get progress summary
    const summary = await getPhaseProgressSummary(validPhaseId);

    const response: ApiResponse = {
      success: true,
      data: { summary }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get progress summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get detailed progress breakdown for an engineer on a phase
 * GET /api/progress/phase/:phaseId/engineer/:engineerId
 */
export const getEngineerProgressBreakdown = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId, engineerId } = req.params;

    if (!phaseId || !engineerId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID and Engineer ID are required'
      });
      return;
    }

    // Type assertion: after validation, these are guaranteed to be strings
    const validPhaseId = phaseId as string;
    const validEngineerId = engineerId as string;

    // Engineers can only view their own progress, supervisors can view any
    if (authReq.user.role === 'engineer' && toUUID(authReq.user.id) !== validEngineerId) {
      res.status(403).json({
        success: false,
        error: 'Engineers can only view their own progress'
      });
      return;
    }

    // Get progress breakdown
    const breakdown = await getProgressBreakdown(
      validPhaseId,
      validEngineerId
    );

    const response: ApiResponse = {
      success: true,
      data: { breakdown }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get engineer progress breakdown error:', error);

    if (error instanceof Error && error.message === 'Phase or engineer not found') {
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

/**
 * Get detailed progress information for a phase
 * GET /api/progress/phase/:phaseId/detail
 */
export const getPhaseProgressDetailController = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;

    if (!phaseId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID is required'
      });
      return;
    }

    // Type assertion: after validation, phaseId is guaranteed to be a string
    const validPhaseId = phaseId as string;

    // Get phase progress detail
    const detail = await getPhaseProgressDetail(validPhaseId);

    const response: ApiResponse = {
      success: true,
      data: { detail }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get phase progress detail error:', error);

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

/**
 * Calculate what progress percentage would be for given hours
 * POST /api/progress/calculate
 * Helper endpoint for UI to show users what the auto-calculation would be
 */
export const calculateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hours_logged, predicted_hours } = req.body;

    if (!hours_logged || !predicted_hours) {
      res.status(400).json({
        success: false,
        error: 'hours_logged and predicted_hours are required'
      });
      return;
    }

    const progress = calculateProgressForHours(
      parseFloat(hours_logged),
      parseFloat(predicted_hours)
    );

    const response: ApiResponse = {
      success: true,
      data: { progress }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Calculate progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
