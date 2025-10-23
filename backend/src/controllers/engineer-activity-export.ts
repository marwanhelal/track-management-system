import { Request, Response } from 'express';
import { query } from '@/database/connection';

/**
 * Export daily engineer activity to Excel (CSV format)
 */
export const exportToExcel = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors and administrators can export reports
    if (authReq.user.role !== 'supervisor' && authReq.user.role !== 'administrator') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors and administrators can export reports'
      });
      return;
    }

    const targetDate = req.query.date as string || new Date().toISOString().split('T')[0];

    // Fetch all work logs for the date
    const workLogsResult = await query(
      `SELECT
        u.name as engineer_name,
        u.email as engineer_email,
        u.job_description,
        p.name as project_name,
        pp.phase_name,
        wl.hours,
        wl.description,
        wl.date,
        wl.created_at
       FROM work_logs wl
       JOIN project_phases pp ON wl.phase_id = pp.id
       JOIN projects p ON wl.project_id = p.id
       JOIN users u ON wl.engineer_id = u.id
       WHERE wl.date = $1
       AND wl.deleted_at IS NULL
       AND u.role = 'engineer'
       ORDER BY u.name, wl.created_at ASC`,
      [targetDate]
    );

    // Build CSV content
    const csvRows = [];

    // Header
    csvRows.push([
      'Engineer Name',
      'Email',
      'Job Description',
      'Project',
      'Phase',
      'Hours',
      'Description',
      'Date',
      'Logged At'
    ].join(','));

    // Data rows
    workLogsResult.rows.forEach((log: any) => {
      csvRows.push([
        `"${log.engineer_name}"`,
        `"${log.engineer_email}"`,
        `"${log.job_description || 'N/A'}"`,
        `"${log.project_name}"`,
        `"${log.phase_name}"`,
        log.hours,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        log.date,
        new Date(log.created_at).toLocaleString()
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    // Send CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="engineer-activity-${targetDate}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while exporting to Excel'
    });
  }
};
