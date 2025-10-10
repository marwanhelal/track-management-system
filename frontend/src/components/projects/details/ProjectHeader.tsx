import React from 'react';
import { Box, Typography, IconButton, Chip, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../../types';

interface ProjectHeaderProps {
  project: Project;
  onDelete: () => void;
  getStatusColor: (status: string) => 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onDelete, getStatusColor }) => {
  const navigate = useNavigate();

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton onClick={() => navigate('/projects')}>
          <ArrowBackIcon />
        </IconButton>
        <div>
          <Typography variant="h4" component="h1">
            {project.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Chip
              label={project.status.replace('_', ' ')}
              color={getStatusColor(project.status) as any}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              Created {new Date(project.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </div>
      </Box>

      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
};

export default ProjectHeader;
