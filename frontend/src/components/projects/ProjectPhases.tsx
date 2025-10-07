import React, { memo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  AssessmentOutlined as AssessmentIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { ProjectPhase } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import PhaseProgressSummary from '../progress/PhaseProgressSummary';

interface ProjectPhasesProps {
  phases: ProjectPhase[];
  onPhaseAction: (phaseId: number, action: string, note?: string) => void;
  onAddPhase: () => void;
  onReorderPhases: () => void;
  loading: boolean;
  onProgressUpdated?: () => void;
}

const ProjectPhases: React.FC<ProjectPhasesProps> = memo(({
  phases,
  onPhaseAction,
  onAddPhase,
  onReorderPhases,
  loading,
  onProgressUpdated
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  const [phaseMenus, setPhaseMenus] = useState<{ [key: number]: HTMLElement | null }>({});
  const [progressSummaryOpen, setProgressSummaryOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null);

  const handlePhaseMenuOpen = useCallback((phaseId: number, event: React.MouseEvent<HTMLElement>) => {
    setPhaseMenus(prev => ({ ...prev, [phaseId]: event.currentTarget }));
  }, []);

  const handlePhaseMenuClose = useCallback((phaseId: number) => {
    setPhaseMenus(prev => ({ ...prev, [phaseId]: null }));
  }, []);

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'ready': return 'info';
      case 'in_progress': return 'primary';
      case 'submitted': return 'warning';
      case 'approved': return 'secondary';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'in_progress': return <PlayArrowIcon />;
      case 'ready': return <PlayArrowIcon />;
      default: return <AccessTimeIcon />;
    }
  };

  const getPhaseActions = (phase: ProjectPhase) => {
    const actions = [];

    if (isSupervisor) {
      switch (phase.status) {
        case 'not_started':
          actions.push({ label: 'Mark Ready', action: 'ready' });
          break;
        case 'ready':
          actions.push({ label: 'Start Phase', action: 'start' });
          break;
        case 'in_progress':
          actions.push({ label: 'Submit for Review', action: 'submit' });
          actions.push({ label: 'Flag Warning', action: 'warning' });
          break;
        case 'submitted':
          actions.push({ label: 'Approve', action: 'approve' });
          actions.push({ label: 'Return to Progress', action: 'return' });
          break;
        case 'approved':
          actions.push({ label: 'Complete Phase', action: 'complete' });
          break;
      }

      if (phase.status !== 'completed') {
        actions.push({ label: 'Edit Phase', action: 'edit' });
      }
    }

    return actions;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateProgress = (phase: ProjectPhase) => {
    // Use actual_progress if available (from database), otherwise calculate
    if (phase.actual_progress !== undefined && phase.actual_progress !== null) {
      return phase.actual_progress;
    }
    if (phase.predicted_hours && phase.predicted_hours > 0) {
      return Math.min((phase.actual_hours / phase.predicted_hours) * 100, 100);
    }
    return 0;
  };

  const getProgressVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'success';
    if (Math.abs(variance) < 10) return 'warning';
    return 'error';
  };

  const handleManageProgress = (phase: ProjectPhase) => {
    setSelectedPhase(phase);
    setProgressSummaryOpen(true);
  };

  if (phases.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Phases
          </Typography>
          <Alert severity="info">
            No phases have been created for this project yet.
          </Alert>
          {isSupervisor && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={onAddPhase}>
                Add First Phase
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Project Phases ({phases.length})
          </Typography>

          {isSupervisor && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={onReorderPhases}
                disabled={loading || phases.length < 2}
              >
                Reorder
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={onAddPhase}
                disabled={loading}
              >
                Add Phase
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {phases.map((phase, index) => (
            <Accordion key={phase.id} defaultExpanded={phase.status === 'in_progress'}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium" sx={{ mr: 2 }}>
                      {index + 1}. {phase.phase_name}
                    </Typography>

                    <Chip
                      icon={getPhaseStatusIcon(phase.status)}
                      label={phase.status.replace('_', ' ').toUpperCase()}
                      color={getPhaseStatusColor(phase.status) as any}
                      size="small"
                      sx={{ mr: 1 }}
                    />

                    {phase.warning_flag && (
                      <Tooltip title="Phase has warnings">
                        <WarningIcon color="warning" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>

                  {isSupervisor && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePhaseMenuOpen(phase.id, e);
                      }}
                      disabled={loading}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Timeline:</strong>
                    </Typography>
                    <Typography variant="body2">
                      Planned: {formatDate(phase.planned_start_date)} - {formatDate(phase.planned_end_date)}
                    </Typography>
                    {(phase.actual_start_date || phase.actual_end_date) && (
                      <Typography variant="body2">
                        Actual: {formatDate(phase.actual_start_date)} - {formatDate(phase.actual_end_date)}
                      </Typography>
                    )}

                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                      <strong>Duration:</strong> {phase.planned_weeks} weeks
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Progress:</strong>
                      </Typography>
                      {isSupervisor && phase.predicted_hours && phase.predicted_hours > 0 && (
                        <Button
                          size="small"
                          startIcon={<AssessmentIcon />}
                          onClick={() => handleManageProgress(phase)}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                        >
                          Manage Progress
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {phase.actual_hours} / {phase.predicted_hours || 0} hours
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {phase.calculated_progress !== undefined && phase.actual_progress !== undefined &&
                         Math.abs(phase.progress_variance || 0) > 2 && (
                          <Tooltip title={`Calculated: ${phase.calculated_progress.toFixed(1)}% | Actual: ${phase.actual_progress.toFixed(1)}%`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {(phase.progress_variance || 0) > 0 ? (
                                <TrendingUpIcon fontSize="small" color={getProgressVarianceColor(phase.progress_variance || 0)} />
                              ) : (
                                <TrendingDownIcon fontSize="small" color={getProgressVarianceColor(phase.progress_variance || 0)} />
                              )}
                              <Chip
                                label={`${(phase.progress_variance || 0) > 0 ? '+' : ''}${(phase.progress_variance || 0).toFixed(1)}%`}
                                size="small"
                                color={getProgressVarianceColor(phase.progress_variance || 0)}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Tooltip>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {calculateProgress(phase).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    <Tooltip
                      title={
                        phase.calculated_progress !== undefined && phase.actual_progress !== undefined
                          ? `Calculated: ${phase.calculated_progress.toFixed(1)}% | Actual: ${phase.actual_progress.toFixed(1)}% | Variance: ${(phase.progress_variance || 0).toFixed(1)}%`
                          : ''
                      }
                      arrow
                    >
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(calculateProgress(phase), 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: calculateProgress(phase) > 100
                              ? 'warning.main'
                              : Math.abs(phase.progress_variance || 0) > 10
                              ? 'error.main'
                              : Math.abs(phase.progress_variance || 0) > 5
                              ? 'warning.main'
                              : 'success.main'
                          }
                        }}
                      />
                    </Tooltip>

                    {phase.delay_reason !== 'none' && (
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                        Delay reason: {phase.delay_reason}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Phase Action Menus */}
        {Object.entries(phaseMenus).map(([phaseId, anchorEl]) => {
          const phase = phases.find(p => p.id === parseInt(phaseId));
          if (!phase || !anchorEl) return null;

          const actions = getPhaseActions(phase);

          return (
            <Menu
              key={phaseId}
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => handlePhaseMenuClose(phase.id)}
            >
              {actions.map((action) => (
                <MenuItem
                  key={action.action}
                  onClick={() => {
                    onPhaseAction(phase.id, action.action);
                    handlePhaseMenuClose(phase.id);
                  }}
                  disabled={loading}
                >
                  {action.label}
                </MenuItem>
              ))}
            </Menu>
          );
        })}
      </CardContent>

      {/* Progress Summary Dialog */}
      {selectedPhase && (
        <PhaseProgressSummary
          open={progressSummaryOpen}
          onClose={() => setProgressSummaryOpen(false)}
          phaseId={selectedPhase.id}
          phaseName={selectedPhase.phase_name}
          predictedHours={selectedPhase.predicted_hours || 0}
          isSupervisor={isSupervisor}
          onProgressUpdated={onProgressUpdated}
        />
      )}
    </Card>
  );
});

ProjectPhases.displayName = 'ProjectPhases';

export default ProjectPhases;