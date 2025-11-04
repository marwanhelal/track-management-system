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
}

const ChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSupervisor } = useAuth();

  const [state, setState] = useState<ChecklistPageState>({
    projects: [],
    loading: true,
    error: null,
    searchTerm: ''
  });

  const fetchProjects = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiService.getAllProjectsWithChecklists();

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          projects: response.data.projects,
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
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Level 1 (Engineer)</Typography>
                            <Typography variant="caption">0%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            color={getProgressColor(0)}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>

                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Level 2 (Supervisor 1)</Typography>
                            <Typography variant="caption">0%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            color={getProgressColor(0)}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>

                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Level 3 (Supervisor 2)</Typography>
                            <Typography variant="caption">0%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            color={getProgressColor(0)}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Level 4 (Final)</Typography>
                            <Typography variant="caption">0%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={0}
                            color={getProgressColor(0)}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>
                      </Box>
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
