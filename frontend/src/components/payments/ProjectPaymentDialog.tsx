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
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface ProjectPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  currentData?: {
    total_contract_amount?: number;
    down_payment_amount?: number;
    down_payment_date?: string;
    down_payment_notes?: string;
    down_payment_received?: boolean;
  };
  onUpdate: () => void;
}

const ProjectPaymentDialog: React.FC<ProjectPaymentDialogProps> = ({
  open,
  onClose,
  projectId,
  currentData,
  onUpdate,
}) => {
  const [totalContract, setTotalContract] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [downPaymentDate, setDownPaymentDate] = useState<string>('');
  const [downPaymentNotes, setDownPaymentNotes] = useState<string>('');
  const [downPaymentReceived, setDownPaymentReceived] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && currentData) {
      setTotalContract(currentData.total_contract_amount?.toString() || '');
      setDownPayment(currentData.down_payment_amount?.toString() || '');
      setDownPaymentDate(currentData.down_payment_date ? currentData.down_payment_date.split('T')[0] : '');
      setDownPaymentNotes(currentData.down_payment_notes || '');
      setDownPaymentReceived(currentData.down_payment_received || false);
    }
  }, [open, currentData]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const totalAmount = parseFloat(totalContract) || 0;
      const downAmount = parseFloat(downPayment) || 0;

      if (totalAmount < 0) {
        setError('Total contract amount cannot be negative');
        setLoading(false);
        return;
      }

      if (downAmount < 0) {
        setError('Down payment amount cannot be negative');
        setLoading(false);
        return;
      }

      if (downAmount > totalAmount) {
        setError('Down payment cannot exceed total contract amount');
        setLoading(false);
        return;
      }

      const response = await apiService.updateProjectPayment(projectId, {
        total_contract_amount: totalAmount,
        down_payment_amount: downAmount,
        down_payment_date: downPaymentDate || null,
        down_payment_notes: downPaymentNotes || null,
        down_payment_received: downPaymentReceived,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onUpdate();
          onClose();
          setSuccess(false);
        }, 1000);
      } else {
        setError(response.error || 'Failed to update project payment information');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AccountBalanceIcon color="primary" />
            <Typography variant="h6">Project Payment Settings</Typography>
          </Box>
          <Button onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Project payment information updated successfully!
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Total Contract Amount"
            type="number"
            value={totalContract}
            onChange={(e) => setTotalContract(e.target.value)}
            fullWidth
            helperText="Total project contract value with client"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            disabled={loading}
          />

          <TextField
            label="Down Payment Amount"
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            fullWidth
            helperText="Initial down payment received from client"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            disabled={loading}
          />

          <TextField
            label="Down Payment Date"
            type="date"
            value={downPaymentDate}
            onChange={(e) => setDownPaymentDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="When was the down payment received?"
            disabled={loading}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={downPaymentReceived}
                onChange={(e) => setDownPaymentReceived(e.target.checked)}
                disabled={loading}
              />
            }
            label="Down payment received"
          />

          <TextField
            label="Notes"
            value={downPaymentNotes}
            onChange={(e) => setDownPaymentNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="Additional notes about the down payment"
            disabled={loading}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AccountBalanceIcon />}
        >
          {loading ? 'Saving...' : 'Save Payment Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectPaymentDialog;
