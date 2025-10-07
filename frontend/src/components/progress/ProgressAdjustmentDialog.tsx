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
  Slider,
  Grid,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

interface ProgressAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { manual_progress_percentage: number; adjustment_reason: string }) => Promise<void>;
  engineerName: string;
  phaseName: string;
  hoursLogged: number;
  predictedHours: number;
  calculatedProgress: number;
  currentActualProgress?: number;
  workLogId?: number;
  isPhaseLevel?: boolean;
}

const ProgressAdjustmentDialog: React.FC<ProgressAdjustmentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  engineerName,
  phaseName,
  hoursLogged,
  predictedHours,
  calculatedProgress,
  currentActualProgress,
  workLogId,
  isPhaseLevel = false
}) => {
  const [manualProgress, setManualProgress] = useState<number>(calculatedProgress);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Initialize with current actual progress or calculated progress
      setManualProgress(currentActualProgress || calculatedProgress);
      setReason('');
      setError(null);
    }
  }, [open, calculatedProgress, currentActualProgress]);

  const handleSubmit = async () => {
    // Validate
    if (manualProgress < 0 || manualProgress > 100) {
      setError('Progress must be between 0 and 100');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        manual_progress_percentage: manualProgress,
        adjustment_reason: reason.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to adjust progress');
    } finally {
      setLoading(false);
    }
  };

  const variance = manualProgress - calculatedProgress;
  const varianceColor = Math.abs(variance) < 5 ? 'success' : Math.abs(variance) < 10 ? 'warning' : 'error';

  const getVarianceIcon = () => {
    if (variance > 2) return <TrendingUpIcon />;
    if (variance < -2) return <TrendingDownIcon />;
    return <TrendingFlatIcon />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Adjust Progress {isPhaseLevel ? '- Phase Overall' : '- Work Log Entry'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Context Information */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Engineer
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {engineerName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Phase
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {phaseName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Hours Logged
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {hoursLogged.toFixed(2)} / {predictedHours} hrs
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Calculated Progress
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {calculatedProgress.toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Progress Adjustment Slider */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Actual Work Progress %
            </Typography>
            <Box sx={{ px: 2, mt: 2 }}>
              <Slider
                value={manualProgress}
                onChange={(_, value) => setManualProgress(value as number)}
                min={0}
                max={100}
                step={1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' }
                ]}
                valueLabelDisplay="on"
                color={varianceColor}
              />
            </Box>
            <TextField
              fullWidth
              type="number"
              label="Exact Progress (%)"
              value={manualProgress}
              onChange={(e) => setManualProgress(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              sx={{ mt: 2 }}
            />
          </Box>

          {/* Variance Display */}
          <Box sx={{ mb: 3, p: 2, bgcolor: `${varianceColor}.light`, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {getVarianceIcon()}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">
                Variance (Work is {variance < 0 ? 'behind' : variance > 0 ? 'ahead of' : 'aligned with'} hours)
              </Typography>
              <Typography variant="h6" color={`${varianceColor}.dark`}>
                {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
              </Typography>
            </Box>
            <Chip
              label={Math.abs(variance) < 5 ? 'Minor' : Math.abs(variance) < 10 ? 'Moderate' : 'Significant'}
              color={varianceColor}
              size="small"
            />
          </Box>

          {/* Comparison Display */}
          <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Progress Hours (Time-Based)
                </Typography>
                <Typography variant="h5" color="primary">
                  {calculatedProgress.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Actual Work (Quality-Based)
                </Typography>
                <Typography variant="h5" color={varianceColor === 'error' ? 'error' : 'success'}>
                  {manualProgress.toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Reason Input */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Adjustment *"
            placeholder="Explain why the actual progress differs from the calculated progress. For example: work quality issues, rework required, incomplete deliverables, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={!!error && !reason.trim()}
            helperText={error && !reason.trim() ? error : 'Minimum 10 characters required'}
            sx={{ mb: 2 }}
          />

          {/* Help Text */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Note:</strong> This adjustment will override the automatic hours-based calculation.
              The engineer will see this adjusted progress along with your reasoning.
              All adjustments are logged for audit purposes.
            </Typography>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !reason.trim() || reason.trim().length < 10}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Adjusting...' : 'Adjust Progress'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressAdjustmentDialog;
