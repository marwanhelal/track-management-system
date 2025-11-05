import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Button,
  SelectChangeEvent,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Assignment,
  Refresh,
  Info,
  TrendingUp,
  Add,
  Edit,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  Project,
  ChecklistProgressOverview,
  ChecklistPhaseName,
} from '../types';
import ProjectChecklistView from '../components/checklist/ProjectChecklistView';
import AddPhaseDialog from '../components/checklist/AddPhaseDialog';
import EditProjectInfoDialog from '../components/checklist/EditProjectInfoDialog';

const ChecklistPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedPhase, setSelectedPhase] = useState<ChecklistPhaseName | 'all'>('all');
  const [checklistOverview, setChecklistOverview] = useState<ChecklistProgressOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addPhaseDialogOpen, setAddPhaseDialogOpen] = useState(false);
  const [editProjectInfoDialogOpen, setEditProjectInfoDialogOpen] = useState(false);

  const isSupervisor = user?.role === 'supervisor';

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load checklist when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      loadChecklistOverview();
    } else {
      setChecklistOverview(null);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjects();
      if (response.success && response.data) {
        // Filter only active and on_hold projects
        const activeProjects = response.data.projects.filter(
          (p: Project) => p.status === 'active' || p.status === 'on_hold'
        );
        setProjects(activeProjects);

        // Auto-select first project if available
        if (activeProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(activeProjects[0].id);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistOverview = async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getProjectChecklistGrouped(selectedProjectId as number);
      if (response.success && response.data) {
        setChecklistOverview(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value;
    setSelectedProjectId(value === '' ? '' : Number(value));
    setSelectedPhase('all');
  };

  const handlePhaseChange = (event: SelectChangeEvent<string>) => {
    setSelectedPhase(event.target.value as ChecklistPhaseName | 'all');
  };

  const handleRefresh = () => {
    if (selectedProjectId) {
      loadChecklistOverview();
    } else {
      loadProjects();
    }
  };

  // Get selected project details
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Get phases for selected project from checklist overview
  const availablePhases = checklistOverview?.phases || [];

  // Filter phases based on selection
  const filteredPhases = selectedPhase === 'all'
    ? availablePhases
    : availablePhases.filter((p) => p.phase_name === selectedPhase);

  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (!checklistOverview || availablePhases.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        engineerApproved: 0,
        supervisor1Approved: 0,
        supervisor2Approved: 0,
        supervisor3Approved: 0,
        completionPercentage: 0,
      };
    }

    const stats = availablePhases.reduce(
      (acc, phase) => {
        const s = phase.statistics;
        return {
          totalTasks: acc.totalTasks + s.total_tasks,
          completedTasks: acc.completedTasks + s.completed_tasks,
          engineerApproved: acc.engineerApproved + s.engineer_approved_tasks,
          supervisor1Approved: acc.supervisor1Approved + s.supervisor_1_approved_tasks,
          supervisor2Approved: acc.supervisor2Approved + s.supervisor_2_approved_tasks,
          supervisor3Approved: acc.supervisor3Approved + s.supervisor_3_approved_tasks,
          completionPercentage: 0, // Will calculate after
        };
      },
      {
        totalTasks: 0,
        completedTasks: 0,
        engineerApproved: 0,
        supervisor1Approved: 0,
        supervisor2Approved: 0,
        supervisor3Approved: 0,
        completionPercentage: 0,
      }
    );

    if (stats.totalTasks > 0) {
      stats.completionPercentage = Math.round(
        (stats.completedTasks / stats.totalTasks) * 100
      );
    }

    return stats;
  };

  const overallStats = calculateOverallStats();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
          Project Checklists
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage project tasks with approval workflow
        </Typography>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={isSupervisor ? 4 : 5}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={handleProjectChange}
                label="Project"
              >
                <MenuItem value="">
                  <em>Select a project</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={isSupervisor ? 3 : 4}>
            <FormControl fullWidth disabled={!selectedProjectId}>
              <InputLabel>Phase</InputLabel>
              <Select
                value={selectedPhase}
                onChange={handlePhaseChange}
                label="Phase"
              >
                <MenuItem value="all">
                  <em>All Phases</em>
                </MenuItem>
                {availablePhases.map((phase) => (
                  <MenuItem key={phase.phase_name} value={phase.phase_name}>
                    {phase.phase_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {isSupervisor && selectedProjectId && (
            <Grid item xs={12} md={2.5}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddPhaseDialogOpen(true)}
                disabled={loading}
                color="secondary"
                sx={{ height: 56 }}
              >
                Add Phase
              </Button>
            </Grid>
          )}

          <Grid item xs={12} md={isSupervisor ? 2.5 : 3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{ height: 56 }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && !checklistOverview && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* No Project Selected */}
      {!selectedProjectId && !loading && (
        <Alert severity="info" icon={<Info />} sx={{ borderRadius: 2 }}>
          <Typography variant="body1">
            Please select a project to view checklists
          </Typography>
        </Alert>
      )}

      {/* Project Details & Statistics */}
      {selectedProjectId && checklistOverview && selectedProject && (
        <>
          {/* Project Information Card */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'primary.50' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Assignment color="primary" />
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Project Information
                </Typography>
              </Box>
              {isSupervisor && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setEditProjectInfoDialogOpen(true)}
                  size="small"
                  color="primary"
                >
                  Edit Info
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Project Name
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedProject.name}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={6} md={2}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Status
                </Typography>
                <Typography variant="body1" fontWeight="bold" textTransform="capitalize">
                  {selectedProject.status}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Phases
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {availablePhases.length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Predicted Hours
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedProject.predicted_hours}h
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Start Date
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {new Date(selectedProject.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Typography>
              </Grid>

              {/* Extended Project Details */}
              {selectedProject.land_area && (
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Land Area
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.land_area}
                  </Typography>
                </Grid>
              )}
              {selectedProject.building_type && (
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Building Type
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.building_type}
                  </Typography>
                </Grid>
              )}
              {selectedProject.floors_count && (
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Number of Floors
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.floors_count}
                  </Typography>
                </Grid>
              )}
              {selectedProject.location && (
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Location
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.location}
                  </Typography>
                </Grid>
              )}
              {selectedProject.bua && (
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    BUA (Built-Up Area)
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.bua}
                  </Typography>
                </Grid>
              )}
              {selectedProject.client_name && (
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Client Name
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedProject.client_name}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Overall Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Assignment fontSize="large" color="primary" />
                    <Typography variant="h6" color="text.secondary" fontWeight="medium">
                      Total Tasks
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold" color="primary.main">
                    {overallStats.totalTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CheckCircle fontSize="large" color="success" />
                    <Typography variant="h6" color="text.secondary" fontWeight="medium">
                      Completed
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {overallStats.completedTasks}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={overallStats.completionPercentage}
                    sx={{ mt: 2, height: 8, borderRadius: 1 }}
                    color="success"
                  />
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {overallStats.completionPercentage}% Complete
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUp fontSize="large" color="info" />
                    <Typography variant="h6" color="text.secondary" fontWeight="medium">
                      Engineer Approved
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold" color="info.main">
                    {overallStats.engineerApproved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" fontWeight="medium" gutterBottom>
                    Supervisor Approvals
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
                    <Chip
                      label={`Level 1: ${overallStats.supervisor1Approved}`}
                      color="secondary"
                      variant="filled"
                      sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                    />
                    <Chip
                      label={`Level 2: ${overallStats.supervisor2Approved}`}
                      color="secondary"
                      variant="filled"
                      sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                    />
                    <Chip
                      label={`Level 3: ${overallStats.supervisor3Approved}`}
                      color="secondary"
                      variant="filled"
                      sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Checklist Items by Phase */}
          {filteredPhases.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body1">
                No phases with checklists found for this project
              </Typography>
            </Alert>
          ) : (
            <Box>
              {filteredPhases.map((phase) => (
                <ProjectChecklistView
                  key={phase.phase_name}
                  projectId={selectedProjectId as number}
                  phaseName={phase.phase_name}
                  statistics={phase.statistics}
                  sections={phase.sections}
                  onUpdate={loadChecklistOverview}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {/* Add Phase Dialog */}
      {isSupervisor && selectedProjectId && (
        <AddPhaseDialog
          open={addPhaseDialogOpen}
          onClose={() => setAddPhaseDialogOpen(false)}
          projectId={selectedProjectId as number}
          existingPhases={availablePhases.map((phase) => phase.phase_name)}
          onSuccess={() => {
            loadChecklistOverview();
            setAddPhaseDialogOpen(false);
          }}
        />
      )}

      {/* Edit Project Information Dialog */}
      {isSupervisor && selectedProjectId && selectedProject && (
        <EditProjectInfoDialog
          open={editProjectInfoDialogOpen}
          onClose={() => setEditProjectInfoDialogOpen(false)}
          projectId={selectedProjectId as number}
          projectName={selectedProject.name}
          currentInfo={{
            land_area: selectedProject.land_area,
            building_type: selectedProject.building_type,
            floors_count: selectedProject.floors_count,
            location: selectedProject.location,
            bua: selectedProject.bua,
            client_name: selectedProject.client_name,
          }}
          onSuccess={() => {
            loadProjects(); // Reload projects to get updated info
            setEditProjectInfoDialogOpen(false);
          }}
        />
      )}
    </Container>
  );
};

export default ChecklistPage;
