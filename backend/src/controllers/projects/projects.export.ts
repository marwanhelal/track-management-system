import { Request, Response } from 'express';
import { query } from '@/database/connection';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to generate CSV export
const generateCSVExport = async (exportData: any): Promise<string> => {
  const { project, phases, workLogs, teamAnalytics, summary } = exportData;

  let csvContent = '';

  // Project Summary Section
  csvContent += 'PROJECT SUMMARY\n';
  csvContent += 'Field,Value\n';
  csvContent += `Project Name,"${project.name}"\n`;
  csvContent += `Status,"${project.status}"\n`;
  csvContent += `Start Date,"${project.start_date}"\n`;
  csvContent += `End Date,"${project.end_date || 'Not set'}"\n`;
  csvContent += `Total Hours,"${summary.totalHours}"\n`;
  csvContent += `Predicted Hours,"${project.predicted_hours}"\n`;
  csvContent += `Budget Utilization,"${summary.budgetUtilization}%"\n`;
  csvContent += `Progress,"${summary.progressPercentage}%"\n`;
  csvContent += `Team Size,"${summary.teamSize}"\n`;
  csvContent += `Created By,"${project.created_by_name}"\n`;
  csvContent += `Exported At,"${summary.exportedAt}"\n`;

  // Phases Section
  csvContent += '\n\nPHASES\n';
  csvContent += 'Phase Name,Status,Order,Hours,Engineers,Work Logs,Start Date,End Date,Warning Flag\n';
  phases.forEach((phase: any) => {
    csvContent += `"${phase.phase_name}","${phase.status}",${phase.phase_order},${phase.total_hours},${phase.engineers_count},${phase.work_logs_count},"${phase.start_date || ''}","${phase.end_date || ''}","${phase.warning_flag || 'No'}"\n`;
  });

  // Work Logs Section
  csvContent += '\n\nWORK LOGS\n';
  csvContent += 'Date,Engineer,Phase,Hours,Task Description,Notes\n';
  workLogs.forEach((log: any) => {
    csvContent += `"${log.date}","${log.engineer_name}","${log.phase_name}",${log.hours},"${log.task_description || ''}","${log.notes || ''}"\n`;
  });

  // Team Analytics Section
  csvContent += '\n\nTEAM ANALYTICS\n';
  csvContent += 'Engineer Name,Email,Total Hours,Work Logs,Phases Worked,Avg Hours/Log,First Log,Last Log\n';
  teamAnalytics.forEach((member: any) => {
    csvContent += `"${member.name}","${member.email}",${member.total_hours},${member.work_logs_count},${member.phases_worked},${parseFloat(member.avg_hours_per_log).toFixed(2)},"${member.first_log_date || ''}","${member.last_log_date || ''}"\n`;
  });

  return csvContent;
};

