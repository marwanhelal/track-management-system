import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface EngineerDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

interface Phase {
  phase_id: number;
  phase_name: string;
  phase_status: string;
  total_hours: number;
  work_log_count: number;
}

interface Project {
  project_id: number;
  project_name: string;
  project_status: string;
  total_hours: number;
  work_log_count: number;
  phases: Phase[];
}

interface Summary {
  total_projects: number;
  total_phases: number;
  total_work_logs: number;
  total_hours: number;
}

interface BreakdownData {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  summary: Summary;
  projects: Project[];
}

const EngineerDetailsDialog: React.FC<EngineerDetailsDialogProps> = ({
  open,
  onClose,
  userId,
  userName
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BreakdownData | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchBreakdown();
    }
  }, [open, userId]);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getUserProjectBreakdown(userId);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch project breakdown');
      }
    } catch (err: any) {
      console.error('Fetch breakdown error:', err);
      setError(err.message || 'Failed to fetch project breakdown');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      'active': 'success',
      'in_progress': 'warning',
      'completed': 'success',
      'on_hold': 'warning',
      'cancelled': 'error',
      'not_started': 'default',
      'pending': 'warning'
    };

    return (
      <Chip
        label={status.replace(/_/g, ' ').toUpperCase()}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <WorkIcon color="primary" />
            <Typography variant="h6" component="span">
              Project Breakdown - {userName}
            </Typography>
          </Box>
          <Button
            onClick={onClose}
            color="inherit"
            size="small"
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              Loading project breakdown...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!loading && !error && data && (
          <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <WorkIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" color="primary">
                      {data.summary.total_projects}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Projects
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <TimelineIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" color="info.main">
                      {data.summary.total_phases}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phases
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <AssignmentIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" color="warning.main">
                      {data.summary.total_work_logs}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Work Logs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <AccessTimeIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" color="success.main">
                      {data.summary.total_hours.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Projects List */}
            {data.projects.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No projects found for this engineer
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom mb={2}>
                  Projects & Phases
                </Typography>

                {data.projects.map((project) => (
                  <Accordion key={project.project_id} defaultExpanded={data.projects.length === 1}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {project.project_name}
                          </Typography>
                          {getStatusChip(project.project_status)}
                        </Box>
                        <Box display="flex" gap={3} mr={2}>
                          <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary">
                              Hours
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {project.total_hours.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary">
                              Logs
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {project.work_log_count}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Phase Name</strong></TableCell>
                              <TableCell><strong>Status</strong></TableCell>
                              <TableCell align="right"><strong>Work Logs</strong></TableCell>
                              <TableCell align="right"><strong>Hours</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {project.phases.map((phase) => (
                              <TableRow key={phase.phase_id} hover>
                                <TableCell>{phase.phase_name}</TableCell>
                                <TableCell>{getStatusChip(phase.phase_status)}</TableCell>
                                <TableCell align="right">{phase.work_log_count}</TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium" color="primary">
                                    {phase.total_hours.toFixed(2)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EngineerDetailsDialog;
