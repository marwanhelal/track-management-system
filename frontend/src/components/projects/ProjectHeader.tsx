import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { Project, ProjectPhase } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectHeaderProps {
  project: Project;
  phases: ProjectPhase[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onExport: () => void;
  onSettings: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = memo(({
  project,
  phases,
  onBack,
  onEdit,
  onDelete,
  onArchive,
  onExport,
  onSettings
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  // Calculate project statistics
  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const totalPhases = phases.length;
  const progressPercentage = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  const progressHours = project.predicted_hours > 0
    ? (project.actual_hours / project.predicted_hours) * 100
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'on_hold': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Navigation and Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          size="small"
        >
          Back to Projects
        </Button>

        {isSupervisor && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export Project">
              <IconButton onClick={onExport} size="small">
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Project Settings">
              <IconButton onClick={onSettings} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Project">
              <IconButton onClick={onEdit} size="small">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive Project">
              <IconButton onClick={onArchive} size="small">
                <ArchiveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Project">
              <IconButton onClick={onDelete} size="small" color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Project Overview Card */}
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            {/* Basic Project Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h1" gutterBottom>
                {project.name}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label={project.status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(project.status) as any}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  Created by {project.created_by_name || 'Unknown'}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Start Date: {formatDate(project.start_date)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Planned Duration: {project.planned_total_weeks} weeks
              </Typography>
            </Grid>

            {/* Progress Metrics */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Phase Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completedPhases} / {totalPhases} phases
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Hour Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.actual_hours} / {project.predicted_hours} hours
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progressHours, 100)}
                  color={progressHours > 100 ? 'warning' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h6" color="primary">
                    {project.actual_hours}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Actual Hours
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" color="text.secondary">
                    {project.predicted_hours}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Predicted Hours
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
});

ProjectHeader.displayName = 'ProjectHeader';

export default ProjectHeader;