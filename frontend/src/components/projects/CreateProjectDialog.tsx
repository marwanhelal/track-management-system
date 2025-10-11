import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
  Chip,
  Paper,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Add, Remove } from '@mui/icons-material';
import dayjs from 'dayjs';
import { Project, PredefinedPhase, ProjectPhaseInput } from '../../types';
import apiService from '../../services/api';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

const CreateProjectDialog = ({
  open,
  onClose,
  onSuccess,
}: CreateProjectDialogProps) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(dayjs());
  const [predefinedPhases, setPredefinedPhases] = useState<PredefinedPhase[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<ProjectPhaseInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load predefined phases
  useEffect(() => {
    if (open) {
      loadPredefinedPhases();
    }
  }, [open]);

  const loadPredefinedPhases = async () => {
    try {
      const response = await apiService.getPredefinedPhases();
      if (response.success && response.data) {
        // Remove duplicates by name (keep first occurrence)
        const uniquePhases = response.data.phases.filter((phase, index, self) =>
          index === self.findIndex((p) => p.name === phase.name)
        );
        setPredefinedPhases(uniquePhases);
        // Pre-select all phases with default values
        const defaultPhases = uniquePhases.map(phase => ({
          phase_name: phase.name,
          is_custom: false,
          planned_weeks: phase.typical_duration_weeks,
          predicted_hours: phase.typical_duration_weeks * 40, // Default: 40 hours per week
        }));
        setSelectedPhases(defaultPhases);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load phases');
    }
  };

  const handlePhaseToggle = (phase: PredefinedPhase) => {
    setSelectedPhases(prev => {
      const exists = prev.find(p => p.phase_name === phase.name);
      if (exists) {
        return prev.filter(p => p.phase_name !== phase.name);
      } else {
        return [...prev, {
          phase_name: phase.name,
          is_custom: false,
          planned_weeks: phase.typical_duration_weeks,
          predicted_hours: phase.typical_duration_weeks * 40,
        }];
      }
    });
  };

  const handlePhaseUpdate = (index: number, field: keyof ProjectPhaseInput, value: any) => {
    setSelectedPhases(prev =>
      prev.map((phase, i) =>
        i === index ? { ...phase, [field]: value } : phase
      )
    );
  };

  const addCustomPhase = () => {
    setSelectedPhases(prev => [...prev, {
      phase_name: '',
      is_custom: true,
      planned_weeks: 1,
      predicted_hours: 40,
    }]);
  };

  const removeCustomPhase = (index: number) => {
    setSelectedPhases(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalWeeks = selectedPhases.reduce((sum, phase) => sum + phase.planned_weeks, 0);
    const totalHours = selectedPhases.reduce((sum, phase) => sum + (phase.predicted_hours || 0), 0);
    return { totalWeeks, totalHours };
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (selectedPhases.length === 0) {
      setError('At least one phase must be selected');
      return;
    }

    const { totalWeeks, totalHours } = calculateTotals();

    try {
      setLoading(true);
      setError(null);

      const projectData = {
        name: name.trim(),
        start_date: startDate.format('YYYY-MM-DD'),
        planned_total_weeks: totalWeeks,
        predicted_hours: totalHours,
        selectedPhases,
      };

      const response = await apiService.createProject(projectData);

      if (response.success && response.data) {
        onSuccess(response.data.project);
        handleClose();
      } else {
        setError(response.error || 'Failed to create project');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setStartDate(dayjs());
    setSelectedPhases([]);
    setError(null);
    onClose();
  };

  const { totalWeeks, totalHours } = calculateTotals();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue ? dayjs(newValue) : dayjs())}
                  disabled={loading}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>

              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Project Summary
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip label={`${totalWeeks} weeks`} color="primary" variant="outlined" />
                  <Chip label={`${totalHours} hours`} color="secondary" variant="outlined" />
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                Select Project Phases
              </Typography>

              {/* Predefined Phases */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {predefinedPhases.map((phase) => {
                  const isSelected = selectedPhases.some(p => p.phase_name === phase.name);
                  return (
                    <Box key={phase.id} sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                      <Paper sx={{ p: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handlePhaseToggle(phase)}
                              disabled={loading}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {phase.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {phase.description}
                              </Typography>
                            </Box>
                          }
                        />
                        {isSelected && (
                          <Box mt={2}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                size="small"
                                label="Weeks"
                                type="number"
                                value={selectedPhases.find(p => p.phase_name === phase.name)?.planned_weeks || ''}
                                onChange={(e) => {
                                  const index = selectedPhases.findIndex(p => p.phase_name === phase.name);
                                  if (index >= 0) {
                                    handlePhaseUpdate(index, 'planned_weeks', parseInt(e.target.value) || 1);
                                  }
                                }}
                                disabled={loading}
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                size="small"
                                label="Hours"
                                type="number"
                                value={selectedPhases.find(p => p.phase_name === phase.name)?.predicted_hours || ''}
                                onChange={(e) => {
                                  const index = selectedPhases.findIndex(p => p.phase_name === phase.name);
                                  if (index >= 0) {
                                    handlePhaseUpdate(index, 'predicted_hours', parseInt(e.target.value) || 0);
                                  }
                                }}
                                disabled={loading}
                                sx={{ flex: 1 }}
                              />
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  );
                })}
              </Box>

              {/* Custom Phases */}
              {selectedPhases.filter(p => p.is_custom).map((phase, index) => {
                const actualIndex = selectedPhases.findIndex(p => p === phase);
                return (
                  <Paper key={actualIndex} sx={{ p: 2, mt: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <TextField
                        label="Custom Phase Name"
                        value={phase.phase_name}
                        onChange={(e) => handlePhaseUpdate(actualIndex, 'phase_name', e.target.value)}
                        disabled={loading}
                        sx={{ flexGrow: 1 }}
                      />
                      <TextField
                        label="Weeks"
                        type="number"
                        value={phase.planned_weeks}
                        onChange={(e) => handlePhaseUpdate(actualIndex, 'planned_weeks', parseInt(e.target.value) || 1)}
                        disabled={loading}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        label="Hours"
                        type="number"
                        value={phase.predicted_hours}
                        onChange={(e) => handlePhaseUpdate(actualIndex, 'predicted_hours', parseInt(e.target.value) || 0)}
                        disabled={loading}
                        sx={{ width: 100 }}
                      />
                      <IconButton
                        onClick={() => removeCustomPhase(actualIndex)}
                        disabled={loading}
                        color="error"
                      >
                        <Remove />
                      </IconButton>
                    </Box>
                  </Paper>
                );
              })}

              <Button
                startIcon={<Add />}
                onClick={addCustomPhase}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Add Custom Phase
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || selectedPhases.length === 0}
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateProjectDialog;