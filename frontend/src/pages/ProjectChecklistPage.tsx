import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Grid,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Layers as LayersIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { ProjectWithDetails } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ProjectChecklistPageState {
  project: ProjectWithDetails | null;
  checklists: any[]; // Will be populated with checklist data
  activeTab: number;
  loading: boolean;
  error: string | null;
}

const ProjectChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isSupervisor } = useAuth();

  const [state, setState] = useState<ProjectChecklistPageState>({
    project: null,
    checklists: [],
    activeTab: 0,
    loading: true,
    error: null
  });

  const fetchProjectAndChecklists = useCallback(async () => {
    if (!projectId) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch project details
      const projectResponse = await apiService.getProject(parseInt(projectId));

      if (!projectResponse.success || !projectResponse.data) {
        throw new Error('Failed to load project');
      }

      // Fetch project checklists
      const checklistsResponse = await apiService.getProjectChecklists(parseInt(projectId));

      if (!checklistsResponse.success) {
        throw new Error('Failed to load checklists');
      }

      setState(prev => ({
        ...prev,
        project: projectResponse.data.project,
        checklists: checklistsResponse.data?.checklists || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false
      }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectAndChecklists();
  }, [fetchProjectAndChecklists]);

  const handleBack = () => {
    navigate('/checklist');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, activeTab: newValue }));
  };

  if (state.loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading checklist...
        </Typography>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={handleBack}>
          {state.error}
        </Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!state.project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Project not found</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {state.project.name} - Checklist
        </Typography>
        {isSupervisor && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            size="small"
          >
            Edit Project Details
          </Button>
        )}
      </Box>

      {/* Project Details Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Details (بيانات المشروع)
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {state.project.client_name && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Client Name
                    </Typography>
                    <Typography variant="body2">
                      {state.project.client_name}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.location && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body2">
                      {state.project.location}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.building_type && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Building Type
                    </Typography>
                    <Typography variant="body2">
                      {state.project.building_type}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.floors_count && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Floors
                    </Typography>
                    <Typography variant="body2">
                      {state.project.floors_count} floors
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.land_area && (
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Land Area
                  </Typography>
                  <Typography variant="body2">
                    {state.project.land_area}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Phase Tabs */}
      {state.checklists.length > 0 ? (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={state.activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {state.checklists.map((checklist, index) => (
              <Tab key={checklist.phase_id} label={checklist.phase_name || `Phase ${index + 1}`} />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {state.checklists[state.activeTab] && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {state.checklists[state.activeTab].phase_name}
                </Typography>

                {/* Client Notes */}
                {state.checklists[state.activeTab].client_notes && (
                  <Alert severity="info" icon={<NoteIcon />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Client Notes (ملحوظات العميل)
                    </Typography>
                    <Typography variant="body2">
                      {state.checklists[state.activeTab].client_notes}
                    </Typography>
                  </Alert>
                )}

                {isSupervisor && (
                  <Button
                    variant="text"
                    startIcon={<EditIcon />}
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Edit Client Notes
                  </Button>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Placeholder for Checklist Items */}
                <Alert severity="info">
                  Checklist items will be displayed here. This is where subsections and items with 4-level approvals will appear.
                </Alert>
              </Box>
            )}
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No checklists found for this project
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Checklists are automatically created when you create a new project with phases.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ProjectChecklistPage;
