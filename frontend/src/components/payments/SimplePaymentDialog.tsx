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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface SimplePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName: string;
  onSuccess: () => void;
}

const SimplePaymentDialog: React.FC<SimplePaymentDialogProps> = ({
  open,
  onClose,
  phaseId,
  phaseName,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [paymentStatus, setPaymentStatus] = useState<string>('unpaid');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadPaymentData();
    }
  }, [open, phaseId]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPhasePayments(phaseId);
      if (response.success && response.data) {
        const { phase } = response.data;

        setPaymentStatus(phase.payment_status || 'unpaid');
        setTotalAmount(phase.total_amount || '');
        setPaidAmount(phase.paid_amount || '');
        setExpectedDate(phase.payment_deadline ? phase.payment_deadline.split('T')[0] : '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Update phase payment info
      await apiService.updatePhasePaymentInfo(phaseId, {
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        payment_deadline: expectedDate || null,
        payment_notes: null,
        payment_request_date: null
      });

      // If user manually set paid amount, create a payment record
      const currentPaidAmount = parseFloat(paidAmount || '0');
      if (currentPaidAmount > 0) {
        // Get existing payments to see if we need to add more
        const existingResponse = await apiService.getPhasePayments(phaseId);
        const existingPaid = existingResponse.data?.summary?.paidAmount || 0;

        const difference = currentPaidAmount - existingPaid;

        if (difference > 0) {
          // Add the difference as a new payment
          await apiService.addPhasePayment(phaseId, {
            payment_amount: difference,
            payment_date: new Date().toISOString().split('T')[0],
            payment_type: paymentStatus === 'fully_paid' ? 'final' : 'partial',
            notes: 'Payment recorded by supervisor'
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment information');
    } finally {
      setLoading(false);
    }
  };

  const calculateRemaining = () => {
    const total = parseFloat(totalAmount || '0');
    const paid = parseFloat(paidAmount || '0');
    return total - paid;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return 'success';
      case 'partially_paid':
        return 'warning';
      case 'unpaid':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return <CheckCircleIcon />;
      case 'partially_paid':
        return <WarningIcon />;
      case 'unpaid':
        return <CancelIcon />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return 'Fully Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'unpaid':
        return 'Not Paid';
      default:
        return status;
    }
  };

  if (loading && !paymentStatus) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const remaining = calculateRemaining();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PaymentIcon />
            Payment Status
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Phase: {phaseName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={3}>
          {/* Current Status Display */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Status
            </Typography>
            <Chip
              label={getStatusLabel(paymentStatus)}
              color={getStatusColor(paymentStatus) as any}
              icon={getStatusIcon(paymentStatus) || undefined}
              sx={{ mt: 1 }}
            />
            {remaining > 0 && (
              <Typography variant="h6" color="error.main" sx={{ mt: 2 }}>
                Remaining: {formatCurrency(remaining)}
              </Typography>
            )}
          </Box>

          {/* Total Phase Amount */}
          <TextField
            fullWidth
            type="number"
            label="Total Phase Amount"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="How much should the client pay for this phase?"
          />

          {/* Paid Amount */}
          <TextField
            fullWidth
            type="number"
            label="Amount Already Paid"
            value={paidAmount}
            onChange={(e) => {
              const paid = parseFloat(e.target.value || '0');
              const total = parseFloat(totalAmount || '0');
              setPaidAmount(e.target.value);

              // Auto-update status based on amounts
              if (paid === 0) {
                setPaymentStatus('unpaid');
              } else if (total > 0 && paid >= total) {
                setPaymentStatus('fully_paid');
              } else if (paid > 0) {
                setPaymentStatus('partially_paid');
              }
            }}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="How much has been paid so far?"
          />

          {/* Remaining Amount (Auto-calculated) */}
          {totalAmount && (
            <Box
              sx={{
                p: 2,
                bgcolor: remaining > 0 ? 'warning.50' : 'success.50',
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Remaining Amount
              </Typography>
              <Typography variant="h5" color={remaining > 0 ? 'error.main' : 'success.main'}>
                {formatCurrency(remaining)}
              </Typography>
              {remaining === 0 && (
                <Typography variant="caption" color="success.main">
                  ✅ Fully Paid
                </Typography>
              )}
            </Box>
          )}

          {/* Payment Status */}
          <FormControl fullWidth>
            <InputLabel>Payment Status</InputLabel>
            <Select
              value={paymentStatus}
              label="Payment Status"
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <MenuItem value="unpaid">Not Paid</MenuItem>
              <MenuItem value="partially_paid">Partially Paid</MenuItem>
              <MenuItem value="fully_paid">Fully Paid</MenuItem>
            </Select>
          </FormControl>

          {/* Expected Payment Date (if not fully paid) */}
          {paymentStatus !== 'fully_paid' && (
            <TextField
              fullWidth
              type="date"
              label="Expected Payment Date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="When do you expect to receive payment?"
            />
          )}

          {paymentStatus === 'fully_paid' && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              This phase is marked as <strong>Fully Paid</strong>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
        >
          Save Payment Status
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimplePaymentDialog;