// Helper function to generate PDF export
const generatePDFExport = async (exportData: any): Promise<Buffer> => {
  try {
    const { project, phases, workLogs, teamAnalytics, summary } = exportData;

    // Validate required data
    if (!project) {
      throw new Error('Project data is required for PDF generation');
    }

    // Ensure arrays are properly initialized
    const safePhases = Array.isArray(phases) ? phases : [];
    const safeWorkLogs = Array.isArray(workLogs) ? workLogs : [];
    const safeTeamAnalytics = Array.isArray(teamAnalytics) ? teamAnalytics : [];
    const safeSummary = summary || {};

  // Enhanced data formatting and validation
  const formatDate = (date: string | null) => {
    return date ? new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : 'N/A';
  };

  const formatNumber = (num: number | string) => {
    if (num === null || num === undefined || isNaN(Number(num))) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (numValue === 0) return '0';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: numValue % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 2
    });
  };

  const formatHours = (hours: number | string) => {
    const numHours = parseFloat(String(hours)) || 0;
    return `${formatNumber(numHours)}h`;
  };

  const formatPercentage = (percent: number | string) => {
    const numPercent = parseFloat(String(percent)) || 0;
    return `${Math.round(numPercent)}%`;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = parseFloat(String(amount)) || 0;
    return `$${formatNumber(numAmount)}`;
  };

  // Helper function to format project names professionally
  const formatProjectName = (name: string) => {
    if (!name) return 'Project Name Not Available';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#4caf50';
      case 'in_progress': return '#ff9800';
      case 'pending': return '#757575';
      case 'active': return '#2196F3';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '✓';
      case 'in_progress': return '⟳';
      case 'pending': return '○';
      case 'active': return '▶';
      default: return '○';
    }
  };

  // Calculate phase duration safely
  const calculateDuration = (phase: any) => {
    if (!phase.first_log_date || !phase.last_log_date) {
      if (phase.status === 'completed') return 'Completed';
      if (phase.status === 'in_progress') return 'In Progress';
      return 'Not Started';
    }
    const start = new Date(phase.first_log_date);
    const end = new Date(phase.last_log_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks`;
    return `${Math.round(diffDays / 30)} months`;
  };

  // Company logo as base64 PNG
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  const logoSvg = `data:image/png;base64,${logoBase64}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Report - ${project.name || 'Untitled Project'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          font-size: 11px;
        }

        .page {
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #e3f2fd;
          position: relative;
          background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
          border-radius: 8px 8px 0 0;
          padding: 25px;
          margin: -40px -40px 40px -40px;
        }

        .header::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 25px;
          width: 80px;
          height: 3px;
          background: linear-gradient(135deg, #1565C0, #0D47A1);
          border-radius: 2px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo {
          width: 160px;
          height: auto;
          max-height: 50px;
        }

        .company-info {
          color: #666;
          font-size: 9px;
          line-height: 1.4;
        }

        .report-info {
          text-align: right;
          color: #666;
          font-size: 10px;
        }

        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 5px;
        }

        .report-date {
          color: #666;
          font-size: 10px;
        }

        /* Project Title */
        .project-header {
          text-align: center;
          margin-bottom: 35px;
          padding: 30px;
          background: linear-gradient(135deg, #f8fbff 0%, #e3f2fd 100%);
          border-radius: 12px;
          border-left: 5px solid #1565C0;
          box-shadow: 0 2px 10px rgba(21, 101, 192, 0.1);
        }

        .project-title {
          font-size: 28px;
          font-weight: 700;
          color: #0D47A1;
          margin-bottom: 12px;
          text-transform: capitalize;
          letter-spacing: 0.5px;
        }

        .project-subtitle {
          color: #666;
          font-size: 12px;
          font-weight: 400;
        }

        /* Sections */
        .section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #2196F3;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e8f4fd;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-icon {
          width: 16px;
          height: 16px;
          background: #2196F3;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        }

        /* Summary Grid */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 18px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }

        .summary-card:hover {
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.1);
          border-color: #2196F3;
        }

        .summary-label {
          font-size: 9px;
          font-weight: 500;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .summary-trend {
          font-size: 8px;
          color: #4caf50;
          font-weight: 500;
        }

        /* Progress Bars */
        .progress-container {
          margin-top: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #f0f0f0;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #45a049);
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Tables */
        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e1e8ed;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        th {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          font-weight: 600;
          padding: 12px 10px;
          text-align: left;
          font-size: 9px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #f5f5f5;
          vertical-align: middle;
        }

        tr:nth-child(even) {
          background: #fafbfc;
        }

        tr:hover {
          background: #f8fbff;
        }

        /* Status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-completed {
          background: #e8f5e8;
          color: #2e7d32;
          border: 1px solid #c8e6c9;
        }

        .status-in_progress {
          background: #fff3e0;
          color: #ef6c00;
          border: 1px solid #ffcc02;
        }

        .status-pending {
          background: #f5f5f5;
          color: #616161;
          border: 1px solid #e0e0e0;
        }

        .status-active {
          background: #e3f2fd;
          color: #1976d2;
          border: 1px solid #90caf9;
        }

        /* Numbers and metrics */
        .metric {
          font-weight: 600;
          color: #1a1a1a;
        }

        .metric-hours {
          color: #2196F3;
        }

        .metric-percentage {
          color: #4caf50;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e1e8ed;
          text-align: center;
          color: #666;
          font-size: 9px;
        }

        .footer-logo {
          width: 80px;
          height: 26px;
          margin: 0 auto 10px;
        }

        /* Charts placeholder */
        .chart-placeholder {
          height: 120px;
          background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 10px;
          border: 1px solid #e1e8ed;
          margin: 15px 0;
        }

        /* Responsive adjustments */
        @media print {
          .page {
            box-shadow: none;
            margin: 0;
            padding: 20px;
          }

          .section {
            page-break-inside: avoid;
          }

          .progress-fill::after {
            display: none;
          }
        }

        /* Utility classes */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 600; }
        .text-sm { font-size: 9px; }
        .text-xs { font-size: 8px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-3 { margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <header class="header">
          <div class="logo-section">
            <img src="${logoSvg}" alt="Criteria Design Group" class="logo">
            <div class="company-info">
              <strong>CRITERIA DESIGN GROUP</strong><br>
              URBAN - ARCHITECTURE - INTERIOR<br>
              <div style="margin-top: 8px; font-size: 10px; color: #666;">
                Arch. HESHAM HELAL | System Engineer: Marwan Helal
              </div>
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">PROJECT ANALYSIS REPORT</div>
            <div class="report-date">Generated: ${formatDate(safeSummary.exportedAt)}</div>
            <div class="text-xs" style="margin-top: 5px;">
              Document ID: RPT-${project.id || 'XXX'}-${new Date().getFullYear()}
            </div>
          </div>
        </header>

        <!-- Project Header -->
        <div class="project-header">
          <h1 class="project-title">${formatProjectName(project.name)}</h1>
          <p class="project-subtitle">
            ${project.description || 'Comprehensive project analysis and performance metrics'}
          </p>
        </div>

        <!-- Executive Summary -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">📊</span>
            Executive Summary
          </h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Project Status</div>
              <div class="summary-value" style="color: ${getStatusColor(project.status)}">
                ${getStatusIcon(project.status)} ${(project.status || 'Unknown').toUpperCase()}
              </div>
              <div class="summary-trend">
                ${project.status === 'completed' ? '✓ Project Delivered' :
                  project.status === 'active' ? '▶ In Progress' : '○ Pending Start'}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Overall Progress</div>
              <div class="summary-value metric-percentage">${formatPercentage(safeSummary.progressPercentage || 0)}</div>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${safeSummary.progressPercentage || 0}%"></div>
                </div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Budget Utilization</div>
              <div class="summary-value" style="color: ${safeSummary.budgetUtilization > 100 ? '#f44336' : safeSummary.budgetUtilization > 80 ? '#ff9800' : '#4caf50'}">
                ${formatPercentage(safeSummary.budgetUtilization || 0)}
              </div>
              <div class="summary-trend">
                ${safeSummary.budgetUtilization > 100 ? '⚠ Over Budget' :
                  safeSummary.budgetUtilization > 80 ? '⚡ Near Limit' : '✓ On Track'}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Hours Logged</div>
              <div class="summary-value metric-hours">${formatHours(safeSummary.totalHours || 0)}</div>
              <div class="summary-trend">
                Predicted: ${formatHours(safeSummary.predictedHours || 0)}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Team Size</div>
              <div class="summary-value">${safeSummary.teamSize || 0}</div>
              <div class="summary-trend">Active Engineers</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Phase Completion</div>
              <div class="summary-value">${safeSummary.completedPhases || 0}/${safeSummary.totalPhases || 0}</div>
              <div class="summary-trend">
                ${safeSummary.totalPhases ? Math.round((safeSummary.completedPhases / safeSummary.totalPhases) * 100) : 0}% Complete
              </div>
            </div>
          </div>
        </section>

        <!-- Project Timeline -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">📅</span>
            Project Timeline & Phases
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Phase Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Hours</th>
                  <th>Engineers</th>
                  <th>Work Logs</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${safePhases && safePhases.length > 0 ? safePhases.map((phase: any) => `
                  <tr>
                    <td class="font-bold">${phase.phase_name || 'Unnamed Phase'}</td>
                    <td>
                      <span class="status-badge status-${(phase.status || 'pending').replace(' ', '_')}">
                        ${getStatusIcon(phase.status)} ${(phase.status || 'Pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div class="progress-bar" style="width: 60px; height: 4px;">
                        <div class="progress-fill" style="width: ${phase.progress || 0}%"></div>
                      </div>
                    </td>
                    <td class="metric metric-hours">${formatHours(phase.total_hours || 0)}</td>
                    <td class="metric">${formatNumber(phase.engineers_count || 0)}</td>
                    <td class="metric">${formatNumber(phase.work_logs_count || 0)}</td>
                    <td class="text-sm">${calculateDuration(phase)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #666;">
                      No phases data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Team Performance -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">👥</span>
            Team Performance Analysis
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Engineer</th>
                  <th>Total Hours</th>
                  <th>Work Sessions</th>
                  <th>Phases Worked</th>
                  <th>Avg Hours/Session</th>
                  <th>Active Period</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                ${safeTeamAnalytics && safeTeamAnalytics.length > 0 ? safeTeamAnalytics.map((member: any) => {
                  const contributionPercent = safeSummary.totalHours > 0 ?
                    Math.round((member.total_hours / safeSummary.totalHours) * 100) : 0;
                  return `
                    <tr>
                      <td class="font-bold">
                        <div>${member.name || 'Unknown Engineer'}</div>
                        <div class="text-xs" style="color: #666;">${member.email || ''}</div>
                      </td>
                      <td class="metric metric-hours">${formatHours(member.total_hours || 0)}</td>
                      <td class="metric">${formatNumber(member.work_logs_count || 0)}</td>
                      <td class="metric">${formatNumber(member.phases_worked || 0)}</td>
                      <td class="metric">${formatHours(member.avg_hours_per_log || 0)}</td>
                      <td class="text-sm">
                        ${member.first_log_date && member.last_log_date ?
                          `${formatDate(member.first_log_date)} - ${formatDate(member.last_log_date)}` :
                          'N/A'}
                      </td>
                      <td>
                        <div class="progress-bar" style="width: 50px; height: 4px;">
                          <div class="progress-fill" style="width: ${contributionPercent}%"></div>
                        </div>
                        <div class="text-xs">${formatPercentage(contributionPercent)}</div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #666;">
                      No team performance data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Recent Activity -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon">⚡</span>
            Recent Work Activity
          </h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Engineer</th>
                  <th>Phase</th>
                  <th>Hours</th>
                  <th>Task Description</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${safeWorkLogs && safeWorkLogs.length > 0 ? safeWorkLogs.slice(0, 15).map((log: any) => `
                  <tr>
                    <td class="text-sm">${formatDate(log.date)}</td>
                    <td class="font-bold">${log.engineer_name || 'Unknown'}</td>
                    <td class="text-sm">${log.phase_name || 'N/A'}</td>
                    <td class="metric metric-hours">${formatNumber(log.hours || 0)}h</td>
                    <td class="text-sm">${(log.task_description || 'No description').substring(0, 40)}${(log.task_description || '').length > 40 ? '...' : ''}</td>
                    <td class="text-xs" style="color: #666;">
                      ${(log.notes || 'No notes').substring(0, 30)}${(log.notes || '').length > 30 ? '...' : ''}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" class="text-center" style="padding: 20px; color: #666;">
                      No work log data available
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
          ${safeWorkLogs && safeWorkLogs.length > 15 ? `
            <div class="text-center text-sm" style="margin-top: 10px; color: #666;">
              <em>Showing latest 15 entries. Total work logs: ${safeWorkLogs.length}</em>
            </div>
          ` : ''}
        </section>

        <!-- Footer -->
        <footer class="footer">
          <img src="${logoSvg}" alt="Criteria Design Group" class="footer-logo">
          <div style="margin-top: 10px;">
            <strong>CRITERIA DESIGN GROUP</strong><br>
            URBAN - ARCHITECTURE - INTERIOR | This report contains confidential information.<br>
            Generated on ${formatDate(summary.exportedAt)} | Arch. HESHAM HELAL
          </div>
        </footer>
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();
    return Buffer.from(pdfBuffer);

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  } catch (error) {
    console.error('PDF export data processing error:', error);
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Data processing error'}`);
  }
};

export const exportProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { format = 'json', dateFrom, dateTo, phases: phaseFilter } = req.query;

    // Type cast query parameters
    const formatStr = format as string;
    const dateFromStr = dateFrom as string | undefined;
    const dateToStr = dateTo as string | undefined;
    const phaseFilterStr = phaseFilter as string | undefined;

    // Get complete project data with enhanced queries
    const projectResult = await query(`
      SELECT p.*, u.name as created_by_name,
             COUNT(DISTINCT pp.id) as total_phases,
             COUNT(DISTINCT CASE WHEN pp.status IN ('completed', 'approved') THEN pp.id END) as completed_phases,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(DISTINCT wl.engineer_id) as team_size
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `, [id]);

    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Enhanced phases query with additional metrics
    const phasesResult = await query(`
      SELECT pp.*,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(DISTINCT wl.engineer_id) as engineers_count,
             COUNT(wl.id) as work_logs_count,
             MIN(wl.date) as first_log_date,
             MAX(wl.date) as last_log_date
      FROM project_phases pp
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE pp.project_id = $1
      ${phaseFilterStr ? 'AND pp.id = ANY($2)' : ''}
      GROUP BY pp.id
      ORDER BY pp.phase_order ASC
    `, phaseFilterStr ? [id, (phaseFilterStr as string).split(',').map(Number)] : [id]);

    // Enhanced work logs query with filters
    let workLogsQuery = `
      SELECT wl.*, u.name as engineer_name, u.email as engineer_email,
             pp.phase_name, pp.phase_order
      FROM work_logs wl
      JOIN project_phases pp ON wl.phase_id = pp.id
      JOIN users u ON wl.engineer_id = u.id
      WHERE pp.project_id = $1
    `;
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (dateFromStr) {
      workLogsQuery += ` AND wl.date >= $${paramIndex}`;
      queryParams.push(dateFromStr);
      paramIndex++;
    }
    if (dateToStr) {
      workLogsQuery += ` AND wl.date <= $${paramIndex}`;
      queryParams.push(dateToStr);
      paramIndex++;
    }
    if (phaseFilterStr) {
      workLogsQuery += ` AND pp.id = ANY($${paramIndex})`;
      queryParams.push((phaseFilterStr as string).split(',').map(Number));
    }

    workLogsQuery += ' ORDER BY wl.created_at DESC';
    const workLogsResult = await query(workLogsQuery, queryParams);

    // Get team analytics
    const teamAnalyticsResult = await query(`
      SELECT u.name, u.email, u.role,
             COALESCE(SUM(wl.hours), 0) as total_hours,
             COUNT(wl.id) as work_logs_count,
             COUNT(DISTINCT pp.id) as phases_worked,
             COALESCE(AVG(wl.hours), 0) as avg_hours_per_log,
             MIN(wl.date) as first_log_date,
             MAX(wl.date) as last_log_date
      FROM users u
      LEFT JOIN work_logs wl ON u.id = wl.engineer_id
      LEFT JOIN project_phases pp ON wl.phase_id = pp.id
      WHERE pp.project_id = $1 AND u.role = 'engineer' AND u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_hours DESC
    `, [id]);

    const project = projectResult.rows[0];
    const phases = phasesResult.rows;
    const workLogs = workLogsResult.rows;
    const teamAnalytics = teamAnalyticsResult.rows;

    // Calculate additional metrics with proper validation
    const progressPercentage = project.total_phases > 0 ?
      Math.round((project.completed_phases / project.total_phases) * 100) : 0;

    // Fix budget utilization calculation - ensure we use consistent total hours
    const actualTotalHours = parseFloat(project.total_hours) || 0;
    const predictedHours = parseFloat(project.predicted_hours) || 0;
    const budgetUtilization = predictedHours > 0 ?
      Math.round((actualTotalHours / predictedHours) * 100) : 0;

    // Calculate phase progress more accurately
    const phasesWithProgress = phases.map((phase: any) => {
      // Calculate individual phase progress based on status and hours
      let progress = 0;
      if (phase.status === 'completed') {
        progress = 100;
      } else if (phase.status === 'in_progress') {
        // Estimate progress based on hours logged vs expected
        const expectedHours = parseFloat(phase.estimated_hours) || 0;
        const actualHours = parseFloat(phase.total_hours) || 0;
        if (expectedHours > 0) {
          progress = Math.min(95, Math.round((actualHours / expectedHours) * 100));
        } else {
          progress = 50; // Default for in-progress without hour estimates
        }
      } else if (phase.status === 'approved') {
        progress = 75; // Approved phases are significantly complete
      } else if (phase.status === 'ready') {
        progress = 25; // Ready phases have some preparation done
      } else if (phase.status === 'pending' || phase.status === 'not started') {
        progress = 0; // Not started phases
      }
      return { ...phase, progress };
    });

    // Recalculate overall progress based on individual phase progress
    const weightedProgress = phasesWithProgress.length > 0 ?
      Math.round(phasesWithProgress.reduce((sum: number, phase: any) => sum + phase.progress, 0) / phasesWithProgress.length) : 0;

    const exportData = {
      project: {
        ...project,
        progress_percentage: weightedProgress,
        budget_utilization: budgetUtilization
      },
      phases: phasesWithProgress,
      workLogs,
      teamAnalytics,
      summary: {
        totalHours: actualTotalHours,
        totalPhases: parseInt(project.total_phases) || 0,
        completedPhases: parseInt(project.completed_phases) || 0,
        teamSize: parseInt(project.team_size) || 0,
        progressPercentage: weightedProgress,
        budgetUtilization,
        predictedHours,
        actualHours: actualTotalHours,
        hoursVariance: actualTotalHours - predictedHours,
        hoursVariancePercent: predictedHours > 0 ? Math.round(((actualTotalHours - predictedHours) / predictedHours) * 100) : 0,
        exportedAt: new Date().toISOString(),
        exportFilters: {
          dateFrom: dateFromStr,
          dateTo: dateToStr,
          phases: phaseFilterStr
        }
      }
    };

    // Handle different export formats
    switch (formatStr) {
      case 'csv':
        const csvData = await generateCSVExport(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="project-${project.name}-export.csv"`);
        res.send(csvData);
        break;

      case 'pdf':
        const pdfBuffer = await generatePDFExport(exportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="project-${project.name}-report.pdf"`);
        res.send(pdfBuffer);
        break;

      default: // json
        res.status(200).json({
          success: true,
          data: exportData
        });
    }
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
