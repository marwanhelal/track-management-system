import { Request, Response } from 'express';
import { query } from '@/database/connection';

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
