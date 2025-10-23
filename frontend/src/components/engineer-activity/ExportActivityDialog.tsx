import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';

interface ActiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  total_hours: number;
  work_logs: Array<{
    project_name: string;
    phase_name: string;
    hours: number;
    description: string;
  }>;
}

interface InactiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  last_login: string | null;
  status: string;
}

interface ExportActivityDialogProps {
  open: boolean;
  onClose: () => void;
  data: {
    summary: {
      total_active_engineers: number;
      total_inactive_engineers: number;
      total_hours_logged: number;
      average_hours_per_engineer: number;
      date: string;
    };
    active_engineers: ActiveEngineer[];
    inactive_engineers: InactiveEngineer[];
  };
}

const ExportActivityDialog: React.FC<ExportActivityDialogProps> = ({
  open,
  onClose,
  data
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const generatePDF = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const htmlContent = generateHTMLContent(data);
      await downloadPDF(htmlContent);
      onClose();
    } catch (error) {
      console.error('PDF export error:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'no_work_logged':
        return 'Logged In - No Work';
      case 'not_logged_in':
        return 'Not Logged In';
      case 'completely_inactive':
        return 'Never Logged In';
      default:
        return status;
    }
  };

  const generateHTMLContent = (content: typeof data): string => {
    const targetDate = content.summary.date;
    const activeEngineers = content.active_engineers;
    const inactiveEngineers = content.inactive_engineers;
    const totalHours = content.summary.total_hours_logged;

    return `
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
    @media print {
      body { padding: 20px; }
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
  ${activeEngineers.map((engineer) => {
    const engineerTotal = engineer.total_hours;
    return `
    <div class="engineer-card">
      <div class="engineer-header">
        <div>
          <div class="engineer-name">${engineer.name}</div>
          <div style="color: #666; font-size: 14px;">${engineer.email}${engineer.job_description ? ` • ${engineer.job_description}` : ''}</div>
        </div>
        <div class="engineer-hours">${engineerTotal.toFixed(2)} hrs</div>
      </div>
      ${engineer.work_logs.map((log) => `
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
        <th>Job Description</th>
        <th>Last Login</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${inactiveEngineers.map((engineer) => {
        const statusLabel = getStatusLabel(engineer.status);
        const statusClass = engineer.status === 'no_work_logged' ? 'status-no-work' : 'status-not-logged-in';
        return `
        <tr>
          <td>${engineer.name}</td>
          <td>${engineer.email}</td>
          <td>${engineer.job_description || 'N/A'}</td>
          <td>${engineer.last_login ? new Date(engineer.last_login).toLocaleString() : 'Never'}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Track Management System - Engineer Activity Report</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;
  };

  const downloadPDF = async (htmlContent: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your browser popup settings.');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.addEventListener('load', resolve);
      // Fallback timeout in case load event doesn't fire
      setTimeout(resolve, 500);
    });

    // Trigger print dialog
    printWindow.print();

    // Close window after a delay
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <PdfIcon color="primary" />
          <Typography variant="h6">Export Engineer Activity to PDF</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {exportError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {exportError}
          </Alert>
        )}

        <Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your PDF will include:
          </Typography>
          <ul>
            <li>{data.active_engineers.length} active engineers with work logs</li>
            <li>{data.inactive_engineers.length} inactive engineers</li>
            <li>Summary with {data.summary.total_hours_logged.toFixed(1)} total hours logged</li>
            <li>Detailed breakdown of all activities for {data.summary.date}</li>
          </ul>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          onClick={generatePDF}
          variant="contained"
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          disabled={exporting}
        >
          {exporting ? 'Generating...' : 'Export PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportActivityDialog;
