import { query } from '@/database/connection';
import {
  ProgressAdjustment,
  ProgressSummary,
  ProgressBreakdown,
  PhaseProgressDetail,
  EngineerProgressDetail
} from '@/types';

/**
 * Progress Calculation Service
 * Handles all progress calculations, comparisons, and aggregations
 * between hours-based progress and supervisor-adjusted progress
 */

/**
 * Calculate hours-based progress for an engineer on a specific phase
 * Formula: (Total Hours Logged / Predicted Hours) * 100 (capped at 100%)
 */
export const calculateHoursBasedProgress = async (
  phaseId: string,
  engineerId: string
): Promise<number> => {
  const result = await query(
    'SELECT calculate_hours_based_progress($1, $2) as progress',
    [phaseId, engineerId]
  );
  return parseFloat(result.rows[0].progress) || 0;
};

/**
 * Get actual progress (with manual adjustments) for an engineer on a phase
 * Returns manual progress if set, otherwise returns calculated progress
 */
export const getActualProgress = async (
  phaseId: string,
  engineerId: string
): Promise<number> => {
  const result = await query(
    'SELECT get_actual_progress($1, $2) as progress',
    [phaseId, engineerId]
  );
  return parseFloat(result.rows[0].progress) || 0;
};

/**
 * Get detailed progress breakdown for an engineer on a phase
 * Includes hours, calculated progress, manual adjustments, and variance
 */
export const getProgressBreakdown = async (
  phaseId: string,
  engineerId: string
): Promise<ProgressBreakdown> => {
  // Get basic phase and engineer info
  const phaseResult = await query(
    `SELECT pp.id, pp.phase_name, pp.predicted_hours, u.name as engineer_name
     FROM project_phases pp
     CROSS JOIN users u
     WHERE pp.id = $1 AND u.id = $2`,
    [phaseId, engineerId]
  );

  if (phaseResult.rows.length === 0) {
    throw new Error('Phase or engineer not found');
  }

  const phase = phaseResult.rows[0];

  // Get total hours logged
  const hoursResult = await query(
    'SELECT COALESCE(SUM(hours), 0) as total_hours FROM work_logs WHERE phase_id = $1 AND engineer_id = $2',
    [phaseId, engineerId]
  );
  const hoursLogged = parseFloat(hoursResult.rows[0].total_hours);

  // Calculate progress percentages
  const calculatedProgress = await calculateHoursBasedProgress(phaseId, engineerId);
  const actualProgress = await getActualProgress(phaseId, engineerId);
  const variance = actualProgress - calculatedProgress;

  // Get adjustment history
  const adjustmentsResult = await query(
    `SELECT pa.*, u.name as adjusted_by_name
     FROM progress_adjustments pa
     JOIN users u ON pa.adjusted_by = u.id
     WHERE pa.phase_id = $1 AND pa.engineer_id = $2
     ORDER BY pa.created_at DESC`,
    [phaseId, engineerId]
  );

  return {
    phase_id: phaseId,
    phase_name: phase.phase_name,
    engineer_id: engineerId,
    engineer_name: phase.engineer_name,
    hours_logged: hoursLogged,
    predicted_hours: parseFloat(phase.predicted_hours) || 0,
    hours_based_progress: calculatedProgress,
    manual_adjustments: adjustmentsResult.rows,
    actual_progress: actualProgress,
    variance: variance,
    adjustment_history_count: adjustmentsResult.rows.length
  };
};

/**
 * Get progress summary for all engineers working on a phase
 * Returns aggregated data for dashboard/overview displays
 */
