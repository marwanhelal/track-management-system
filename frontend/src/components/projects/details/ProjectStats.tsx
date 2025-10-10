import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import { Project, ProjectPhase } from '../../../types';

interface ProjectStatsProps {
  project: Project;
  phases: ProjectPhase[];
  calculateProjectProgress: () => number;
}

const ProjectStats: React.FC<ProjectStatsProps> = ({ project, phases, calculateProjectProgress }) => {
  const completedPhases = phases.filter(p => p.status === 'completed' || p.status === 'approved').length;
  const progressValue = calculateProjectProgress();

  return (
    <>
      {/* Project Overview Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 3,
          '& > *': {
            flex: { xs: '1 1 100%', md: '1 1 calc(25% - 18px)' }
          }
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              {project.planned_total_weeks}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Planned Weeks
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              {project.predicted_hours}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Predicted Hours
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main">
              {project.actual_hours || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actual Hours
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="info.main">
              {Math.round(progressValue)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {completedPhases} of {phases.length} phases fully completed
          </Typography>
        </CardContent>
      </Card>
    </>
  );
};

export default ProjectStats;
