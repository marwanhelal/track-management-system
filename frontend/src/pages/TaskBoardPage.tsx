import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Avatar, IconButton, Button, TextField, InputAdornment, Select,
  FormControl, InputLabel, MenuItem, Skeleton, Alert, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Tooltip, Badge, Snackbar, CircularProgress, Checkbox
} from '@mui/material';
import {
  Add, Search, Refresh, Assignment, PlayArrow, Block,
  CheckCircle, Warning, AccessTime, CalendarToday, Person,
  ArrowForward, FilterList, FiberManualRecord, Flag, Close,
  MoreVert, OpenInNew, ThumbUp, ThumbDown, BookmarkBorder, Bookmark,
  Group
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
  { key: 'in_progress', statuses: ['in_progress', 'blocked'], label: 'In Progress', color: '#388e3c', bgColor: '#e8f5e9', icon: <PlayArrow fontSize="small" /> },
  { key: 'submitted', statuses: ['submitted'], label: 'Submitted', color: '#f57c00', bgColor: '#fff8e1', icon: <CheckCircle fontSize="small" /> },
  { key: 'rejected', statuses: ['rejected'], label: 'Rejected', color: '#c62828', bgColor: '#ffebee', icon: <Warning fontSize="small" /> },
  { key: 'done', statuses: ['approved', 'cancelled'], label: 'Done', color: '#7b1fa2', bgColor: '#f3e5f5', icon: <CheckCircle fontSize="small" /> },
];

