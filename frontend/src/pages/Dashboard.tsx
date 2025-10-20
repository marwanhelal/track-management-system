import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment,
  AccessTime,
  TrendingUp,
  Warning,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  FilterList,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { Project, WorkLogSummary, PhaseSummary } from '../types';
import CreateProjectDialog from '../components/projects/CreateProjectDialog';
import ProjectCard from '../components/dashboard/ProjectCard';
import WorkLogSummaryCard from '../components/dashboard/WorkLogSummaryCard';
import QuickTimeEntry from '../components/time-tracking/QuickTimeEntry';

const Dashboard = () => {
  const { isSupervisor, isEngineer } = useAuth();
  const { joinProject, on, off, connected } = useSocket();

  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState<{
    projectSummary: WorkLogSummary[];
    phaseSummary: PhaseSummary[];
    phaseEngineerDetail: any[];
  }>({ projectSummary: [], phaseSummary: [], phaseEngineerDetail: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Track which projects we've already joined to prevent duplicate joins
  const joinedProjectsRef = useRef<Set<number>>(new Set());

  // ✅ OPTIMIZED: Memoize expensive calculations to prevent re-computation on every render
  const totalHours = useMemo(() => {
    return workLogSummary.projectSummary.reduce(
      (sum: number, item: WorkLogSummary) => sum + parseFloat(item.total_hours),
      0
    );
  }, [workLogSummary.projectSummary]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p: Project) => p.status === 'active').length;
  }, [projects]);

  const onHoldProjectsCount = useMemo(() => {
    return projects.filter((p: Project) => p.status === 'on_hold').length;
  }, [projects]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const requests = [
          apiService.getProjects(),
          apiService.getWorkLogsSummary(),
        ];

        // Load archived projects for supervisors
        if (isSupervisor) {
          requests.push(apiService.getArchivedProjects());
        }

        const responses = await Promise.all(requests);
        const [projectsResponse, summaryResponse, archivedResponse] = responses;

        if (projectsResponse.success && projectsResponse.data) {
          const projectsData = projectsResponse.data as { projects: Project[] };
          setProjects(projectsData.projects);
        }

        if (summaryResponse.success && summaryResponse.data) {
          const summaryData = summaryResponse.data as any;
          setWorkLogSummary({
            projectSummary: summaryData.projectSummary || [],
            phaseSummary: summaryData.phaseSummary || [],
            phaseEngineerDetail: summaryData.phaseEngineerDetail || []
          });
        }

        // Set archived projects if supervisor
        if (isSupervisor && archivedResponse?.success && archivedResponse.data) {
          const archivedData = archivedResponse.data as { projects: Project[] };
          setArchivedProjects(archivedData.projects);
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isSupervisor]);

  // Join project rooms when socket connects and projects are loaded
  useEffect(() => {
    if (connected && projects.length > 0) {
      projects.forEach((project: Project) => {
        // Only join if we haven't already joined this project
        if (!joinedProjectsRef.current.has(project.id)) {
          joinProject(project.id);
          joinedProjectsRef.current.add(project.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, projects.length]); // Only depend on connection status and project count

  // Handle archive/unarchive operations
  const handleUnarchiveProject = async (projectId: number) => {
    try {
      const response = await apiService.unarchiveProject(projectId);
      if (response.success) {
        // Refresh both active and archived projects for accurate counts
        const requests = [apiService.getProjects()];
        if (isSupervisor) {
          requests.push(apiService.getArchivedProjects());
        }

        const responses = await Promise.all(requests);
        const [projectsResponse, archivedResponse] = responses;

        if (projectsResponse.success && projectsResponse.data) {
          const projectsData = projectsResponse.data as { projects: Project[] };
          setProjects(projectsData.projects);
        }

        if (isSupervisor && archivedResponse?.success && archivedResponse.data) {
          const archivedData = archivedResponse.data as { projects: Project[] };
          setArchivedProjects(archivedData.projects);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to unarchive project');
    }
  };

  // Handle view mode change
  const handleViewModeChange = async (_: any, newValue: 'active' | 'archived') => {
    setViewMode(newValue);

    // Refresh archived projects when switching to archived view
    if (newValue === 'archived' && isSupervisor) {
      try {
        const response = await apiService.getArchivedProjects();
        if (response.success && response.data) {
          const archivedData = response.data as { projects: Project[] };
          setArchivedProjects(archivedData.projects);
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load archived projects');
      }
    }
  };

  // Socket.IO event listeners
  useEffect(() => {
    const handleProjectCreated = (data: Project) => {
      setProjects((prev: Project[]) => [data, ...prev]);
      // Join project room only if connected and not already joined
      if (connected && !joinedProjectsRef.current.has(data.id)) {
        joinProject(data.id);
        joinedProjectsRef.current.add(data.id);
      }
    };

    const handleProjectUpdated = (data: Project) => {
      setProjects((prev: Project[]) =>
        prev.map((project: Project) =>
          project.id === data.id ? { ...project, ...data } : project
        )
      );
    };

    const handleProjectArchived = async (data: { projectId: number }) => {
      try {
        // Refresh both lists when a project is archived
        const requests = [apiService.getProjects()];
        if (isSupervisor) {
          requests.push(apiService.getArchivedProjects());
        }

        const responses = await Promise.all(requests);
        const [projectsResponse, archivedResponse] = responses;

        if (projectsResponse.success && projectsResponse.data) {
          const projectsData = projectsResponse.data as { projects: Project[] };
          setProjects(projectsData.projects);
        }

        if (isSupervisor && archivedResponse?.success && archivedResponse.data) {
          const archivedData = archivedResponse.data as { projects: Project[] };
          setArchivedProjects(archivedData.projects);
        }
      } catch (error) {
        console.error('Error refreshing projects after archive:', error);
      }
    };

    const handleProjectUnarchived = async (data: { projectId: number }) => {
      try {
        // Refresh both lists when a project is unarchived
        const requests = [apiService.getProjects()];
        if (isSupervisor) {
          requests.push(apiService.getArchivedProjects());
        }

        const responses = await Promise.all(requests);
        const [projectsResponse, archivedResponse] = responses;

        if (projectsResponse.success && projectsResponse.data) {
          const projectsData = projectsResponse.data as { projects: Project[] };
          setProjects(projectsData.projects);
        }

        if (isSupervisor && archivedResponse?.success && archivedResponse.data) {
          const archivedData = archivedResponse.data as { projects: Project[] };
          setArchivedProjects(archivedData.projects);
        }
      } catch (error) {
        console.error('Error refreshing projects after unarchive:', error);
      }
    };

    const handleWorkLogCreated = () => {
      // Refresh work log summary when new logs are created
      apiService.getWorkLogsSummary().then(response => {
        if (response.success && response.data) {
          setWorkLogSummary({
            ...response.data,
            phaseEngineerDetail: (response.data as any).phaseEngineerDetail || []
          });
        }
      });
    };

    on('project:created', handleProjectCreated);
    on('project:updated', handleProjectUpdated);
    on('project:archived', handleProjectArchived);
    on('project:unarchived', handleProjectUnarchived);
    on('work_log:created', handleWorkLogCreated);

    return () => {
      off('project:created', handleProjectCreated);
      off('project:updated', handleProjectUpdated);
      off('project:archived', handleProjectArchived);
      off('project:unarchived', handleProjectUnarchived);
      off('work_log:created', handleWorkLogCreated);
    };
  }, [on, off, isSupervisor, connected, joinProject]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev: Project[]) => [newProject, ...prev]);
    setCreateProjectOpen(false);
    // Join project room only if connected and not already joined
    if (connected && !joinedProjectsRef.current.has(newProject.id)) {
      joinProject(newProject.id);
      joinedProjectsRef.current.add(newProject.id);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {isSupervisor ? 'Supervisor Dashboard' : 'Engineer Dashboard'}
        </Typography>
        {isSupervisor && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateProjectOpen(true)}
            size="large"
          >
            New Project
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* View Tabs for Supervisors */}
      {isSupervisor && (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Assignment />
                  <span>Active Projects</span>
                  <Chip
                    label={projects.length}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
              value="active"
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <ArchiveIcon />
                  <span>Archived Projects</span>
                  <Chip
                    label={archivedProjects.length}
                    size="small"
                    color="default"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
              value="archived"
            />
          </Tabs>
        </Paper>
      )}

      {/* Quick Stats */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Projects
                  </Typography>
                  <Typography variant="h4">
                    {projects.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AccessTime color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Hours
                  </Typography>
                  <Typography variant="h4">
                    {totalHours.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Projects
                  </Typography>
                  <Typography variant="h4">
                    {activeProjectsCount}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    On Hold
                  </Typography>
                  <Typography variant="h4">
                    {onHoldProjectsCount}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Projects Section */}
        <Box sx={{ flex: '1 1 600px', minWidth: '600px' }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {viewMode === 'active' ? 'Recent Projects' : 'Archived Projects'}
            </Typography>
            {viewMode === 'active' ? (
              <>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {projects.slice(0, 6).map((project: Project) => (
                    <Box key={project.id} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <ProjectCard project={project} />
                    </Box>
                  ))}
                </Box>
                {projects.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="textSecondary">
                      No active projects found
                    </Typography>
                    {isSupervisor && (
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateProjectOpen(true)}
                        sx={{ mt: 2 }}
                      >
                        Create Your First Project
                      </Button>
                    )}
                  </Box>
                )}
              </>
            ) : (
              <>
                {archivedProjects.length > 0 ? (
                  <List>
                    {archivedProjects.map((project: any) => (
                      <ListItem
                        key={project.id}
                        divider
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: 'grey.50'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="h6">{project.name}</Typography>
                              <Chip
                                label={project.status}
                                size="small"
                                color="default"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary" component="span">
                                Created by: {project.created_by_name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" component="span">
                                Archived: {new Date(project.archived_at).toLocaleDateString()}
                                {project.archived_by_name && ` by ${project.archived_by_name}`}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Unarchive Project">
                            <IconButton
                              edge="end"
                              onClick={() => handleUnarchiveProject(project.id)}
                              color="primary"
                            >
                              <UnarchiveIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={4}>
                    <ArchiveIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="body1" color="textSecondary">
                      No archived projects found
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Archived projects will appear here when supervisors archive them
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>

          {/* Engineer Quick Time Entry */}
          {isEngineer && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Quick Time Entry
              </Typography>
              <QuickTimeEntry onSuccess={() => {
                // Refresh work log summary
                apiService.getWorkLogsSummary().then(response => {
                  if (response.success && response.data) {
                    setWorkLogSummary({
                      ...response.data,
                      phaseEngineerDetail: (response.data as any).phaseEngineerDetail || []
                    });
                  }
                });
              }} />
            </Paper>
          )}
        </Box>

        {/* Summary Section */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <WorkLogSummaryCard
            summary={workLogSummary}
            isSupervisor={isSupervisor}
          />
        </Box>
      </Box>

      {/* Create Project Dialog */}
      {isSupervisor && (
        <CreateProjectDialog
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </Box>
  );
};

export default Dashboard;