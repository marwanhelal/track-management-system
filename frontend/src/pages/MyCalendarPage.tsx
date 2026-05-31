import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, IconButton,
  Button, Skeleton, Alert, Paper, Divider
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, CalendarToday, Today, Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface CalendarMilestone {
  id: number;
  task_id: number;
  task_title: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  status: 'overdue' | 'pending' | 'completed';
  project_name?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_STYLE = {
  overdue:   { bg: '#ffebee', color: '#c62828', border: '#ef9a9a' },
  pending:   { bg: '#fff8e1', color: '#e65100', border: '#ffe082' },
  completed: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
};

const MyCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isTeamLeader, isSupervisor } = useAuth();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [milestones, setMilestones] = useState<CalendarMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTaskAssignments();
      const tasks: any[] = res.data?.tasks || res.data || [];

      const allMilestones: CalendarMilestone[] = [];
      await Promise.all(
        tasks
          .filter((t: any) => !['approved', 'cancelled'].includes(t.status))
          .map(async (task: any) => {
            try {
              const msRes = await apiService.getTaskMilestones(task.id);
              const taskMilestones = msRes.data?.milestones || msRes.data || [];
              taskMilestones.forEach((ms: any) => {
                allMilestones.push({
                  id: ms.id,
                  task_id: task.id,
                  task_title: task.title,
                  title: ms.title,
                  due_date: ms.due_date,
                  completed_at: ms.completed_at,
                  status: ms.completed_at
                    ? 'completed'
                    : ms.due_date && new Date(ms.due_date) < today
                    ? 'overdue'
                    : 'pending',
                  project_name: task.project_name,
                });
              });
            } catch { /* skip */ }
          })
      );
      setMilestones(allMilestones);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMilestones(); }, [loadMilestones]);

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getMilestonesForDay = (day: number) =>
    milestones.filter(ms => {
      if (!ms.due_date) return false;
      const d = new Date(ms.due_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const selectedDayMilestones = selectedDay ? getMilestonesForDay(selectedDay) : [];
  const overdueMilestones = milestones.filter(ms => ms.status === 'overdue');
  const upcomingMilestones = milestones
    .filter(ms => ms.status === 'pending' && ms.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 8);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Build week rows for the grid
  const totalCells = firstDayOfMonth + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>My Calendar</Typography>
          <Typography variant="body2" color="text.secondary">
            {isTeamLeader || isSupervisor
              ? 'Track milestones across your team\'s tasks'
              : 'Track your milestones and deadlines'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={loadMilestones} disabled={loading}>
            Refresh
          </Button>
          <Button
            startIcon={<Today />}
            variant="outlined"
            size="small"
            onClick={() => {
              setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDay(today.getDate());
            }}
          >
            Today
          </Button>
        </Box>
      </Box>

      {/* Overdue Alert */}
      {!loading && overdueMilestones.length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
            {overdueMilestones.length} overdue milestone{overdueMilestones.length > 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {overdueMilestones.slice(0, 5).map(ms => (
              <Chip
                key={ms.id} label={ms.title} size="small" color="error" variant="outlined" clickable
                onClick={() => navigate(`/tasks/${ms.task_id}`)}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              {/* Month Nav */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <IconButton onClick={prevMonth} size="small"><ChevronLeft /></IconButton>
                <Typography variant="h6" fontWeight={700}>{MONTHS[month]} {year}</Typography>
                <IconButton onClick={nextMonth} size="small"><ChevronRight /></IconButton>
              </Box>

              {/* Day Headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
                {DAYS.map(d => (
                  <Typography key={d} variant="caption" fontWeight={700} color="text.secondary"
                    align="center" display="block">
                    {d}
                  </Typography>
                ))}
              </Box>

              {/* Calendar Grid */}
              {loading ? (
                <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {/* Empty cells */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <Box key={`empty-${i}`} sx={{ minHeight: 72 }} />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayMilestones = getMilestonesForDay(day);
                    const isSelected = selectedDay === day;
                    const todayFlag = isToday(day);

                    return (
                      <Box
                        key={day}
                        onClick={() => { setSelectedDay(day); setSelectedMilestoneId(null); }}
                        sx={{
                          minHeight: 72,
                          p: 0.5,
                          cursor: 'pointer',
                          borderRadius: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          bgcolor: isSelected ? 'primary.main' : todayFlag ? 'primary.50' : 'transparent',
                          border: '2px solid',
                          borderColor: isSelected ? 'primary.dark' : todayFlag ? 'primary.main' : 'transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
                        }}
                      >
                        {/* Day number */}
                        <Typography
                          variant="caption"
                          fontWeight={todayFlag || isSelected ? 800 : 500}
                          sx={{
                            lineHeight: 1.4,
                            textAlign: 'center',
                            color: isSelected ? 'white' : 'text.primary',
                            mb: 0.3,
                          }}
                        >
                          {day}
                        </Typography>

                        {/* Milestone text chips inside the box */}
                        {dayMilestones.slice(0, 2).map(ms => {
                          const style = STATUS_STYLE[ms.status];
                          const isHighlighted = selectedMilestoneId === ms.id;
                          return (
                            <Box
                              key={ms.id}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedDay(day);
                                setSelectedMilestoneId(ms.id);
                              }}
                              sx={{
                                bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : style.bg,
                                color: isSelected ? 'white' : style.color,
                                border: `1px solid ${isHighlighted ? style.color : (isSelected ? 'rgba(255,255,255,0.4)' : style.border)}`,
                                borderRadius: '3px',
                                px: 0.4,
                                py: 0.1,
                                mb: 0.3,
                                fontSize: '0.58rem',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                lineHeight: 1.6,
                                '&:hover': { opacity: 0.85, transform: 'scale(1.02)' },
                              }}
                              title={`${ms.title} — ${ms.task_title}`}
                            >
                              {ms.title}
                            </Box>
                          );
                        })}

                        {/* "+N more" indicator */}
                        {dayMilestones.length > 2 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.55rem',
                              color: isSelected ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                              textAlign: 'center',
                              lineHeight: 1.4,
                            }}
                          >
                            +{dayMilestones.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
                {[
                  { color: STATUS_STYLE.overdue.color, bg: STATUS_STYLE.overdue.bg, label: 'Overdue' },
                  { color: STATUS_STYLE.pending.color, bg: STATUS_STYLE.pending.bg, label: 'Pending' },
                  { color: STATUS_STYLE.completed.color, bg: STATUS_STYLE.completed.bg, label: 'Completed' },
                ].map(({ color, bg, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: bg, border: `1px solid ${color}` }} />
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Selected Day Detail Panel */}
          {selectedDay && (
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mt: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  {MONTHS[month]} {selectedDay}, {year}
                  {isToday(selectedDay) && <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />}
                </Typography>

                {selectedDayMilestones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No milestones on this day.</Typography>
                ) : (
                  selectedDayMilestones.map(ms => {
                    const style = STATUS_STYLE[ms.status];
                    const isHighlighted = selectedMilestoneId === ms.id;
                    return (
                      <Paper
                        key={ms.id}
                        id={`ms-${ms.id}`}
                        sx={{
                          p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer',
                          border: '2px solid',
                          borderColor: isHighlighted ? style.color : style.border,
                          bgcolor: style.bg,
                          boxShadow: isHighlighted ? `0 0 0 2px ${style.color}40` : 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': { boxShadow: 3 }
                        }}
                        onClick={() => navigate(`/tasks/${ms.task_id}`)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ flex: 1, mr: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: style.color }}>
                              {ms.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Task: {ms.task_title}
                            </Typography>
                            {ms.project_name && (
                              <Typography variant="caption" color="text.secondary">
                                Project: {ms.project_name}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Chip
                              label={ms.status}
                              size="small"
                              sx={{
                                bgcolor: style.bg, color: style.color,
                                border: `1px solid ${style.color}`,
                                fontWeight: 700, fontSize: '0.65rem'
                              }}
                            />
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                              Click to open task →
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Upcoming */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday fontSize="small" color="primary" />
                Upcoming Milestones
              </Typography>
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1, borderRadius: 2 }} />)
              ) : upcomingMilestones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No upcoming milestones.</Typography>
              ) : (
                upcomingMilestones.map(ms => {
                  const daysUntil = Math.ceil((new Date(ms.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysUntil <= 3;
                  return (
                    <Paper
                      key={ms.id}
                      sx={{
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer',
                        border: '1px solid',
                        borderLeft: '3px solid',
                        borderLeftColor: isUrgent ? 'error.main' : 'primary.main',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => {
                        const d = new Date(ms.due_date);
                        setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        setSelectedDay(d.getDate());
                        setSelectedMilestoneId(ms.id);
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          <Typography variant="caption" fontWeight={600} display="block" sx={{ lineHeight: 1.3 }}>
                            {ms.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {ms.task_title}
                          </Typography>
                        </Box>
                        <Chip
                          label={daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          size="small"
                          color={isUrgent ? 'error' : 'default'}
                          sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                        />
                      </Box>
                    </Paper>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Month Summary */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>This Month</Typography>
              {[
                {
                  label: 'Total milestones',
                  value: milestones.filter(ms => {
                    if (!ms.due_date) return false;
                    const d = new Date(ms.due_date);
                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                  }).length,
                  color: 'text.primary'
                },
                {
                  label: 'Completed',
                  value: milestones.filter(ms => {
                    if (!ms.due_date) return false;
                    const d = new Date(ms.due_date);
                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && !!ms.completed_at;
                  }).length,
                  color: 'success.main'
                },
                {
                  label: 'Overdue',
                  value: overdueMilestones.filter(ms => {
                    const d = new Date(ms.due_date);
                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                  }).length,
                  color: 'error.main'
                },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color }}>{value}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MyCalendarPage;
