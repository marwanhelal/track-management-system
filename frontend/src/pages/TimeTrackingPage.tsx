import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Grid,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  AccessTime as AccessTimeIcon,
  Work as WorkIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { WorkLog, TimerSession } from '../types';

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

// localStorage key for timer persistence
const TIMER_STORAGE_KEY = 'cdtms_active_timer';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<number | null>(null);

  // Enhanced Timer states for pause/resume
  const [timerSession, setTimerSession] = useState<TimerSession | null>(null);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number>(0);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate active work time (elapsed - paused)
  const getActiveWorkTime = useCallback(() => {
    return elapsedTime - totalPausedTime;
  }, [elapsedTime, totalPausedTime]);

  // Save timer state to localStorage
  const saveTimerToLocalStorage = useCallback(() => {
    if (timerSession && timerStatus !== 'idle') {
      const timerData = {
        sessionId: timerSession.id,
        phase_id: timerSession.phase_id,
        project_name: timerSession.project_name,
        phase_name: timerSession.phase_name,
        description: timerSession.description,
        start_time: timerSession.start_time,
        paused_at: pausedAt?.toISOString() || null,
        status: timerStatus,
        elapsed_time_ms: elapsedTime,
        total_paused_ms: totalPausedTime,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, [timerSession, timerStatus, elapsedTime, totalPausedTime, pausedAt]);

  // Load timer state from localStorage and backend
  const recoverTimerSession = useCallback(async () => {
    try {
      // First, check backend for active session
      const response = await apiService.getActiveTimerSession();
      if (response.success && response.data.session) {
        const session = response.data.session;
        setTimerSession(session);

        // Calculate elapsed time based on start_time
        const startTime = new Date(session.start_time).getTime();
        const now = Date.now();
        let calculatedElapsed = now - startTime;

        // Restore paused state if session is paused
        if (session.status === 'paused') {
          setTimerStatus('paused');
          setPausedAt(new Date(session.paused_at));
          setElapsedTime(session.elapsed_time_ms);
          setTotalPausedTime(session.total_paused_ms);

          // Calculate additional pause time since paused_at
          const pausedTime = new Date(session.paused_at).getTime();
          const additionalPausedTime = now - pausedTime;
          setTotalPausedTime(session.total_paused_ms + additionalPausedTime);
        } else if (session.status === 'active') {
          setTimerStatus('running');
          setElapsedTime(calculatedElapsed);
          setTotalPausedTime(session.total_paused_ms);
        }

        console.log('✅ Timer session recovered from backend:', session);
        return;
      }

      // Fallback to localStorage if backend has no active session
      const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer);
        console.log('📦 Found saved timer in localStorage:', timerData);
        // Clear localStorage since backend has no active session
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error recovering timer session:', error);
      // Try localStorage as fallback
      const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimer) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }
  }, []);

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

      // Filter to only show phases that engineers can work on (unlocked phases)
      const workablePhases = allPhases.filter(phase =>
        ['ready', 'in_progress', 'submitted'].includes(phase.status)
      );
      setPhases(workablePhases);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, projectFilter, user]);

  useEffect(() => {
    fetchData();
    recoverTimerSession();
  }, [fetchData, recoverTimerSession]);

  // Timer interval effect
  useEffect(() => {
    if (timerStatus === 'running' && timerSession) {
      timerIntervalRef.current = setInterval(() => {
        const startTime = new Date(timerSession.start_time).getTime();
        const now = Date.now();
        setElapsedTime(now - startTime);
      }, 1000);
    } else if (timerStatus === 'paused') {
      // When paused, track pause duration
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      const pauseInterval = setInterval(() => {
        if (pauseStartTime > 0) {
          const now = Date.now();
          const currentPauseDuration = now - pauseStartTime;
          setTotalPausedTime(totalPausedTime + currentPauseDuration);
          setPauseStartTime(now);
        }
      }, 1000);

      return () => clearInterval(pauseInterval);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerStatus, timerSession, pauseStartTime, totalPausedTime]);

  // Auto-save timer state every 30 seconds
  useEffect(() => {
    if (timerStatus !== 'idle') {
      autoSaveIntervalRef.current = setInterval(() => {
        saveTimerToLocalStorage();

        // Also sync to backend
        if (timerSession && timerStatus === 'running') {
          // Auto-save to backend is handled by pause/resume actions
        }
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [timerStatus, saveTimerToLocalStorage, timerSession]);

  // Save timer state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveTimerToLocalStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveTimerToLocalStorage]);

  const handleCreateWorkLog = async () => {
    try {
      if (!formData.hours || !formData.description || !formData.phase_id) {
        setError('Please fill in all required fields');
        return;
      }

      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0) {
        setError('Hours must be greater than 0');
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
      if (isNaN(hours) || hours <= 0) {
        setError('Hours must be greater than 0');
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

  const openDeleteDialog = (logId: number) => {
    setLogToDelete(logId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteWorkLog = async () => {
    if (!logToDelete) return;

    try {
      const response = await apiService.deleteWorkLog(logToDelete);
      if (response.success) {
        setSuccess('Work log deleted successfully');
        setDeleteDialogOpen(false);
        setLogToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete work log');
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    }
  };

  const startTimer = async () => {
    try {
      if (!formData.phase_id || !formData.description) {
        setError('Please select a phase and enter a description before starting the timer');
        return;
      }

      const response = await apiService.startTimerSession({
        phase_id: parseInt(formData.phase_id),
        description: formData.description
      });

      if (response.success && response.data) {
        const session = response.data.session;
        setTimerSession(session);
        setTimerStatus('running');
        setElapsedTime(0);
        setTotalPausedTime(0);
        setPausedAt(null);
        saveTimerToLocalStorage();
        setSuccess('Timer started successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start timer');
    }
  };

  const pauseTimer = async () => {
    try {
      if (!timerSession) return;

      const response = await apiService.pauseTimerSession(timerSession.id, elapsedTime);

      if (response.success) {
        setTimerStatus('paused');
        setPausedAt(new Date());
        setPauseStartTime(Date.now());
        saveTimerToLocalStorage();
        setSuccess('Timer paused');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pause timer');
    }
  };

  const resumeTimer = async () => {
    try {
      if (!timerSession) return;

      const response = await apiService.resumeTimerSession(timerSession.id, totalPausedTime);

      if (response.success) {
        setTimerStatus('running');
        setPausedAt(null);
        setPauseStartTime(0);
        saveTimerToLocalStorage();
        setSuccess('Timer resumed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resume timer');
    }
  };

  const stopTimer = async () => {
    try {
      if (!timerSession) return;

      const activeWorkTime = getActiveWorkTime();
      if (activeWorkTime <= 0) {
        setError('Active work time must be greater than 0');
        return;
      }

      const response = await apiService.stopTimerSession(
        timerSession.id,
        elapsedTime,
        totalPausedTime
      );

      if (response.success && response.data) {
        setSuccess(
          `Work log created! Active time: ${response.data.activeWorkHours.toFixed(2)}h, Paused: ${response.data.totalPausedHours.toFixed(2)}h`
        );

        // Reset timer state
        setTimerSession(null);
        setTimerStatus('idle');
        setElapsedTime(0);
        setTotalPausedTime(0);
        setPausedAt(null);
        localStorage.removeItem(TIMER_STORAGE_KEY);

        // Refresh work logs
        fetchData();

        // Reset form
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop timer');
    }
  };

  const cancelTimer = async () => {
    try {
      if (!timerSession) return;

      if (window.confirm('Are you sure you want to cancel this timer session? This cannot be undone.')) {
        const response = await apiService.cancelTimerSession(timerSession.id);

        if (response.success) {
          setTimerSession(null);
          setTimerStatus('idle');
          setElapsedTime(0);
          setTotalPausedTime(0);
          setPausedAt(null);
          localStorage.removeItem(TIMER_STORAGE_KEY);
          setSuccess('Timer cancelled');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel timer');
    }
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

        {/* Enhanced Timer Section with Pause/Resume */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Time Tracker
              </Typography>
              {timerStatus !== 'idle' && (
                <Chip
                  label={timerStatus === 'running' ? 'Running' : 'Paused'}
                  color={timerStatus === 'running' ? 'success' : 'warning'}
                  size="small"
                />
              )}
            </Box>

            {timerSession && timerStatus !== 'idle' ? (
              <Box>
                {/* Timer Display */}
                <Box textAlign="center" mb={2}>
                  {timerStatus === 'paused' ? (
                    <Box>
                      <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Active Time</Typography>
                          <Typography variant="h4" color="success.main">
                            {formatTime(getActiveWorkTime())}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Paused Time</Typography>
                          <Typography variant="h4" color="warning.main">
                            {formatTime(totalPausedTime)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Total Elapsed</Typography>
                          <Typography variant="h4" color="text.secondary">
                            {formatTime(elapsedTime)}
                          </Typography>
                        </Grid>
                      </Grid>
                      {pausedAt && (
                        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                          ⏸️ Paused since: {pausedAt.toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Active Work Time</Typography>
                      <Typography variant="h3" color="success.main" gutterBottom>
                        {formatTime(getActiveWorkTime())}
                      </Typography>
                      {totalPausedTime > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          (Total paused: {formatTime(totalPausedTime)})
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

                <Typography variant="body1" gutterBottom textAlign="center">
                  Working on: <strong>{timerSession.project_name}</strong> - {timerSession.phase_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom textAlign="center">
                  {timerSession.description}
                </Typography>

                {/* Timer Control Buttons */}
                <Box display="flex" gap={2} justifyContent="center" mt={2}>
                  {timerStatus === 'running' ? (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<PauseIcon />}
                      onClick={pauseTimer}
                      size="large"
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayIcon />}
                      onClick={resumeTimer}
                      size="large"
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopTimer}
                    size="large"
                  >
                    Stop Timer
                  </Button>
                  <Tooltip title="Cancel timer session">
                    <IconButton
                      color="error"
                      onClick={cancelTimer}
                    >
                      <CancelIcon />
                    </IconButton>
                  </Tooltip>
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
                          onClick={() => openDeleteDialog(log.id)}
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
                  inputProps={{ min: 0.25, step: 0.25 }}
                  helperText="Minimum 0.25 hours (no upper limit for catch-up logging)"
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

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone!
            </Alert>
            <Typography>
              Are you sure you want to delete this work log?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteWorkLog}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default TimeTrackingPage;
