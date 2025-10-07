import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { ProjectPhase } from '../../types';
import apiService from '../../services/api';

interface EditPhaseDatesDialogProps {
  open: boolean;
  phase: ProjectPhase | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPhaseDatesDialog: React.FC<EditPhaseDatesDialogProps> = ({
  open,
  phase,
  onClose,
  onSuccess,
}) => {
  const [actualStartDate, setActualStartDate] = useState<Dayjs | null>(null);
  const [actualEndDate, setActualEndDate] = useState<Dayjs | null>(null);
  const [submittedDate, setSubmittedDate] = useState<Dayjs | null>(null);
  const [approvedDate, setApprovedDate] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase) {
      setActualStartDate(phase.actual_start_date ? dayjs(phase.actual_start_date) : null);
      setActualEndDate(phase.actual_end_date ? dayjs(phase.actual_end_date) : null);
      setSubmittedDate((phase as any).submitted_date ? dayjs((phase as any).submitted_date) : null);
      setApprovedDate((phase as any).approved_date ? dayjs((phase as any).approved_date) : null);
    }
  }, [phase]);

  const handleSubmit = async () => {
    if (!phase) return;

    try {
      setLoading(true);
      setError(null);

      const updateData: any = {};

      if (actualStartDate) {
        updateData.actual_start_date = actualStartDate.format('YYYY-MM-DD');
      }

      if (actualEndDate) {
        updateData.actual_end_date = actualEndDate.format('YYYY-MM-DD');
      }

      if (submittedDate) {
        updateData.submitted_date = submittedDate.format('YYYY-MM-DD');
      }

      if (approvedDate) {
        updateData.approved_date = approvedDate.format('YYYY-MM-DD');
      }

      // Validate: end date should be after start date
      if (actualStartDate && actualEndDate && actualEndDate.isBefore(actualStartDate)) {
        setError('End date cannot be before start date');
        setLoading(false);
        return;
      }

      // Validate: approved date should be after submitted date
      if (submittedDate && approvedDate && approvedDate.isBefore(submittedDate)) {
        setError('Approved date cannot be before submitted date');
        setLoading(false);
        return;
      }

      const response = await apiService.updatePhaseHistorical(phase.id, updateData);

      if (response.success) {
        onSuccess();
        handleClose();
      } else {
        setError(response.error || 'Failed to update phase dates');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to update phase dates');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActualStartDate(null);
    setActualEndDate(null);
    setSubmittedDate(null);
    setApprovedDate(null);
    setError(null);
    onClose();
  };

  if (!phase) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Phase Dates - {phase.phase_name}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <DatePicker
              label="Actual Start Date"
              value={actualStartDate}
              onChange={(newValue) => setActualStartDate(newValue)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'When did this phase actually start?'
                }
              }}
            />

            <DatePicker
              label="Actual End Date"
              value={actualEndDate}
              onChange={(newValue) => setActualEndDate(newValue)}
              disabled={loading}
              minDate={actualStartDate || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'When did this phase actually end?'
                }
              }}
            />

            <DatePicker
              label="Submitted Date"
              value={submittedDate}
              onChange={(newValue) => setSubmittedDate(newValue)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'When was this phase submitted to the client?'
                }
              }}
            />

            <DatePicker
              label="Approved Date"
              value={approvedDate}
              onChange={(newValue) => setApprovedDate(newValue)}
              disabled={loading}
              minDate={submittedDate || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'When did the client approve this phase?'
                }
              }}
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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Dates'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EditPhaseDatesDialog;
