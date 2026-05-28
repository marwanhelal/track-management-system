import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Avatar, IconButton, Button, TextField, InputAdornment, Select,
  FormControl, InputLabel, MenuItem, Skeleton, Alert, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Tooltip, Badge, Snackbar, CircularProgress
} from '@mui/material';
import {
  Add, Search, Refresh, Assignment, PlayArrow, Block,
  CheckCircle, Warning, AccessTime, CalendarToday, Person,
  ArrowForward, FilterList, FiberManualRecord, Flag, Close,
  MoreVert, OpenInNew
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { TaskAssignment, TaskStatus } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TaskWithStats extends TaskAssignment {
  logged_hours?: number;
  milestone_count?: number;
  completed_milestones?: number;
  overdue_milestones?: number;
  has_active_blocker?: boolean;
  engineer_name?: string;
  project_name?: string;
}

interface Column {
  key: string;
  statuses: TaskStatus[];
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const COLUMNS: Column[] = [
  { key: 'assigned', statuses: ['assigned'], label: 'Assigned', color: '#1976d2', bgColor: '#e3f2fd', icon: <Assignment fontSize="small" /> },
  { key: 'in_progress', statuses: ['in_progress'], label: 'In Progress', color: '#388e3c', bgColor: '#e8f5e9', icon: <PlayArrow fontSize="small" /> },
  { key: 'blocked', statuses: ['blocked'], label: 'Blocked', color: '#d32f2f', bgColor: '#ffebee', icon: <Block fontSize="small" /> },
  { key: 'submitted', statuses: ['submitted'], label: 'Submitted', color: '#f57c00', bgColor: '#fff8e1', icon: <CheckCircle fontSize="small" /> },
  { key: 'done', statuses: ['approved', 'cancelled'], label: 'Done', color: '#7b1fa2', bgColor: '#f3e5f5', icon: <CheckCircle fontSize="small" /> },
];

// ── Create Task Dialog ─────────────────────────────────────────────────────────
const CreateTaskDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    project_id: '',
    phase_id: '',
    engineer_id: '',
    title: '',
    description: '',
    allocated_hours: '',
    due_date: '',
    milestones: [] as { title: string; due_date: string; description: string }[],
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setError(null);
      setForm({ project_id: '', phase_id: '', engineer_id: '', title: '', description: '', allocated_hours: '', due_date: '', milestones: [] });
      setPhases([]);
      setEngineers([]);
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await apiService.getProjects();
      setProjects((res.data as any)?.projects || []);
    } finally {
      setLoading(false);
    }
  };

  const loadEngineers = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await apiService.getMyTeam();
      const all: any[] = res.data?.memberships || [];
      setEngineers(all.filter(m => String(m.project_id) === projectId));
    } finally {
      setLoading(false);
    }
  };

  const loadPhases = async (projectId: string) => {
    try {
      const res = await apiService.getProjectPhases(parseInt(projectId));
      setPhases(res.data?.phases || []);
    } catch {
      setPhases([]);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setForm(p => ({ ...p, project_id: projectId, phase_id: '', engineer_id: '' }));
    setPhases([]);
    setEngineers([]);
    if (projectId) {
      loadEngineers(projectId);
      loadPhases(projectId);
    }
  };

  const addMilestone = () => setForm(p => ({ ...p, milestones: [...p.milestones, { title: '', due_date: '', description: '' }] }));
  const updateMilestone = (i: number, field: string, val: string) => {
    setForm(p => {
      const ms = [...p.milestones];
      ms[i] = { ...ms[i], [field]: val };
      return { ...p, milestones: ms };
    });
  };
  const removeMilestone = (i: number) => setForm(p => ({ ...p, milestones: p.milestones.filter((_, j) => j !== i) }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiService.createTaskAssignment({
        project_id: parseInt(form.project_id),
        phase_id: parseInt(form.phase_id),
        engineer_id: parseInt(form.engineer_id),
        title: form.title,
        description: form.description || undefined,
        allocated_hours: parseInt(form.allocated_hours),
        due_date: form.due_date || undefined,
        milestones: form.milestones.filter(m => m.title.trim()),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Project & Engineer', 'Task Details', 'Milestones (optional)'];
  const canNextStep0 = form.project_id && form.phase_id && form.engineer_id;
  const canNextStep1 = form.title.trim() && form.allocated_hours && parseInt(form.allocated_hours) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          Assign New Task
          <Typography variant="caption" display="block" color="text.secondary" fontWeight={400}>
            Step {step + 1} of {steps.length} — {steps[step]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      {/* Step Indicator */}
      <Box sx={{ px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {steps.map((s, i) => (
            <Box key={i} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: i <= step ? 'primary.main' : 'grey.200' }} />
          ))}
        </Box>
      </Box>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Project</InputLabel>
              <Select
                value={form.project_id}
                onChange={e => handleProjectChange(e.target.value)}
                label="Project"
                disabled={loading}
              >
                {projects.map((p: any) => (
                  <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {form.project_id && (
              <FormControl fullWidth required>
                <InputLabel>Phase</InputLabel>
                <Select
                  value={form.phase_id}
                  onChange={e => setForm(p => ({ ...p, phase_id: e.target.value }))}
                  label="Phase"
                  disabled={loading || phases.length === 0}
                >
                  {phases.length === 0 ? (
                    <MenuItem disabled>No active phases for this project</MenuItem>
                  ) : (
                    phases.map((ph: any) => (
                      <MenuItem key={ph.id} value={String(ph.id)}>
                        {ph.phase_name} ({ph.status.replace('_', ' ')})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}

            {form.project_id && (
              <FormControl fullWidth required>
                <InputLabel>Engineer</InputLabel>
                <Select
                  value={form.engineer_id}
                  onChange={e => setForm(p => ({ ...p, engineer_id: e.target.value }))}
                  label="Engineer"
                  disabled={loading || engineers.length === 0}
                >
                  {engineers.length === 0 ? (
                    <MenuItem disabled>No engineers in your team for this project</MenuItem>
                  ) : (
                    engineers.map((e: any) => (
                      <MenuItem key={e.engineer_id || e.id} value={String(e.engineer_id || e.id)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{(e.engineer_name || e.name || 'E')[0]}</Avatar>
                          {e.engineer_name || e.name}
                          {e.active_tasks !== undefined && (
                            <Chip label={`${e.active_tasks} active`} size="small" sx={{ ml: 'auto', fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Task Title" required fullWidth
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Complete structural calculations for Phase 1"
            />
            <TextField
              label="Description" fullWidth multiline rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Detailed description of what needs to be done..."
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Allocated Hours" required fullWidth type="number"
                  inputProps={{ min: 1, max: 9999 }}
                  value={form.allocated_hours}
                  onChange={e => setForm(p => ({ ...p, allocated_hours: e.target.value }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">hrs</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Due Date" type="date" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Break the task into milestones to track progress. Each milestone has a due date.
            </Typography>
            {form.milestones.map((ms, i) => (
              <Paper key={i} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    MILESTONE {i + 1}
                  </Typography>
                  <IconButton size="small" onClick={() => removeMilestone(i)} color="error">
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small" fullWidth label="Title" required
                      value={ms.title}
                      onChange={e => updateMilestone(i, 'title', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small" fullWidth label="Due Date" type="date"
                      InputLabelProps={{ shrink: true }}
                      value={ms.due_date}
                      onChange={e => updateMilestone(i, 'due_date', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      size="small" fullWidth label="Description (optional)"
                      value={ms.description}
                      onChange={e => updateMilestone(i, 'description', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button startIcon={<Add />} variant="outlined" onClick={addMilestone} fullWidth sx={{ borderStyle: 'dashed' }}>
              Add Milestone
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        <Box sx={{ flex: 1 }} />
        {step < 2 ? (
          <Button
            variant="contained"
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !canNextStep0 : !canNextStep1}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={submitting || !canNextStep1}
          >
            {submitting ? <CircularProgress size={18} /> : 'Assign Task'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Kanban Card ────────────────────────────────────────────────────────────────
const KanbanCard: React.FC<{ task: TaskWithStats; onClick: () => void }> = ({ task, onClick }) => {
  const hoursPercent = task.allocated_hours > 0
    ? Math.min(100, (((task as any).logged_hours || 0) / task.allocated_hours) * 100) : 0;
  const isOverBudget = ((task as any).logged_hours || 0) > task.allocated_hours;

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: '1px solid',
        borderColor: task.has_active_blocker ? 'error.light' : 'divider',
        mb: 1.5,
        transition: 'all 0.15s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 },
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Engineer avatar + name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: 'primary.light' }}>
            {(task.engineer_name || 'E')[0].toUpperCase()}
          </Avatar>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
            {task.engineer_name || `Engineer #${task.engineer_id}`}
          </Typography>
          {task.has_active_blocker && (
            <Tooltip title="Active blocker">
              <Flag sx={{ fontSize: 14, color: 'error.main' }} />
            </Tooltip>
          )}
        </Box>

        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.3 }}>
          {task.title}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {task.project_name || `Project #${task.project_id}`}
        </Typography>

        {/* Hours bar */}
        <Box sx={{ mb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Hours</Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: isOverBudget ? 'error.main' : 'text.primary' }}>
              {(task as any).logged_hours || 0}h / {task.allocated_hours}h
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, hoursPercent)}
            sx={{
              height: 3, borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                bgcolor: isOverBudget ? 'error.main' : hoursPercent > 80 ? 'warning.main' : 'success.main'
              }
            }}
          />
        </Box>

        {/* Due date & milestones */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          {task.due_date && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <CalendarToday sx={{ fontSize: 10 }} />
              {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Typography>
          )}
          {(task.milestone_count || 0) > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {task.completed_milestones || 0}/{task.milestone_count} ms
              {(task.overdue_milestones || 0) > 0 && ` · ${task.overdue_milestones} ⚠️`}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TaskBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isTeamLeader, isSupervisor } = useAuth();

  const [tasks, setTasks] = useState<TaskWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTaskAssignments();
      setTasks(Array.isArray(res.data?.tasks) ? res.data.tasks : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const engineers = Array.from(new Map(
    tasks.filter(t => t.engineer_name).map(t => [t.engineer_id, { id: t.engineer_id, name: t.engineer_name! }])
  ).values());

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.engineer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.project_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEngineer = !engineerFilter || String(task.engineer_id) === engineerFilter;
    return matchesSearch && matchesEngineer;
  });

  const getColumnTasks = (col: Column) =>
    filteredTasks.filter(t => col.statuses.includes(t.status));

  const urgentTasks = tasks.filter(t =>
    t.has_active_blocker ||
    (t.status === 'submitted') ||
    ((t.overdue_milestones || 0) > 0 && ['assigned', 'in_progress'].includes(t.status))
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Task Board</Typography>
          <Typography variant="body2" color="text.secondary">
            {tasks.length} tasks across your team
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadTasks} size="small" sx={{ bgcolor: 'action.hover' }}>
            <Refresh />
          </IconButton>
          {isTeamLeader && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)} sx={{ borderRadius: 2 }}>
              Assign Task
            </Button>
          )}
        </Box>
      </Box>

      {/* Urgent Attention Panel */}
      {!loading && urgentTasks.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 3 }}
          icon={<Flag />}
        >
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
            {urgentTasks.length} item{urgentTasks.length > 1 ? 's' : ''} need attention:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {urgentTasks.slice(0, 4).map(t => (
              <Chip
                key={t.id}
                label={t.title}
                size="small"
                clickable
                onClick={() => navigate(`/tasks/${t.id}`)}
                color={t.has_active_blocker ? 'error' : 'warning'}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {urgentTasks.length > 4 && <Chip label={`+${urgentTasks.length - 4} more`} size="small" />}
          </Box>
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search tasks or engineers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        {engineers.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter by Engineer</InputLabel>
            <Select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)} label="Filter by Engineer">
              <MenuItem value="">All Engineers</MenuItem>
              {engineers.map(e => (
                <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Kanban Board */}
      {loading ? (
        <Grid container spacing={2}>
          {COLUMNS.map(col => (
            <Grid item xs={12} sm={6} md key={col.key}>
              <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 600 }}>
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col);
            return (
              <Box
                key={col.key}
                sx={{
                  flex: '0 0 280px',
                  minWidth: 280,
                  bgcolor: col.bgColor,
                  borderRadius: 3,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Column Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ color: col.color }}>{col.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: col.color, flex: 1 }}>
                    {col.label}
                  </Typography>
                  <Chip
                    label={colTasks.length}
                    size="small"
                    sx={{
                      bgcolor: col.color,
                      color: 'white',
                      fontWeight: 700,
                      height: 20,
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                </Box>

                {/* Cards */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  {colTasks.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="caption" color="text.disabled">No tasks</Typography>
                    </Box>
                  ) : (
                    colTasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))
                  )}
                </Box>

                {/* Add button in Assigned column */}
                {col.key === 'assigned' && isTeamLeader && (
                  <Button
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => setCreateDialog(true)}
                    sx={{
                      mt: 1,
                      borderStyle: 'dashed',
                      borderColor: col.color,
                      color: col.color,
                      borderWidth: 1,
                      borderRadius: 2,
                      '&:hover': { bgcolor: `rgba(25,118,210,0.05)` }
                    }}
                    variant="outlined"
                  >
                    Assign Task
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <CreateTaskDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        onCreated={() => {
          loadTasks();
          setSnack({ open: true, msg: 'Task assigned successfully!' });
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskBoardPage;