export const getPhaseProgressSummary = async (
  phaseId: string
): Promise<ProgressSummary[]> => {
  const result = await query(
    `SELECT
      pp.id as phase_id,
      pp.phase_name,
      u.id as engineer_id,
      u.name as engineer_name,
      COALESCE(SUM(wl.hours), 0) as total_hours_logged,
      pp.predicted_hours,
      calculate_hours_based_progress(pp.id, u.id) as calculated_progress,
      get_actual_progress(pp.id, u.id) as actual_progress,
      get_actual_progress(pp.id, u.id) - calculate_hours_based_progress(pp.id, u.id) as variance,
      (SELECT MAX(created_at) FROM progress_adjustments WHERE phase_id = pp.id AND engineer_id = u.id) as last_adjustment,
      (SELECT u2.name FROM progress_adjustments pa2 JOIN users u2 ON pa2.adjusted_by = u2.id WHERE pa2.phase_id = pp.id AND pa2.engineer_id = u.id ORDER BY pa2.created_at DESC LIMIT 1) as last_adjustment_by,
      (SELECT COUNT(*) FROM progress_adjustments WHERE phase_id = pp.id AND engineer_id = u.id) as adjustment_count
     FROM project_phases pp
     CROSS JOIN users u
     LEFT JOIN work_logs wl ON wl.phase_id = pp.id AND wl.engineer_id = u.id
     WHERE pp.id = $1
       AND u.role = 'engineer'
       AND EXISTS (SELECT 1 FROM work_logs WHERE phase_id = pp.id AND engineer_id = u.id)
     GROUP BY pp.id, pp.phase_name, pp.predicted_hours, u.id, u.name
     ORDER BY u.name`,
    [phaseId]
  );

  return result.rows.map((row: {
    phase_id: string;
    phase_name: string;
    engineer_id: string;
    engineer_name: string;
    total_hours_logged: string;
    predicted_hours: string;
    calculated_progress: string;
    actual_progress: string;
    variance: string;
    last_adjustment: Date;
    last_adjustment_by: string;
    adjustment_count: string;
  }) => ({
    phase_id: row.phase_id,
    phase_name: row.phase_name,
    engineer_id: row.engineer_id,
    engineer_name: row.engineer_name,
    total_hours_logged: parseFloat(row.total_hours_logged),
    predicted_hours: parseFloat(row.predicted_hours) || 0,
    calculated_progress: parseFloat(row.calculated_progress) || 0,
    actual_progress: parseFloat(row.actual_progress) || 0,
    variance: parseFloat(row.variance) || 0,
    last_adjustment: row.last_adjustment,
    last_adjustment_by: row.last_adjustment_by,
    adjustment_count: parseInt(row.adjustment_count) || 0
  }));
};

/**
 * Get detailed progress information for a phase including all engineers
 */
export const getPhaseProgressDetail = async (
  phaseId: string
): Promise<PhaseProgressDetail> => {
  // Get phase info
  const phaseResult = await query(
    'SELECT * FROM project_phases WHERE id = $1',
    [phaseId]
  );

  if (phaseResult.rows.length === 0) {
    throw new Error('Phase not found');
  }

  const phase = phaseResult.rows[0];

  // Get all engineers working on this phase with their progress
  const engineersResult = await query(
    `SELECT DISTINCT
      u.id as engineer_id,
      u.name as engineer_name,
      COALESCE(SUM(wl.hours), 0) as hours_logged,
      calculate_hours_based_progress($1, u.id) as calculated_progress,
      get_actual_progress($1, u.id) as actual_progress,
      get_actual_progress($1, u.id) - calculate_hours_based_progress($1, u.id) as variance,
      MAX(wl.date) as last_work_log_date,
      (SELECT COUNT(*) FROM progress_adjustments WHERE phase_id = $1 AND engineer_id = u.id) as adjustment_count,
      (SELECT COUNT(*) > 0 FROM progress_adjustments WHERE phase_id = $1 AND engineer_id = u.id) as has_manual_adjustments
     FROM users u
     JOIN work_logs wl ON wl.engineer_id = u.id
     WHERE wl.phase_id = $1 AND u.role = 'engineer'
     GROUP BY u.id, u.name
     ORDER BY u.name`,
    [phaseId]
  );

  const engineers: EngineerProgressDetail[] = engineersResult.rows.map((row: {
    engineer_id: string;
    engineer_name: string;
    hours_logged: string;
    calculated_progress: string;
    actual_progress: string;
    variance: string;
    last_work_log_date: Date;
    adjustment_count: string;
    has_manual_adjustments: boolean;
  }) => ({
    engineer_id: row.engineer_id,
    engineer_name: row.engineer_name,
    hours_logged: parseFloat(row.hours_logged),
    calculated_progress: parseFloat(row.calculated_progress) || 0,
    actual_progress: parseFloat(row.actual_progress) || 0,
    variance: parseFloat(row.variance) || 0,
    last_work_log_date: row.last_work_log_date,
    adjustment_count: parseInt(row.adjustment_count) || 0,
    has_manual_adjustments: row.has_manual_adjustments || false
  }));

  return {
    phase_id: phase.id,
    phase_name: phase.phase_name,
    predicted_hours: parseFloat(phase.predicted_hours) || 0,
    calculated_progress: parseFloat(phase.calculated_progress) || 0,
    actual_progress: parseFloat(phase.actual_progress) || 0,
    progress_variance: parseFloat(phase.progress_variance) || 0,
    engineers
  };
};

