import React, { useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  LinearProgress,
  Button,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // ✅ OPTIMIZED: Memoize progress calculation
  const progress = useMemo(() => {
    if (project.predicted_hours === 0) return 0;
    return Math.min((project.actual_hours / project.predicted_hours) * 100, 100);
  }, [project.predicted_hours, project.actual_hours]);

  // ✅ OPTIMIZED: Memoize date formatting
  const formattedStartDate = useMemo(() => {
    return new Date(project.start_date).toLocaleDateString();
  }, [project.start_date]);

  // ✅ OPTIMIZED: Memoize navigation handler
  const handleViewDetails = useCallback(() => {
    navigate(`/projects/${project.id}`);
  }, [navigate, project.id]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h3" gutterBottom>
            {project.name}
          </Typography>
          <Chip
            label={project.status.replace('_', ' ').toUpperCase()}
            color={getStatusColor(project.status) as any}
            size="small"
          />
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <Schedule fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Started: {formattedStartDate}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={2}>
          <TrendingUp fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Duration: {project.planned_total_weeks} weeks
          </Typography>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Hours Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {project.actual_hours}/{project.predicted_hours}h
            </Typography>
          </Box>
          <Tooltip title={`${progress.toFixed(1)}% complete`}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Tooltip>
        </Box>

        {project.created_by_name && (
          <Typography variant="caption" color="text.secondary">
            Created by: {project.created_by_name}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={handleViewDetails}
          fullWidth
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

// ✅ OPTIMIZED: Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(ProjectCard);