import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea, Chip, Button, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Stepper, Step, StepLabel,
  Checkbox, Alert, CircularProgress,
  InputAdornment, Avatar, Divider, IconButton, Paper, Skeleton,
  Snackbar, Badge,
} from '@mui/material';
import {
  Add, Search, Description, FolderOpen, Person, CalendarToday,
  CheckCircle, Archive, AttachFile, Delete,
  ArrowBack, ArrowForward, AccessTime, Warning, Inbox,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface Briefing {
  id: number;
  project_id: number; project_name: string;
  team_leader_id: number; team_leader_name: string; team_leader_email: string;
  created_by: number; created_by_name: string;
  title: string; body: string | null; duration_notes: string | null;
  due_date: string | null; resources: string | null;
  attachments: { name: string; path: string; type: string }[];
  status: 'active' | 'archived'; phase_count: number;
  created_at: string; updated_at: string;
}
interface Attachment { name: string; path: string; type: string }

const STEPS = ['Project & Phases', 'Team Leader', 'Content & Dates', 'Files & Review'];

const dueDaysLeft = (due: string | null) => {
  if (!due) return null;
  const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
  return diff;
};

const DueBadge: React.FC<{ due: string | null }> = ({ due }) => {
  if (!due) return null;
  const days = dueDaysLeft(due);
  if (days === null) return null;
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 5;
  return (
    <Chip
      size="small"
      icon={overdue ? <Warning sx={{ fontSize: 11 }} /> : <CalendarToday sx={{ fontSize: 11 }} />}
      label={overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
      sx={{
        height: 20, fontSize: '0.62rem', fontWeight: 700,
        bgcolor: overdue ? '#ffebee' : urgent ? '#fff3e0' : '#e8f5e9',
        color: overdue ? '#c62828' : urgent ? '#e65100' : '#2e7d32',
      }}
    />
  );
};

// ── Briefing Card ──────────────────────────────────────────────────────────────
const BriefingCard: React.FC<{ briefing: Briefing; onClick: () => void; isTeamLeader?: boolean }> = ({ briefing, onClick, isTeamLeader }) => {
  const days = dueDaysLeft(briefing.due_date);
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 5;

  return (
    <Card sx={{
      borderRadius: 3,
      border: '1.5px solid',
      borderColor: isOverdue ? 'error.light' : isUrgent ? 'warning.light' : briefing.status === 'archived' ? 'grey.300' : 'divider',
      opacity: briefing.status === 'archived' ? 0.72 : 1,
      transition: 'all 0.18s',
      '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
    }}>
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.2 }}>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              <Chip size="small"
                label={briefing.status === 'archived' ? 'Archived' : 'Active'}
                icon={briefing.status === 'archived' ? <Archive sx={{ fontSize: 11 }} /> : <CheckCircle sx={{ fontSize: 11 }} />}
                sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700,
                  bgcolor: briefing.status === 'archived' ? 'grey.200' : '#e8f5e9',
                  color: briefing.status === 'archived' ? 'grey.600' : '#2e7d32' }} />
              {isTeamLeader && briefing.status === 'active' && (
                <Chip size="small" label="Action Required" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#e3f2fd', color: 'primary.dark' }} />
              )}
            </Box>
            <DueBadge due={briefing.due_date} />
          </Box>

          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.3, direction: 'auto' }}>
            {briefing.title}
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <FolderOpen sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="primary.main" noWrap>{briefing.project_name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>{briefing.team_leader_name}</Typography>
            </Box>
            {briefing.due_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <AccessTime sx={{ fontSize: 14, color: isOverdue ? 'error.main' : 'text.secondary' }} />
                <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                  Deliver by {new Date(briefing.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 0.7, mt: 1.3, flexWrap: 'wrap' }}>
            {briefing.phase_count > 0 && (
              <Chip size="small" label={`${briefing.phase_count} phase${briefing.phase_count > 1 ? 's' : ''}`}
                sx={{ height: 19, fontSize: '0.62rem', bgcolor: 'primary.50', color: 'primary.dark' }} />
            )}
            {briefing.attachments?.length > 0 && (
              <Chip size="small" icon={<AttachFile sx={{ fontSize: 10 }} />}
                label={`${briefing.attachments.length} file${briefing.attachments.length > 1 ? 's' : ''}`}
                sx={{ height: 19, fontSize: '0.62rem', bgcolor: 'grey.100' }} />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ── Create Dialog ──────────────────────────────────────────────────────────────
const CreateBriefingDialog: React.FC<{ open: boolean; onClose: () => void; onCreated: () => void }> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    project_id: '', phase_ids: [] as number[], team_leader_id: '',
    title: '', body: '', duration_notes: '', due_date: '', resources: '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAtt, setNewAtt] = useState({ name: '', path: '', type: 'pdf' });

  useEffect(() => {
    if (!open) return;
    Promise.all([apiService.getProjects(), apiService.getUsers()]).then(([pRes, uRes]) => {
      setProjects((pRes.data?.projects || []).filter((p: any) => !p.archived_at));
      setTeamLeaders((uRes.data?.users || []).filter((u: any) => u.role === 'team_leader' && u.is_active));
    }).catch(() => {});
  }, [open]);

  const handleProjectChange = async (pid: string) => {
    setForm(p => ({ ...p, project_id: pid, phase_ids: [] }));
    if (!pid) { setPhases([]); return; }
    setPhasesLoading(true);
    try {
      const res = await apiService.getProjectPhases(parseInt(pid));
      setPhases(res.data?.phases || []);
    } catch {} finally { setPhasesLoading(false); }
  };

  const togglePhase = (id: number) =>
    setForm(p => ({ ...p, phase_ids: p.phase_ids.includes(id) ? p.phase_ids.filter(x => x !== id) : [...p.phase_ids, id] }));

  const addAtt = () => {
    if (!newAtt.name.trim() || !newAtt.path.trim()) return;
    setAttachments(p => [...p, { ...newAtt, name: newAtt.name.trim(), path: newAtt.path.trim() }]);
    setNewAtt({ name: '', path: '', type: 'pdf' });
  };

  const reset = () => {
    setStep(0);
    setForm({ project_id: '', phase_ids: [], team_leader_id: '', title: '', body: '', duration_notes: '', due_date: '', resources: '' });
    setAttachments([]);
    setNewAtt({ name: '', path: '', type: 'pdf' });
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true); setError('');
    try {
      await apiService.createBriefing({
        project_id: parseInt(form.project_id),
        team_leader_id: parseInt(form.team_leader_id),
        phase_ids: form.phase_ids,
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        duration_notes: form.duration_notes.trim() || undefined,
        due_date: form.due_date || undefined,
        resources: form.resources.trim() || undefined,
        attachments,
      });
      onCreated(); handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create briefing');
    } finally { setLoading(false); }
  };

  const canNext = [
    !!(form.project_id && form.phase_ids.length > 0),
    !!form.team_leader_id,
    !!form.title.trim(),
    true,
  ];

  const selectedProject = projects.find(p => String(p.id) === form.project_id);
  const selectedTL = teamLeaders.find(t => String(t.id) === form.team_leader_id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: 580 } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Description sx={{ color: 'primary.main' }} />
        New Project Briefing
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map(l => <Step key={l}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>{l}</StepLabel></Step>)}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* Step 0 — Project & Phases */}
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Project *</InputLabel>
              <Select value={form.project_id} onChange={e => handleProjectChange(e.target.value)} label="Project *">
                {projects.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            {form.project_id && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Select Phases * {form.phase_ids.length > 0 && `— ${form.phase_ids.length} selected`}
                  </Typography>
                  {phases.length > 0 && (
                    <Button size="small" onClick={() =>
                      setForm(p => ({ ...p, phase_ids: p.phase_ids.length === phases.length ? [] : phases.map(ph => ph.id) }))}>
                      {form.phase_ids.length === phases.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </Box>
                {phasesLoading ? (
                  [1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 2 }} />)
                ) : phases.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>No phases for this project.</Alert>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 240, overflowY: 'auto' }}>
                    {phases.map(ph => (
                      <Box key={ph.id} onClick={() => togglePhase(ph.id)} sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer',
                        bgcolor: form.phase_ids.includes(ph.id) ? 'primary.50' : 'transparent',
                        borderBottom: '1px solid', borderColor: 'divider',
                        '&:hover': { bgcolor: form.phase_ids.includes(ph.id) ? 'primary.100' : 'action.hover' },
                      }}>
                        <Checkbox size="small" checked={form.phase_ids.includes(ph.id)} onChange={() => {}} sx={{ p: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={form.phase_ids.includes(ph.id) ? 700 : 400}>{ph.phase_name}</Typography>
                          {ph.phase_type && <Typography variant="caption" color="text.secondary">{ph.phase_type}</Typography>}
                        </Box>
                        <Chip label={ph.status || 'pending'} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 1 — Team Leader */}
        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select the team leader who will receive and action this briefing.
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 340, overflowY: 'auto' }}>
              {teamLeaders.map(tl => (
                <Box key={tl.id} onClick={() => setForm(p => ({ ...p, team_leader_id: String(tl.id) }))} sx={{
                  display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer',
                  bgcolor: form.team_leader_id === String(tl.id) ? 'primary.50' : 'transparent',
                  borderBottom: '1px solid', borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700, fontSize: '1rem' }}>
                    {tl.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{tl.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{tl.email}</Typography>
                  </Box>
                  {form.team_leader_id === String(tl.id) && <CheckCircle sx={{ color: 'primary.main', fontSize: 22 }} />}
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        {/* Step 2 — Content & Dates */}
        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Briefing Title *" fullWidth value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Design Phase — Client Requirements Q3 2026"
              inputProps={{ dir: 'auto' }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Delivery Due Date *" type="date" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                helperText="Date the team leader must deliver by"
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
              <TextField
                label="Duration / Timeline Notes" fullWidth value={form.duration_notes}
                onChange={e => setForm(p => ({ ...p, duration_notes: e.target.value }))}
                placeholder="e.g., 3 months, Phase 1 done before Phase 2 starts"
                inputProps={{ dir: 'auto' }}
              />
            </Box>

            <TextField
              label="Instructions & Notes" fullWidth multiline rows={6} value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder={"Write everything the team leader needs to know...\nيمكن الكتابة بالعربية أو الإنجليزية أو كليهما"}
              inputProps={{ dir: 'auto', style: { lineHeight: 1.85, fontFamily: 'inherit' } }}
              helperText="Arabic and English are both supported — text direction is auto-detected"
            />

            <TextField
              label="Resources" fullWidth multiline rows={2} value={form.resources}
              onChange={e => setForm(p => ({ ...p, resources: e.target.value }))}
              placeholder="Describe available resources, tools, budget, external contacts..."
              inputProps={{ dir: 'auto' }}
            />
          </Box>
        )}

        {/* Step 3 — Files & Review */}
        {step === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Add File References</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Files are stored on the server. Enter the file name and its path so the team leader can locate them.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <TextField size="small" label="File Name" value={newAtt.name}
                  onChange={e => setNewAtt(p => ({ ...p, name: e.target.value }))}
                  placeholder="CEO_Brief_Q3.pdf" sx={{ flex: 2, minWidth: 140 }} />
                <TextField size="small" label="Server Path" value={newAtt.path}
                  onChange={e => setNewAtt(p => ({ ...p, path: e.target.value }))}
                  placeholder="/uploads/projects/2026/brief.pdf" sx={{ flex: 3, minWidth: 180 }}
                  InputProps={{ startAdornment: <InputAdornment position="start" sx={{ mr: 0 }}><AttachFile sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment> }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newAtt.type} onChange={e => setNewAtt(p => ({ ...p, type: e.target.value }))} label="Type">
                    {['pdf', 'doc', 'image', 'dwg', 'other'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={addAtt} disabled={!newAtt.name.trim() || !newAtt.path.trim()} sx={{ minWidth: 64 }}>
                  Add
                </Button>
              </Box>
              {attachments.length > 0 && (
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  {attachments.map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2,
                      borderBottom: i < attachments.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <AttachFile sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{a.name}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} noWrap>{a.path}</Typography>
                      </Box>
                      <Chip label={a.type.toUpperCase()} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                      <IconButton size="small" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>

            {/* Summary */}
            <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: 'primary.main' }}>Summary</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Project', value: selectedProject?.name },
                  { label: 'Phases', value: `${form.phase_ids.length} selected` },
                  { label: 'Team Leader', value: selectedTL?.name },
                  { label: 'Title', value: form.title },
                  { label: 'Due Date', value: form.due_date ? new Date(form.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                  { label: 'File References', value: attachments.length > 0 ? `${attachments.length} file(s)` : 'None' },
                ].map(row => (
                  <Box key={row.label} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>{row.label}:</Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ direction: 'auto', flex: 1 }}>{row.value || '—'}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && <Button startIcon={<ArrowBack />} onClick={() => setStep(s => s - 1)}>Back</Button>}
        {step < STEPS.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}>
            Next
          </Button>
        ) : (
          <Button variant="contained" color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            onClick={handleSubmit} disabled={loading || !form.title.trim()}>
            {loading ? 'Creating...' : 'Create & Notify Team Leader'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const ProjectBriefingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSupervisor, isTeamLeader } = useAuth();

  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [createDialog, setCreateDialog] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiService.getBriefings(params);
      setBriefings(res.data?.briefings || []);
    } catch {
      setSnack({ open: true, msg: 'Failed to load briefings', severity: 'error' });
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = briefings.filter(b =>
    search === '' ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.team_leader_name?.toLowerCase().includes(search.toLowerCase())
  );

  const overdueCnt = filtered.filter(b => { const d = dueDaysLeft(b.due_date); return d !== null && d < 0 && b.status === 'active'; }).length;
  const urgentCnt = filtered.filter(b => { const d = dueDaysLeft(b.due_date); return d !== null && d >= 0 && d <= 5 && b.status === 'active'; }).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Project Briefings</Typography>
          <Typography variant="body2" color="text.secondary">
            {isSupervisor
              ? 'Assign CEO meeting outcomes and deliverables to team leaders'
              : 'Instructions and deliverables assigned to you from the supervisor'}
          </Typography>
        </Box>
        {isSupervisor && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}>
            New Briefing
          </Button>
        )}
      </Box>

      {/* Overdue / Urgent alerts */}
      {!loading && overdueCnt > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} icon={<Warning />}>
          <strong>{overdueCnt} briefing{overdueCnt > 1 ? 's are' : ' is'} past due date.</strong> Action needed immediately.
        </Alert>
      )}
      {!loading && urgentCnt > 0 && overdueCnt === 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{urgentCnt} briefing{urgentCnt > 1 ? 's are' : ' is'} due within 5 days.</strong>
        </Alert>
      )}

      {/* TL welcome panel */}
      {isTeamLeader && !loading && filtered.filter(b => b.status === 'active').length > 0 && (
        <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: '#e3f2fd', border: '1px solid', borderColor: 'primary.light', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Inbox sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box>
            <Typography variant="body2" fontWeight={700} color="primary.dark">
              {filtered.filter(b => b.status === 'active').length} active briefing{filtered.filter(b => b.status === 'active').length > 1 ? 's' : ''} from your supervisor
            </Typography>
            <Typography variant="caption" color="primary.main">Review each briefing and assign engineers from your team to complete the deliverables.</Typography>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by title, project, or team leader..."
          value={search} onChange={e => setSearch(e.target.value)}
          size="small" sx={{ flex: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Grid */}
      {loading ? (
        <Grid container spacing={2.5}>
          {[1,2,3,4,5,6].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rectangular" height={210} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Description sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
            {search ? 'No results found' : 'No briefings yet'}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {isSupervisor ? 'Create the first briefing to assign work to a team leader.' : 'No briefings have been assigned to you yet.'}
          </Typography>
          {isSupervisor && !search && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>Create First Briefing</Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map(b => (
            <Grid item xs={12} sm={6} md={4} key={b.id}>
              <BriefingCard briefing={b} onClick={() => navigate(`/briefings/${b.id}`)} isTeamLeader={isTeamLeader} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateBriefingDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        onCreated={() => { load(); setSnack({ open: true, msg: 'Briefing created — team leader notified!', severity: 'success' }); }}
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }} onClose={() => setSnack(p => ({ ...p, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectBriefingsPage;
