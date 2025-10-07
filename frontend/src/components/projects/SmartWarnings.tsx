import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface SmartWarning {
  id: string;
  type: string;
  severity: 'critical' | 'urgent' | 'warning' | 'advisory';
  phase_name: string;
  message: string;
  days_overdue?: number;
  days_until_due?: number;
  due_date?: string;
  timestamp: string;
}

interface SmartWarningData {
  project_id: number;
  total_phases: number;
  warnings: SmartWarning[];
  total_warnings: number;
  total_risk_score: number;
  analysis_timestamp: string;
  summary: {
    delays: number;
    approaching_due_dates: number;
    overdue: number;
    flagged: number;
  };
}

interface SmartWarningsProps {
  projectId: number;
}

const SmartWarnings: React.FC<SmartWarningsProps> = ({ projectId }) => {
  const [warningData, setWarningData] = useState<SmartWarningData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSmartWarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5004/api/v1/smart-test/delays?project_id=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setWarningData(data.data);
      } else {
        setError(data.error || 'Failed to fetch smart warnings');
      }
    } catch (err) {
      setError('Network error: Could not connect to smart warning system');
      console.error('Smart warning error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSmartWarnings();
    }
  }, [projectId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'urgent': return 'warning';
      case 'warning': return 'warning';
      case 'advisory': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'urgent': return <WarningIcon />;
      case 'warning': return <WarningIcon />;
      case 'advisory': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    if (score >= 20) return 'info';
    return 'success';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <AlertTitle>Smart Warning System Error</AlertTitle>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon color="primary" />
            <Typography variant="h6">
              🧠 Smart Warning System
            </Typography>
            {warningData && (
              <Chip
                label={`Risk Score: ${warningData.total_risk_score}%`}
                color={getRiskScoreColor(warningData.total_risk_score)}
                size="small"
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh Analysis">
              <IconButton onClick={fetchSmartWarnings} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Collapse in={expanded}>
          {warningData ? (
            <Box>
              {/* Summary Stats */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="text.secondary">
                      {warningData.total_phases}
                    </Typography>
                    <Typography variant="caption">Total Phases</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {warningData.summary.delays}
                    </Typography>
                    <Typography variant="caption">Delays</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {warningData.summary.approaching_due_dates}
                    </Typography>
                    <Typography variant="caption">Due Soon</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {warningData.summary.overdue}
                    </Typography>
                    <Typography variant="caption">Overdue</Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Risk Score Bar */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Project Risk Level: {warningData.total_risk_score}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(warningData.total_risk_score, 100)}
                  color={getRiskScoreColor(warningData.total_risk_score)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Warnings List */}
              {warningData.warnings.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Active Warnings ({warningData.warnings.length})
                  </Typography>
                  {warningData.warnings.map((warning) => (
                    <Alert
                      key={warning.id}
                      severity={getSeverityColor(warning.severity) as any}
                      icon={getSeverityIcon(warning.severity)}
                      sx={{ mb: 1 }}
                    >
                      <AlertTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                          {warning.phase_name}
                          <Chip
                            label={warning.severity.toUpperCase()}
                            size="small"
                            color={getSeverityColor(warning.severity) as any}
                          />
                        </Box>
                      </AlertTitle>
                      <Typography variant="body2">
                        {warning.message}
                      </Typography>
                      {warning.due_date && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Due: {formatDate(warning.due_date)}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </Box>
              ) : (
                <Alert severity="success">
                  <AlertTitle>✅ All Clear!</AlertTitle>
                  No warnings detected. All phases are on track.
                </Alert>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Last analyzed: {new Date(warningData.analysis_timestamp).toLocaleString()}
              </Typography>
            </Box>
          ) : (
            !loading && (
              <Typography color="text.secondary">
                Click refresh to analyze project timeline...
              </Typography>
            )
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default SmartWarnings;