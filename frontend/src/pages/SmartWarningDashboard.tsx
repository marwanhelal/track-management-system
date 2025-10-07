import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Psychology as BrainIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import ProjectSmartWarnings from '../components/projects/ProjectSmartWarnings';
import { smartWarningService, Project } from '../services/smartWarningService';

const SmartWarningDashboard: React.FC = () => {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Auto-refresh functionality for active project monitoring
  useEffect(() => {
    // Clear any existing interval first
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    if (autoRefresh && projectId) {
      // Set initial refresh
      setLastRefresh(new Date());

      const interval = setInterval(() => {
        setLastRefresh(new Date());
        // Refresh will be handled by ProjectSmartWarnings component
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, projectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await smartWarningService.getAllProjects();
      if (response.success) {
        setProjects(response.data.projects);
        // Auto-select first active project
        const firstActiveProject = response.data.projects.find(p => p.status === 'active');
        if (firstActiveProject) {
          setSelectedProject(firstActiveProject.id.toString());
          setProjectId(firstActiveProject.id);
        } else if (response.data.projects.length > 0) {
          // If no active projects, select first project
          setSelectedProject(response.data.projects[0].id.toString());
          setProjectId(response.data.projects[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setProjectId(parseInt(projectId));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <BrainIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          🧠 Smart Warning Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Professional Project Timeline Intelligence & Risk Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced warning system that analyzes project phases for delays, overdue tasks, and approaching deadlines
        </Typography>
      </Box>

      {/* Professional Project Selection Interface */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold">
              Project Selection & Analysis Center
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    🔄 Auto-Refresh
                  </Typography>
                  {autoRefresh && projectId && (
                    <Chip
                      label="LIVE"
                      size="small"
                      color="success"
                      variant="filled"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchProjects}
              disabled={loading}
              size="small"
            >
              Refresh Projects
            </Button>
          </Box>
        </Box>

        {/* Project Selection Dropdown */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="project-select-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon fontSize="small" />
                Select Project for Smart Analysis
              </Box>
            </InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              label="Select Project for Smart Analysis"
              disabled={loading}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id.toString()}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" />
                      <Typography>{project.name}</Typography>
                    </Box>
                    <Chip
                      label={project.status.toUpperCase()}
                      size="small"
                      color={
                        project.status === 'active' ? 'success' :
                        project.status === 'completed' ? 'info' :
                        project.status === 'cancelled' ? 'error' : 'warning'
                      }
                      variant={project.status === 'active' ? 'filled' : 'outlined'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Project Overview Cards */}
        {projects.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon />
              Available Projects ({projects.length})
            </Typography>
            <Grid container spacing={2}>
              {projects.map((project) => (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: projectId === project.id ? '2px solid' : '1px solid',
                      borderColor: projectId === project.id ? 'primary.main' : 'divider',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => handleProjectChange(project.id.toString())}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <BusinessIcon color="primary" />
                        <Chip
                          label={project.status.toUpperCase()}
                          size="small"
                          color={
                            project.status === 'active' ? 'success' :
                            project.status === 'completed' ? 'info' :
                            project.status === 'cancelled' ? 'error' : 'warning'
                          }
                          icon={
                            project.status === 'active' ? <CheckCircleIcon /> :
                            project.status === 'cancelled' ? <WarningIcon /> : undefined
                          }
                        />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                        {project.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {project.id} • Status: {project.status}
                      </Typography>
                      {projectId === project.id && (
                        <Box sx={{ mt: 1, p: 1, backgroundColor: 'primary.light', borderRadius: 1 }}>
                          <Typography variant="caption" color="primary.contrastText">
                            ✓ Currently Analyzing
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading projects...</Typography>
          </Box>
        )}

        {/* Selected Project Info */}
        {projectId && !loading && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" color="success.contrastText" sx={{ fontWeight: 'bold' }}>
              🎯 Active Analysis: {projects.find(p => p.id === projectId)?.name} (ID: {projectId})
            </Typography>
            <Typography variant="caption" color="success.contrastText">
              Smart Warning System is actively monitoring this project for risks and timeline issues
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Smart Warning Analysis */}
      {projectId && (
        <ProjectSmartWarnings
          projectId={projectId}
          autoRefresh={autoRefresh}
          refreshTrigger={lastRefresh}
        />
      )}

      {/* Professional System Overview */}
      <Paper elevation={1} sx={{ p: 4, mt: 4, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <BrainIcon color="primary" />
          🧠 Professional Smart Warning System
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom color="primary">
              🎯 Core Intelligence Features
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Real-time Timeline Analysis:</strong> Continuously monitors all project phases for delays, overdue tasks, and approaching deadlines
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Advanced Risk Scoring:</strong> Calculates professional risk percentages (0-100%) based on multiple project health indicators
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Smart Phase Detection:</strong> Identifies critical phases that require immediate attention with severity-based warnings
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Health Score Calculation:</strong> Provides comprehensive project health insights with actionable recommendations
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom color="secondary">
              📊 Professional Analytics
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Intelligent Recommendations:</strong> AI-powered action items with priority scoring for immediate project improvements
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Risk Assessment Levels:</strong> Critical, High, Medium, Low risk categorization with mitigation strategies
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Performance Metrics:</strong> Completion percentage, phase status tracking, and resource utilization analysis
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Professional Reporting:</strong> Comprehensive analytics with timestamp tracking and audit trails
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom color="success.main">
            ✅ System Status: Fully Operational
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Professional Project Tracking:</strong> Select any project above to begin comprehensive smart analysis.
            Active projects receive real-time monitoring, while completed and cancelled projects show historical analysis data.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            🔄 System automatically refreshes analysis every time you select a different project •
            All data is processed through advanced algorithms for maximum accuracy
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SmartWarningDashboard;