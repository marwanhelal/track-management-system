import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Assignment as PhaseIcon,
  Schedule as ScheduleIcon,
  Build as CustomIcon,
  Star as StarIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
// DatePicker replaced with HTML date input for React 19 compatibility
import { PredefinedPhase, ProjectPhaseInput } from '../../types';
import apiService from '../../services/api';

export interface AddPhaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (phaseData: ProjectPhaseInput) => Promise<void>;
  projectId: number;
  existingPhases: number;
  loading?: boolean;
}

interface PhaseFormData {
  phase_name: string;
  is_custom: boolean;
  planned_weeks: number;
  predicted_hours: number;
  description?: string;
  planned_start_date?: string;
}

const AddPhaseDialog: React.FC<AddPhaseDialogProps> = ({
  open,
  onClose,
  onSave,
  projectId,
  existingPhases,
  loading = false
}) => {
  const [phaseType, setPhaseType] = useState<'predefined' | 'custom'>('predefined');
  const [predefinedPhases, setPredefinedPhases] = useState<PredefinedPhase[]>([]);
  const [selectedPredefined, setSelectedPredefined] = useState<PredefinedPhase | null>(null);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<PhaseFormData>({
    phase_name: '',
    is_custom: true,
    planned_weeks: 1,
    predicted_hours: 40,
    description: '',
    planned_start_date: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load predefined phases on open
  useEffect(() => {
    if (open) {
      loadPredefinedPhases();
    }
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        phase_name: '',
        is_custom: true,
        planned_weeks: 1,
        predicted_hours: 40,
        description: '',
        planned_start_date: ''
      });
      setSelectedPredefined(null);
      setPhaseType('predefined');
      setErrors({});
    }
  }, [open]);

  // Update form when predefined phase is selected
  useEffect(() => {
    if (selectedPredefined && phaseType === 'predefined') {
      setFormData(prev => ({
        ...prev,
        phase_name: selectedPredefined.name,
        is_custom: false,
        planned_weeks: selectedPredefined.typical_duration_weeks,
        predicted_hours: selectedPredefined.typical_duration_weeks * 40, // Estimate 40h/week
        description: selectedPredefined.description || ''
      }));
    }
  }, [selectedPredefined, phaseType]);

  const loadPredefinedPhases = async () => {
    try {
      setLoadingPhases(true);
      const response = await apiService.getPredefinedPhases();
      if (response.success && response.data) {
        setPredefinedPhases(response.data.phases.filter(phase => phase.is_active));
      }
    } catch (error) {
      console.error('Failed to load predefined phases:', error);
    } finally {
      setLoadingPhases(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phase_name.trim()) {
      newErrors.phase_name = 'Phase name is required';
    } else if (formData.phase_name.trim().length < 2) {
      newErrors.phase_name = 'Phase name must be at least 2 characters';
    }

    if (formData.planned_weeks <= 0) {
      newErrors.planned_weeks = 'Planned weeks must be greater than 0';
    } else if (formData.planned_weeks > 52) {
      newErrors.planned_weeks = 'Planned weeks cannot exceed 1 year (52 weeks)';
    }

    if (formData.predicted_hours <= 0) {
      newErrors.predicted_hours = 'Predicted hours must be greater than 0';
    } else if (formData.predicted_hours > 2000) {
      newErrors.predicted_hours = 'Predicted hours seems unrealistic (max 2,000)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof PhaseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific field error
    if (errors[field]) {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handlePhaseTypeChange = (type: 'predefined' | 'custom') => {
    setPhaseType(type);
    setFormData(prev => ({
      ...prev,
      is_custom: type === 'custom',
      phase_name: type === 'custom' ? '' : prev.phase_name
    }));
    setSelectedPredefined(null);
    setErrors({});
  };

  const handlePredefinedSelect = (phase: PredefinedPhase) => {
    setSelectedPredefined(phase);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const phaseData: ProjectPhaseInput = {
        phase_name: formData.phase_name,
        is_custom: formData.is_custom,
        planned_weeks: formData.planned_weeks,
        predicted_hours: formData.predicted_hours
      };

      await onSave(phaseData);
      onClose();
    } catch (error) {
      console.error('Failed to save phase:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setSelectedPredefined(null);
    onClose();
  };

  const getPhaseOrderNumber = () => existingPhases + 1;

  const estimatedHoursPerWeek = formData.planned_weeks > 0
    ? Math.round(formData.predicted_hours / formData.planned_weeks)
    : 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AddIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Add New Project Phase
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phase {getPhaseOrderNumber()} • Choose from predefined phases or create custom
            </Typography>
          </Box>
        </Box>
        {(saving || loadingPhases) && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Phase Type Selection */}
          <Typography variant="h6" gutterBottom>
            Phase Type
          </Typography>
          <ToggleButtonGroup
            value={phaseType}
            exclusive
            onChange={(_, value) => value && handlePhaseTypeChange(value)}
            aria-label="phase type"
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="predefined" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <StarIcon />
                <Typography variant="body2">Predefined Phases</Typography>
                <Typography variant="caption" color="text.secondary">
                  Standard industry phases
                </Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="custom" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <CustomIcon />
                <Typography variant="body2">Custom Phase</Typography>
                <Typography variant="caption" color="text.secondary">
                  Create your own phase
                </Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Predefined Phases Selection */}
          {phaseType === 'predefined' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Select Predefined Phase
                </Typography>
                <Tooltip title="Refresh phases">
                  <span>
                    <IconButton onClick={loadPredefinedPhases} disabled={loadingPhases}>
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {loadingPhases ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {predefinedPhases.map((phase) => (
                    <Grid item xs={12} md={6} key={phase.id}>
                      <Card
                        variant={selectedPredefined?.id === phase.id ? "outlined" : "elevation"}
                        sx={{
                          cursor: 'pointer',
                          border: selectedPredefined?.id === phase.id ? 2 : 1,
                          borderColor: selectedPredefined?.id === phase.id ? 'primary.main' : 'divider',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 2
                          }
                        }}
                        onClick={() => handlePredefinedSelect(phase)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                            <Typography variant="h6" component="div">
                              {phase.name}
                            </Typography>
                            <Chip
                              label={`${phase.typical_duration_weeks}w`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          {phase.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {phase.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Typical Duration: {phase.typical_duration_weeks} weeks
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {predefinedPhases.length === 0 && !loadingPhases && (
                <Alert severity="info">
                  No predefined phases available. You can create a custom phase instead.
                </Alert>
              )}
            </Box>
          )}

          {/* Phase Details Form */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Phase Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phase Name"
                  value={formData.phase_name}
                  onChange={(e) => handleInputChange('phase_name', e.target.value)}
                  error={!!errors.phase_name}
                  helperText={errors.phase_name}
                  placeholder="Enter phase name"
                  required
                  disabled={phaseType === 'predefined' && !selectedPredefined}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Planned Duration (Weeks)"
                  type="number"
                  value={formData.planned_weeks}
                  onChange={(e) => handleInputChange('planned_weeks', parseInt(e.target.value) || 0)}
                  error={!!errors.planned_weeks}
                  helperText={errors.planned_weeks}
                  inputProps={{ min: 1, max: 52 }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Predicted Hours"
                  type="number"
                  value={formData.predicted_hours}
                  onChange={(e) => handleInputChange('predicted_hours', parseInt(e.target.value) || 0)}
                  error={!!errors.predicted_hours}
                  helperText={errors.predicted_hours}
                  inputProps={{ min: 1, max: 2000 }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the phase objectives and deliverables..."
                />
              </Grid>
            </Grid>

            {/* Phase Metrics Preview */}
            <Card variant="outlined" sx={{ mt: 3, bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="info" />
                  Phase Metrics Preview
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {estimatedHoursPerWeek}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hours/Week
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {getPhaseOrderNumber()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Phase Order
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {formData.predicted_hours}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Hours
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          variant="outlined"
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !formData.phase_name.trim() || Object.keys(errors).length > 0}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ minWidth: 140 }}
        >
          {saving ? 'Adding...' : 'Add Phase'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPhaseDialog;