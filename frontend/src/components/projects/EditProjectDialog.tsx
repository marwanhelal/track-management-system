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
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon
} from '@mui/icons-material';
// DatePicker replaced with HTML date input for React 19 compatibility
import { Project } from '../../types';

export interface EditProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedProject: Partial<Project>) => Promise<void>;
  project: Project | null;
  loading?: boolean;
}

interface ProjectFormData {
  name: string;
  start_date: string;
  planned_total_weeks: number;
  predicted_hours: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onClose,
  onSave,
  project,
  loading = false
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    start_date: '',
    planned_total_weeks: 0,
    predicted_hours: 0,
    status: 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      // Convert ISO datetime to yyyy-MM-dd format for date input
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        // Extract just the date portion (yyyy-MM-dd) from ISO string
        return dateString.split('T')[0];
      };

      const initialData = {
        name: project.name,
        start_date: formatDateForInput(project.start_date),
        planned_total_weeks: project.planned_total_weeks,
        predicted_hours: project.predicted_hours,
        status: project.status
      };
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [project]);

  // Validation rules
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.planned_total_weeks <= 0) {
      newErrors.planned_total_weeks = 'Planned weeks must be greater than 0';
    } else if (formData.planned_total_weeks > 260) {
      newErrors.planned_total_weeks = 'Planned weeks cannot exceed 5 years (260 weeks)';
    }

    if (formData.predicted_hours <= 0) {
      newErrors.predicted_hours = 'Predicted hours must be greater than 0';
    } else if (formData.predicted_hours > 10000) {
      newErrors.predicted_hours = 'Predicted hours seems unrealistic (max 10,000)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific field error
    if (errors[field]) {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }

    // Check if there are changes
    if (project) {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
      };

      const hasChangesNow = JSON.stringify({ ...formData, [field]: value }) !==
                           JSON.stringify({
                             name: project.name,
                             start_date: formatDateForInput(project.start_date),
                             planned_total_weeks: project.planned_total_weeks,
                             predicted_hours: project.predicted_hours,
                             status: project.status
                           });
      setHasChanges(hasChangesNow);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmDiscard) return;
    }
    setErrors({});
    setHasChanges(false);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'on_hold':
        return '🟡';
      case 'completed':
        return '🔵';
      case 'cancelled':
        return '🔴';
      default:
        return '⚪';
    }
  };

  // Calculate derived values
  const estimatedEndDate = formData.start_date && formData.planned_total_weeks > 0
    ? new Date(new Date(formData.start_date).getTime() + (formData.planned_total_weeks * 7 * 24 * 60 * 60 * 1000))
    : null;

  const averageHoursPerWeek = formData.planned_total_weeks > 0
    ? Math.round(formData.predicted_hours / formData.planned_total_weeks)
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
            <EditIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Edit Project Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update project information and settings
            </Typography>
          </Box>
        </Box>
        {saving && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="primary" />
                  Basic Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Project Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={!!errors.name}
                      helperText={errors.name}
                      placeholder="Enter a descriptive project name"
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Project Status</InputLabel>
                      <Select
                        value={formData.status}
                        label="Project Status"
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <MenuItem value="active">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon('active')} Active
                          </Box>
                        </MenuItem>
                        <MenuItem value="on_hold">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon('on_hold')} On Hold
                          </Box>
                        </MenuItem>
                        <MenuItem value="completed">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon('completed')} Completed
                          </Box>
                        </MenuItem>
                        <MenuItem value="cancelled">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon('cancelled')} Cancelled
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Current Status:
                      </Typography>
                      <Chip
                        label={formData.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(formData.status) as any}
                        size="small"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline & Planning */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  Timeline & Planning
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Project Start Date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      error={!!errors.start_date}
                      helperText={errors.start_date}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Planned Duration (Weeks)"
                      type="number"
                      value={formData.planned_total_weeks}
                      onChange={(e) => handleInputChange('planned_total_weeks', parseInt(e.target.value) || 0)}
                      error={!!errors.planned_total_weeks}
                      helperText={errors.planned_total_weeks}
                      inputProps={{ min: 1, max: 260 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Predicted Total Hours"
                      type="number"
                      value={formData.predicted_hours}
                      onChange={(e) => handleInputChange('predicted_hours', parseInt(e.target.value) || 0)}
                      error={!!errors.predicted_hours}
                      helperText={errors.predicted_hours}
                      inputProps={{ min: 1, max: 10000 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Estimated End Date"
                      value={estimatedEndDate ? estimatedEndDate.toLocaleDateString() : 'Not calculated'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      helperText="Automatically calculated based on start date and duration"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Project Metrics */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" />
                  Project Metrics
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {averageHoursPerWeek}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Hours/Week
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {formData.planned_total_weeks}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Weeks
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
          </Grid>

          {/* Change Summary */}
          {hasChanges && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Changes Detected
                  </Typography>
                  <Typography variant="body2">
                    Your changes will be saved when you click "Save Changes" below.
                  </Typography>
                </Box>
              </Alert>
            </Grid>
          )}
        </Grid>
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
          disabled={saving || !hasChanges || Object.keys(errors).length > 0}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ minWidth: 140 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProjectDialog;