import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material';
import { apiService } from '../../services/api';

interface AddManualWorkLogDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  phaseId: number;
  phaseName: string;
  phaseStatus: string;
  onSuccess: () => void;
}

interface Engineer {
  id: number;
  name: string;
  email: string;
}

const AddManualWorkLogDialog: React.FC<AddManualWorkLogDialogProps> = ({
  open,
  onClose,
  projectId,
  phaseId,
  phaseName,
  phaseStatus,
  onSuccess
}) => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | ''>('');
  const [hours, setHours] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load engineers when dialog opens
  useEffect(() => {
    if (open) {
      loadEngineers();
    }
  }, [open]);

  const loadEngineers = async () => {
    try {
      setLoadingEngineers(true);
      setError(null);
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        // Filter only engineers
        const engineersList = response.data.users.filter(
          (user: any) => user.role === 'engineer' && user.is_active
        );
        setEngineers(engineersList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load engineers');
    } finally {
      setLoadingEngineers(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEngineerId || !hours || !description) {
      setError('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Hours must be a positive number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the admin endpoint to bypass phase status checks
      const response = await apiService.createWorkLogAdmin({
        engineer_id: selectedEngineerId as number,
        phase_id: phaseId,
        hours: hoursNum,
        description,
        date
      });

      if (response.success) {
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add work log');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEngineerId('');
    setHours('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setError(null);
    onClose();
  };

  const isPhaseCompleted = ['completed', 'approved'].includes(phaseStatus);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon />
          Manual Work Log Entry
        </Box>
        <Typography variant="caption" color="text.secondary">
          Phase: {phaseName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {isPhaseCompleted && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
            This phase is <strong>{phaseStatus}</strong>. This manual entry will bypass the normal restrictions.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          {/* Engineer Selection */}
          <FormControl fullWidth required disabled={loadingEngineers}>
            <InputLabel>Engineer</InputLabel>
            <Select
              value={selectedEngineerId}
              label="Engineer"
              onChange={(e: SelectChangeEvent<number | ''>) => setSelectedEngineerId(e.target.value as number)}
            >
              {loadingEngineers ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                  Loading engineers...
                </MenuItem>
              ) : (
                engineers.map((engineer) => (
                  <MenuItem key={engineer.id} value={engineer.id}>
                    {engineer.name} ({engineer.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Date */}
          <TextField
            fullWidth
            required
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Hours */}
          <TextField
            fullWidth
            required
            type="number"
            label="Hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            helperText="Enter the number of hours worked"
          />

          {/* Description */}
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work performed..."
            helperText="Provide details about the work done"
          />

          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="caption">
              <strong>Note:</strong> This work log will be automatically approved and will update the phase's actual hours immediately.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || loadingEngineers}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Adding...' : 'Add Work Log'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddManualWorkLogDialog;
