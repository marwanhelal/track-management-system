import { query, transaction } from '@/database/connection';

class QueryOptimizationService {

  // Optimized query for getting project list with efficient joins
  public async getOptimizedProjectList(filters?: any): Promise<any[]> {
    const baseQuery = `
      SELECT
        p.id,
        p.name,
        p.start_date,
        p.planned_total_weeks,
        p.predicted_hours,
        p.actual_hours,
        p.status,
        p.created_at,
        u.name as created_by_name,
        -- Aggregated data for performance
        COALESCE(phase_stats.total_phases, 0) as total_phases,
        COALESCE(phase_stats.completed_phases, 0) as completed_phases,
        COALESCE(phase_stats.warning_phases, 0) as warning_phases,
        COALESCE(work_stats.engineer_count, 0) as engineer_count,
        work_stats.last_activity_date,
        CASE
          WHEN p.predicted_hours > 0
          THEN ROUND((p.actual_hours::numeric / p.predicted_hours * 100), 1)
          ELSE 0
        END as progress_percentage
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      -- Efficient subquery for phase statistics
      LEFT JOIN (
        SELECT
          project_id,
          COUNT(*) as total_phases,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_phases,
          COUNT(CASE WHEN warning_flag = true THEN 1 END) as warning_phases
        FROM project_phases
        GROUP BY project_id
      ) phase_stats ON p.id = phase_stats.project_id
      -- Efficient subquery for work log statistics
      LEFT JOIN (
        SELECT
          pp.project_id,
          COUNT(DISTINCT wl.engineer_id) as engineer_count,
          MAX(wl.date) as last_activity_date
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        GROUP BY pp.project_id
      ) work_stats ON p.id = work_stats.project_id
      WHERE p.status != 'cancelled' AND p.archived_at IS NULL
      ORDER BY
        CASE WHEN work_stats.last_activity_date IS NULL THEN 1 ELSE 0 END,
        work_stats.last_activity_date DESC,
        p.created_at DESC
    `;

    const result = await query(baseQuery);
    return result.rows;
  }

  // Optimized query for getting project details with all related data in one go
  public async getOptimizedProjectDetails(projectId: number): Promise<any> {
    const projectQuery = `
      WITH project_data AS (
        SELECT
          p.*,
          u.name as created_by_name,
          ps.auto_advance_enabled,
          ps.allow_timeline_mismatch
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_settings ps ON p.id = ps.project_id
        WHERE p.id = $1
      ),
      phase_data AS (
        SELECT
          pp.*,
          COALESCE(wl_stats.total_hours, 0) as actual_hours,
          COALESCE(wl_stats.engineer_count, 0) as engineer_count
        FROM project_phases pp
        LEFT JOIN (
          SELECT
            phase_id,
            SUM(hours) as total_hours,
            COUNT(DISTINCT engineer_id) as engineer_count
          FROM work_logs
          GROUP BY phase_id
        ) wl_stats ON pp.id = wl_stats.phase_id
        WHERE pp.project_id = $1
        ORDER BY pp.phase_order ASC
      ),
      work_log_data AS (
        SELECT
          wl.id,
          wl.date,
          wl.hours,
          wl.description,
          wl.supervisor_approved,
          wl.created_at,
          wl.updated_at,
          pp.id as phase_id,
          pp.phase_name,
          u.id as engineer_id,
          u.name as engineer_name
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        JOIN users u ON wl.engineer_id = u.id
        WHERE pp.project_id = $1
        ORDER BY wl.created_at DESC
        LIMIT 100  -- Limit to recent 100 work logs for performance
      )
      SELECT
        json_build_object(
          'project', (SELECT row_to_json(pd) FROM project_data pd),
          'phases', (SELECT json_agg(row_to_json(phd)) FROM phase_data phd),
          'workLogs', (SELECT json_agg(row_to_json(wld)) FROM work_log_data wld)
        ) as result
    `;

    const result = await query(projectQuery, [projectId]);
    return result.rows[0]?.result || null;
  }

