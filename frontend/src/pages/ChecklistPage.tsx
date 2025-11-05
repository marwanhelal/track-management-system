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
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Assignment,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  Project,
  ChecklistProgressOverview,
  ChecklistPhaseName,
  ChecklistStatistics,
} from '../types';
import ProjectChecklistView from '../components/checklist/ProjectChecklistView';

const ChecklistPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedPhase, setSelectedPhase] = useState<ChecklistPhaseName | 'all'>('all');
  const [checklistOverview, setChecklistOverview] = useState<ChecklistProgressOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(error.message || 'فشل في تحميل المشاريع / Failed to load projects');
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
      setError(error.message || 'فشل في تحميل قوائم المهام / Failed to load checklists');
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

    return availablePhases.reduce(
      (acc, phase) => {
        const stats = phase.statistics;
        return {
          totalTasks: acc.totalTasks + stats.total_tasks,
          completedTasks: acc.completedTasks + stats.completed_tasks,
          engineerApproved: acc.engineerApproved + stats.engineer_approved_tasks,
          supervisor1Approved: acc.supervisor1Approved + stats.supervisor_1_approved_tasks,
          supervisor2Approved: acc.supervisor2Approved + stats.supervisor_2_approved_tasks,
          supervisor3Approved: acc.supervisor3Approved + stats.supervisor_3_approved_tasks,
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
  };

  const overallStats = calculateOverallStats();
  if (overallStats.totalTasks > 0) {
    overallStats.completionPercentage = Math.round(
      (overallStats.completedTasks / overallStats.totalTasks) * 100
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          قوائم المهام / Checklists
        </Typography>
        <Typography variant="body1" color="text.secondary">
          تتبع وإدارة مهام المشاريع مع سير عمل الموافقات
          <br />
          Track and manage project tasks with approval workflow
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>المشروع / Project</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={handleProjectChange}
                label="المشروع / Project"
              >
                <MenuItem value="">
                  <em>اختر مشروع / Select a project</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedProjectId}>
              <InputLabel>المرحلة / Phase</InputLabel>
              <Select
                value={selectedPhase}
                onChange={handlePhaseChange}
                label="المرحلة / Phase"
              >
                <MenuItem value="all">
                  <em>كل المراحل / All Phases</em>
                </MenuItem>
                {availablePhases.map((phase) => (
                  <MenuItem key={phase.phase_name} value={phase.phase_name}>
                    {phase.phase_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              تحديث / Refresh
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
          <CircularProgress />
        </Box>
      )}

      {/* No Project Selected */}
      {!selectedProjectId && !loading && (
        <Alert severity="info" icon={<Assignment />}>
          الرجاء اختيار مشروع لعرض قوائم المهام
          <br />
          Please select a project to view checklists
        </Alert>
      )}

      {/* Overall Statistics */}
      {selectedProjectId && checklistOverview && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Assignment color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      إجمالي المهام / Total Tasks
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {overallStats.totalTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CheckCircle color="success" />
                    <Typography variant="body2" color="text.secondary">
                      مكتمل / Completed
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {overallStats.completedTasks}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={overallStats.completionPercentage}
                    sx={{ mt: 1 }}
                    color="success"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {overallStats.completionPercentage}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Pending color="info" />
                    <Typography variant="body2" color="text.secondary">
                      موافقة المهندس / Engineer Approved
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {overallStats.engineerApproved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    موافقات المشرفين / Supervisor Approvals
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={`L1: ${overallStats.supervisor1Approved}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      label={`L2: ${overallStats.supervisor2Approved}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      label={`L3: ${overallStats.supervisor3Approved}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Project Info */}
          {selectedProject && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                معلومات المشروع / Project Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    الحالة / Status:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedProject.status}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    المراحل / Phases:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {availablePhases.length}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    الساعات / Hours:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedProject.predicted_hours}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    الأسابيع / Weeks:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedProject.planned_total_weeks}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ البدء / Start Date:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {new Date(selectedProject.start_date).toLocaleDateString('ar-SA')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Checklist Items by Phase */}
          {filteredPhases.length === 0 ? (
            <Alert severity="warning">
              لا توجد مراحل بقوائم مهام لهذا المشروع
              <br />
              No phases with checklists found for this project
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
    </Container>
  );
};

export default ChecklistPage;
