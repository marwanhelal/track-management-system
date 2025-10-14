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
import { Add, Remove, ArrowUpward, ArrowDownward } from '@mui/icons-material';
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

  const movePhaseUp = (index: number) => {
    if (index === 0) return;
    const items = Array.from(selectedPhases);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    setSelectedPhases(items);
  };

  const movePhaseDown = (index: number) => {
    if (index === selectedPhases.length - 1) return;
    const items = Array.from(selectedPhases);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    setSelectedPhases(items);
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

              {/* Predefined Phases - Selection Only */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select phases to include in your project:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {predefinedPhases.map((phase) => {
                    const isSelected = selectedPhases.some(p => p.phase_name === phase.name);
                    return (
                      <FormControlLabel
                        key={phase.id}
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handlePhaseToggle(phase)}
                            disabled={loading}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {phase.name}
                          </Typography>
                        }
                      />
                    );
                  })}
                </Box>
              </Paper>

              {/* Selected Phases - Ordered List */}
              <Typography variant="h6" gutterBottom>
                Phase Sequence & Configuration
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Use arrow buttons to reorder phases. The order will determine the project workflow.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedPhases.map((phase, index) => (
                  <Paper
                    key={`phase-${index}`}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      {/* Phase Order Number */}
                      <Chip
                        label={index + 1}
                        size="small"
                        color="primary"
                        sx={{ minWidth: 40, fontWeight: 'bold' }}
                      />

                      {/* Phase Name */}
                      {phase.is_custom ? (
                        <TextField
                          size="small"
                          label="Phase Name"
                          value={phase.phase_name}
                          onChange={(e) => handlePhaseUpdate(index, 'phase_name', e.target.value)}
                          disabled={loading}
                          sx={{ flexGrow: 1, minWidth: 200 }}
                          placeholder="Enter custom phase name"
                        />
                      ) : (
                        <Typography variant="body1" fontWeight="medium" sx={{ flexGrow: 1, minWidth: 200 }}>
                          {phase.phase_name}
                        </Typography>
                      )}

                      {/* Weeks Input */}
                      <TextField
                        size="small"
                        label="Weeks"
                        type="number"
                        value={phase.planned_weeks}
                        onChange={(e) => handlePhaseUpdate(index, 'planned_weeks', parseInt(e.target.value) || 1)}
                        disabled={loading}
                        sx={{ width: 100 }}
                        inputProps={{ min: 1 }}
                      />

                      {/* Hours Input */}
                      <TextField
                        size="small"
                        label="Hours"
                        type="number"
                        value={phase.predicted_hours}
                        onChange={(e) => handlePhaseUpdate(index, 'predicted_hours', parseInt(e.target.value) || 0)}
                        disabled={loading}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />

                      {/* Move Up/Down Buttons */}
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => movePhaseUp(index)}
                          disabled={loading || index === 0}
                          color="primary"
                          title="Move Up"
                        >
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => movePhaseDown(index)}
                          disabled={loading || index === selectedPhases.length - 1}
                          color="primary"
                          title="Move Down"
                        >
                          <ArrowDownward fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Remove Button */}
                      <IconButton
                        onClick={() => {
                          if (phase.is_custom) {
                            removeCustomPhase(index);
                          } else {
                            const predefinedPhase = predefinedPhases.find(p => p.name === phase.phase_name);
                            if (predefinedPhase) {
                              handlePhaseToggle(predefinedPhase);
                            }
                          }
                        }}
                        disabled={loading}
                        color="error"
                        size="small"
                        title="Remove Phase"
                      >
                        <Remove />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {selectedPhases.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Please select at least one phase from above to continue.
                </Alert>
              )}

              <Button
                startIcon={<Add />}
                onClick={addCustomPhase}
                disabled={loading}
                variant="outlined"
                sx={{ mt: 1 }}
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