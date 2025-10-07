import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
  Box,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Code as JsonIcon,
  DateRange as DateIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { ProjectPhase, Project } from '../../types';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport?: (options: ExportOptions) => Promise<void>;
  phases?: ProjectPhase[];
  projectName?: string;
  project?: Project | null;
  loading?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  phases?: number[];
  includeWorkLogs: boolean;
  includeTeamAnalytics: boolean;
  includePhaseDetails: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onExport,
  phases,
  projectName,
  loading = false
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeWorkLogs: true,
    includeTeamAnalytics: true,
    includePhaseDetails: true
  });

  const [selectedPhases, setSelectedPhases] = useState<number[]>([]);

  const handleFormatChange = (format: 'json' | 'csv' | 'pdf') => {
    setExportOptions(prev => ({ ...prev, format }));
  };

  const handlePhaseToggle = (phaseId: number) => {
    const newSelected = selectedPhases.includes(phaseId)
      ? selectedPhases.filter(id => id !== phaseId)
      : [...selectedPhases, phaseId];

    setSelectedPhases(newSelected);
    setExportOptions(prev => ({
      ...prev,
      phases: newSelected.length > 0 ? newSelected : undefined
    }));
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setExportOptions(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleIncludeChange = (field: keyof ExportOptions, value: boolean) => {
    setExportOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = async () => {
    if (onExport) {
      await onExport(exportOptions);
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json':
        return 'Complete structured data for further processing';
      case 'csv':
        return 'Spreadsheet-friendly format with multiple data sections';
      case 'pdf':
        return 'Professional report with charts and formatted tables';
      default:
        return '';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <JsonIcon />;
      case 'csv':
        return <CsvIcon />;
      case 'pdf':
        return <PdfIcon />;
      default:
        return <ExportIcon />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExportIcon />
          Export Project Data
        </Box>
        <Typography variant="body2" color="text.secondary">
          Export comprehensive data for: {projectName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Export Format Selection */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExportIcon fontSize="small" />
              Export Format
            </Typography>
            <Grid container spacing={2}>
              {(['json', 'csv', 'pdf'] as const).map((format) => (
                <Grid item xs={12} md={4} key={format}>
                  <Box
                    sx={{
                      border: 2,
                      borderColor: exportOptions.format === format ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => handleFormatChange(format)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getFormatIcon(format)}
                      <Typography variant="h6" component="span">
                        {format.toUpperCase()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {getFormatDescription(format)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          {/* Data Filters */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon fontSize="small" />
              Data Filters
            </Typography>

            {/* Date Range */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateIcon fontSize="small" />
                Date Range (Optional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="From Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={exportOptions.dateFrom || ''}
                    onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="To Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={exportOptions.dateTo || ''}
                    onChange={(e) => handleDateChange('dateTo', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Phase Selection */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Specific Phases (Optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Leave unselected to export all phases
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {phases?.map((phase) => (
                  <Chip
                    key={phase.id}
                    label={phase.phase_name}
                    variant={selectedPhases.includes(phase.id) ? 'filled' : 'outlined'}
                    color={selectedPhases.includes(phase.id) ? 'primary' : 'default'}
                    onClick={() => handlePhaseToggle(phase.id)}
                    clickable
                  />
                ))}
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Data Inclusion Options */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Include Data Categories
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.includePhaseDetails}
                    onChange={(e) => handleIncludeChange('includePhaseDetails', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Phase Details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phase information, status, timelines, and metrics
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.includeWorkLogs}
                    onChange={(e) => handleIncludeChange('includeWorkLogs', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Work Logs & Time Tracking</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Individual work entries, hours logged, and task descriptions
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.includeTeamAnalytics}
                    onChange={(e) => handleIncludeChange('includeTeamAnalytics', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Team Analytics</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Engineer performance metrics and productivity analysis
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>
          </Box>

          {/* Preview/Summary */}
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>Export Summary:</Typography>
            <Typography variant="body2">
              Format: <strong>{exportOptions.format.toUpperCase()}</strong>
              {exportOptions.dateFrom && exportOptions.dateTo && (
                <span> • Date Range: {exportOptions.dateFrom} to {exportOptions.dateTo}</span>
              )}
              {selectedPhases.length > 0 && (
                <span> • Phases: {selectedPhases.length} selected</span>
              )}
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : getFormatIcon(exportOptions.format)}
          disabled={loading}
        >
          {loading ? 'Exporting...' : `Export ${exportOptions.format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;