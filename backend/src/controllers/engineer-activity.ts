import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse } from '@/types';

// Interface for engineer activity data
interface EngineerWorkLog {
  id: number;
  project_name: string;
  phase_name: string;
  hours: number;
  description: string;
  date: string;
  created_at: string;
}

interface ActiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  login_time: string | null;
  total_hours: number;
  work_logs: EngineerWorkLog[];
}

interface InactiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  last_login: string | null;
  last_work_date: string | null;
  status: 'no_work_logged' | 'not_logged_in' | 'completely_inactive';
}

interface DailyActivitySummary {
  total_active_engineers: number;
  total_inactive_engineers: number;
  total_hours_logged: number;
  average_hours_per_engineer: number;
  date: string;
}

interface DailyActivityData {
  summary: DailyActivitySummary;
  active_engineers: ActiveEngineer[];
  inactive_engineers: InactiveEngineer[];
}

/**
 * Get daily engineer activity report
 * Shows which engineers worked today and which didn't
 * Includes login tracking
 */
export const getDailyActivity = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors and administrators can view activity reports
    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors and administrators can view engineer activity reports'
      });
      return;
    }

    // Get date parameter (defaults to today)
    const dateParam = req.query.date;
    const targetDate = typeof dateParam === 'string' ? dateParam : new Date().toISOString().split('T')[0];

    // ===== STEP 1: Get all engineers (excluding supervisors and administrators) =====
    const allEngineersResult = await query(
      `SELECT id, name, email, job_description, last_login
       FROM users
       WHERE role = 'engineer' AND is_active = true
       ORDER BY name ASC`
    );

    const allEngineers = allEngineersResult.rows;

    // ===== STEP 2: Get work logs for the target date =====
    const workLogsResult = await query(
      `SELECT
        wl.id,
        wl.engineer_id,
        wl.hours,
        wl.description,
        wl.date,
        wl.created_at,
        p.name as project_name,
        pp.phase_name
       FROM work_logs wl
       JOIN project_phases pp ON wl.phase_id = pp.id
       JOIN projects p ON wl.project_id = p.id
       WHERE wl.date = $1
       AND wl.deleted_at IS NULL
       ORDER BY wl.engineer_id, wl.created_at DESC`,
      [targetDate]
    );

    const workLogs = workLogsResult.rows;

    // ===== STEP 3: Get login sessions for the target date =====
    const loginSessionsResult = await query(
      `SELECT DISTINCT ON (user_id)
        user_id,
        login_time
       FROM user_sessions
       WHERE login_time::date = $1::date
       ORDER BY user_id, login_time DESC`,
      [targetDate]
    );

    const loginSessions = loginSessionsResult.rows;
    const loggedInEngineerIds = new Set(loginSessions.map((s: any) => s.user_id));
    const loginTimesMap = new Map<number, string>(loginSessions.map((s: any) => [s.user_id, s.login_time]));

    // ===== STEP 4: Group work logs by engineer =====
    const workLogsByEngineer = new Map<number, EngineerWorkLog[]>();
    let totalHoursLogged = 0;

    workLogs.forEach((log: any) => {
      if (!workLogsByEngineer.has(log.engineer_id)) {
        workLogsByEngineer.set(log.engineer_id, []);
      }

      const workLog: EngineerWorkLog = {
        id: log.id,
        project_name: log.project_name,
        phase_name: log.phase_name,
        hours: parseFloat(log.hours),
        description: log.description || '',
        date: log.date,
        created_at: log.created_at
      };

      workLogsByEngineer.get(log.engineer_id)!.push(workLog);
      totalHoursLogged += parseFloat(log.hours);
    });

    const engineersWithWork = new Set(workLogsByEngineer.keys());

    // ===== STEP 5: Build active engineers list =====
    const activeEngineers: ActiveEngineer[] = [];

    allEngineers.forEach((engineer: any) => {
      if (engineersWithWork.has(engineer.id)) {
        const engineerWorkLogs = workLogsByEngineer.get(engineer.id) || [];
        const totalHours = engineerWorkLogs.reduce((sum, log) => sum + log.hours, 0);
        const loginTime = loginTimesMap.get(engineer.id);

        activeEngineers.push({
          id: engineer.id,
          name: engineer.name,
          email: engineer.email,
          job_description: engineer.job_description,
          login_time: loginTime || null,
          total_hours: totalHours,
          work_logs: engineerWorkLogs
        });
      }
    });

    // Sort active engineers by total hours (descending)
    activeEngineers.sort((a, b) => b.total_hours - a.total_hours);

    // ===== STEP 6: Build inactive engineers list =====
    const inactiveEngineers: InactiveEngineer[] = [];

    allEngineers.forEach((engineer: any) => {
      if (!engineersWithWork.has(engineer.id)) {
        // Determine status
        let status: 'no_work_logged' | 'not_logged_in' | 'completely_inactive';

        if (loggedInEngineerIds.has(engineer.id)) {
          // Logged in but didn't log work
          status = 'no_work_logged';
        } else if (engineer.last_login) {
          // Didn't log in today but has logged in before
          status = 'not_logged_in';
        } else {
          // Never logged in
          status = 'completely_inactive';
        }

        inactiveEngineers.push({
          id: engineer.id,
          name: engineer.name,
          email: engineer.email,
          job_description: engineer.job_description,
          last_login: engineer.last_login,
          last_work_date: null, // Will be filled in parallel queries
          status
        });
      }
    });

    // ===== STEP 7: Get last work dates for inactive engineers =====
    await Promise.all(
      inactiveEngineers.map(async (engineer) => {
        const lastWorkResult = await query(
          `SELECT MAX(date) as last_work_date
           FROM work_logs
           WHERE engineer_id = $1 AND deleted_at IS NULL`,
          [engineer.id]
        );
        engineer.last_work_date = lastWorkResult.rows[0]?.last_work_date || null;
      })
    );

    // ===== STEP 8: Calculate summary statistics =====
    const summary = {
      total_active_engineers: activeEngineers.length,
      total_inactive_engineers: inactiveEngineers.length,
      total_hours_logged: Math.round(totalHoursLogged * 100) / 100,
      average_hours_per_engineer:
        activeEngineers.length > 0
          ? Math.round((totalHoursLogged / activeEngineers.length) * 100) / 100
          : 0,
      date: targetDate
    };

    // ===== STEP 9: Build response =====
    const activityData = {
      summary,
      active_engineers: activeEngineers,
      inactive_engineers: inactiveEngineers
    };

    const response: ApiResponse<any> = {
      success: true,
      message: `Engineer activity report for ${targetDate}`,
      data: activityData
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get daily activity error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching engineer activity',
      ...(process.env.NODE_ENV === 'development' && { details: error.message, stack: error.stack })
    });
  }
};

/**
 * Get activity summary for multiple dates (for charts/trends)
 */
export const getActivitySummary = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors and administrators can view activity reports
    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors and administrators can view engineer activity reports'
      });
      return;
    }

    // Get date range parameters
    const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];

    // Get daily activity summary
    const summaryResult = await query(
      `SELECT
        wl.date,
        COUNT(DISTINCT wl.engineer_id) as active_engineers,
        SUM(wl.hours) as total_hours,
        COUNT(wl.id) as total_work_logs
       FROM work_logs wl
       JOIN users u ON wl.engineer_id = u.id
       WHERE wl.date BETWEEN $1 AND $2
       AND u.role = 'engineer'
       AND wl.deleted_at IS NULL
       GROUP BY wl.date
       ORDER BY wl.date DESC`,
      [startDate, endDate]
    );

    const response: ApiResponse<{ summary: any[] }> = {
      success: true,
      data: { summary: summaryResult.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get activity summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching activity summary'
    });
  }
};