  // Optimized dashboard data query
  public async getOptimizedDashboardData(userId: number, userRole: string): Promise<any> {
    if (userRole === 'supervisor') {
      return this.getSupervisorDashboardData();
    } else {
      return this.getEngineerDashboardData(userId);
    }
  }

  private async getSupervisorDashboardData(): Promise<any> {
    const dashboardQuery = `
      WITH project_stats AS (
        SELECT
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_projects
        FROM projects
        WHERE archived_at IS NULL
      ),
      recent_activity AS (
        SELECT
          p.id as project_id,
          p.name as project_name,
          p.status,
          wl.date as last_activity,
          wl.hours,
          u.name as engineer_name,
          pp.phase_name
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        JOIN users u ON wl.engineer_id = u.id
        WHERE wl.date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY wl.created_at DESC
        LIMIT 20
      ),
      warning_phases AS (
        SELECT
          p.id as project_id,
          p.name as project_name,
          pp.phase_name,
          pp.status as phase_status
        FROM project_phases pp
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.warning_flag = true
        AND p.status = 'active'
        ORDER BY pp.updated_at DESC
        LIMIT 10
      )
      SELECT
        json_build_object(
          'projectStats', (SELECT row_to_json(ps) FROM project_stats ps),
          'recentActivity', (SELECT json_agg(row_to_json(ra)) FROM recent_activity ra),
          'warningPhases', (SELECT json_agg(row_to_json(wp)) FROM warning_phases wp)
        ) as dashboard_data
    `;

    const result = await query(dashboardQuery);
    return result.rows[0]?.dashboard_data || {};
  }

  private async getEngineerDashboardData(userId: number): Promise<any> {
    const dashboardQuery = `
      WITH user_stats AS (
        SELECT
          COUNT(DISTINCT pp.project_id) as active_projects,
          SUM(wl.hours) as total_hours_this_month,
          AVG(wl.hours) as avg_hours_per_day
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE wl.engineer_id = $1
        AND wl.date >= DATE_TRUNC('month', CURRENT_DATE)
        AND p.status = 'active'
      ),
      recent_work AS (
        SELECT
          wl.id,
          wl.date,
          wl.hours,
          wl.description,
          p.name as project_name,
          pp.phase_name
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE wl.engineer_id = $1
        ORDER BY wl.created_at DESC
        LIMIT 15
      ),
      available_phases AS (
        SELECT
          pp.id as phase_id,
          pp.phase_name,
          p.id as project_id,
          p.name as project_name,
          pp.predicted_hours,
          pp.actual_hours
        FROM project_phases pp
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.status IN ('ready', 'in_progress')
        AND p.status = 'active'
        ORDER BY pp.planned_start_date ASC
        LIMIT 10
      )
      SELECT
        json_build_object(
          'userStats', (SELECT row_to_json(us) FROM user_stats us),
          'recentWork', (SELECT json_agg(row_to_json(rw)) FROM recent_work rw),
          'availablePhases', (SELECT json_agg(row_to_json(ap)) FROM available_phases ap)
        ) as dashboard_data
    `;

    const result = await query(dashboardQuery, [userId]);
    return result.rows[0]?.dashboard_data || {};
  }

  // Optimized work log queries
  public async getOptimizedUserWorkLogs(userId: number, limit: number = 50, offset: number = 0): Promise<any> {
    const workLogsQuery = `
      SELECT
        wl.id,
        wl.date,
        wl.hours,
        wl.description,
        wl.supervisor_approved,
        wl.created_at,
        wl.updated_at,
        pp.phase_name,
        p.name as project_name,
        p.id as project_id,
        pp.id as phase_id
      FROM work_logs wl
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      WHERE wl.engineer_id = $1
      ORDER BY wl.date DESC, wl.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_logs wl
      WHERE wl.engineer_id = $1
    `;

    const [workLogsResult, countResult] = await Promise.all([
      query(workLogsQuery, [userId, limit, offset]),
      query(countQuery, [userId])
    ]);

    return {
      workLogs: workLogsResult.rows,
      total: parseInt(countResult.rows[0].total),
      hasMore: offset + limit < parseInt(countResult.rows[0].total)
    };
  }

