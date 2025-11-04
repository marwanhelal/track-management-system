import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Divider,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  ChecklistRtl as ChecklistIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ProjectWithChecklistSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistPageState {
  projects: ProjectWithChecklistSummary[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  projectProgress: Record<number, {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
  }>;
}

const ChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSupervisor } = useAuth();

  const [state, setState] = useState<ChecklistPageState>({
    projects: [],
    loading: true,
    error: null,
    searchTerm: '',
    projectProgress: {}
  });

  const fetchProjects = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiService.getAllProjectsWithChecklists();

      if (response.success && response.data) {
        const projects = response.data.projects;

        // Fetch progress for each project
        const progressData: Record<number, any> = {};
        await Promise.all(
          projects.map(async (project: any) => {
            try {
              // Get checklists for this project
              const checklistsResponse = await apiService.getProjectChecklists(project.id);
              if (checklistsResponse.success && checklistsResponse.data?.checklists) {
                const checklists = checklistsResponse.data.checklists;

                // Get progress for each checklist
                const progressPromises = checklists.map(async (checklist: any) => {
                  try {
                    const progressResponse = await apiService.getChecklistProgress(checklist.id);
                    if (progressResponse.success && progressResponse.data) {
                      return {
                        level1: progressResponse.data.level_1_percentage || 0,
                        level2: progressResponse.data.level_2_percentage || 0,
                        level3: progressResponse.data.level_3_percentage || 0,
                        level4: progressResponse.data.level_4_percentage || 0
                      };
                    }
                  } catch (error) {
                    console.error(`Error fetching progress for checklist ${checklist.id}:`, error);
                  }
                  return { level1: 0, level2: 0, level3: 0, level4: 0 };
                });

                const progressResults = await Promise.all(progressPromises);

                // Calculate average progress across all checklists
                if (progressResults.length > 0) {
                  const avgProgress = progressResults.reduce(
                    (acc, curr) => ({
                      level1: acc.level1 + curr.level1,
                      level2: acc.level2 + curr.level2,
                      level3: acc.level3 + curr.level3,
                      level4: acc.level4 + curr.level4
                    }),
                    { level1: 0, level2: 0, level3: 0, level4: 0 }
                  );

                  progressData[project.id] = {
                    level1: Math.round(avgProgress.level1 / progressResults.length),
                    level2: Math.round(avgProgress.level2 / progressResults.length),
                    level3: Math.round(avgProgress.level3 / progressResults.length),
                    level4: Math.round(avgProgress.level4 / progressResults.length)
                  };
                } else {
                  progressData[project.id] = { level1: 0, level2: 0, level3: 0, level4: 0 };
                }
              }
            } catch (error) {
              console.error(`Error fetching progress for project ${project.id}:`, error);
              progressData[project.id] = { level1: 0, level2: 0, level3: 0, level4: 0 };
            }
          })
        );

        setState(prev => ({
          ...prev,
          projects,
          projectProgress: progressData,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to load projects',
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load projects',
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, searchTerm: event.target.value }));
  };

  const handleViewProject = (projectId: number) => {
    navigate(`/checklist/${projectId}`);
  };

  const filteredProjects = state.projects.filter(project =>
    project.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    project.location?.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (state.loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <ChecklistIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          مراجعة المشاريع (Checklists)
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          <ChecklistIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          مراجعة المشاريع (Checklists)
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search projects by name, client, or location..."
          value={state.searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ChecklistIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {state.searchTerm ? 'No projects match your search' : 'No projects with checklists found'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Project Name */}
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>

                  {/* Project Details */}
                  {(project.client_name || project.location || project.building_type) && (
                    <Box sx={{ mb: 2 }}>
                      {project.client_name && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <BusinessIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {project.client_name}
                          </Typography>
                        </Box>
                      )}
                      {project.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {project.location}
                          </Typography>
                        </Box>
                      )}
                      {project.building_type && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <LayersIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {project.building_type}
                            {project.floors_count && ` - ${project.floors_count} floors`}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Checklist Summary */}
                  <Typography variant="subtitle2" gutterBottom>
                    Checklist Progress
                  </Typography>

                  {project.total_checklists && project.total_checklists > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {project.total_phases} Phases • {project.total_checklists} Checklists
                      </Typography>

                      {/* Progress Bars for each level */}
                      {state.projectProgress[project.id] ? (
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">Level 1 (Engineer)</Typography>
                              <Typography variant="caption">{state.projectProgress[project.id].level1}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={state.projectProgress[project.id].level1}
                              color={getProgressColor(state.projectProgress[project.id].level1)}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>

                          <Box sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">Level 2 (Supervisor 1)</Typography>
                              <Typography variant="caption">{state.projectProgress[project.id].level2}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={state.projectProgress[project.id].level2}
                              color={getProgressColor(state.projectProgress[project.id].level2)}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>

                          <Box sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">Level 3 (Supervisor 2)</Typography>
                              <Typography variant="caption">{state.projectProgress[project.id].level3}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={state.projectProgress[project.id].level3}
                              color={getProgressColor(state.projectProgress[project.id].level3)}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>

                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">Level 4 (Final)</Typography>
                              <Typography variant="caption">{state.projectProgress[project.id].level4}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={state.projectProgress[project.id].level4}
                              color={getProgressColor(state.projectProgress[project.id].level4)}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <LinearProgress />
                          <Typography variant="caption" color="text.secondary">Loading progress...</Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No checklists available for this project
                    </Alert>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewProject(project.id)}
                    disabled={!project.total_checklists || project.total_checklists === 0}
                  >
                    View Checklist
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ChecklistPage;
