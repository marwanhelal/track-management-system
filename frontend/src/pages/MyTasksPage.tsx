import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Avatar, AvatarGroup, Tooltip, IconButton, Button, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Skeleton, Alert, Divider, Badge, Tab, Tabs, Paper
} from '@mui/material';
import {
  Search, FilterList, Assignment, CheckCircle, PlayArrow,
  Warning, Block, AccessTime, CalendarToday, Person,
  ArrowForward, Add, Refresh, TrendingUp, FiberManualRecord
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { TaskAssignment, TaskStatus } from '../types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactNode; bgColor: string }> = {
  assigned: { label: 'Assigned', color: 'info', icon: <Assignment fontSize="small" />, bgColor: '#e3f2fd' },
  in_progress: { label: 'In Progress', color: 'primary', icon: <PlayArrow fontSize="small" />, bgColor: '#e8f5e9' },
  blocked: { label: 'Blocked', color: 'error', icon: <Block fontSize="small" />, bgColor: '#fce4ec' },
  submitted: { label: 'Submitted', color: 'warning', icon: <CheckCircle fontSize="small" />, bgColor: '#fff8e1' },
  approved: { label: 'Approved', color: 'success', icon: <CheckCircle fontSize="small" />, bgColor: '#f3e5f5' },
  rejected: { label: 'Rejected', color: 'error', icon: <Warning fontSize="small" />, bgColor: '#ffebee' },
  cancelled: { label: 'Cancelled', color: 'default', icon: <Block fontSize="small" />, bgColor: '#f5f5f5' },
};

interface TaskWithStats extends TaskAssignment {
  logged_hours?: number;
  milestone_count?: number;
  completed_milestones?: number;
  overdue_milestones?: number;
  team_leader_name?: string;
  project_name?: string;
}

const TaskCard: React.FC<{ task: TaskWithStats; onClick: () => void }> = ({ task, onClick }) => {
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
  const hoursPercent = task.allocated_hours > 0
    ? Math.min(100, ((task.logged_hours || 0) / task.allocated_hours) * 100)
    : 0;
  const isOverBudget = (task.logged_hours || 0) > task.allocated_hours;
  const milestonesTotal = task.milestone_count || 0;
  const milestonesCompleted = task.completed_milestones || 0;
  const milestonePercent = milestonesTotal > 0 ? (milestonesCompleted / milestonesTotal) * 100 : 0;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: task.status === 'in_progress' ? 'primary.main'
          : task.status === 'submitted' ? 'warning.main'
          : task.status === 'rejected' ? 'error.main'
          : task.status === 'approved' ? 'success.main'
          : 'grey.300',
        transition: 'all 0.2s ease',
        bgcolor: statusCfg.bgColor,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: 'primary.main',
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>
              {task.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={task.project_name || `Project #${task.project_id}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              {task.team_leader_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Person sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">{task.team_leader_name}</Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              icon={statusCfg.icon as any}
              label={statusCfg.label}
              size="small"
              color={statusCfg.color}
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Description */}
        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{
            mb: 1.5, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
          }}>
            {task.description}
          </Typography>
        )}

        {/* Hours Progress */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: 12 }} />
              Hours Budget
            </Typography>
            <Typography variant="caption" fontWeight={600} color={isOverBudget ? 'error.main' : 'text.primary'}>
              {task.logged_hours || 0}h / {task.allocated_hours}h
              {isOverBudget && ' ⚠️'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, hoursPercent)}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: isOverBudget ? 'error.main' : hoursPercent > 80 ? 'warning.main' : 'primary.main'
              }
            }}
          />
        </Box>

        {/* Milestones */}
        {milestonesTotal > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarToday sx={{ fontSize: 12 }} />
                Milestones
              </Typography>
              <Typography variant="caption" fontWeight={600} color={task.overdue_milestones ? 'error.main' : 'text.primary'}>
                {milestonesCompleted}/{milestonesTotal}
                {task.overdue_milestones ? ` · ${task.overdue_milestones} overdue` : ''}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={milestonePercent}
              color={task.overdue_milestones ? 'error' : 'success'}
              sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.08)' }}
            />
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No date'}
            </Typography>
          </Box>
          <ArrowForward sx={{ fontSize: 16, color: 'primary.main' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isEngineer, isTeamLeader } = useAuth();

  const [tasks, setTasks] = useState<TaskWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [tab, setTab] = useState(0);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getTaskAssignments();
      if (response.success) {
        setTasks(response.data?.tasks || response.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.project_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'active') {
      return matchesSearch && ['assigned', 'in_progress', 'blocked'].includes(task.status);
    }
    if (statusFilter === 'pending_review') {
      return matchesSearch && task.status === 'submitted';
    }
    if (statusFilter === 'rejected') {
      return matchesSearch && task.status === 'rejected';
    }
    if (statusFilter === 'completed') {
      return matchesSearch && ['approved', 'cancelled'].includes(task.status);
    }
    return matchesSearch;
  });

  const counts = {
    active: tasks.filter(t => ['assigned', 'in_progress', 'blocked'].includes(t.status)).length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
    completed: tasks.filter(t => ['approved', 'cancelled'].includes(t.status)).length,
  };

  const todaysFocus = tasks.filter(t =>
    ['assigned', 'in_progress', 'blocked'].includes(t.status) &&
    t.due_date &&
    new Date(t.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
            My Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isTeamLeader ? 'Tasks assigned to you by supervisors' : 'Tasks assigned to you by your team leaders'}
          </Typography>
        </Box>
        <IconButton onClick={fetchTasks} size="small" sx={{ bgcolor: 'action.hover' }}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Active', value: counts.active, color: 'primary.main', icon: <PlayArrow /> },
          { label: 'Awaiting Review', value: counts.submitted, color: 'warning.main', icon: <CheckCircle /> },
          { label: 'Rejected', value: counts.rejected, color: 'error.main', icon: <Warning /> },
          { label: 'Completed', value: counts.completed, color: 'success.main', icon: <TrendingUp /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color }}>
                  {loading ? <Skeleton width={40} /> : value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Today's Focus */}
      {!loading && todaysFocus.length > 0 && (
        <Alert
          severity="warning"
          icon={<CalendarToday />}
          sx={{ mb: 3, borderRadius: 3 }}
          action={
            <Typography variant="caption" fontWeight={600}>
              Due within 3 days
            </Typography>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {todaysFocus.length} task{todaysFocus.length > 1 ? 's' : ''} need your attention soon:{' '}
            {todaysFocus.slice(0, 2).map(t => t.title).join(', ')}
            {todaysFocus.length > 2 && ` +${todaysFocus.length - 2} more`}
          </Typography>
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="active">
              Active <Chip label={counts.active} size="small" sx={{ ml: 1 }} />
            </MenuItem>
            <MenuItem value="pending_review">
              Awaiting Review <Chip label={counts.submitted} size="small" sx={{ ml: 1 }} />
            </MenuItem>
            <MenuItem value="rejected">
              Rejected <Chip label={counts.rejected} size="small" sx={{ ml: 1 }} />
            </MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Task Grid */}
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredTasks.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '2px dashed', borderColor: 'divider' }}>
          <Assignment sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No tasks match your search' : 'No tasks found'}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {statusFilter === 'active' ? 'Your active tasks will appear here once assigned by your team leader.' : 'Try a different filter.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredTasks.map(task => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <TaskCard task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyTasksPage;
