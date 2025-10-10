import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

// Import custom hooks
import {
  useProjectData,
  useProjectSocket,
  useProjectTeam,
  useProjectEarlyAccess
} from '../hooks/projects';

// Import extracted components
import {
  ProjectHeader,
  ProjectStats,
  ProjectPhasesList
} from '../components/projects/details';

// Import existing dialogs
import ExportDialog from '../components/projects/ExportDialog';
import EditProjectDialog from '../components/projects/EditProjectDialog';
import AddPhaseDialog from '../components/projects/AddPhaseDialog';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import EditPhaseDatesDialog from '../components/phases/EditPhaseDatesDialog';

import { ProjectPhase, Project } from '../types';

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
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSupervisor, user } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'info' | 'warning' | 'error'
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false });
  const [exportDialog, setExportDialog] = useState({ open: false });
  const [editProjectDialog, setEditProjectDialog] = useState({ open: false });
  const [addPhaseDialog, setAddPhaseDialog] = useState({ open: false });
  const [editPhaseDatesDialog, setEditPhaseDatesDialog] = useState<{
    open: boolean;
    phase: ProjectPhase | null;
  }>({ open: false, phase: null });

  // Custom hooks for data and business logic
  const { project, phases, workLogs, loading, error, refetch } = useProjectData(id);

  useProjectSocket({
    projectId: project?.id,
    onRefresh: refetch,
    onNotification: (message, severity) => {
      setSnackbar({ open: true, message, severity });
    }
  });

  const teamHook = useProjectTeam(workLogs);
  const earlyAccessHook = useProjectEarlyAccess(refetch);

  // Helper functions
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'active': return 'success';
      case 'on_hold': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      case 'in_progress': return 'primary';
      case 'ready': return 'success';
      case 'submitted': return 'info';
      case 'approved': return 'success';
      default: return 'default';
    }
  };

  const calculateProjectProgress = (): number => {
    if (phases.length === 0) return 0;

    // Calculate total progress from all phases
    const totalProgress = phases.reduce((sum, phase) => {
      return sum + calculatePhaseProgress(phase);
    }, 0);

    return phases.length > 0 ? totalProgress / phases.length : 0;
  };

  const calculatePhaseProgress = (phase: ProjectPhase): number => {
    // If manually set progress exists, use it
    if (phase.actual_progress !== null && phase.actual_progress !== undefined) {
      return phase.actual_progress;
    }

    // Calculate progress based on work logs for this phase
    const phaseWorkLogs = workLogs.filter(log => log.phase_id === phase.id);
    const totalHours = phaseWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);

    // Check if predicted_hours is a valid number greater than 0
    if (phase.predicted_hours && parseFloat(phase.predicted_hours.toString()) > 0) {
      return Math.min(100, (totalHours / parseFloat(phase.predicted_hours.toString())) * 100);
    }

    return phase.status === 'completed' || phase.status === 'approved' ? 100 : 0;
  };

  // Event handlers
  const handleDeleteProject = () => {
    setDeleteDialog({ open: true });
  };

  const confirmDeleteProject = async () => {
    try {
      await apiService.deleteProject(parseInt(id!));
      setSnackbar({ open: true, message: 'Project deleted successfully', severity: 'success' });
      navigate('/projects');
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete project', severity: 'error' });
    }
    setDeleteDialog({ open: false });
  };

  const handlePhaseAction = async (phaseId: number, action: string, note?: string) => {
    try {
      switch (action) {
        case 'submit':
          await apiService.submitPhase(phaseId, note);
          break;
        case 'approve':
          await apiService.approvePhase(phaseId, note);
          break;
        case 'complete':
          await apiService.completePhase(phaseId, note);
          break;
      }
      await refetch();
      setSnackbar({ open: true, message: `Phase ${action} successful`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Failed to ${action} phase`, severity: 'error' });
    }
  };

  const handleToggleWarning = async (phaseId: number, currentState: boolean) => {
    try {
      await apiService.markPhaseWarning(phaseId, !currentState);
      await refetch();
      setSnackbar({
        open: true,
        message: `Warning ${!currentState ? 'added' : 'removed'} successfully`,
        severity: 'info'
      });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to toggle warning', severity: 'error' });
    }
  };

  const handleEditDates = (phase: ProjectPhase) => {
    setEditPhaseDatesDialog({ open: true, phase });
  };

  const handleSaveProject = async (updatedProject: Partial<Project>) => {
    try {
      await apiService.updateProject(parseInt(id!), updatedProject);
      await refetch();
      setSnackbar({ open: true, message: 'Project updated successfully', severity: 'success' });
      setEditProjectDialog({ open: false });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update project', severity: 'error' });
    }
  };

  const handleSavePhase = async (phaseData: any) => {
    try {
      await apiService.createPhase(parseInt(id!), phaseData);
      await refetch();
      setSnackbar({ open: true, message: 'Phase created successfully', severity: 'success' });
      setAddPhaseDialog({ open: false });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create phase', severity: 'error' });
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading project details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>Project not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header - Using extracted component */}
      <ProjectHeader
        project={project}
        onDelete={handleDeleteProject}
        getStatusColor={getStatusColor}
      />

      {/* Stats - Using extracted component */}
      <ProjectStats
        project={project}
        phases={phases}
        calculateProjectProgress={calculateProjectProgress}
      />

      {/* Tabs Navigation */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="project tabs"
          >
            <Tab label="Phases" icon={<AssignmentIcon />} />
            <Tab label="Work Logs" icon={<AccessTimeIcon />} />
            <Tab label="Team" icon={<PersonIcon />} />
            <Tab label="Settings" icon={<EditIcon />} />
          </Tabs>
        </Box>

        {/* Phases Tab - Using extracted component */}
        <TabPanel value={activeTab} index={0}>
          <ProjectPhasesList
            phases={phases}
            isSupervisor={isSupervisor}
            user={user}
            calculatePhaseProgress={calculatePhaseProgress}
            getPhaseDisplayStatus={earlyAccessHook.getPhaseDisplayStatus}
            getStatusColor={getStatusColor}
            getEarlyAccessStatusColor={earlyAccessHook.getEarlyAccessStatusColor}
            canStartWithEarlyAccess={earlyAccessHook.canStartWithEarlyAccess}
            isEarlyAccessAvailable={earlyAccessHook.isEarlyAccessAvailable}
            onPhaseAction={handlePhaseAction}
            onStartPhaseWithEarlyAccess={earlyAccessHook.startPhaseWithEarlyAccess}
            onGrantEarlyAccess={earlyAccessHook.grantEarlyAccess}
            onRevokeEarlyAccess={earlyAccessHook.revokeEarlyAccess}
            onToggleWarning={handleToggleWarning}
            onEditDates={handleEditDates}
          />
        </TabPanel>

        {/* Work Logs Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>Work Logs</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell>{log.engineer_name}</TableCell>
                    <TableCell>{log.phase_name}</TableCell>
                    <TableCell>{log.hours}h</TableCell>
                    <TableCell>{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {workLogs.length > 20 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Showing 20 of {workLogs.length} work logs
            </Typography>
          )}
        </TabPanel>

        {/* Team Tab - Using custom hook data */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>Team Performance</Typography>

          {/* Team Analytics Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {teamHook.teamMembers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Team Members
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {teamHook.teamAnalytics.totalProductivity.toFixed(1)}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Hours/Person
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {teamHook.teamAnalytics.averageHoursPerDay.toFixed(1)}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Hours/Day
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {teamHook.teamAnalytics.topPerformer?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Top Performer
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Team Members List */}
          <Grid container spacing={2}>
            {teamHook.teamMembers.map((member) => (
              <Grid item xs={12} md={6} key={member.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar>{member.name.charAt(0)}</Avatar>
                      <Box flex={1}>
                        <Typography variant="h6">{member.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.totalHours.toFixed(1)}h total • {member.entries} logs
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip label={`${member.phases.length} phases`} size="small" />
                          <Chip
                            label={`${member.productivity.toFixed(1)}h/day`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>Project Settings</Typography>
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="body1" gutterBottom>
                <strong>Project ID:</strong> {project.id}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> <Chip label={project.status} color={getStatusColor(project.status) as any} size="small" />
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Created:</strong> {new Date(project.created_at).toLocaleString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Last Updated:</strong> {project.updated_at ? new Date(project.updated_at).toLocaleString() : 'N/A'}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setEditProjectDialog({ open: true })}
                  sx={{ mr: 1 }}
                >
                  Edit Project
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setExportDialog({ open: true })}
                >
                  Export Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
      </Card>

      {/* Dialogs */}
      <ConfirmationDialog
        open={deleteDialog.open}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={confirmDeleteProject}
        onCancel={() => setDeleteDialog({ open: false })}
        onClose={() => setDeleteDialog({ open: false })}
      />

      <ExportDialog
        open={exportDialog.open}
        onClose={() => setExportDialog({ open: false })}
        phases={phases}
        projectName={project.name}
      />

      <EditProjectDialog
        open={editProjectDialog.open}
        project={project}
        onClose={() => setEditProjectDialog({ open: false })}
        onSave={handleSaveProject}
      />

      <AddPhaseDialog
        open={addPhaseDialog.open}
        projectId={parseInt(id!)}
        existingPhases={phases.length}
        onClose={() => setAddPhaseDialog({ open: false })}
        onSave={handleSavePhase}
      />

      <EditPhaseDatesDialog
        open={editPhaseDatesDialog.open}
        phase={editPhaseDatesDialog.phase}
        onClose={() => setEditPhaseDatesDialog({ open: false, phase: null })}
        onSuccess={() => {
          setEditPhaseDatesDialog({ open: false, phase: null });
          refetch();
        }}
      />

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectDetailsPage;
