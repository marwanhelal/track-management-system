import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  FormHelperText,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  AccessTime as AccessTimeIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { WorkLog } from '../types';

interface Project {
  id: number;
  name: string;
  status: string;
}

interface ProjectPhase {
  id: number;
  phase_name: string;
  project_id: number;
  project_name: string;
  status: string;
  phase_order: number;
}

interface TimerSession {
  phaseId: number;
  projectName: string;
  phaseName: string;
  startTime: Date;
  description: string;
}

const TimeTrackingPage: React.FC = () => {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  // Timer states
  const [timerSession, setTimerSession] = useState<TimerSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Form states
  const [formData, setFormData] = useState({
    date: new Date(),
    hours: '',
    description: '',
    phase_id: ''
  });

  // Filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: dayjs().startOf('month'),
    endDate: dayjs()
  });
  const [projectFilter, setProjectFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch projects
      const projectsResponse = await apiService.getProjects();
      if (projectsResponse.success && projectsResponse.data) {
        setProjects(projectsResponse.data.projects);
      }

      // Fetch work logs with filters
      const filters = {
        startDate: dateFilter.startDate.format('YYYY-MM-DD'),
        endDate: dateFilter.endDate.format('YYYY-MM-DD'),
        ...(projectFilter && { projectId: parseInt(projectFilter) })
      };

      const workLogsResponse = await apiService.getEngineerWorkLogs(user!.id, filters);
      if (workLogsResponse.success && workLogsResponse.data) {
        setWorkLogs(workLogsResponse.data.workLogs);
      }

      // Get all phases for active projects
      const allPhases: ProjectPhase[] = [];
      if (projectsResponse.success && projectsResponse.data) {
        for (const project of projectsResponse.data.projects) {
          try {
            const phasesResponse = await apiService.getProjectPhases(project.id);
            if (phasesResponse.success && phasesResponse.data) {
              allPhases.push(...phasesResponse.data.phases.map(phase => ({
                ...phase,
                project_name: project.name
              })));
            }
          } catch (err) {
            // Continue if phases fetch fails for a project
          }
        }
      }
      setPhases(allPhases);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, projectFilter, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerSession) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - timerSession.startTime.getTime());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerSession]);


  const handleCreateWorkLog = async () => {
    try {
      if (!formData.hours || !formData.description || !formData.phase_id) {
        setError('Please fill in all required fields');
        return;
      }

      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        setError('Hours must be a valid number between 0 and 24');
        return;
      }

      const workLogData = {
        date: dayjs(formData.date).format('YYYY-MM-DD'),
        hours,
        description: formData.description,
        phase_id: parseInt(formData.phase_id)
      };

      const response = await apiService.createWorkLog(workLogData);
      if (response.success) {
        setSuccess('Work log created successfully');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create work log');
    }
  };

  const handleUpdateWorkLog = async () => {
    if (!editingLog) return;

    try {
      if (!formData.hours || !formData.description || !formData.phase_id) {
        setError('Please fill in all required fields');
        return;
      }

      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        setError('Hours must be a valid number between 0 and 24');
        return;
      }

      const updateData = {
        date: dayjs(formData.date).format('YYYY-MM-DD'),
        hours,
        description: formData.description,
        phase_id: parseInt(formData.phase_id)
      };

      const response = await apiService.updateWorkLog(editingLog.id, updateData);
      if (response.success) {
        setSuccess('Work log updated successfully');
        setDialogOpen(false);
        setEditingLog(null);
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update work log');
    }
  };

  const handleDeleteWorkLog = async (logId: number) => {
    if (!window.confirm('Are you sure you want to delete this work log?')) return;

    try {
      const response = await apiService.deleteWorkLog(logId);
      if (response.success) {
        setSuccess('Work log deleted successfully');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete work log');
    }
  };

  const startTimer = () => {
    if (!formData.phase_id || !formData.description) {
      setError('Please select a phase and enter a description before starting the timer');
      return;
    }

    const phase = phases.find(p => p.id === parseInt(formData.phase_id));
    if (!phase) return;

    setTimerSession({
      phaseId: parseInt(formData.phase_id),
      projectName: phase.project_name,
      phaseName: phase.phase_name,
      startTime: new Date(),
      description: formData.description
    });
    setElapsedTime(0);
  };

  const stopTimer = () => {
    if (!timerSession) return;

    const hours = elapsedTime / (1000 * 60 * 60);
    setFormData(prev => ({
      ...prev,
      hours: hours.toFixed(2),
      phase_id: timerSession.phaseId.toString(),
      description: timerSession.description
    }));

    setTimerSession(null);
    setElapsedTime(0);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      hours: '',
      description: '',
      phase_id: ''
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingLog(null);
    setDialogOpen(true);
  };

  const openEditDialog = (log: WorkLog) => {
    setFormData({
      date: new Date(log.date),
      hours: log.hours.toString(),
      description: log.description || '',
      phase_id: log.phase_id.toString()
    });
    setEditingLog(log);
    setDialogOpen(true);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalHours = () => {
    const total = workLogs.reduce((total, log) => total + parseFloat(log.hours?.toString() || '0'), 0);
    return isNaN(total) ? 0 : total;
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <TimerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Time Tracking
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Timer Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Time Tracker
            </Typography>

            {timerSession ? (
              <Box>
                <Typography variant="h3" color="primary" gutterBottom textAlign="center">
                  {formatTime(elapsedTime)}
                </Typography>
                <Typography variant="body1" gutterBottom textAlign="center">
                  Working on: <strong>{timerSession.projectName}</strong> - {timerSession.phaseName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom textAlign="center">
                  {timerSession.description}
                </Typography>
                <Box textAlign="center">
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopTimer}
                    size="large"
                  >
                    Stop Timer
                  </Button>
                </Box>
              </Box>
            ) : (
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Project Phase</InputLabel>
                    <Select
                      value={formData.phase_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, phase_id: e.target.value }))}
                      label="Project Phase"
                    >
                      {phases.map(phase => (
                        <MenuItem key={phase.id} value={phase.id}>
                          {phase.project_name} - {phase.phase_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Task Description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What are you working on?"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayIcon />}
                    onClick={startTimer}
                    size="large"
                    fullWidth
                    disabled={!formData.phase_id || !formData.description}
                  >
                    Start Timer
                  </Button>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Total Hours This Period
                </Typography>
                <Typography variant="h4">{getTotalHours().toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Total Work Logs
                </Typography>
                <Typography variant="h4">{workLogs.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Active Projects
                </Typography>
                <Typography variant="h4">
                  {new Set(workLogs.map(log => log.project_id)).size}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={dateFilter.startDate}
                onChange={(date) => date && setDateFilter(prev => ({ ...prev, startDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={dateFilter.endDate}
                onChange={(date) => date && setDateFilter(prev => ({ ...prev, endDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Project</InputLabel>
                <Select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  label="Filter by Project"
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                fullWidth
              >
                Add Work Log
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Work Logs Table */}
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Work Logs
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No work logs found for the selected period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        {new Date(log.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{log.project_name || 'Unknown Project'}</TableCell>
                      <TableCell>
                        <Chip label={log.phase_name || 'Unknown Phase'} size="small" />
                      </TableCell>
                      <TableCell>{log.description || '-'}</TableCell>
                      <TableCell align="right">
                        <strong>{parseFloat(log.hours?.toString() || '0').toFixed(2)}</strong>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(log)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteWorkLog(log.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Work Log Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingLog ? 'Edit Work Log' : 'Add Work Log'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Date"
                  value={dayjs(formData.date)}
                  onChange={(date) => date && setFormData(prev => ({ ...prev, date: date.toDate() }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hours"
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                  inputProps={{ min: 0, max: 24, step: 0.25 }}
                  helperText="Enter hours worked (0.25 = 15 minutes)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Project Phase</InputLabel>
                  <Select
                    value={formData.phase_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, phase_id: e.target.value }))}
                    label="Project Phase"
                  >
                    {phases.map(phase => (
                      <MenuItem key={phase.id} value={phase.id}>
                        {phase.project_name} - {phase.phase_name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Select the project phase you worked on</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you worked on..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={editingLog ? handleUpdateWorkLog : handleCreateWorkLog}
              variant="contained"
            >
              {editingLog ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default TimeTrackingPage;