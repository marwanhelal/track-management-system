import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
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
  Alert,
  CircularProgress,
  Divider,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItem,
  ListItemText,
  List,
  Grid
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  GetApp as ExportIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon
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

interface WeeklyStats {
  week: string;
  totalHours: number;
  totalLogs: number;
  projects: string[];
}

interface MonthlyStats {
  month: string;
  totalHours: number;
  totalLogs: number;
  avgHoursPerDay: number;
  projects: string[];
}

const MyWorkLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter states - Show ALL historical work logs by default (last 2 years)
  const [dateFilter, setDateFilter] = useState({
    startDate: dayjs().subtract(2, 'years'),
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
        ...(projectFilter && { projectId: parseInt(projectFilter) }),
        limit: 1000 // Get all logs for analysis
      };

      const workLogsResponse = await apiService.getEngineerWorkLogs(user!.id, filters);
      if (workLogsResponse.success && workLogsResponse.data) {
        setWorkLogs(workLogsResponse.data.workLogs);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, projectFilter, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTotalHours = () => {
    const total = workLogs.reduce((total, log) => total + parseFloat(log.hours?.toString() || '0'), 0);
    return isNaN(total) ? 0 : total;
  };

  const getAverageHoursPerDay = () => {
    const uniqueDates = new Set(workLogs.map(log => log.date));
    return uniqueDates.size > 0 ? getTotalHours() / uniqueDates.size : 0;
  };

  const getProjectStats = () => {
    const projectStats = workLogs.reduce((acc, log) => {
      if (!acc[log.project_id]) {
        acc[log.project_id] = {
          name: log.project_name || 'Unknown Project',
          hours: 0,
          logs: 0
        };
      }
      acc[log.project_id].hours += parseFloat(log.hours?.toString() || '0');
      acc[log.project_id].logs += 1;
      return acc;
    }, {} as Record<number, { name: string; hours: number; logs: number }>);

    return Object.values(projectStats).sort((a, b) => b.hours - a.hours);
  };

  const getWeeklyStats = (): WeeklyStats[] => {
    const weeklyData = workLogs.reduce((acc, log) => {
      const date = dayjs(log.date);
      const weekStart = date.startOf('week');
      const weekKey = weekStart.format('YYYY-MM-DD');

      if (!acc[weekKey]) {
        acc[weekKey] = {
          week: weekStart.format('MMM DD, YYYY'),
          totalHours: 0,
          totalLogs: 0,
          projects: new Set<string>()
        };
      }

      acc[weekKey].totalHours += parseFloat(log.hours?.toString() || '0');
      acc[weekKey].totalLogs += 1;
      acc[weekKey].projects.add(log.project_name || 'Unknown Project');

      return acc;
    }, {} as Record<string, { week: string; totalHours: number; totalLogs: number; projects: Set<string> }>);

    return Object.values(weeklyData)
      .map(week => ({
        ...week,
        projects: Array.from(week.projects)
      }))
      .sort((a, b) => b.week.localeCompare(a.week));
  };

  const getMonthlyStats = (): MonthlyStats[] => {
    const monthlyData = workLogs.reduce((acc, log) => {
      const date = dayjs(log.date);
      const monthStart = date.startOf('month');
      const monthKey = monthStart.format('YYYY-MM');

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthStart.format('MMMM YYYY'),
          totalHours: 0,
          totalLogs: 0,
          dates: new Set<string>(),
          projects: new Set<string>()
        };
      }

      acc[monthKey].totalHours += parseFloat(log.hours?.toString() || '0');
      acc[monthKey].totalLogs += 1;
      acc[monthKey].dates.add(log.date);
      acc[monthKey].projects.add(log.project_name || 'Unknown Project');

      return acc;
    }, {} as Record<string, { month: string; totalHours: number; totalLogs: number; dates: Set<string>; projects: Set<string> }>);

    return Object.values(monthlyData)
      .map(month => ({
        month: month.month,
        totalHours: month.totalHours,
        totalLogs: month.totalLogs,
        avgHoursPerDay: month.dates.size > 0 ? month.totalHours / month.dates.size : 0,
        projects: Array.from(month.projects)
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Project', 'Phase', 'Description', 'Hours'];
    const csvContent = [
      headers.join(','),
      ...workLogs.map(log => [
        log.date,
        `"${log.project_name || 'Unknown Project'}"`,
        `"${log.phase_name || 'Unknown Phase'}"`,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        log.hours
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `work-logs-${dayjs().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedLogs = workLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
          <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          My Work Logs
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Total Hours
                </Typography>
                <Typography variant="h4">{getTotalHours().toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  This period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Total Entries
                </Typography>
                <Typography variant="h4">{workLogs.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Work log entries
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Daily Average
                </Typography>
                <Typography variant="h4">{getAverageHoursPerDay().toFixed(1)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hours per day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Projects
                </Typography>
                <Typography variant="h4">
                  {new Set(workLogs.map(log => log.project_id)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active projects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Analytics Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Project Breakdown */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Breakdown
                </Typography>
                <List dense>
                  {getProjectStats().map((project, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={project.name}
                        secondary={`${(project.hours || 0).toFixed(2)} hours • ${project.logs} entries`}
                      />
                      <Chip
                        label={`${(((project.hours || 0) / getTotalHours()) * 100).toFixed(1)}%`}
                        size="small"
                        color="primary"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly Overview */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Weekly Overview
                </Typography>
                <List dense>
                  {getWeeklyStats().slice(0, 5).map((week, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`Week of ${week.week}`}
                        secondary={`${week.totalHours.toFixed(2)} hours • ${week.totalLogs} entries • ${week.projects.length} projects`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed Analytics Accordions */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Monthly Statistics</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Total Hours</TableCell>
                        <TableCell align="right">Work Logs</TableCell>
                        <TableCell align="right">Avg Hours/Day</TableCell>
                        <TableCell>Projects</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getMonthlyStats().map((month, index) => (
                        <TableRow key={index}>
                          <TableCell>{month.month}</TableCell>
                          <TableCell align="right">{month.totalHours.toFixed(2)}</TableCell>
                          <TableCell align="right">{month.totalLogs}</TableCell>
                          <TableCell align="right">{month.avgHoursPerDay.toFixed(1)}</TableCell>
                          <TableCell>
                            {month.projects.slice(0, 3).map((project, idx) => (
                              <Chip key={idx} label={project} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                            {month.projects.length > 3 && (
                              <Chip label={`+${month.projects.length - 3} more`} size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
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
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={exportToCSV}
                fullWidth
                disabled={workLogs.length === 0}
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Work Logs Table */}
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Detailed Work Logs
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
                  <TableCell>Created</TableCell>
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
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <strong>{dayjs(log.date).format('MMM DD, YYYY')}</strong>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(log.date).format('dddd')}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.project_name || 'Unknown Project'}</TableCell>
                      <TableCell>
                        <Chip label={log.phase_name || 'Unknown Phase'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{parseFloat(log.hours?.toString() || '0').toFixed(2)}</strong>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(log.created_at).format('MMM DD, HH:mm')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {workLogs.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={workLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default MyWorkLogsPage;