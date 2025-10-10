import React from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Button,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  VpnKey as EarlyAccessIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  FastForward as FastForwardIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { ProjectPhase, User } from '../../../types';

interface ProjectPhasesListProps {
  phases: ProjectPhase[];
  isSupervisor: boolean;
  user: User | null;
  calculatePhaseProgress: (phase: ProjectPhase) => number;
  getPhaseDisplayStatus: (phase: ProjectPhase) => string;
  getStatusColor: (status: string) => 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  getEarlyAccessStatusColor: (status: string) => 'success' | 'primary' | 'default';
  canStartWithEarlyAccess: (phase: ProjectPhase) => boolean;
  isEarlyAccessAvailable: (phase: ProjectPhase) => boolean;
  onPhaseAction: (phaseId: number, action: string, note?: string) => Promise<void>;
  onStartPhaseWithEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
  onGrantEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
  onRevokeEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
  onToggleWarning: (phaseId: number, currentState: boolean) => Promise<void>;
  onEditDates: (phase: ProjectPhase) => void;
}

const ProjectPhasesList: React.FC<ProjectPhasesListProps> = ({
  phases,
  isSupervisor,
  user,
  calculatePhaseProgress,
  getPhaseDisplayStatus,
  getStatusColor,
  getEarlyAccessStatusColor,
  canStartWithEarlyAccess,
  isEarlyAccessAvailable,
  onPhaseAction,
  onStartPhaseWithEarlyAccess,
  onGrantEarlyAccess,
  onRevokeEarlyAccess,
  onToggleWarning,
  onEditDates
}) => {
  return (
    <Box>
      {phases.map((phase) => (
        <Accordion key={phase.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6">{phase.phase_name}</Typography>
                <Chip
                  label={getPhaseDisplayStatus(phase)}
                  color={phase.early_access_granted
                    ? getEarlyAccessStatusColor(phase.early_access_status) as any
                    : getStatusColor(phase.status) as any}
                  size="small"
                />
                {phase.early_access_granted && (
                  <Chip
                    icon={<EarlyAccessIcon />}
                    label="Early Access"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  {phase.planned_weeks} weeks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(calculatePhaseProgress(phase))}%
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Phase Information and Hours - Responsive Layout */}
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3
              }}>
                {/* Phase Information */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Phase Details
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography variant="body2">
                      <strong>Order:</strong> {phase.phase_order}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Type:</strong> {phase.is_custom ? 'Custom Phase' : 'Standard Phase'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Planned Start:</strong> {phase.planned_start_date ? new Date(phase.planned_start_date).toLocaleDateString() : 'Not set'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Planned End:</strong> {phase.planned_end_date ? new Date(phase.planned_end_date).toLocaleDateString() : 'Not set'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Actual Start:</strong> {phase.actual_start_date ? new Date(phase.actual_start_date).toLocaleDateString() : 'Not started'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Actual End:</strong> {phase.actual_end_date ? new Date(phase.actual_end_date).toLocaleDateString() : 'Not completed'}
                    </Typography>
                    {isSupervisor && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DateRangeIcon />}
                          onClick={() => onEditDates(phase)}
                        >
                          Edit Phase Dates
                        </Button>
                      </Box>
                    )}
                    {phase.early_access_granted && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                          <EarlyAccessIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' }} />
                          Early Access Granted
                        </Typography>
                        <Typography variant="body2">
                          <strong>Status:</strong> {phase.early_access_status?.replace('_', ' ') || 'Unknown'}
                        </Typography>
                        {phase.early_access_granted_at && (
                          <Typography variant="body2">
                            <strong>Granted At:</strong> {new Date(phase.early_access_granted_at).toLocaleDateString()}
                          </Typography>
                        )}
                        {phase.early_access_note && (
                          <Typography variant="body2">
                            <strong>Note:</strong> {phase.early_access_note}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                {/* Phase Hours and Progress */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Hours & Progress
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography variant="body2">
                      <strong>Planned Weeks:</strong> {phase.planned_weeks}
                    </Typography>
                    {phase.predicted_hours && (
                      <Typography variant="body2">
                        <strong>Predicted Hours:</strong> {phase.predicted_hours}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Actual Hours:</strong> {phase.actual_hours || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Progress Hours:</strong> {Math.round(calculatePhaseProgress(phase))}%
                    </Typography>
                    {phase.actual_progress !== undefined && phase.actual_progress !== null && (
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        <strong>Actual Working Progress:</strong> {Math.round(phase.actual_progress)}%
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Delay Reason:</strong> {phase.delay_reason === 'none' ? 'No delays' : phase.delay_reason}
                    </Typography>
                    {phase.warning_flag && (
                      <Chip
                        icon={<WarningIcon />}
                        label="Warning Flag"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Phase Actions */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Phase Actions
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {/* Standard Phase Actions */}
                  {(phase.status === 'ready' || canStartWithEarlyAccess(phase)) && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={phase.early_access_granted && phase.early_access_status === 'accessible' ? <FastForwardIcon /> : <PlayArrowIcon />}
                      onClick={() => onStartPhaseWithEarlyAccess(phase.id,
                        phase.early_access_granted ? 'Starting phase with early access' : 'Starting phase normally')}
                    >
                      {phase.early_access_granted && phase.early_access_status === 'accessible' ? 'Start with Early Access' : 'Start Phase'}
                    </Button>
                  )}
                  {phase.status === 'in_progress' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onPhaseAction(phase.id, 'submit')}
                    >
                      Submit for Review
                    </Button>
                  )}
                  {phase.status === 'submitted' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => onPhaseAction(phase.id, 'approve')}
                    >
                      Approve Phase
                    </Button>
                  )}
                  {phase.status === 'approved' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => onPhaseAction(phase.id, 'complete')}
                    >
                      Mark Complete
                    </Button>
                  )}

                  {/* Early Access Controls - Supervisor Only */}
                  {isSupervisor && (
                    <>
                      {isEarlyAccessAvailable(phase) && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<LockOpenIcon />}
                          onClick={() => onGrantEarlyAccess(phase.id, `Early access granted for ${phase.phase_name} by ${user?.name}`)}
                        >
                          Grant Early Access
                        </Button>
                      )}
                      {phase.early_access_granted && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<LockIcon />}
                          onClick={() => onRevokeEarlyAccess(phase.id, `Early access revoked for ${phase.phase_name} by ${user?.name}`)}
                        >
                          Revoke Early Access
                        </Button>
                      )}
                    </>
                  )}

                  {/* Warning Toggle */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => onToggleWarning(phase.id, phase.warning_flag)}
                  >
                    {phase.warning_flag ? 'Remove Warning' : 'Add Warning'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ProjectPhasesList;
