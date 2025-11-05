import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { ChecklistPhaseName } from '../../types';
import apiService from '../../services/api';

interface AddChecklistItemDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  phaseName: ChecklistPhaseName;
  existingItemsCount: number;
  onSuccess: () => void;
}

const AddChecklistItemDialog = ({
  open,
  onClose,
  projectId,
  phaseName,
  existingItemsCount,
  onSuccess,
}: AddChecklistItemDialogProps) => {
  const [taskTitleAr, setTaskTitleAr] = useState('');
  const [taskTitleEn, setTaskTitleEn] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(existingItemsCount + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!taskTitleAr.trim()) {
      setError('Arabic task title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiService.createProjectChecklistItem(projectId, {
        phase_name: phaseName,
        section_name: sectionName || undefined,
        task_title_ar: taskTitleAr,
        task_title_en: taskTitleEn || undefined,
        display_order: displayOrder,
      });

      // Reset form
      setTaskTitleAr('');
      setTaskTitleEn('');
      setSectionName('');
      setDisplayOrder(existingItemsCount + 1);

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to create checklist item');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTaskTitleAr('');
      setTaskTitleEn('');
      setSectionName('');
      setDisplayOrder(existingItemsCount + 1);
      setError(null);
      onClose();
    }
  };

  // Predefined sections based on phase
  const getSectionsForPhase = () => {
    switch (phaseName) {
      case 'License':
        return ['المساقط', 'الواجهات', 'القطاعات', 'القرار الوزاري', 'Layout'];
      case 'Working':
        return ['مساقط', 'واجهات', 'قطاعات', 'تفاصيل', 'Layout'];
      default:
        return [];
    }
  };

  const sections = getSectionsForPhase();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Add color="primary" />
          <Box>
            <Typography variant="h6" gutterBottom>
              Add New Checklist Item
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phase: {phaseName}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {/* Arabic Task Title */}
          <TextField
            fullWidth
            required
            label="Task Title (Arabic)"
            value={taskTitleAr}
            onChange={(e) => setTaskTitleAr(e.target.value)}
            placeholder="Enter task title in Arabic..."
            disabled={loading}
            dir="rtl"
          />

          {/* English Task Title */}
          <TextField
            fullWidth
            label="Task Title (English)"
            value={taskTitleEn}
            onChange={(e) => setTaskTitleEn(e.target.value)}
            placeholder="Enter task title in English (optional)..."
            disabled={loading}
          />

          {/* Section Name (for License and Working phases) */}
          {sections.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Section (Optional)</InputLabel>
              <Select
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                label="Section (Optional)"
                disabled={loading}
              >
                <MenuItem value="">
                  <em>No Section</em>
                </MenuItem>
                {sections.map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Display Order */}
          <TextField
            fullWidth
            type="number"
            label="Display Order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
            disabled={loading}
            helperText={`Current items count: ${existingItemsCount}`}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !taskTitleAr.trim()}
          color="primary"
          startIcon={<Add />}
        >
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddChecklistItemDialog;
