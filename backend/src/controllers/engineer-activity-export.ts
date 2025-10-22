import { Request, Response } from 'express';
import { query } from '@/database/connection';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export daily engineer activity to PDF
 */
export const exportToPDF = async (req: Request, res: Response): Promise<void> => {
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

    // Fetch activity data (similar to getDailyActivity)
    const allEngineersResult = await query(
      `SELECT id, name, email, job_description, last_login
       FROM users
       WHERE role = 'engineer' AND is_active = true
       ORDER BY name ASC`
    );

    const workLogsResult = await query(
      `SELECT
        wl.engineer_id,
        wl.hours,
        wl.description,
        wl.date,
        p.name as project_name,
        pp.phase_name,
        u.name as engineer_name
       FROM work_logs wl
       JOIN project_phases pp ON wl.phase_id = pp.id
       JOIN projects p ON wl.project_id = p.id
       JOIN users u ON wl.engineer_id = u.id
       WHERE wl.date = $1
       AND wl.deleted_at IS NULL
       ORDER BY u.name, wl.created_at DESC`,
      [targetDate]
    );

    const loginSessionsResult = await query(
      `SELECT DISTINCT ON (user_id)
        user_id,
        login_time
       FROM user_sessions
       WHERE login_time::date = $1::date
       ORDER BY user_id, login_time DESC`,
      [targetDate]
    );

    const allEngineers = allEngineersResult.rows;
    const workLogs = workLogsResult.rows;
    const loginSessions = loginSessionsResult.rows;
    const loggedInEngineerIds = new Set(loginSessions.map((s: any) => s.user_id));

    // Group work logs by engineer
    const workLogsByEngineer = new Map<number, any[]>();
    let totalHours = 0;

    workLogs.forEach((log: any) => {
      if (!workLogsByEngineer.has(log.engineer_id)) {
        workLogsByEngineer.set(log.engineer_id, []);
      }
      workLogsByEngineer.get(log.engineer_id)!.push(log);
      totalHours += parseFloat(log.hours);
    });

    const activeEngineers = allEngineers.filter((e: any) => workLogsByEngineer.has(e.id));
    const inactiveEngineers = allEngineers.filter((e: any) => !workLogsByEngineer.has(e.id));

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Engineer Activity Report - ${targetDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 30px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1e3a8a;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .date {
      color: #666;
      font-size: 16px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card h3 {
      font-size: 14px;
      margin-bottom: 10px;
      opacity: 0.9;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
    }
    .section-title {
      background: #1e3a8a;
      color: white;
      padding: 12px 20px;
      margin: 30px 0 15px 0;
      border-radius: 6px;
      font-size: 18px;
      font-weight: 600;
    }
    .engineer-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .engineer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    .engineer-name {
      font-size: 16px;
      font-weight: 600;
      color: #1e3a8a;
    }
    .engineer-hours {
      font-size: 18px;
      font-weight: bold;
      color: #059669;
    }
    .work-log {
      background: white;
      border-left: 4px solid #3b82f6;
      padding: 10px 15px;
      margin: 8px 0;
      border-radius: 4px;
    }
    .work-log-header {
      font-weight: 600;
      color: #1e3a8a;
      margin-bottom: 4px;
    }
    .work-log-details {
      font-size: 14px;
      color: #666;
    }
    .inactive-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .inactive-table th {
      background: #1e3a8a;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .inactive-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .inactive-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-no-work {
      background: #fef3c7;
      color: #92400e;
    }
    .status-not-logged-in {
      background: #fecaca;
      color: #991b1b;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Daily Engineer Activity Report</h1>
    <div class="date">Report Date: ${targetDate}</div>
    <div class="date">Generated on: ${new Date().toLocaleString()}</div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Active Engineers</h3>
      <div class="value">${activeEngineers.length}</div>
    </div>
    <div class="summary-card">
      <h3>Inactive Engineers</h3>
      <div class="value">${inactiveEngineers.length}</div>
    </div>
    <div class="summary-card">
      <h3>Total Hours</h3>
      <div class="value">${totalHours.toFixed(1)}</div>
    </div>
    <div class="summary-card">
      <h3>Avg Hours/Engineer</h3>
      <div class="value">${activeEngineers.length > 0 ? (totalHours / activeEngineers.length).toFixed(1) : '0'}</div>
    </div>
  </div>

  <div class="section-title">Active Engineers (${activeEngineers.length})</div>
  ${activeEngineers.map((engineer: any) => {
    const logs = workLogsByEngineer.get(engineer.id) || [];
    const engineerTotal = logs.reduce((sum: number, log: any) => sum + parseFloat(log.hours), 0);
    return `
    <div class="engineer-card">
      <div class="engineer-header">
        <div>
          <div class="engineer-name">${engineer.name}</div>
          <div style="color: #666; font-size: 14px;">${engineer.email}${engineer.job_description ? ` • ${engineer.job_description}` : ''}</div>
        </div>
        <div class="engineer-hours">${engineerTotal.toFixed(2)} hrs</div>
      </div>
      ${logs.map((log: any) => `
        <div class="work-log">
          <div class="work-log-header">${log.project_name} - ${log.phase_name} (${log.hours} hrs)</div>
          <div class="work-log-details">${log.description || 'No description'}</div>
        </div>
      `).join('')}
    </div>
    `;
  }).join('')}

  <div class="section-title">Inactive Engineers (${inactiveEngineers.length})</div>
  <table class="inactive-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Last Login</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${inactiveEngineers.map((engineer: any) => {
        const loggedIn = loggedInEngineerIds.has(engineer.id);
        const status = loggedIn ? 'Logged In - No Work' : 'Not Logged In';
        const statusClass = loggedIn ? 'status-no-work' : 'status-not-logged-in';
        return `
        <tr>
          <td>${engineer.name}</td>
          <td>${engineer.email}</td>
          <td>${engineer.last_login ? new Date(engineer.last_login).toLocaleString() : 'Never'}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Track Management System - Engineer Activity Report</p>
    <p>Generated by ${authReq.user.name} on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Send PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="engineer-activity-${targetDate}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while exporting to PDF'
    });
  }
};

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
