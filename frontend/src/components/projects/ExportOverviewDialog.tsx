import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { ComprehensiveOverviewData } from '../../types';

interface ExportOverviewDialogProps {
  open: boolean;
  onClose: () => void;
  data: {
    projects: ComprehensiveOverviewData[];
    summary: {
      total_projects: number;
      active_projects: number;
      total_engineers: number;
      total_hours_logged: number;
      projects_with_warnings: number;
      overall_health_score: number;
    };
  };
}

const ExportOverviewDialog: React.FC<ExportOverviewDialogProps> = ({
  open,
  onClose,
  data
}) => {
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(
    new Set(data.projects.map(p => p.project_id))
  );
  const [includeOptions, setIncludeOptions] = useState({
    summary: true,
    phases: true,
    engineers: true,
    warnings: true,
    deadlines: true,
    charts: true
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleProjectToggle = (projectId: number) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === data.projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(data.projects.map(p => p.project_id)));
    }
  };

  const handleIncludeOptionToggle = (option: keyof typeof includeOptions) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const generatePDF = async () => {
    setExporting(true);
    setExportError(null);

    try {
      // Filter selected projects
      const selectedProjectsData = data.projects.filter(p =>
        selectedProjects.has(p.project_id)
      );

      // Generate PDF content
      const pdfContent = {
        title: 'CEO Project Overview Dashboard',
        generatedAt: new Date().toISOString(),
        summary: includeOptions.summary ? data.summary : null,
        projects: selectedProjectsData.map(project => ({
          ...project,
          phases: includeOptions.phases ? project.current_phases : [],
          engineers: includeOptions.engineers ? project.engineer_breakdown : [],
          warnings: includeOptions.warnings ? project.warnings_count : 0,
          deadlines: includeOptions.deadlines ? project.approaching_deadlines : []
        })),
        options: includeOptions
      };

      // Create HTML content for PDF
      const htmlContent = generateHTMLContent(pdfContent);

      // Generate and download PDF
      await downloadPDF(htmlContent, 'CEO-Project-Overview.pdf');

      onClose();
    } catch (error) {
      console.error('PDF export error:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const generateHTMLContent = (content: any): string => {
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
    const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CEO Project Overview Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
          .logo { font-size: 24px; color: #1976d2; margin-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; }
          .summary-number { font-size: 28px; font-weight: bold; color: #1976d2; }
          .summary-label { color: #666; margin-top: 8px; }
          .project { margin-bottom: 30px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }
          .project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
          .project-name { font-size: 18px; font-weight: bold; }
          .status-badge { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; }
          .status-active { background: #e8f5e8; color: #2e7d32; }
          .status-warning { background: #fff3e0; color: #f57c00; }
          .progress-bar { width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: #4caf50; }
          .phases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
          .phase { background: #f9f9f9; padding: 10px; border-radius: 4px; border-left: 4px solid #1976d2; }
          .engineers { margin-top: 15px; }
          .engineer { display: inline-block; margin-right: 15px; padding: 5px 10px; background: #e3f2fd; border-radius: 16px; font-size: 12px; }
          .warnings { margin-top: 15px; padding: 10px; background: #ffebee; border-radius: 4px; }
          .warning-item { margin: 5px 0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <img src="/logo.png" alt="Criteria Design Group" style="width: 80px; height: 80px; border-radius: 8px; background: rgba(255,255,255,0.9); padding: 5px; object-fit: contain;" />
              <div>
                <div style="font-size: 28px; font-weight: bold; color: #1976d2; margin-bottom: 5px;">CRITERIA DESIGN GROUP</div>
                <div style="font-size: 20px; color: #555;">CEO Project Overview Dashboard</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">Arch. Hesham Helal</div>
              <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Eng. Developer: Marwan Helal</div>
              <div style="font-size: 14px; color: #888;">Generated: ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
          </div>
          <p style="text-align: center; color: #666; margin-top: 15px;">Report includes: ${content.projects.length} projects</p>
        </div>

        ${content.summary ? `
        <h2>Executive Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${content.summary.total_projects}</div>
            <div class="summary-label">Total Projects</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${content.summary.active_projects}</div>
            <div class="summary-label">Active Projects</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${content.summary.total_engineers}</div>
            <div class="summary-label">Engineers</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${formatHours(content.summary.total_hours_logged)}</div>
            <div class="summary-label">Hours Logged</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${content.summary.overall_health_score}%</div>
            <div class="summary-label">Health Score</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${content.summary.projects_with_warnings}</div>
            <div class="summary-label">Projects with Warnings</div>
          </div>
        </div>
        ` : ''}

        <h2>Project Details</h2>
        ${content.projects.map((project: any) => `
          <div class="project">
            <div class="project-header">
              <div>
                <div class="project-name">${project.project_name}</div>
                <div>Created by: ${project.created_by_name} | Started: ${formatDate(project.start_date)}</div>
              </div>
              <span class="status-badge status-${project.project_status}">
                ${project.project_status.toUpperCase()}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div>
                ${project.actual_progress !== undefined && project.actual_progress !== null ? `
                  <strong>Actual Working Progress: ${Math.round(project.actual_progress)}%</strong>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.actual_progress}%; background: #2e7d32;"></div>
                  </div>
                  <small style="color: #666;">(${project.progress_percentage}% hours-based)</small>
                ` : `
                  <strong>Progress: ${project.progress_percentage}%</strong>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress_percentage}%"></div>
                  </div>
                `}
              </div>
              <div>
                <strong>Hours:</strong> ${formatHours(project.actual_hours)} / ${formatHours(project.predicted_hours)}
              </div>
              <div>
                <strong>Health Score:</strong> ${project.health_score}%
              </div>
            </div>

            ${content.options.phases && project.phases.length > 0 ? `
            <h4>Active Phases (${project.phases.filter((p: any) => p.status !== 'completed').length})</h4>
            <div class="phases-grid">
              ${project.phases.filter((p: any) => p.status !== 'completed').map((phase: any) => `
                <div class="phase">
                  <strong>${phase.phase_name}</strong> (${phase.status})<br>
                  ${phase.actual_progress !== undefined && phase.actual_progress !== null ? `
                    <span style="color: #2e7d32; font-weight: bold;">Actual Working Progress: ${Math.round(phase.actual_progress)}%</span><br>
                    <span style="color: #666; font-size: 12px;">(${phase.progress_percentage}% hours-based)</span><br>
                  ` : `
                    Progress: ${phase.progress_percentage}%<br>
                  `}
                  Hours: ${formatHours(phase.actual_hours)} / ${formatHours(phase.predicted_hours)}
                  ${phase.warning_flag ? '<br><span style="color: #f57c00;">⚠️ Warning</span>' : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${content.options.engineers && project.engineers.length > 0 ? `
            <div class="engineers">
              <h4>Engineers (${project.engineers.length})</h4>
              ${project.engineers.map((eng: any) => `
                <span class="engineer">${eng.engineer_name} - ${formatHours(eng.total_hours)}</span>
              `).join('')}
            </div>
            ` : ''}

            ${content.options.warnings && project.warnings_count > 0 ? `
            <div class="warnings">
              <h4>⚠️ Warnings (${project.warnings_count})</h4>
              <p>This project has ${project.warnings_count} active warnings that require attention.</p>
            </div>
            ` : ''}

            ${content.options.deadlines && project.deadlines.length > 0 ? `
            <div style="margin-top: 15px;">
              <h4>📅 Approaching Deadlines</h4>
              ${project.deadlines.map((deadline: any) => `
                <div class="warning-item">
                  <strong>${deadline.phase_name}</strong> - Due: ${formatDate(deadline.planned_end_date)}
                  ${deadline.is_overdue ? ' <span style="color: #d32f2f;">(OVERDUE)</span>' :
                    ` (${deadline.days_until_deadline} days remaining)`}
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0; font-weight: bold;">CRITERIA DESIGN GROUP</p>
              <p style="margin: 5px 0 0 0; font-size: 10px;">Arch. Hesham Helal | Eng. Developer: Marwan Helal</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 10px;">Generated: ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0 0 0; font-size: 10px; color: #d32f2f;">Confidential Business Information</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const downloadPDF = async (htmlContent: string, filename: string) => {
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.addEventListener('load', resolve);
    });

    // Trigger print dialog (which can save as PDF)
    printWindow.print();

    // Close the window after a delay
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };

  const selectedProjectsData = data.projects.filter(p => selectedProjects.has(p.project_id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <PdfIcon color="primary" />
          <Typography variant="h6">Export CEO Overview to PDF</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {exportError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {exportError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Project Selection */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Projects ({selectedProjects.size})
                </Typography>
                <Box mb={2}>
                  <Button size="small" onClick={handleSelectAll}>
                    {selectedProjects.size === data.projects.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {data.projects.map((project) => (
                      <FormControlLabel
                        key={project.project_id}
                        control={
                          <Checkbox
                            checked={selectedProjects.has(project.project_id)}
                            onChange={() => handleProjectToggle(project.project_id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{project.project_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {project.project_status} • {project.progress_percentage}% complete
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Export Options */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Include in Export
                </Typography>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.summary}
                          onChange={() => handleIncludeOptionToggle('summary')}
                        />
                      }
                      label="Executive Summary"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.phases}
                          onChange={() => handleIncludeOptionToggle('phases')}
                        />
                      }
                      label="Phase Details"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.engineers}
                          onChange={() => handleIncludeOptionToggle('engineers')}
                        />
                      }
                      label="Engineer Assignments"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.warnings}
                          onChange={() => handleIncludeOptionToggle('warnings')}
                        />
                      }
                      label="Warning Indicators"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.deadlines}
                          onChange={() => handleIncludeOptionToggle('deadlines')}
                        />
                      }
                      label="Approaching Deadlines"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeOptions.charts}
                          onChange={() => handleIncludeOptionToggle('charts')}
                        />
                      }
                      label="Progress Charts"
                    />
                  </FormGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Preview */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Export Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your PDF will include:
          </Typography>
          <ul>
            <li>{selectedProjectsData.length} projects</li>
            {includeOptions.summary && <li>Executive summary with key metrics</li>}
            {includeOptions.phases && <li>Detailed phase information</li>}
            {includeOptions.engineers && <li>Engineer assignments and hours</li>}
            {includeOptions.warnings && <li>Warning indicators</li>}
            {includeOptions.deadlines && <li>Approaching deadlines</li>}
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
          disabled={selectedProjects.size === 0 || exporting}
        >
          {exporting ? 'Generating...' : 'Export PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportOverviewDialog;