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
  LocationCity as LocationIcon,
  Apartment as ApartmentIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { Project } from '../../types';

export interface EditProjectDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedDetails: ProjectDetailsFormData) => Promise<void>;
  project: Project | null;
  loading?: boolean;
}

export interface ProjectDetailsFormData {
  client_name?: string;
  location?: string;
  land_area?: string;
  bua?: string;
  building_type?: string;
  floors_count?: number;
}

const EditProjectDetailsDialog: React.FC<EditProjectDetailsDialogProps> = ({
  open,
  onClose,
  onSave,
  project,
  loading = false
}) => {
  const [formData, setFormData] = useState<ProjectDetailsFormData>({
    client_name: '',
    location: '',
    land_area: '',
    bua: '',
    building_type: '',
    floors_count: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      const initialData: ProjectDetailsFormData = {
        client_name: project.client_name || '',
        location: project.location || '',
        land_area: project.land_area || '',
        bua: project.bua || '',
        building_type: project.building_type || '',
        floors_count: project.floors_count || undefined
      };
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [project]);

  // Validation rules
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Optional validations for data quality
    if (formData.floors_count !== undefined && formData.floors_count < 0) {
      newErrors.floors_count = 'Number of floors cannot be negative';
    }

    if (formData.floors_count !== undefined && formData.floors_count > 200) {
      newErrors.floors_count = 'Number of floors seems unrealistic (max 200)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProjectDetailsFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));

    // Clear specific field error
    if (errors[field]) {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }

    // Check if there are changes
    if (project) {
      const initialData: ProjectDetailsFormData = {
        client_name: project.client_name || '',
        location: project.location || '',
        land_area: project.land_area || '',
        bua: project.bua || '',
        building_type: project.building_type || '',
        floors_count: project.floors_count || undefined
      };

      const hasChangesNow = JSON.stringify({ ...formData, [field]: value === '' ? undefined : value }) !==
                           JSON.stringify(initialData);
      setHasChanges(hasChangesNow);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Filter out empty strings and convert them to undefined for API
      const dataToSave: ProjectDetailsFormData = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          dataToSave[key as keyof ProjectDetailsFormData] = value;
        }
      });

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Failed to save project details:', error);
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
              Edit Additional Project Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update client information and building specifications
            </Typography>
          </Box>
        </Box>
        {saving && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Client Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Client Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Client Name"
                      value={formData.client_name || ''}
                      onChange={(e) => handleInputChange('client_name', e.target.value)}
                      error={!!errors.client_name}
                      helperText={errors.client_name || 'Enter the name of the client or company'}
                      placeholder="e.g., ABC Corporation"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={formData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      error={!!errors.location}
                      helperText={errors.location || 'Enter the project location (city, district, address)'}
                      placeholder="e.g., Dubai, Business Bay"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Building Specifications */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ApartmentIcon color="primary" />
                  Building Specifications
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Land Area"
                      value={formData.land_area || ''}
                      onChange={(e) => handleInputChange('land_area', e.target.value)}
                      error={!!errors.land_area}
                      helperText={errors.land_area || 'Total land area (e.g., 500 sqm, 1.5 acres)'}
                      placeholder="e.g., 500 sqm"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="BUA (Built-Up Area)"
                      value={formData.bua || ''}
                      onChange={(e) => handleInputChange('bua', e.target.value)}
                      error={!!errors.bua}
                      helperText={errors.bua || 'Built-up area (e.g., 1200 sqm, 3000 sqft)'}
                      placeholder="e.g., 1200 sqm"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Building Type"
                      value={formData.building_type || ''}
                      onChange={(e) => handleInputChange('building_type', e.target.value)}
                      error={!!errors.building_type}
                      helperText={errors.building_type || 'Type of building (e.g., Residential, Commercial, Mixed-Use)'}
                      placeholder="e.g., Residential Villa"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Number of Floors"
                      type="number"
                      value={formData.floors_count !== undefined ? formData.floors_count : ''}
                      onChange={(e) => handleInputChange('floors_count', e.target.value ? parseInt(e.target.value) : undefined)}
                      error={!!errors.floors_count}
                      helperText={errors.floors_count || 'Total number of floors in the building'}
                      inputProps={{ min: 0, max: 200 }}
                      placeholder="e.g., 3"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Summary */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="info" />
                  Project Summary
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Client
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.client_name || 'Not specified'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Location
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.location || 'Not specified'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Building Type
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.building_type || 'Not specified'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Floors
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.floors_count !== undefined ? formData.floors_count : 'Not specified'}
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

export default EditProjectDetailsDialog;