// ── Create Task Dialog ─────────────────────────────────────────────────────────
const CreateTaskDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (count: number) => void;
}> = ({ open, onClose, onCreated }) => {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [allMemberships, setAllMemberships] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<any[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const [form, setForm] = useState({
    project_id: '',
    phase_id: '',
    title: '',
    description: '',
    allocated_hours: '',
    due_date: '',
    priority: 'medium',
    milestones: [] as { title: string; due_date: string; description: string; allocated_hours: string; priority: string }[],
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setError(null);
      setForm({ project_id: '', phase_id: '', title: '', description: '', allocated_hours: '', due_date: '', priority: 'medium', milestones: [] });
      setPhases([]);
      setEngineers([]);
      setSelectedEngineerIds([]);
      apiService.getTaskTemplates().then(res => { if (res.success) setTemplates(res.data?.templates || []); }).catch(() => {});
      loadTeamProjects();
    }
  }, [open]);

  const loadTeamProjects = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMyTeam();
      const memberships: any[] = res.data?.memberships || [];
      setAllMemberships(memberships);
      // Derive unique projects from memberships (only projects TL has engineers in)
      const seen = new Set<string>();
      const uniqueProjects: any[] = [];
      for (const m of memberships) {
        if (!seen.has(String(m.project_id))) {
          seen.add(String(m.project_id));
          uniqueProjects.push({ id: m.project_id, name: m.project_name });
        }
      }
      setProjects(uniqueProjects);
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
    setForm(p => ({ ...p, project_id: projectId, phase_id: '' }));
    setPhases([]);
    setSelectedEngineerIds([]);
    // Filter engineers from already-loaded memberships — no extra API call
    const projectEngineers = allMemberships.filter(m => String(m.project_id) === projectId);
    setEngineers(projectEngineers);
    if (projectId) loadPhases(projectId);
  };

  const toggleEngineer = (id: string) => {
    setSelectedEngineerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllEngineers = () => {
    setSelectedEngineerIds(prev =>
      prev.length === engineers.length ? [] : engineers.map((e: any) => String(e.engineer_id || e.id))
    );
  };

  const addMilestone = () => setForm(p => ({ ...p, milestones: [...p.milestones, { title: '', due_date: '', description: '', allocated_hours: '', priority: 'medium' }] }));
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
    const milestones = form.milestones.filter(m => m.title.trim()).map(m => ({
      ...m,
      allocated_hours: m.allocated_hours ? parseFloat(m.allocated_hours) : undefined,
    }));
    const errors: string[] = [];
    let created = 0;
    for (const engId of selectedEngineerIds) {
      try {
        await apiService.createTaskAssignment({
          project_id: parseInt(form.project_id),
          phase_id: parseInt(form.phase_id),
          engineer_id: parseInt(engId),
          title: form.title,
          description: form.description || undefined,
          allocated_hours: parseInt(form.allocated_hours),
          due_date: form.due_date || undefined,
          priority: form.priority,
          milestones,
        } as any);
        created++;
      } catch (err: any) {
        const eng = engineers.find((e: any) => String(e.engineer_id || e.id) === engId);
        const name = eng?.engineer_name || eng?.name || `Engineer #${engId}`;
        errors.push(`${name}: ${err.response?.data?.error || 'Failed'}`);
      }
    }
    setSubmitting(false);
    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      onCreated(created);
      onClose();
    }
  };

  const selectedEngineers = engineers.filter((e: any) =>
    selectedEngineerIds.includes(String(e.engineer_id || e.id))
  );
  const allSelected = engineers.length > 0 && selectedEngineerIds.length === engineers.length;
  const someSelected = selectedEngineerIds.length > 0 && selectedEngineerIds.length < engineers.length;

  const steps = ['Project & Engineers', 'Task Details', 'Milestones (optional)'];
  const canNextStep0 = form.project_id && form.phase_id && selectedEngineerIds.length > 0;
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
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}

        {/* ── Step 0: Project, Phase, Engineers ── */}
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

            {/* Multi-select engineers */}
            {form.project_id && (
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Group fontSize="small" /> Assign to Engineers
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">Loading engineers...</Typography>
                  </Box>
                ) : engineers.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>No engineers in your team for this project.</Alert>
                ) : (
                  <>
                    {/* Select All */}
                    <Box
                      onClick={toggleAllEngineers}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                        borderRadius: 2, cursor: 'pointer', mb: 0.5,
                        bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Checkbox checked={allSelected} indeterminate={someSelected} size="small" sx={{ p: 0 }} readOnly />
                      <Typography variant="body2" fontWeight={600}>
                        {allSelected ? 'Deselect All' : 'Select All'} ({engineers.length} engineers)
                      </Typography>
                    </Box>

                    {/* Engineer list */}
                    <Box sx={{
                      maxHeight: 220, overflowY: 'auto', border: '1px solid', borderColor: 'grey.200',
                      borderRadius: 2, bgcolor: 'background.paper'
                    }}>
                      {engineers.map((eng: any) => {
                        const id = String(eng.engineer_id || eng.id);
                        const checked = selectedEngineerIds.includes(id);
                        const name = eng.engineer_name || eng.name || 'Engineer';
                        return (
                          <Box
                            key={id}
                            onClick={() => toggleEngineer(id)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.8,
                              cursor: 'pointer', borderBottom: '1px solid', borderColor: 'grey.100',
                              bgcolor: checked ? 'primary.50' : 'transparent',
                              '&:hover': { bgcolor: checked ? 'primary.100' : 'grey.50' },
                              '&:last-child': { borderBottom: 'none' },
                            }}
                          >
                            <Checkbox checked={checked} size="small" sx={{ p: 0 }} readOnly />
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: checked ? 'primary.main' : 'grey.400' }}>
                              {name[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={checked ? 600 : 400} noWrap>{name}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>{eng.engineer_email || eng.email}</Typography>
                            </Box>
                            {eng.active_tasks !== undefined && (
                              <Chip label={`${eng.active_tasks} active`} size="small"
                                sx={{ fontSize: '0.6rem', height: 18, bgcolor: eng.active_tasks > 3 ? 'warning.50' : 'grey.100' }} />
                            )}
                            {checked && <CheckCircle sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />}
                          </Box>
                        );
                      })}
                    </Box>

                    {selectedEngineerIds.length > 0 && (
                      <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                        {selectedEngineerIds.length} engineer{selectedEngineerIds.length > 1 ? 's' : ''} selected
                        {selectedEngineerIds.length > 1 && ' — task will be assigned to each individually'}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ── Step 1: Task Details ── */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Assigned-to summary */}
            <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
              <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Group fontSize="small" />
                Assigning to {selectedEngineers.length} engineer{selectedEngineers.length > 1 ? 's' : ''}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedEngineers.map((eng: any) => (
                  <Chip
                    key={eng.engineer_id || eng.id}
                    avatar={<Avatar sx={{ width: 20, height: 20, fontSize: 10 }}>{(eng.engineer_name || eng.name || 'E')[0]}</Avatar>}
                    label={eng.engineer_name || eng.name}
                    size="small"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                ))}
              </Box>
              {selectedEngineers.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  The same task details and milestones will be assigned to each engineer separately.
                </Typography>
              )}
            </Box>

            {templates.length > 0 && (
              <Button size="small" variant="outlined" startIcon={<Bookmark />} onClick={() => setTemplatePickerOpen(true)}>
                Load from Template
              </Button>
            )}
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
              <Grid item xs={4}>
                <TextField
                  label="Allocated Hours" required fullWidth type="number"
                  inputProps={{ min: 1, max: 9999 }}
                  value={form.allocated_hours}
                  onChange={e => setForm(p => ({ ...p, allocated_hours: e.target.value }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">hrs</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Due Date" type="date" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth size="small" sx={{ mt: 0 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} label="Priority">
                    <MenuItem value="high"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 16, color: '#d32f2f' }} />High</Box></MenuItem>
                    <MenuItem value="medium"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 16, color: '#f57c00' }} />Medium</Box></MenuItem>
                    <MenuItem value="low"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 16, color: '#388e3c' }} />Low</Box></MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Template Picker Dialog */}
            <Dialog open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Load Template</DialogTitle>
              <DialogContent>
                {templates.map((t: any) => (
                  <Paper key={t.id} sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        title: t.name,
                        description: t.description || '',
                        allocated_hours: t.allocated_hours ? String(t.allocated_hours) : '',
                        milestones: (t.milestones || []).map((m: any) => ({
                          title: m.title, description: m.description || '', due_date: '',
                          allocated_hours: m.allocated_hours ? String(m.allocated_hours) : '',
                          priority: m.priority || 'medium',
                        }))
                      }));
                      setTemplatePickerOpen(false);
                    }}>
                    <Typography variant="subtitle2" fontWeight={700}>{t.name}</Typography>
                    {t.description && <Typography variant="caption" color="text.secondary">{t.description}</Typography>}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {t.allocated_hours && <Chip label={`${t.allocated_hours}h`} size="small" />}
                      {(t.milestones || []).length > 0 && <Chip label={`${t.milestones.length} milestones`} size="small" />}
                    </Box>
                  </Paper>
                ))}
              </DialogContent>
              <DialogActions><Button onClick={() => setTemplatePickerOpen(false)}>Cancel</Button></DialogActions>
            </Dialog>
          </Box>
        )}

        {/* ── Step 2: Milestones ── */}
        {step === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Break the task into milestones. These will be created for{' '}
                <strong>each of the {selectedEngineers.length} engineer{selectedEngineers.length > 1 ? 's' : ''}</strong> assigned.
              </Typography>
            </Box>
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
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small" fullWidth label="Title" required
                      value={ms.title}
                      onChange={e => updateMilestone(i, 'title', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small" fullWidth label="Due Date" type="date"
                      InputLabelProps={{ shrink: true }}
                      value={ms.due_date}
                      onChange={e => updateMilestone(i, 'due_date', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField
                      size="small" fullWidth label="Hrs" type="number"
                      inputProps={{ min: 0.5, step: 0.5 }}
                      value={ms.allocated_hours}
                      onChange={e => updateMilestone(i, 'allocated_hours', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">h</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select value={ms.priority || 'medium'} onChange={e => updateMilestone(i, 'priority', e.target.value)} label="Priority">
                        <MenuItem value="high"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Flag sx={{ fontSize: 14, color: '#d32f2f' }} />High</Box></MenuItem>
                        <MenuItem value="medium"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Flag sx={{ fontSize: 14, color: '#f57c00' }} />Med</Box></MenuItem>
                        <MenuItem value="low"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Flag sx={{ fontSize: 14, color: '#388e3c' }} />Low</Box></MenuItem>
                      </Select>
                    </FormControl>
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
          <>
            {form.title && (
              <Button
                variant="outlined"
                startIcon={<BookmarkBorder />}
                onClick={async () => {
                  try {
                    await apiService.createTaskTemplate({
                      name: form.title,
                      description: form.description || undefined,
                      allocated_hours: form.allocated_hours ? parseFloat(form.allocated_hours) : undefined,
                      milestones: form.milestones.filter(m => m.title.trim()).map((m, i) => ({
                        title: m.title, description: m.description || undefined,
                        allocated_hours: m.allocated_hours ? parseFloat(m.allocated_hours) : undefined,
                        display_order: i
                      }))
                    });
                  } catch {}
                }}
                sx={{ mr: 'auto' }}
              >
                Save as Template
              </Button>
            )}
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={submitting || !canNextStep1}
              startIcon={submitting ? <CircularProgress size={16} /> : undefined}
            >
              {submitting
                ? 'Assigning...'
                : selectedEngineerIds.length > 1
                  ? `Assign to ${selectedEngineerIds.length} Engineers`
                  : 'Assign Task'}
            </Button>
          </>
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
        borderColor: task.status === 'rejected' ? 'error.light' : 'divider',
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
          {(task as any).priority === 'high' && <Tooltip title="Task: High Priority"><Flag sx={{ fontSize: 14, color: '#d32f2f' }} /></Tooltip>}
          {(task as any).priority === 'medium' && <Tooltip title="Task: Medium Priority"><Flag sx={{ fontSize: 14, color: '#f57c00' }} /></Tooltip>}
          {(task as any).max_milestone_priority === 'high' && <Tooltip title="Milestone: High Priority"><Flag sx={{ fontSize: 12, color: '#b71c1c', opacity: 0.7 }} /></Tooltip>}
          {(task as any).max_milestone_priority === 'medium' && <Tooltip title="Milestone: Medium Priority"><Flag sx={{ fontSize: 12, color: '#e65100', opacity: 0.7 }} /></Tooltip>}
          {task.status === 'rejected' && (
            <Tooltip title="Rejected — reopen to reassign">
              <Warning sx={{ fontSize: 14, color: 'error.main' }} />
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
  const [priorityFilter, setPriorityFilter] = useState('');
  const [milestonePriorityFilter, setMilestonePriorityFilter] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDialog, setBulkDialog] = useState<{ open: boolean; action: 'approve' | 'reject' }>({ open: false, action: 'approve' });
  const [bulkNote, setBulkNote] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

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
    const matchesPriority = !priorityFilter || (task as any).priority === priorityFilter;
    const matchesMilestonePriority = !milestonePriorityFilter || (task as any).max_milestone_priority === milestonePriorityFilter;
    return matchesSearch && matchesEngineer && matchesPriority && matchesMilestonePriority;
  });

  const handleBulkReview = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await apiService.bulkReviewTasks({ ids: selectedIds, action: bulkDialog.action, review_note: bulkNote || undefined });
      setSnack({ open: true, msg: `${selectedIds.length} task(s) ${bulkDialog.action === 'approve' ? 'approved' : 'rejected'}!` });
      setSelectedIds([]);
      setBulkDialog({ open: false, action: 'approve' });
      setBulkNote('');
      loadTasks();
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.error || 'Bulk action failed' });
    } finally { setBulkLoading(false); }
  };

  const submittedTasks = filteredTasks.filter(t => t.status === 'submitted');
  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const getColumnTasks = (col: Column) =>
    filteredTasks.filter(t => col.statuses.includes(t.status));

  const urgentTasks = tasks.filter(t =>
    t.status === 'submitted' ||
    t.status === 'rejected' ||
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
                color={t.status === 'rejected' ? 'error' : 'warning'}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {urgentTasks.length > 4 && <Chip label={`+${urgentTasks.length - 4} more`} size="small" />}
          </Box>
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: selectedIds.length > 0 ? 1 : 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search tasks or engineers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        {engineers.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Engineer</InputLabel>
            <Select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)} label="Engineer">
              <MenuItem value="">All Engineers</MenuItem>
              {engineers.map(e => (
                <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Task Priority</InputLabel>
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} label="Task Priority">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="high"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#d32f2f' }} />High</Box></MenuItem>
            <MenuItem value="medium"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#f57c00' }} />Medium</Box></MenuItem>
            <MenuItem value="low"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#388e3c' }} />Low</Box></MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Milestone Priority</InputLabel>
          <Select value={milestonePriorityFilter} onChange={e => setMilestonePriorityFilter(e.target.value)} label="Milestone Priority">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="high"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#d32f2f' }} />High</Box></MenuItem>
            <MenuItem value="medium"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#f57c00' }} />Medium</Box></MenuItem>
            <MenuItem value="low"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Flag sx={{ fontSize: 14, color: '#388e3c' }} />Low</Box></MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.light' }}>
          <Typography variant="body2" fontWeight={700}>{selectedIds.length} task(s) selected</Typography>
          <Button size="small" variant="contained" color="success" startIcon={<ThumbUp />} onClick={() => setBulkDialog({ open: true, action: 'approve' })}>Approve All</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<ThumbDown />} onClick={() => setBulkDialog({ open: true, action: 'reject' })}>Reject All</Button>
          <Button size="small" onClick={() => setSelectedIds([])}>Clear</Button>
        </Box>
      )}

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
                      <Box key={task.id} sx={{ position: 'relative' }}>
                        {col.key === 'submitted' && (isTeamLeader || isSupervisor) && (
                          <Box
                            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, width: 18, height: 18,
                              border: '2px solid', borderColor: selectedIds.includes(task.id) ? 'primary.main' : 'grey.400',
                              borderRadius: '3px', bgcolor: selectedIds.includes(task.id) ? 'primary.main' : 'white',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={e => { e.stopPropagation(); toggleSelect(task.id); }}
                          >
                            {selectedIds.includes(task.id) && <CheckCircle sx={{ fontSize: 14, color: 'white' }} />}
                          </Box>
                        )}
                        <KanbanCard
                          task={task}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        />
                      </Box>
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

      {/* Bulk Review Dialog */}
      <Dialog open={bulkDialog.open} onClose={() => setBulkDialog({ open: false, action: 'approve' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: bulkDialog.action === 'approve' ? 'success.main' : 'error.main' }}>
          {bulkDialog.action === 'approve' ? `Approve ${selectedIds.length} Task(s)` : `Reject ${selectedIds.length} Task(s)`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth multiline rows={3}
            label={bulkDialog.action === 'approve' ? 'Note (optional)' : 'Rejection Reason'}
            value={bulkNote}
            onChange={e => setBulkNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkDialog({ open: false, action: 'approve' })}>Cancel</Button>
          <Button variant="contained" color={bulkDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleBulkReview} disabled={bulkLoading}>
            {bulkLoading ? <CircularProgress size={18} /> : bulkDialog.action === 'approve' ? 'Approve All' : 'Reject All'}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateTaskDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        onCreated={(count: number) => {
          loadTasks();
          setSnack({ open: true, msg: count > 1 ? `${count} tasks assigned successfully!` : 'Task assigned successfully!' });
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