/**
 * Sync phase progress by aggregating from all engineers
 * This is called automatically by database triggers but can be manually invoked
 */
export const syncPhaseProgress = async (phaseId: string): Promise<void> => {
  await query('SELECT sync_phase_progress($1)', [phaseId]);
};

/**
 * Get progress adjustment history for a specific engineer on a phase
 */
export const getProgressHistory = async (
  phaseId: string,
  engineerId?: string
): Promise<ProgressAdjustment[]> => {
  let queryText = `
    SELECT
      pa.*,
      u.name as adjusted_by_name,
      e.name as engineer_name,
      pp.phase_name
    FROM progress_adjustments pa
    JOIN users u ON pa.adjusted_by = u.id
    JOIN users e ON pa.engineer_id = e.id
    JOIN project_phases pp ON pa.phase_id = pp.id
    WHERE pa.phase_id = $1
  `;

  const params: any[] = [phaseId];

  if (engineerId) {
    queryText += ' AND pa.engineer_id = $2';
    params.push(engineerId);
  }

  queryText += ' ORDER BY pa.created_at DESC';

  const result = await query(queryText, params);

  return result.rows;
};

/**
 * Calculate what the progress percentage would be for a given number of hours
 * Useful for showing the user what the automatic calculation would be
 */
export const calculateProgressForHours = (
  hoursLogged: number,
  predictedHours: number
): number => {
  if (predictedHours === 0) {
    return 0;
  }
  return Math.min(Math.round((hoursLogged / predictedHours) * 100 * 100) / 100, 100);
};

/**
 * Get progress statistics for a project
 * Useful for project-level dashboards and reports
 */
export const getProjectProgressStats = async (projectId: number) => {
  const result = await query(
    `SELECT
      COUNT(DISTINCT pp.id) as total_phases,
      COUNT(DISTINCT CASE WHEN pp.actual_progress = 100 THEN pp.id END) as completed_phases,
      AVG(pp.calculated_progress) as avg_calculated_progress,
      AVG(pp.actual_progress) as avg_actual_progress,
      AVG(pp.progress_variance) as avg_variance,
      SUM(CASE WHEN pp.progress_variance < -10 THEN 1 ELSE 0 END) as phases_behind_quality,
      SUM(CASE WHEN pp.progress_variance > 10 THEN 1 ELSE 0 END) as phases_ahead_quality
     FROM project_phases pp
     WHERE pp.project_id = $1`,
    [projectId]
  );

  const stats = result.rows[0];

  return {
    total_phases: parseInt(stats.total_phases) || 0,
    completed_phases: parseInt(stats.completed_phases) || 0,
    avg_calculated_progress: parseFloat(stats.avg_calculated_progress) || 0,
    avg_actual_progress: parseFloat(stats.avg_actual_progress) || 0,
    avg_variance: parseFloat(stats.avg_variance) || 0,
    phases_behind_quality: parseInt(stats.phases_behind_quality) || 0,
    phases_ahead_quality: parseInt(stats.phases_ahead_quality) || 0
  };
};
