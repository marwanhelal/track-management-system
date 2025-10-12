import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

interface EditWorkLogDialogProps {
  open: boolean;
  onClose: () => void;
  workLog: any;
  onSave: (id: number, updateData: { hours: number; description: string; date: string }) => Promise<void>;
}

const EditWorkLogDialog: React.FC<EditWorkLogDialogProps> = ({ open, onClose, workLog, onSave }) => {
  const [hours, setHours] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workLog) {
      setHours(workLog.hours?.toString() || '');
      setDescription(workLog.description || '');
      setDate(workLog.date ? new Date(workLog.date).toISOString().split('T')[0] : '');
    }
  }, [workLog]);

  const handleSave = async () => {
    if (!hours || parseFloat(hours) <= 0) {
      setError('Hours must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(workLog.id, {
        hours: parseFloat(hours),
        description,
        date
      });
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update work log');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EditIcon color="primary" />
          <Typography variant="h6">Edit Work Log</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Engineer"
            value={workLog?.engineer_name || ''}
            disabled
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Phase"
            value={workLog?.phase_name || ''}
            disabled
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            label="Hours"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            fullWidth
            variant="outlined"
            inputProps={{ min: 0.1, step: 0.5 }}
            required
            helperText="Enter hours worked (must be greater than 0)"
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            placeholder="Describe the work done..."
          />

          {workLog?.edit_count > 0 && (
            <Alert severity="info">
              This work log has been edited {workLog.edit_count} time(s).
              {workLog.last_edited_by_name && ` Last edited by: ${workLog.last_edited_by_name}`}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <EditIcon />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditWorkLogDialog;
