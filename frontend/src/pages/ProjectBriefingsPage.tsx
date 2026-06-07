import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea, Chip, Button, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Stepper, Step, StepLabel, StepContent,
  Checkbox, ListItemText as MuiListItemText, Alert, CircularProgress,
  InputAdornment, Avatar, Divider, IconButton, Tooltip, Paper, Skeleton,
  Snackbar,
} from '@mui/material';
import {
  Add, Search, Description, FolderOpen, Person, CalendarToday,
  CheckCircle, Archive, FilterList, AttachFile, Delete, Close,
  ArrowBack, ArrowForward, Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Briefing {
  id: number;
  project_id: number;
  project_name: string;
  team_leader_id: number;
  team_leader_name: string;
  team_leader_email: string;
  created_by: number;
  created_by_name: string;
  title: string;
  body: string | null;
  duration_notes: string | null;
  resources: string | null;
  attachments: { name: string; path: string; type: string }[];
  status: 'active' | 'archived';
  phase_count: number;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  name: string;
  path: string;
  type: string;
}

const STEP_LABELS = ['Select Project & Phases', 'Assign Team Leader', 'Briefing Content', 'Attachments & Review'];

// ── Briefing Card ──────────────────────────────────────────────────────────────
const BriefingCard: React.FC<{ briefing: Briefing; onClick: () => void }> = ({ briefing, onClick }) => {
  const isRTL = /[؀-ۿ]/.test(briefing.title);
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: briefing.status === 'archived' ? 'grey.300' : 'divider',
      opacity: briefing.status === 'archived' ? 0.75 : 1, transition: 'all 0.2s',
      '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}>
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Status + date row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Chip
              size="small"
              label={briefing.status === 'archived' ? 'Archived' : 'Active'}
              icon={briefing.status === 'archived' ? <Archive sx={{ fontSize: 12 }} /> : <CheckCircle sx={{ fontSize: 12 }} />}
              sx={{
                bgcolor: briefing.status === 'archived' ? 'grey.200' : '#e8f5e9',
                color: briefing.status === 'archived' ? 'grey.600' : '#2e7d32',
                fontWeight: 600, fontSize: '0.68rem', height: 22,
              }}
            />
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <CalendarToday sx={{ fontSize: 10 }} />
              {new Date(briefing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>

          {/* Title */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, lineHeight: 1.3, direction: isRTL ? 'rtl' : 'ltr' }}>
            {briefing.title}
          </Typography>

          <Divider sx={{ my: 1 }} />

          {/* Meta */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderOpen sx={{ fontSize: 15, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="primary.main" noWrap>{briefing.project_name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>{briefing.team_leader_name}</Typography>
            </Box>
          </Box>

          {/* Chips row */}
          <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
            {briefing.phase_count > 0 && (
              <Chip size="small" label={`${briefing.phase_count} phase${briefing.phase_count > 1 ? 's' : ''}`}
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'primary.50', color: 'primary.dark' }} />
            )}
            {briefing.attachments?.length > 0 && (
              <Chip size="small" icon={<AttachFile sx={{ fontSize: 10 }} />}
                label={`${briefing.attachments.length} file${briefing.attachments.length > 1 ? 's' : ''}`}
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'grey.100' }} />
            )}
            {briefing.body && (
              <Chip size="small" label="Has instructions" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fff8e1', color: '#f57c00' }} />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ── Create Briefing Dialog ─────────────────────────────────────────────────────
const CreateBriefingDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    project_id: '',
    phase_ids: [] as number[],
    team_leader_id: '',
    title: '',
    body: '',
    duration_notes: '',
    resources: '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachment, setNewAttachment] = useState({ name: '', path: '', type: 'pdf' });

  useEffect(() => {
    if (!open) return;
    Promise.all([apiService.getProjects(), apiService.getUsers()]).then(([pRes, uRes]) => {
      setProjects(pRes.data?.projects || []);
      setTeamLeaders((uRes.data?.users || []).filter((u: any) => u.role === 'team_leader' && u.is_active));
    }).catch(() => {});
  }, [open]);

  const handleProjectChange = async (projectId: string) => {
    setForm(p => ({ ...p, project_id: projectId, phase_ids: [] }));
    if (!projectId) { setPhases([]); return; }
    setPhasesLoading(true);
    try {
      const res = await apiService.getProjectPhases(parseInt(projectId));
      setPhases(res.data?.phases || []);
    } catch {} finally { setPhasesLoading(false); }
  };

  const togglePhase = (id: number) => {
    setForm(p => ({
      ...p,
      phase_ids: p.phase_ids.includes(id) ? p.phase_ids.filter(x => x !== id) : [...p.phase_ids, id],
    }));
  };

  const addAttachment = () => {
    if (!newAttachment.name.trim() || !newAttachment.path.trim()) return;
    setAttachments(p => [...p, { ...newAttachment, name: newAttachment.name.trim(), path: newAttachment.path.trim() }]);
    setNewAttachment({ name: '', path: '', type: 'pdf' });
  };

  const handleClose = () => {
    setStep(0);
    setForm({ project_id: '', phase_ids: [], team_leader_id: '', title: '', body: '', duration_notes: '', resources: '' });
    setAttachments([]);
    setNewAttachment({ name: '', path: '', type: 'pdf' });
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      await apiService.createBriefing({
        project_id: parseInt(form.project_id),
        team_leader_id: parseInt(form.team_leader_id),
        phase_ids: form.phase_ids,
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        duration_notes: form.duration_notes.trim() || undefined,
        resources: form.resources.trim() || undefined,
        attachments,
      });
      onCreated();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create briefing');
    } finally { setLoading(false); }
  };

  const canNext = [
    form.project_id && form.phase_ids.length > 0,
    !!form.team_leader_id,
    !!form.title.trim(),
    true,
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: 580 } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ color: 'primary.main' }} />
          New Project Briefing
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Step indicator */}
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEP_LABELS.map(label => (
            <Step key={label}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* Step 0: Project + Phases */}
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
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Select Phases * {form.phase_ids.length > 0 && `(${form.phase_ids.length} selected)`}
                </Typography>
                {phasesLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 2 }} />)}
                  </Box>
                ) : phases.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>No phases found for this project.</Alert>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 220, overflowY: 'auto' }}>
                    {phases.map(ph => (
                      <Box key={ph.id} onClick={() => togglePhase(ph.id)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2, cursor: 'pointer',
                          bgcolor: form.phase_ids.includes(ph.id) ? 'primary.50' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Checkbox size="small" checked={form.phase_ids.includes(ph.id)} onChange={() => {}} sx={{ p: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={form.phase_ids.includes(ph.id) ? 700 : 400}>
                            {ph.phase_name}
                          </Typography>
                          {ph.phase_type && (
                            <Typography variant="caption" color="text.secondary">{ph.phase_type}</Typography>
                          )}
                        </Box>
                        <Chip label={ph.status || 'active'} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 1: Team Leader */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Select the team leader who will receive this briefing.
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 320, overflowY: 'auto' }}>
              {teamLeaders.map(tl => (
                <Box key={tl.id} onClick={() => setForm(p => ({ ...p, team_leader_id: String(tl.id) }))}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer',
                    bgcolor: form.team_leader_id === String(tl.id) ? 'primary.50' : 'transparent',
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' } }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 700 }}>
                    {tl.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{tl.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{tl.email}</Typography>
                  </Box>
                  {form.team_leader_id === String(tl.id) && <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />}
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        {/* Step 2: Briefing Content */}
        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Briefing Title *" fullWidth value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Meeting with CEO — Phase Overview"
              inputProps={{ dir: 'auto' }}
            />
            <TextField
              label="Instructions / Body" fullWidth multiline rows={5} value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Write instructions, notes, or meeting outcomes here... (Arabic and English supported)"
              inputProps={{ dir: 'auto', style: { lineHeight: 1.8 } }}
              helperText="Supports Arabic and English — text direction is auto-detected"
            />
            <TextField
              label="Duration Notes" fullWidth value={form.duration_notes}
              onChange={e => setForm(p => ({ ...p, duration_notes: e.target.value }))}
              placeholder="e.g., 3 months, Phase 1 must be completed by end of Q3"
              inputProps={{ dir: 'auto' }}
            />
            <TextField
              label="Resources" fullWidth multiline rows={3} value={form.resources}
              onChange={e => setForm(p => ({ ...p, resources: e.target.value }))}
              placeholder="Describe resources available, tools, references, team members..."
              inputProps={{ dir: 'auto' }}
            />
          </Box>
        )}

        {/* Step 3: Attachments + Review */}
        {step === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Attachment builder */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Add File References</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <TextField size="small" label="File Name" value={newAttachment.name}
                  onChange={e => setNewAttachment(p => ({ ...p, name: e.target.value }))}
                  placeholder="CEO_Brief_Q3.pdf" sx={{ flex: 2, minWidth: 160 }} />
                <TextField size="small" label="Server Path" value={newAttachment.path}
                  onChange={e => setNewAttachment(p => ({ ...p, path: e.target.value }))}
                  placeholder="/uploads/projects/brief.pdf" sx={{ flex: 3, minWidth: 200 }} />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newAttachment.type} onChange={e => setNewAttachment(p => ({ ...p, type: e.target.value }))} label="Type">
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="doc">DOC</MenuItem>
                    <MenuItem value="image">Image</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={addAttachment} disabled={!newAttachment.name.trim() || !newAttachment.path.trim()}>
                  Add
                </Button>
              </Box>
              {attachments.length > 0 && (
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  {attachments.map((att, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2,
                      borderBottom: i < attachments.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <AttachFile sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{att.name}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{att.path}</Typography>
                      </Box>
                      <Chip label={att.type} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                      <IconButton size="small" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>

            {/* Summary */}
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Review</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 110 }}>Project:</Typography>
                  <Typography variant="caption" fontWeight={600}>{projects.find(p => String(p.id) === form.project_id)?.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 110 }}>Phases:</Typography>
                  <Typography variant="caption" fontWeight={600}>{form.phase_ids.length} selected</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 110 }}>Team Leader:</Typography>
                  <Typography variant="caption" fontWeight={600}>{teamLeaders.find(t => String(t.id) === form.team_leader_id)?.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 110 }}>Title:</Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ direction: 'auto' }}>{form.title}</Typography>
                </Box>
                {attachments.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 110 }}>Attachments:</Typography>
                    <Typography variant="caption" fontWeight={600}>{attachments.length} file(s)</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && (
          <Button startIcon={<ArrowBack />} onClick={() => setStep(s => s - 1)}>Back</Button>
        )}
        {step < STEP_LABELS.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]}>
            Next
          </Button>
        ) : (
          <Button variant="contained" color="primary" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            onClick={handleSubmit} disabled={loading || !form.title.trim()}>
            {loading ? 'Creating...' : 'Create Briefing'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const ProjectBriefingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();

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

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Project Briefings</Typography>
          <Typography variant="body2" color="text.secondary">
            {isSupervisor
              ? 'Assign CEO meeting outcomes and instructions to team leaders'
              : 'Briefings and instructions assigned to you'}
          </Typography>
        </Box>
        {isSupervisor && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            New Briefing
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by title, project, or team leader..."
          value={search} onChange={e => setSearch(e.target.value)}
          size="small" sx={{ flex: 1, minWidth: 220 }}
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
        <Grid container spacing={2}>
          {[1,2,3,4,5,6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Description sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
            {search ? 'No results found' : 'No briefings yet'}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {isSupervisor
              ? 'Create your first briefing to assign instructions to a team leader.'
              : 'No briefings have been assigned to you yet.'}
          </Typography>
          {isSupervisor && !search && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>
              Create First Briefing
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(b => (
            <Grid item xs={12} sm={6} md={4} key={b.id}>
              <BriefingCard briefing={b} onClick={() => navigate(`/briefings/${b.id}`)} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <CreateBriefingDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        onCreated={() => { load(); setSnack({ open: true, msg: 'Briefing created and team leader notified!', severity: 'success' }); }}
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }} onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectBriefingsPage;