  // Optimized query for project timeline data
  public async getOptimizedProjectTimeline(projectId: number): Promise<any> {
    const timelineQuery = `
      WITH phase_timeline AS (
        SELECT
          pp.id,
          pp.phase_name,
          pp.phase_order,
          pp.status,
          pp.planned_start_date,
          pp.planned_end_date,
          pp.actual_start_date,
          pp.actual_end_date,
          pp.predicted_hours,
          pp.actual_hours,
          pp.warning_flag,
          pp.delay_reason,
          -- Calculate days ahead/behind schedule
          CASE
            WHEN pp.status = 'completed' AND pp.actual_end_date IS NOT NULL THEN
              EXTRACT(days FROM pp.actual_end_date - pp.planned_end_date)
            WHEN pp.status IN ('in_progress', 'submitted', 'approved') THEN
              EXTRACT(days FROM CURRENT_DATE - pp.planned_end_date)
            ELSE NULL
          END as days_variance,
          -- Get latest work log date for in-progress phases
          latest_work.last_work_date
        FROM project_phases pp
        LEFT JOIN (
          SELECT
            phase_id,
            MAX(date) as last_work_date
          FROM work_logs
          GROUP BY phase_id
        ) latest_work ON pp.id = latest_work.phase_id
        WHERE pp.project_id = $1
        ORDER BY pp.phase_order
      )
      SELECT
        json_agg(
          json_build_object(
            'id', pt.id,
            'phaseName', pt.phase_name,
            'phaseOrder', pt.phase_order,
            'status', pt.status,
            'plannedStartDate', pt.planned_start_date,
            'plannedEndDate', pt.planned_end_date,
            'actualStartDate', pt.actual_start_date,
            'actualEndDate', pt.actual_end_date,
            'predictedHours', pt.predicted_hours,
            'actualHours', pt.actual_hours,
            'warningFlag', pt.warning_flag,
            'delayReason', pt.delay_reason,
            'daysVariance', pt.days_variance,
            'lastWorkDate', pt.last_work_date,
            'isOverdue', pt.days_variance > 0 AND pt.status != 'completed',
            'progressPercentage',
              CASE
                WHEN pt.predicted_hours > 0 THEN
                  ROUND((pt.actual_hours::numeric / pt.predicted_hours * 100), 1)
                ELSE 0
              END
          ) ORDER BY pt.phase_order
        ) as timeline
      FROM phase_timeline pt
    `;

    const result = await query(timelineQuery, [projectId]);
    return result.rows[0]?.timeline || [];
  }

  // Performance monitoring query
  public async getQueryPerformanceStats(): Promise<any> {
    const performanceQuery = `
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_tup_hot_upd,
        n_live_tup,
        n_dead_tup,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY seq_tup_read DESC;
    `;

    const result = await query(performanceQuery);
    return result.rows;
  }

  // Index usage statistics
  public async getIndexUsageStats(): Promise<any> {
    const indexQuery = `
      SELECT
        t.tablename,
        indexname,
        c.reltuples AS num_rows,
        pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
        pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
        CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS UNIQUE,
        idx_scan AS number_of_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched
      FROM pg_tables t
      LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
      LEFT OUTER JOIN (
        SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns,
               idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique FROM pg_index x
               JOIN pg_class c ON c.oid = x.indrelid
               JOIN pg_class ipg ON ipg.oid = x.indexrelid
               JOIN pg_stat_all_indexes psai ON x.indexrelid = psai.indexrelid
      ) AS foo ON t.tablename = foo.ctablename
      WHERE t.schemaname='public'
      ORDER BY 1,2;
    `;

    const result = await query(indexQuery);
    return result.rows;
  }
}

// Export singleton instance
const queryOptimizationService = new QueryOptimizationService();
export default queryOptimizationService;