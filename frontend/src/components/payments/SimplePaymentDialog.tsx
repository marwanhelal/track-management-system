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
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface SimplePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName: string;
  projectId: number;
  onSuccess: () => void;
}

const SimplePaymentDialog: React.FC<SimplePaymentDialogProps> = ({
  open,
  onClose,
  phaseId,
  phaseName,
  projectId,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase payment fields
  const [paymentStatus, setPaymentStatus] = useState<string>('unpaid');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');

  // Project payment summary
  const [projectSummary, setProjectSummary] = useState<any>(null);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [projectTotalContract, setProjectTotalContract] = useState<string>('');
  const [projectDownPayment, setProjectDownPayment] = useState<string>('');
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, phaseId, projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load phase payment data
      const phaseResponse = await apiService.getPhasePayments(phaseId);
      if (phaseResponse.success && phaseResponse.data) {
        const { phase } = phaseResponse.data;
        setPaymentStatus(phase.payment_status || 'unpaid');
        setTotalAmount(phase.total_amount || '');
        setPaidAmount(phase.paid_amount || '');
        setExpectedDate(phase.payment_deadline ? phase.payment_deadline.split('T')[0] : '');
      }

      // Load project payment summary
      const projectResponse = await apiService.getProjectPaymentSummary(projectId);
      if (projectResponse.success && projectResponse.data) {
        setProjectSummary(projectResponse.data);
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
        const existingResponse = await apiService.getPhasePayments(phaseId);
        const existingPaid = existingResponse.data?.summary?.paidAmount || 0;
        const difference = currentPaidAmount - existingPaid;

        if (difference > 0) {
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

  const calculatePhasePercentage = () => {
    if (!projectSummary || projectSummary.total_contract === 0) return 0;
    const phaseTotal = parseFloat(totalAmount || '0');
    return (phaseTotal / projectSummary.total_contract) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'success';
      case 'partially_paid': return 'warning';
      case 'unpaid': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_paid': return <CheckCircleIcon />;
      case 'partially_paid': return <WarningIcon />;
      case 'unpaid': return <CancelIcon />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Not Paid';
      default: return status;
    }
  };

  if (loading && !paymentStatus) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const remaining = calculateRemaining();
  const phasePercentage = calculatePhasePercentage();
  const isBalanced = projectSummary?.is_balanced;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PaymentIcon />
            Payment Tracking
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

        {/* PROJECT PAYMENT SUMMARY */}
        {projectSummary && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccountBalanceIcon color="primary" />
                <Typography variant="h6" color="primary">
                  Project Financial Summary
                </Typography>
              </Box>
              <Button
                size="small"
                variant={showProjectEdit ? "contained" : "outlined"}
                onClick={() => {
                  setShowProjectEdit(!showProjectEdit);
                  if (!showProjectEdit) {
                    setProjectTotalContract(projectSummary.total_contract.toString());
                    setProjectDownPayment(projectSummary.down_payment.toString());
                  }
                }}
              >
                {showProjectEdit ? 'Cancel' : 'Edit Contract'}
              </Button>
            </Box>

            {showProjectEdit ? (
              // EDIT MODE
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Contract Amount"
                  value={projectTotalContract}
                  onChange={(e) => setProjectTotalContract(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Total project contract value with client"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Down Payment Amount"
                  value={projectDownPayment}
                  onChange={(e) => setProjectDownPayment(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Initial down payment received from client"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  disabled={savingProject}
                  onClick={async () => {
                    try {
                      setSavingProject(true);
                      await apiService.updateProjectPayment(projectId, {
                        total_contract_amount: parseFloat(projectTotalContract) || 0,
                        down_payment_amount: parseFloat(projectDownPayment) || 0,
                      });
                      // Reload data
                      await loadData();
                      setShowProjectEdit(false);
                    } catch (err: any) {
                      setError(err.message || 'Failed to update project payment');
                    } finally {
                      setSavingProject(false);
                    }
                  }}
                  startIcon={savingProject ? <CircularProgress size={20} /> : <AccountBalanceIcon />}
                >
                  {savingProject ? 'Saving...' : 'Save Contract Info'}
                </Button>
              </Box>
            ) : (
              // VIEW MODE
              <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Contract:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(projectSummary.total_contract)}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Down Payment:</Typography>
                <Typography variant="body1">
                  {formatCurrency(projectSummary.down_payment)}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Sum of All Phases:</Typography>
                <Typography variant="body1">
                  {formatCurrency(projectSummary.sum_of_phases)}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Paid (Down + Phases):</Typography>
                <Typography variant="body1" color="success.main" fontWeight="bold">
                  {formatCurrency(projectSummary.total_paid)}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Remaining:</Typography>
                <Typography variant="h6" color={projectSummary.total_remaining > 0 ? 'error.main' : 'success.main'}>
                  {formatCurrency(projectSummary.total_remaining)}
                </Typography>
              </Box>

              {/* Balance Warning */}
              {!isBalanced && projectSummary.total_contract > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  ⚠️ Project not balanced: Total Contract ({formatCurrency(projectSummary.total_contract)})
                  ≠ Down Payment ({formatCurrency(projectSummary.down_payment)}) +
                  All Phases ({formatCurrency(projectSummary.sum_of_phases)})
                </Alert>
              )}
              </Box>
            )}
          </Paper>
        )}

        <Box display="flex" flexDirection="column" gap={3}>
          {/* PHASE STATUS */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Phase Status
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={getStatusLabel(paymentStatus)}
                color={getStatusColor(paymentStatus) as any}
                icon={getStatusIcon(paymentStatus) || undefined}
              />
              {phasePercentage > 0 && (
                <Chip
                  label={`${phasePercentage.toFixed(1)}% of Project`}
                  color="info"
                  size="small"
                />
              )}
            </Box>
            {remaining > 0 && (
              <Typography variant="h6" color="error.main" sx={{ mt: 2 }}>
                Phase Remaining: {formatCurrency(remaining)}
              </Typography>
            )}
          </Box>

          {/* PHASE PAYMENT FIELDS */}
          <TextField
            fullWidth
            type="number"
            label="Total Phase Amount"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            helperText={phasePercentage > 0
              ? `This phase = ${phasePercentage.toFixed(1)}% of total project`
              : "How much should the client pay for this phase?"}
          />

          <TextField
            fullWidth
            type="number"
            label="Amount Already Paid"
            value={paidAmount}
            onChange={(e) => {
              const paid = parseFloat(e.target.value || '0');
              const total = parseFloat(totalAmount || '0');
              setPaidAmount(e.target.value);

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

          {totalAmount && (
            <Box sx={{ p: 2, bgcolor: remaining > 0 ? 'warning.50' : 'success.50', borderRadius: 2 }}>
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
