import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Grid,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Psychology as BrainIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import { smartWarningService, SmartWarningResponse } from '../../services/smartWarningService';

interface ProjectSmartWarningsProps {
  projectId: number;
  autoRefresh?: boolean;
  refreshTrigger?: Date | null;
}

const ProjectSmartWarnings: React.FC<ProjectSmartWarningsProps> = ({
  projectId,
  autoRefresh = false,
  refreshTrigger
}) => {
  const [warningData, setWarningData] = useState<SmartWarningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchWarnings = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('⚠️ Skipping duplicate fetch request for project', projectId);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    try {
      const data = await smartWarningService.getProjectWarnings(projectId);
      setWarningData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching smart warnings:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [projectId]);

  // Combined effect for initial load and auto-refresh
  useEffect(() => {
    if (projectId) {
      fetchWarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshTrigger]);

  const getRiskColor = (score: number) => {
    if (score >= 70) return '#f44336'; // red
    if (score >= 40) return '#ff9800'; // orange
    if (score >= 20) return '#2196f3'; // blue
    return '#4caf50'; // green
  };

  const getRiskEmoji = (score: number) => {
    if (score >= 70) return '🔴';
    if (score >= 40) return '🟠';
    if (score >= 20) return '🔵';
    return '🟢';
  };

  if (!warningData) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <BrainIcon color="primary" />
            <Typography variant="h6">🧠 Smart Warning System</Typography>
            {loading && <CircularProgress size={20} />}
          </Box>
          {!loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click refresh to analyze project timeline...
            </Typography>
          )}
          <IconButton onClick={fetchWarnings} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </CardContent>
      </Card>
    );
  }

  const { data } = warningData;
  const riskLevel = smartWarningService.getRiskLevel(data.total_risk_score);

  return (
    <Card sx={{ mb: 2, border: data.total_warnings > 0 ? '2px solid #ff9800' : undefined }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <BrainIcon color="primary" />
            <Typography variant="h6">
              🧠 Smart Warning System
            </Typography>
            <Chip
              label={`${getRiskEmoji(data.total_risk_score)} ${riskLevel.level}`}
              color={riskLevel.color}
              size="small"
            />
            {autoRefresh && (
              <Chip
                label="🔴 LIVE"
                color="success"
                variant="filled"
                size="small"
                sx={{ animation: 'pulse 2s infinite' }}
              />
            )}
          </Box>
          <Tooltip title="Refresh Analysis">
            <IconButton onClick={fetchWarnings} disabled={loading} size="small">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Risk Score Display */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <TrendingUpIcon sx={{ color: getRiskColor(data.total_risk_score) }} />
            <Typography variant="body1" fontWeight="bold">
              Risk Score: {data.total_risk_score}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 8,
              backgroundColor: '#f0f0f0',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${Math.min(data.total_risk_score, 100)}%`,
                height: '100%',
                backgroundColor: getRiskColor(data.total_risk_score),
                transition: 'width 0.3s ease'
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {riskLevel.description}
          </Typography>
        </Box>

        {/* Professional Metrics Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {data.total_phases}
              </Typography>
              <Typography variant="caption">Total Phases</Typography>
            </Box>
          </Grid>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="warning.main" fontWeight="bold">
                {data.total_warnings}
              </Typography>
              <Typography variant="caption">Warnings</Typography>
            </Box>
          </Grid>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {data.health_score || 0}%
              </Typography>
              <Typography variant="caption">Health Score</Typography>
            </Box>
          </Grid>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="info.main" fontWeight="bold">
                {data.completion_percentage || 0}%
              </Typography>
              <Typography variant="caption">Complete</Typography>
            </Box>
          </Grid>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="error.main" fontWeight="bold">
                {data.summary.overdue + data.summary.approaching_due_dates}
              </Typography>
              <Typography variant="caption">At Risk</Typography>
            </Box>
          </Grid>
          <Grid item xs={2}>
            <Box textAlign="center">
              <Typography variant="h5" color="secondary.main" fontWeight="bold">
                {data.project_velocity || 0}
              </Typography>
              <Typography variant="caption">Velocity</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Predictive Analytics */}
        {data.estimated_completion_weeks && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📈 Predictive Analytics
            </Typography>
            <Typography variant="body2" color="info.contrastText">
              <strong>Estimated Completion:</strong> {data.estimated_completion_weeks} weeks remaining
              {data.project_velocity && (
                <> • <strong>Current Velocity:</strong> {data.project_velocity} phases/week</>
              )}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Warnings Display */}
        {data.warnings.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              Active Warnings ({data.warnings.length})
            </Typography>
            {data.warnings.map((warning) => (
              <Box
                key={warning.id}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor: smartWarningService.getSeverityColor(warning.severity) === 'error' ? '#ffebee' :
                                   smartWarningService.getSeverityColor(warning.severity) === 'warning' ? '#fff8e1' : '#e3f2fd',
                  borderLeft: `4px solid ${smartWarningService.getSeverityColor(warning.severity) === 'error' ? '#f44336' :
                                            smartWarningService.getSeverityColor(warning.severity) === 'warning' ? '#ff9800' : '#2196f3'}`,
                  borderRadius: 1
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {smartWarningService.getWarningIcon(warning.type)} {warning.phase_name}
                  </Typography>
                  <Chip
                    label={warning.severity.toUpperCase()}
                    color={smartWarningService.getSeverityColor(warning.severity)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.primary">
                  {warning.message}
                </Typography>
                {warning.due_date && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 14 }} />
                    Due: {smartWarningService.formatDate(warning.due_date)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box textAlign="center" py={2}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              ✅ All Clear!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No warnings detected. All phases are on track.
            </Typography>
          </Box>
        )}

        {/* Professional Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              💡 Intelligent Recommendations ({data.recommendations.length})
            </Typography>
            {data.recommendations.map((rec: any) => (
              <Box
                key={rec.id}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor: rec.category === 'immediate' ? '#ffebee' : '#e3f2fd',
                  borderLeft: `4px solid ${rec.category === 'immediate' ? '#f44336' : '#2196f3'}`,
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                  🎯 {rec.title} (Priority: {rec.priority}%)
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                  {rec.description}
                </Typography>
                {rec.action_items && (
                  <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                    {rec.action_items.map((item: string, index: number) => (
                      <Typography component="li" variant="caption" key={index} sx={{ mb: 0.5 }}>
                        {item}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Professional Risk Assessment */}
        {data.risk_assessment && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              📊 Risk Assessment
            </Typography>
            <Box sx={{
              p: 2,
              backgroundColor: data.risk_assessment.level === 'critical' ? '#ffebee' :
                             data.risk_assessment.level === 'high' ? '#fff8e1' :
                             data.risk_assessment.level === 'medium' ? '#e3f2fd' : '#e8f5e8',
              borderRadius: 1,
              border: `1px solid ${data.risk_assessment.level === 'critical' ? '#f44336' :
                                  data.risk_assessment.level === 'high' ? '#ff9800' :
                                  data.risk_assessment.level === 'medium' ? '#2196f3' : '#4caf50'}`
            }}>
              <Typography variant="body2" fontWeight="bold">
                Risk Level: {data.risk_assessment.level.toUpperCase()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.risk_assessment.description}
              </Typography>
              {data.risk_assessment.mitigation_required && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                  ⚠️ Mitigation actions recommended
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Footer */}
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            🕒 Last analyzed: {lastUpdated.toLocaleString()} • Professional AI Analysis System ✨
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectSmartWarnings;