import { Request, Response } from 'express';
import { query } from '@/database/connection';
import {
  ComprehensiveOverviewData,
  ComprehensiveOverviewResponse,
  PhaseDetail,
  EngineerWorkDetail,
  DeadlineInfo
} from '@/types';

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
        GROUP BY u.id, u.name, pp.id, pp.phase_name, pp.phase_order
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
