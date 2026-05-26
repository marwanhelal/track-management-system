import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, IconButton,
  Button, Skeleton, Alert, Paper, Tooltip, Badge, Divider,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, CalendarToday, CheckCircle,
  Warning, FiberManualRecord, Assignment, Today, Circle
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
  status: string;
  project_name?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MyCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [milestones, setMilestones] = useState<CalendarMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTaskAssignments();
      const tasks: any[] = res.data?.tasks || res.data || [];

      // Gather all milestones from all tasks
      const allMilestones: CalendarMilestone[] = [];
      await Promise.all(
        tasks
          .filter((t: any) => ['assigned', 'in_progress', 'blocked', 'submitted'].includes(t.status))
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
                  status: ms.completed_at ? 'completed' : (ms.due_date && new Date(ms.due_date) < today ? 'overdue' : 'pending'),
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

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getMilestonesForDay = (day: number) => {
    return milestones.filter(ms => {
      if (!ms.due_date) return false;
      const d = new Date(ms.due_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const selectedDayMilestones = selectedDay ? getMilestonesForDay(selectedDay) : [];

  const upcomingMilestones = milestones
    .filter(ms => !ms.completed_at && ms.due_date && new Date(ms.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 8);

  const overdueMilestones = milestones.filter(ms => ms.status === 'overdue');

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>My Calendar</Typography>
          <Typography variant="body2" color="text.secondary">
            Track your milestones and deadlines
          </Typography>
        </Box>
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

      {/* Overdue Alert */}
      {!loading && overdueMilestones.length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={700}>
            {overdueMilestones.length} overdue milestone{overdueMilestones.length > 1 ? 's' : ''}:
          </Typography>
          {overdueMilestones.slice(0, 3).map(ms => (
            <Typography key={ms.id} variant="body2" sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`/tasks/${ms.task_id}`)}>
              · {ms.title} ({ms.task_title})
            </Typography>
          ))}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              {/* Month Navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <IconButton onClick={prevMonth} size="small">
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>
                  {MONTHS[month]} {year}
                </Typography>
                <IconButton onClick={nextMonth} size="small">
                  <ChevronRight />
                </IconButton>
              </Box>

              {/* Day Headers */}
              <Grid container sx={{ mb: 1 }}>
                {DAYS.map(d => (
                  <Grid item key={d} sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      align="center"
                      display="block"
                    >
                      {d}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Grid */}
              {loading ? (
                <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
              ) : (
                <Box>
                  {/* Empty cells for first week */}
                  <Grid container>
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <Grid item key={`empty-${i}`} sx={{ flex: 1 }}>
                        <Box sx={{ aspectRatio: '1', p: 0.5 }} />
                      </Grid>
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dayMilestones = getMilestonesForDay(day);
                      const hasOverdue = dayMilestones.some(m => m.status === 'overdue');
                      const hasPending = dayMilestones.some(m => m.status === 'pending');
                      const hasCompleted = dayMilestones.some(m => m.status === 'completed');
                      const isSelected = selectedDay === day;
                      const todayFlag = isToday(day);

                      // Wrap to next row every 7 days (accounting for start offset)
                      const cellIndex = firstDayOfMonth + i;
                      const elements = [];

                      if (cellIndex % 7 === 0 && i > 0) {
                        // This forces a new row — handled by wrapping below
                      }

                      return (
                        <Grid
                          item
                          key={day}
                          sx={{ flex: 1 }}
                          style={{ flexBasis: `${100 / 7}%`, maxWidth: `${100 / 7}%` }}
                        >
                          <Box
                            onClick={() => setSelectedDay(day)}
                            sx={{
                              aspectRatio: '1',
                              p: 0.5,
                              cursor: 'pointer',
                              borderRadius: 2,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              bgcolor: isSelected ? 'primary.main' : todayFlag ? 'primary.50' : 'transparent',
                              color: isSelected ? 'white' : 'text.primary',
                              border: todayFlag && !isSelected ? '2px solid' : '2px solid transparent',
                              borderColor: todayFlag && !isSelected ? 'primary.main' : 'transparent',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                bgcolor: isSelected ? 'primary.dark' : 'action.hover'
                              },
                              minHeight: 40,
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={todayFlag || isSelected ? 800 : 400}
                              sx={{ lineHeight: 1.5 }}
                            >
                              {day}
                            </Typography>
                            {dayMilestones.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.3, mt: 0.2, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {hasOverdue && <FiberManualRecord sx={{ fontSize: 6, color: isSelected ? 'white' : 'error.main' }} />}
                                {hasPending && <FiberManualRecord sx={{ fontSize: 6, color: isSelected ? 'white' : 'warning.main' }} />}
                                {hasCompleted && <FiberManualRecord sx={{ fontSize: 6, color: isSelected ? 'white' : 'success.main' }} />}
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
                {[
                  { color: 'error.main', label: 'Overdue' },
                  { color: 'warning.main', label: 'Pending' },
                  { color: 'success.main', label: 'Completed' },
                ].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FiberManualRecord sx={{ fontSize: 10, color }} />
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Selected Day Detail */}
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
                  selectedDayMilestones.map(ms => (
                    <Paper
                      key={ms.id}
                      sx={{
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer',
                        border: '1px solid',
                        borderColor: ms.status === 'overdue' ? 'error.light' : ms.status === 'completed' ? 'success.light' : 'warning.light',
                        bgcolor: ms.status === 'overdue' ? 'error.50' : ms.status === 'completed' ? 'success.50' : 'warning.50',
                        '&:hover': { boxShadow: 2 }
                      }}
                      onClick={() => navigate(`/tasks/${ms.task_id}`)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{ms.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{ms.task_title}</Typography>
                        </Box>
                        <Chip
                          label={ms.status}
                          size="small"
                          color={ms.status === 'overdue' ? 'error' : ms.status === 'completed' ? 'success' : 'warning'}
                          sx={{ fontWeight: 600, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Paper>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar — Upcoming */}
        <Grid item xs={12} md={4}>
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
                      onClick={() => navigate(`/tasks/${ms.task_id}`)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', lineHeight: 1.3 }}>
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
                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && ms.completed_at;
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
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
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
