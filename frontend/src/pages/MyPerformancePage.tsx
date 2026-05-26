import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Avatar, Skeleton, Alert, Paper, Divider, Tooltip, Button,
  Select, FormControl, InputLabel, MenuItem
} from '@mui/material';
import {
  TrendingUp, TrendingDown, CheckCircle, AccessTime, Assignment,
  EmojiEvents, Star, Warning, CalendarToday, BarChart,
  FiberManualRecord, Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface PerformanceData {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  rejectedTasks: number;
  onTimeRate: number;
  avgHoursPerTask: number;
  totalLoggedHours: number;
  overdueMilestones: number;
  completedMilestones: number;
  totalMilestones: number;
}

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────
const MiniBarChart: React.FC<{ data: { label: string; value: number; color: string }[]; max: number }> = ({ data, max }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80, pt: 1 }}>
    {data.map(({ label, value, color }) => (
      <Box key={label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color, fontSize: '0.65rem' }}>
          {value}
        </Typography>
        <Box
          sx={{
            width: '100%', borderRadius: '3px 3px 0 0',
            bgcolor: color,
            height: max > 0 ? `${(value / max) * 60}px` : '0px',
            minHeight: value > 0 ? '4px' : '0px',
            transition: 'height 0.5s ease'
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}>
          {label}
        </Typography>
      </Box>
    ))}
  </Box>
);

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | null;
  progress?: number;
}> = ({ label, value, subtitle, color, icon, trend, progress }) => (
  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ p: 1, bgcolor: `${color}20`, borderRadius: 2, color, display: 'flex' }}>
          {icon}
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            {trend === 'up' ? (
              <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
            )}
          </Box>
        )}
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color, mb: 0.3 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.disabled">{subtitle}</Typography>
      )}
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, progress)}
          sx={{
            mt: 1, height: 4, borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.06)',
            '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: color }
          }}
        />
      )}
    </CardContent>
  </Card>
);

