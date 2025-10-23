import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
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
  CircularProgress,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  TableChart as ExcelIcon,
  Groups as GroupsIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import apiService from '../services/api';
import { useSocket } from '../contexts/SocketContext';

interface EngineerWorkLog {
  id: number;
  project_name: string;
  phase_name: string;
  hours: number;
  description: string;
  date: string;
  created_at: string;
}

interface ActiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  login_time: string | null;
  total_hours: number;
  work_logs: EngineerWorkLog[];
}

interface InactiveEngineer {
  id: number;
  name: string;
  email: string;
  job_description: string | null;
  last_login: string | null;
  last_work_date: string | null;
  status: 'no_work_logged' | 'not_logged_in' | 'completely_inactive';
}

interface DailyActivityData {
  summary: {
    total_active_engineers: number;
    total_inactive_engineers: number;
    total_hours_logged: number;
    average_hours_per_engineer: number;
    date: string;
  };
  active_engineers: ActiveEngineer[];
  inactive_engineers: InactiveEngineer[];
}

const EngineerActivityPage: React.FC = () => {
  const { socket, connected } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [activityData, setActivityData] = useState<DailyActivityData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getDailyEngineerActivity(selectedDate.format('YYYY-MM-DD'));

      if (response.success && response.data) {
        setActivityData(response.data);
      } else {
        setError(response.error || 'Failed to fetch activity data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchActivityData();
  }, [fetchActivityData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (socket && connected && autoRefresh) {
      const handleActivityUpdate = (data: any) => {
        console.log('Engineer activity updated:', data);
        setSuccess(`${data.engineerName} logged ${data.hours} hours on ${data.projectName}`);

        // Refresh data if the update is for today's date
        const updateDate = dayjs(data.date);
        if (updateDate.isSame(selectedDate, 'day')) {
          fetchActivityData();
        }

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      };

      socket.on('engineer_activity_updated', handleActivityUpdate);

      return () => {
        socket.off('engineer_activity_updated', handleActivityUpdate);
      };
    }
  }, [socket, connected, autoRefresh, selectedDate, fetchActivityData]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const blob = await apiService.exportEngineerActivityExcel(selectedDate.format('YYYY-MM-DD'));

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `engineer-activity-${selectedDate.format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Excel file exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to export Excel: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'no_work_logged':
        return 'warning';
      case 'not_logged_in':
        return 'error';
      case 'completely_inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'no_work_logged':
        return 'Logged In - No Work';
      case 'not_logged_in':
        return 'Not Logged In';
      case 'completely_inactive':
        return 'Never Logged In';
      default:
        return status;
    }
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
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <div>
              <Typography variant="h4">
                Engineer Activity Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track engineer login activity and work logs
              </Typography>
            </div>
          </Box>
          <Chip
            label={connected ? 'Live Updates Active' : 'Offline'}
            color={connected ? 'success' : 'default'}
            size="small"
            icon={connected ? <ActiveIcon /> : <InactiveIcon />}
          />
        </Box>

        {/* Alerts */}
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

        {/* Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchActivityData}
                fullWidth
                disabled={loading}
              >
                Refresh Data
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<ExcelIcon />}
                onClick={handleExportExcel}
                fullWidth
                disabled={exporting || !activityData}
              >
                Export Excel
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    color="primary"
                  />
                }
                label="Auto-refresh"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        {activityData && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ActiveIcon />
                    <Typography variant="h6">Active Engineers</Typography>
                  </Box>
                  <Typography variant="h3">{activityData.summary.total_active_engineers}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Logged work today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <InactiveIcon />
                    <Typography variant="h6">Inactive Engineers</Typography>
                  </Box>
                  <Typography variant="h3">{activityData.summary.total_inactive_engineers}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    No work logged
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ScheduleIcon />
                    <Typography variant="h6">Total Hours</Typography>
                  </Box>
                  <Typography variant="h3">{activityData.summary.total_hours_logged.toFixed(1)}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Hours logged today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BarChartIcon />
                    <Typography variant="h6">Average Hours</Typography>
                  </Box>
                  <Typography variant="h3">{activityData.summary.average_hours_per_engineer.toFixed(1)}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Per active engineer
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Active Engineers Section */}
        {activityData && activityData.active_engineers.length > 0 && (
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white' }}>
              <Typography variant="h6">
                <ActiveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Active Engineers ({activityData.active_engineers.length})
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
              {activityData.active_engineers.map((engineer) => (
                <Accordion key={engineer.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {engineer.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {engineer.email}
                          {engineer.job_description && ` • ${engineer.job_description}`}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${engineer.total_hours.toFixed(2)} hrs`}
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Project</TableCell>
                            <TableCell>Phase</TableCell>
                            <TableCell align="right">Hours</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Time Logged</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {engineer.work_logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{log.project_name}</TableCell>
                              <TableCell>
                                <Chip label={log.phase_name} size="small" />
                              </TableCell>
                              <TableCell align="right">
                                <strong>{log.hours.toFixed(2)}</strong>
                              </TableCell>
                              <TableCell>{log.description || '-'}</TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(log.created_at).format('HH:mm:ss')}
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
          </Paper>
        )}

        {/* Inactive Engineers Section */}
        {activityData && activityData.inactive_engineers.length > 0 && (
          <Paper>
            <Box sx={{ p: 2, background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', color: 'white' }}>
              <Typography variant="h6">
                <InactiveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Inactive Engineers ({activityData.inactive_engineers.length})
              </Typography>
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Job Description</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Last Work Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityData.inactive_engineers.map((engineer) => (
                    <TableRow key={engineer.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{engineer.name}</TableCell>
                      <TableCell>{engineer.email}</TableCell>
                      <TableCell>{engineer.job_description || 'N/A'}</TableCell>
                      <TableCell>
                        {engineer.last_login
                          ? dayjs(engineer.last_login).format('MMM DD, YYYY HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {engineer.last_work_date
                          ? dayjs(engineer.last_work_date).format('MMM DD, YYYY')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(engineer.status)}
                          color={getStatusBadgeColor(engineer.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* No Data Message */}
        {activityData && activityData.active_engineers.length === 0 && activityData.inactive_engineers.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No engineer data available for {selectedDate.format('MMMM DD, YYYY')}
            </Typography>
          </Paper>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default EngineerActivityPage;
