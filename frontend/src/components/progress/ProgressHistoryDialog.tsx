import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  PictureAsPdf as PdfIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { ProgressAdjustment } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProgressHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName: string;
  engineerId?: number;
  fetchHistory: (phaseId: number, engineerId?: number) => Promise<ProgressAdjustment[]>;
}

const ProgressHistoryDialog: React.FC<ProgressHistoryDialogProps> = ({
  open,
  onClose,
  phaseId,
  phaseName,
  engineerId,
  fetchHistory
}) => {
  // PDF export functionality
  const [history, setHistory] = useState<ProgressAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, phaseId, engineerId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(phaseId, engineerId);
      setHistory(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load progress history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchTerm ||
      item.engineer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.adjusted_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.adjustment_reason?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'success';
    if (Math.abs(variance) < 10) return 'warning';
    return 'error';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 2) return <TrendingUpIcon fontSize="small" />;
    if (variance < -2) return <TrendingDownIcon fontSize="small" />;
    return null;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Progress Adjustment History`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Phase: ${phaseName}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    // Prepare table data
    const tableData = filteredHistory.map(item => {
      const hoursLogged = Number(item.hours_logged) || 0;
      const hoursBasedProgress = Number(item.hours_based_progress) || 0;
      const manualProgress = Number(item.manual_progress_percentage) || 0;
      const variance = manualProgress - hoursBasedProgress;
      return [
        formatDate(item.created_at),
        item.engineer_name || 'N/A',
        item.adjusted_by_name || 'N/A',
        item.adjustment_type === 'work_log_entry' ? 'Entry' : 'Overall',
        hoursLogged.toFixed(2),
        hoursBasedProgress.toFixed(1) + '%',
        manualProgress.toFixed(1) + '%',
        (variance > 0 ? '+' : '') + variance.toFixed(1) + '%',
        item.adjustment_reason
      ];
    });

    // Generate table
    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Engineer', 'Adjusted By', 'Type', 'Hours', 'Actual Hour Progress', 'Actual Working Progress (Supervisor)', 'Variance', 'Reason']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    // Save PDF
    doc.save(`progress_history_${phaseName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          Progress Adjustment History - {phaseName}
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by engineer, supervisor, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Export to PDF">
            <span>
              <IconButton onClick={exportToPDF} disabled={filteredHistory.length === 0}>
                <PdfIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredHistory.length === 0 ? (
          <Alert severity="info">
            {history.length === 0
              ? 'No progress adjustments have been made yet.'
              : 'No adjustments match your current filters.'}
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell align="right">Actual Hour Progress</TableCell>
                  <TableCell align="right">Actual Working Progress (Supervisor)</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell>Adjusted By</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((item) => {
                  const variance = item.manual_progress_percentage - item.hours_based_progress;
                  const varianceColor = getVarianceColor(variance);

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {formatDate(item.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.engineer_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.adjustment_type === 'work_log_entry' ? 'Entry' : 'Overall'}
                          size="small"
                          color={item.adjustment_type === 'work_log_entry' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {(Number(item.hours_logged) || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(Number(item.hours_based_progress) || 0).toFixed(1)}%`}
                          size="small"
                          color="default"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(Number(item.manual_progress_percentage) || 0).toFixed(1)}%`}
                          size="small"
                          color={varianceColor}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          {getVarianceIcon(variance)}
                          <Chip
                            label={`${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`}
                            size="small"
                            color={varianceColor}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.adjusted_by_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={item.adjustment_reason} arrow>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'help'
                            }}
                          >
                            {item.adjustment_reason}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary */}
        {filteredHistory.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredHistory.length} of {history.length} adjustments
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressHistoryDialog;
