import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import {  Close, Info } from '@mui/icons-material';
import apiService from '../../services/api';

interface EditProjectInfoDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  currentInfo: {
    land_area?: string;
    building_type?: string;
    floors_count?: number;
    location?: string;
    bua?: string;
    client_name?: string;
  };
  onSuccess: () => void;
}

const EditProjectInfoDialog = ({
  open,
  onClose,
  projectId,
  projectName,
  currentInfo,
  onSuccess,
}: EditProjectInfoDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    land_area: currentInfo.land_area || '',
    building_type: currentInfo.building_type || '',
    floors_count: currentInfo.floors_count || '',
    location: currentInfo.location || '',
    bua: currentInfo.bua || '',
    client_name: currentInfo.client_name || '',
  });

  // Update form when dialog opens or currentInfo changes
  useEffect(() => {
    if (open) {
      setFormData({
        land_area: currentInfo.land_area || '',
        building_type: currentInfo.building_type || '',
        floors_count: currentInfo.floors_count || '',
        location: currentInfo.location || '',
        bua: currentInfo.bua || '',
        client_name: currentInfo.client_name || '',
      });
      setError(null);
    }
  }, [open, currentInfo]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare update data - convert empty strings to null
      const updateData: any = {};
      if (formData.land_area) updateData.land_area = formData.land_area;
      if (formData.building_type) updateData.building_type = formData.building_type;
      if (formData.floors_count) updateData.floors_count = parseInt(formData.floors_count.toString());
      if (formData.location) updateData.location = formData.location;
      if (formData.bua) updateData.bua = formData.bua;
      if (formData.client_name) updateData.client_name = formData.client_name;

      // Update project information
      await apiService.updateProject(projectId, updateData);

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update project information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="primary" />
            <Typography variant="h6">Edit Project Information</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Update project information for: <strong>{projectName}</strong>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Client Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client Name (اسم العميل)"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)}
                placeholder="Enter client name..."
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location (الموقع)"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., الرياض - حي النرجس"
              />
            </Grid>

            {/* Building Type */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Building Type (نوع المبنى)"
                value={formData.building_type}
                onChange={(e) => handleChange('building_type', e.target.value)}
                placeholder="e.g., فيلا سكنية, عمارة تجارية"
              />
            </Grid>

            {/* Floors Count */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Floors Count (عدد الطوابق)"
                value={formData.floors_count}
                onChange={(e) => handleChange('floors_count', e.target.value)}
                placeholder="Enter number of floors..."
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Land Area */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Land Area (مساحة الأرض)"
                value={formData.land_area}
                onChange={(e) => handleChange('land_area', e.target.value)}
                placeholder="e.g., 500 متر مربع"
              />
            </Grid>

            {/* BUA - Built-Up Area */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Built-Up Area - BUA (مساحة البناء)"
                value={formData.bua}
                onChange={(e) => handleChange('bua', e.target.value)}
                placeholder="e.g., 400 متر مربع"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProjectInfoDialog;
