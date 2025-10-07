import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Alert,
  LinearProgress,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Dashboard as DashboardIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateProjectDialog from '../components/projects/CreateProjectDialog';
import ImportHistoricalProjectDialog from '../components/projects/ImportHistoricalProjectDialog';
import ProjectSmartWarnings from '../components/projects/ProjectSmartWarnings';
import ComprehensiveOverview from '../components/projects/ComprehensiveOverview';

interface ProjectsPageState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  totalPages: number;
  showCreateDialog: boolean;
  showImportDialog: boolean;
  showComprehensiveOverview: boolean;
  deleteDialog: {
    open: boolean;
    project: Project | null;
  };
}

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();
  const [state, setState] = useState<ProjectsPageState>({
    projects: [],
    loading: true,
    error: null,
    searchTerm: '',
    statusFilter: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    totalPages: 1,
    showCreateDialog: false,
    showImportDialog: false,
    showComprehensiveOverview: false,
    deleteDialog: {
      open: false,
      project: null
    }
  });

  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiService.getProjects();

      if (response.success && response.data) {
        let filteredProjects = response.data.projects;

        // Apply search filter
        if (state.searchTerm) {
          filteredProjects = filteredProjects.filter(project =>
            project.name.toLowerCase().includes(state.searchTerm.toLowerCase())
          );
        }

        // Apply status filter
        if (state.statusFilter) {
          filteredProjects = filteredProjects.filter(project =>
            project.status === state.statusFilter
          );
        }

        // Apply sorting
        filteredProjects.sort((a, b) => {
          let comparison = 0;

          switch (state.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
            case 'created_at':
            default:
              comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              break;
          }

          return state.sortOrder === 'asc' ? comparison : -comparison;
        });

        setState(prev => ({
          ...prev,
          projects: filteredProjects,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch projects',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch projects',
        loading: false
      }));
    }
  }, [state.page, state.statusFilter, state.sortBy, state.sortOrder, state.searchTerm]);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page, state.statusFilter, state.sortBy, state.sortOrder, state.searchTerm]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, searchTerm: event.target.value }));
    // Debounce search
    setTimeout(() => {
      fetchProjects();
    }, 300);
  };

  const handleStatusFilter = (status: string) => {
    setState(prev => ({ ...prev, statusFilter: status, page: 1 }));
    setFilterMenuAnchor(null);
  };

  const handleSort = (sortBy: string) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handleDeleteProject = async (project: Project) => {
    setState(prev => ({
      ...prev,
      deleteDialog: { open: true, project }
    }));
  };

  const confirmDeleteProject = async () => {
    if (!state.deleteDialog.project) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.deleteProject(state.deleteDialog.project.id);

      if (response.success) {
        await fetchProjects();
        setState(prev => ({
          ...prev,
          deleteDialog: { open: false, project: null }
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to delete project',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete project',
        loading: false
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'on_hold':
        return <WarningIcon fontSize="small" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const calculateProgress = (project: Project) => {
    // Calculate progress based on project phases or hours
    if (project.predicted_hours && project.actual_hours) {
      return Math.min((project.actual_hours / project.predicted_hours) * 100, 100);
    }
    return 0;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => setState(prev => ({ ...prev, showComprehensiveOverview: true }))}
            sx={{
              color: 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.main',
                color: 'white'
              }
            }}
          >
            CEO Overview
          </Button>
          {isSupervisor && (
            <>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setState(prev => ({ ...prev, showImportDialog: true }))}
                sx={{
                  color: 'secondary.main',
                  borderColor: 'secondary.main',
                  '&:hover': {
                    backgroundColor: 'secondary.main',
                    color: 'white'
                  }
                }}
              >
                Import Historical
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
              >
                New Project
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={3} alignItems="center">
        <TextField
          placeholder="Search projects..."
          value={state.searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 300 }}
        />

        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
        >
          Filter
        </Button>

        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={() => setFilterMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleStatusFilter('')}>All Status</MenuItem>
          <MenuItem onClick={() => handleStatusFilter('active')}>Active</MenuItem>
          <MenuItem onClick={() => handleStatusFilter('on_hold')}>On Hold</MenuItem>
          <MenuItem onClick={() => handleStatusFilter('completed')}>Completed</MenuItem>
          <MenuItem onClick={() => handleStatusFilter('cancelled')}>Cancelled</MenuItem>
        </Menu>

        <FormControl variant="outlined" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={state.sortBy}
            label="Sort by"
            onChange={(e) => handleSort(e.target.value)}
          >
            <MenuItem value="created_at">Date Created</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Loading Indicator */}
      {state.loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {state.projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" component="h2" noWrap>
                    {project.name}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(project.status)}
                    label={project.status.replace('_', ' ')}
                    color={getStatusColor(project.status) as any}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Started: {new Date(project.start_date).toLocaleDateString()}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Duration: {project.planned_total_weeks} weeks
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Hours: {project.actual_hours || 0} / {project.predicted_hours}
                </Typography>

                {/* Progress Bar */}
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">{Math.round(calculateProgress(project))}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(project)}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>

              <CardActions>
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>

                {isSupervisor && (
                  <Tooltip title="Delete Project">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteProject(project)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!state.loading && state.projects.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {state.searchTerm || state.statusFilter
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first project to get started'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
          >
            Create Project
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {state.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={state.totalPages}
            page={state.page}
            onChange={(_, page) => setState(prev => ({ ...prev, page }))}
            color="primary"
          />
        </Box>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={state.showCreateDialog}
        onClose={() => setState(prev => ({ ...prev, showCreateDialog: false }))}
        onSuccess={() => {
          setState(prev => ({ ...prev, showCreateDialog: false }));
          fetchProjects();
        }}
      />

      {/* Import Historical Project Dialog */}
      <ImportHistoricalProjectDialog
        open={state.showImportDialog}
        onClose={() => setState(prev => ({ ...prev, showImportDialog: false }))}
        onSuccess={() => {
          setState(prev => ({ ...prev, showImportDialog: false }));
          fetchProjects();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={state.deleteDialog.open}
        onClose={() => setState(prev => ({ ...prev, deleteDialog: { open: false, project: null } }))}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{state.deleteDialog.project?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action will set the project status to cancelled. All project data will be preserved for historical purposes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setState(prev => ({ ...prev, deleteDialog: { open: false, project: null } }))}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteProject}
            color="error"
            variant="contained"
            disabled={state.loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* CEO Comprehensive Overview Dialog */}
      {state.showComprehensiveOverview && (
        <Dialog
          open={state.showComprehensiveOverview}
          onClose={() => setState(prev => ({ ...prev, showComprehensiveOverview: false }))}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              height: '90vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <DashboardIcon color="primary" />
              <Typography variant="h5" component="div">
                CEO Project Overview Dashboard
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <ComprehensiveOverview />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setState(prev => ({ ...prev, showComprehensiveOverview: false }))}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </Box>
  );
};

export default ProjectsPage;