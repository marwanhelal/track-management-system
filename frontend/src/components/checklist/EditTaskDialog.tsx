import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { ProjectChecklistItem } from '../../types';
import apiService from '../../services/api';

interface EditTaskDialogProps {
  open: boolean;
  onClose: () => void;
  item: ProjectChecklistItem | null;
  onSuccess: () => void;
}

const EditTaskDialog = ({
  open,
  onClose,
  item,
  onSuccess,
}: EditTaskDialogProps) => {
  const [taskTitleAr, setTaskTitleAr] = useState('');
  const [taskTitleEn, setTaskTitleEn] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setTaskTitleAr(item.task_title_ar);
      setTaskTitleEn(item.task_title_en || '');
      setSectionName(item.section_name || '');
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!item || !taskTitleAr.trim()) {
      setError('Arabic task title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiService.updateProjectChecklistItem(item.id, {
        task_title_ar: taskTitleAr,
        task_title_en: taskTitleEn || undefined,
        section_name: sectionName || undefined,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!item) return null;

  // Predefined sections based on phase
  const getSectionsForPhase = () => {
    switch (item.phase_name) {
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
          <Edit color="primary" />
          <Box>
            <Typography variant="h6" gutterBottom>
              Edit Task
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phase: {item.phase_name}
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
          startIcon={<Edit />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTaskDialog;
