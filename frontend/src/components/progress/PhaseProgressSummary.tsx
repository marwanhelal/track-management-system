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
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  History as HistoryIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon,
  AssessmentOutlined as AssessmentIcon
} from '@mui/icons-material';
import { ProgressSummary } from '../../types';
import ProgressAdjustmentDialog from './ProgressAdjustmentDialog';
import ProgressHistoryDialog from './ProgressHistoryDialog';
import apiService from '../../services/api';

interface PhaseProgressSummaryProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName: string;
  predictedHours: number;
  isSupervisor: boolean;
  onProgressUpdated?: () => void;
}

const PhaseProgressSummary: React.FC<PhaseProgressSummaryProps> = ({
  open,
  onClose,
  phaseId,
  phaseName,
  predictedHours,
  isSupervisor,
  onProgressUpdated
}) => {
  const [summary, setSummary] = useState<ProgressSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    if (open) {
      loadSummary();
    }
  }, [open, phaseId]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getPhaseProgressSummary(phaseId);
      setSummary(response.data?.summary || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load progress summary');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustProgress = (engineer: ProgressSummary) => {
    setSelectedEngineer(engineer);
    setAdjustDialogOpen(true);
  };

  const handleViewHistory = (engineer: ProgressSummary) => {
    setSelectedEngineer(engineer);
    setHistoryDialogOpen(true);
  };

  const handleProgressAdjustmentSubmit = async (data: { manual_progress_percentage: number; adjustment_reason: string }) => {
    if (!selectedEngineer) return;

    try {
      await apiService.setPhaseEngineerProgress(
        selectedEngineer.phase_id,
        selectedEngineer.engineer_id,
        data
      );
      await loadSummary();
      if (onProgressUpdated) {
        onProgressUpdated();
      }
    } catch (err) {
      throw err;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'success';
    if (Math.abs(variance) < 10) return 'warning';
    return 'error';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 2) return <TrendingUpIcon fontSize="small" />;
    if (variance < -2) return <TrendingDownIcon fontSize="small" />;
    return <TrendingFlatIcon fontSize="small" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const avgCalculated = summary.length > 0
    ? summary.reduce((sum, s) => sum + s.calculated_progress, 0) / summary.length
    : 0;

  const avgActual = summary.length > 0
    ? summary.reduce((sum, s) => sum + s.actual_progress, 0) / summary.length
    : 0;

  const avgVariance = avgActual - avgCalculated;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Progress Summary - {phaseName}
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Phase Overview */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Phase Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Predicted Hours
                </Typography>
                <Typography variant="h6">
                  {predictedHours} hrs
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Avg. Progress Hours
                </Typography>
                <Typography variant="h6" color="primary">
                  {avgCalculated.toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Avg. Actual Work
                </Typography>
                <Typography variant="h6" color={getVarianceColor(avgVariance) === 'error' ? 'error' : 'success'}>
                  {avgActual.toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Avg. Variance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getVarianceIcon(avgVariance)}
                  <Typography variant="h6" color={getVarianceColor(avgVariance) + '.dark'}>
                    {avgVariance > 0 ? '+' : ''}{avgVariance.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Engineers
                </Typography>
                <Typography variant="h6">
                  {summary.length}
                </Typography>
              </Box>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : summary.length === 0 ? (
            <Alert severity="info">
              No engineers have logged work on this phase yet.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell>Engineer</TableCell>
                    <TableCell align="right">Hours Logged</TableCell>
                    <TableCell align="center">Progress Hours</TableCell>
                    <TableCell align="center">Actual Work</TableCell>
                    <TableCell align="center">Variance</TableCell>
                    <TableCell align="center">Progress Bar</TableCell>
                    <TableCell align="center">Last Adjustment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.map((engineer) => {
                    const varianceColor = getVarianceColor(engineer.variance);
                    const hasAdjustments = engineer.adjustment_count > 0;

                    return (
                      <TableRow key={engineer.engineer_id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {engineer.engineer_name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {engineer.engineer_name}
                              </Typography>
                              {hasAdjustments && (
                                <Typography variant="caption" color="text.secondary">
                                  {engineer.adjustment_count} adjustment{engineer.adjustment_count > 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {engineer.total_hours_logged.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            / {engineer.predicted_hours} hrs
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${engineer.calculated_progress.toFixed(1)}%`}
                            size="small"
                            color="default"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${engineer.actual_progress.toFixed(1)}%`}
                            size="small"
                            color={varianceColor}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {getVarianceIcon(engineer.variance)}
                            <Chip
                              label={`${engineer.variance > 0 ? '+' : ''}${engineer.variance.toFixed(1)}%`}
                              size="small"
                              color={varianceColor}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ width: 120 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(engineer.actual_progress, 100)}
                                sx={{
                                  flex: 1,
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: varianceColor === 'error' ? 'error.main' :
                                             varianceColor === 'warning' ? 'warning.main' : 'success.main'
                                  }
                                }}
                              />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>
                                {engineer.actual_progress.toFixed(0)}%
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <Typography variant="caption">
                              {formatDate(engineer.last_adjustment)}
                            </Typography>
                            {engineer.last_adjustment_by && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                by {engineer.last_adjustment_by}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {isSupervisor && (
                              <Tooltip title="Adjust Progress">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAdjustProgress(engineer)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="View History">
                              <IconButton
                                size="small"
                                onClick={() => handleViewHistory(engineer)}
                                color="default"
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Legend */}
          {summary.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" fontWeight="medium" gutterBottom>
                Variance Legend:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Chip label="< ±5% (Minor)" color="success" size="small" />
                <Chip label="±5% to ±10% (Moderate)" color="warning" size="small" />
                <Chip label="> ±10% (Significant)" color="error" size="small" />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Adjustment Dialog */}
      {selectedEngineer && (
        <ProgressAdjustmentDialog
          open={adjustDialogOpen}
          onClose={() => setAdjustDialogOpen(false)}
          onSubmit={handleProgressAdjustmentSubmit}
          engineerName={selectedEngineer.engineer_name}
          phaseName={phaseName}
          hoursLogged={selectedEngineer.total_hours_logged}
          predictedHours={selectedEngineer.predicted_hours}
          calculatedProgress={selectedEngineer.calculated_progress}
          currentActualProgress={selectedEngineer.actual_progress}
          isPhaseLevel={true}
        />
      )}

      {/* History Dialog */}
      {selectedEngineer && (
        <ProgressHistoryDialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          phaseId={phaseId}
          phaseName={phaseName}
          engineerId={selectedEngineer.engineer_id}
          fetchHistory={async (phaseId, engineerId) => {
            const response = await apiService.getProgressHistory(phaseId, engineerId);
            return response.data?.history || [];
          }}
        />
      )}
    </>
  );
};

export default PhaseProgressSummary;
