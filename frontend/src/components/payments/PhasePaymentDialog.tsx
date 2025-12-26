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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface PhasePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName: string;
  onSuccess: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const PhasePaymentDialog: React.FC<PhasePaymentDialogProps> = ({
  open,
  onClose,
  phaseId,
  phaseName,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  // Payment Info Form
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paymentDeadline, setPaymentDeadline] = useState<string>('');
  const [paymentRequestDate, setPaymentRequestDate] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // New Payment Transaction Form
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<string>('partial');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');

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
        setPaymentData(response.data);

        // Pre-fill form with existing data
        const { phase } = response.data;
        setTotalAmount(phase.total_amount || '');
        setPaymentDeadline(phase.payment_deadline || '');
        setPaymentRequestDate(phase.payment_request_date || '');
        setPaymentNotes(phase.payment_notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.updatePhasePaymentInfo(phaseId, {
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        payment_deadline: paymentDeadline || null,
        payment_request_date: paymentRequestDate || null,
        payment_notes: paymentNotes || null
      });

      if (response.success) {
        await loadPaymentData();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || !paymentDate) {
      setError('Payment amount and date are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.addPhasePayment(phaseId, {
        payment_amount: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_type: paymentType,
        payment_method: paymentMethod,
        notes: transactionNotes
      });

      if (response.success) {
        // Reset form
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentType('partial');
        setPaymentMethod('');
        setTransactionNotes('');

        await loadPaymentData();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment transaction?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.deletePhasePayment(paymentId);

      if (response.success) {
        await loadPaymentData();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
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

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return 'Fully Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'unpaid':
        return 'Unpaid';
      default:
        return status;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'upfront':
        return 'Upfront (Before Start)';
      case 'milestone':
        return 'Milestone';
      case 'final':
        return 'Final Payment';
      case 'partial':
        return 'Partial Payment';
      default:
        return type;
    }
  };

  if (loading && !paymentData) {
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

  const summary = paymentData?.summary || {};
  const payments = paymentData?.payments || [];
  const percentagePaid = summary.totalAmount
    ? ((summary.paidAmount / summary.totalAmount) * 100).toFixed(1)
    : 0;

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

        {/* Payment Summary Card */}
        {summary.totalAmount && (
          <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(summary.totalAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Box>
                    <Chip
                      label={getPaymentStatusLabel(summary.paymentStatus)}
                      color={getPaymentStatusColor(summary.paymentStatus) as any}
                      size="small"
                      icon={
                        summary.paymentStatus === 'fully_paid' ? (
                          <CheckCircleIcon />
                        ) : (
                          <WarningIcon />
                        )
                      }
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Paid: {formatCurrency(summary.paidAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Remaining: {formatCurrency(summary.remainingAmount)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(Number(percentagePaid), 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={
                        summary.paymentStatus === 'fully_paid'
                          ? 'success'
                          : summary.paymentStatus === 'partially_paid'
                          ? 'warning'
                          : 'error'
                      }
                    />
                    <Typography variant="caption" color="text.secondary" align="center" display="block">
                      {percentagePaid}% paid
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Payment Info" />
          <Tab label={`Transactions (${payments.length})`} />
        </Tabs>

        {/* Tab 1: Payment Information */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Alert severity="info" icon={<InfoIcon />}>
              Set the total payment amount for this phase and track when you should receive payment.
            </Alert>

            <TextField
              fullWidth
              type="number"
              label="Total Phase Amount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Total contracted amount for this phase"
            />

            <TextField
              fullWidth
              type="date"
              label="Payment Deadline"
              value={paymentDeadline}
              onChange={(e) => setPaymentDeadline(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="When should you receive payment?"
            />

            <TextField
              fullWidth
              type="date"
              label="Payment Request Date"
              value={paymentRequestDate}
              onChange={(e) => setPaymentRequestDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="When should you request payment from the client?"
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Add any notes about payment terms..."
            />

            <Button
              variant="contained"
              onClick={handleSavePaymentInfo}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Save Payment Information
            </Button>
          </Box>
        </TabPanel>

        {/* Tab 2: Payment Transactions */}
        <TabPanel value={activeTab} index={1}>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Add New Payment Form */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AddIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Record Payment Received
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Payment Amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="date"
                      label="Payment Date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Type</InputLabel>
                      <Select
                        value={paymentType}
                        label="Payment Type"
                        onChange={(e) => setPaymentType(e.target.value)}
                      >
                        <MenuItem value="upfront">Upfront (Before Start)</MenuItem>
                        <MenuItem value="milestone">Milestone</MenuItem>
                        <MenuItem value="partial">Partial Payment</MenuItem>
                        <MenuItem value="final">Final Payment</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Payment Method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="e.g., Bank Transfer, Cash, Check"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Notes"
                      value={transactionNotes}
                      onChange={(e) => setTransactionNotes(e.target.value)}
                      placeholder="Add any notes about this payment..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleAddPayment}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      Add Payment
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Payment History Table */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Payment History
            </Typography>
            {payments.length === 0 ? (
              <Alert severity="info">No payments recorded yet.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Recorded By</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {formatCurrency(payment.payment_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={getPaymentTypeLabel(payment.payment_type)} size="small" />
                        </TableCell>
                        <TableCell>{payment.payment_method || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                            {payment.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {payment.recorded_by_name || 'System'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhasePaymentDialog;