// ── Radial-style Score ─────────────────────────────────────────────────────────
const PerformanceScore: React.FC<{ score: number }> = ({ score }) => {
  const getColor = (s: number) => s >= 80 ? '#2e7d32' : s >= 60 ? '#f57c00' : '#d32f2f';
  const getLabel = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Needs Improvement' : 'Critical';
  const color = getColor(score);

  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{
        width: 120, height: 120, borderRadius: '50%',
        border: '8px solid', borderColor: color,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        mx: 'auto', mb: 1.5,
        boxShadow: `0 0 20px ${color}40`,
        position: 'relative'
      }}>
        <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>/ 100</Typography>
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>{getLabel(score)}</Typography>
      <Typography variant="caption" color="text.secondary">Performance Score</Typography>
    </Box>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const MyPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTaskAssignments();
      setTasks(res.data?.tasks || res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate performance metrics from tasks
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'approved').length;
  const activeTasks = tasks.filter(t => ['assigned', 'in_progress', 'blocked'].includes(t.status)).length;
  const submittedTasks = tasks.filter(t => t.status === 'submitted').length;
  const rejectedTasks = tasks.filter(t => t.status === 'rejected').length;
  const totalLoggedHours = tasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0);
  const totalAllocatedHours = tasks.reduce((sum, t) => sum + (t.allocated_hours || 0), 0);
  const onTimeCompletions = completedTasks; // simplified — ideally compare due_date vs completed_at

  const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompletions / completedTasks) * 100) : 0;
  const avgHoursPerTask = completedTasks > 0
    ? Math.round(tasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.logged_hours || 0), 0) / completedTasks)
    : 0;

  const hoursEfficiency = totalAllocatedHours > 0
    ? Math.min(100, Math.round((1 - Math.max(0, (totalLoggedHours - totalAllocatedHours)) / totalAllocatedHours) * 100))
    : 100;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Performance score: composite
  const performanceScore = Math.round(
    (completionRate * 0.4) +
    (hoursEfficiency * 0.3) +
    (onTimeRate * 0.2) +
    (rejectedTasks === 0 ? 10 : Math.max(0, 10 - rejectedTasks * 2))
  );

  // By-project breakdown
  const byProject = Object.entries(
    tasks.reduce((acc: Record<string, { name: string; tasks: number; completed: number; hours: number }>, t) => {
      const key = String(t.project_id);
      if (!acc[key]) acc[key] = { name: t.project_name || `Project #${t.project_id}`, tasks: 0, completed: 0, hours: 0 };
      acc[key].tasks++;
      if (t.status === 'approved') acc[key].completed++;
      acc[key].hours += t.logged_hours || 0;
      return acc;
    }, {})
  ).map(([id, data]) => ({ id, ...data }));

  const taskStatusChart = [
    { label: 'Assigned', value: tasks.filter(t => t.status === 'assigned').length, color: '#1976d2' },
    { label: 'In Prog', value: tasks.filter(t => t.status === 'in_progress').length, color: '#388e3c' },
    { label: 'Submitted', value: submittedTasks, color: '#f57c00' },
    { label: 'Approved', value: completedTasks, color: '#7b1fa2' },
    { label: 'Rejected', value: rejectedTasks, color: '#d32f2f' },
  ];
  const maxTaskStatus = Math.max(...taskStatusChart.map(d => d.value), 1);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>My Performance</Typography>
          <Typography variant="body2" color="text.secondary">
            Your work stats across all assigned tasks
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          variant="outlined"
          size="small"
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {/* Performance Score */}
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Overall Score</Typography>
                <PerformanceScore score={performanceScore} />
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[
                    { label: 'Completion Rate', value: completionRate, color: '#7b1fa2' },
                    { label: 'Hours Efficiency', value: hoursEfficiency, color: '#1976d2' },
                  ].map(({ label, value, color }) => (
                    <Box key={label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="caption" fontWeight={700}>{value}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={value}
                        sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: color } }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Stat Cards */}
          <Grid item xs={12} sm={6} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Total Tasks" value={totalTasks}
                  color="#1976d2" icon={<Assignment />}
                  subtitle={`${activeTasks} active`}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Completed" value={completedTasks}
                  color="#388e3c" icon={<CheckCircle />}
                  progress={completionRate}
                  subtitle={`${completionRate}% completion rate`}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Hours Logged" value={`${totalLoggedHours}h`}
                  color="#f57c00" icon={<AccessTime />}
                  subtitle={`of ${totalAllocatedHours}h allocated`}
                  progress={totalAllocatedHours > 0 ? Math.min(100, (totalLoggedHours / totalAllocatedHours) * 100) : 0}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Avg Hours/Task" value={`${avgHoursPerTask}h`}
                  color="#7b1fa2" icon={<BarChart />}
                  subtitle="on completed tasks"
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Rejected" value={rejectedTasks}
                  color={rejectedTasks === 0 ? '#388e3c' : '#d32f2f'}
                  icon={rejectedTasks === 0 ? <Star /> : <Warning />}
                  subtitle={rejectedTasks === 0 ? 'Perfect record!' : 'needs improvement'}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <StatCard
                  label="Awaiting Review" value={submittedTasks}
                  color="#1976d2" icon={<EmojiEvents />}
                  subtitle="submitted tasks"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Task Status Distribution */}
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Task Distribution
                </Typography>
                <MiniBarChart data={taskStatusChart} max={maxTaskStatus} />
              </CardContent>
            </Card>
          </Grid>

          {/* By Project */}
          <Grid item xs={12} sm={6} md={8}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  By Project
                </Typography>
                {byProject.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No project data yet.</Typography>
                ) : (
                  byProject.map(proj => {
                    const projRate = proj.tasks > 0 ? Math.round((proj.completed / proj.tasks) * 100) : 0;
                    return (
                      <Box key={proj.id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{proj.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {proj.completed}/{proj.tasks} tasks · {proj.hours}h logged
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: projRate >= 80 ? 'success.main' : projRate >= 50 ? 'warning.main' : 'error.main' }}>
                            {projRate}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={projRate}
                          sx={{
                            height: 6, borderRadius: 3,
                            bgcolor: 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: projRate >= 80 ? 'success.main' : projRate >= 50 ? 'warning.main' : 'error.main'
                            }
                          }}
                        />
                      </Box>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Recent Tasks</Typography>
                {tasks.slice(0, 5).map(task => (
                  <Box
                    key={task.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2, py: 1.5,
                      borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover', mx: -1, px: 1, borderRadius: 1 }
                    }}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.project_name || `Project #${task.project_id}`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        size="small"
                        color={
                          task.status === 'approved' ? 'success' :
                          task.status === 'rejected' ? 'error' :
                          task.status === 'submitted' ? 'warning' :
                          task.status === 'in_progress' ? 'primary' : 'default'
                        }
                        sx={{ fontWeight: 600, mb: 0.3 }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {(task.logged_hours || 0)}h / {task.allocated_hours}h
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MyPerformancePage;
