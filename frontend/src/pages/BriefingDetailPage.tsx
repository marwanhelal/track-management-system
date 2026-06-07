import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Grid, Divider,
  Alert, CircularProgress, Paper, IconButton, Breadcrumbs,
  Link, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Checkbox, Skeleton,
  Snackbar, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Edit, Archive, Description, FolderOpen, Person,
  CalendarToday, AttachFile, Delete, CheckCircle, History,
  AccessTime, Create, Update, Inventory2, Save, People, Warning,
  OpenInNew,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Attachment { name: string; path: string; type: string }
interface Briefing {
  id: number; project_id: number; project_name: string;
  team_leader_id: number; team_leader_name: string; team_leader_email: string;
  created_by: number; created_by_name: string;
  title: string; body: string | null; duration_notes: string | null;
  due_date: string | null; resources: string | null; attachments: Attachment[];
  status: 'active' | 'archived'; created_at: string; updated_at: string;
}
interface BriefingPhase { briefing_phase_id: number; phase_id: number; phase_name: string; phase_type: string; phase_status: string }
interface HistoryEntry { id: number; briefing_id: number; action: string; changed_by: number; changed_by_name: string; note: string | null; snapshot: any; created_at: string }

const ACTION_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  created: { label: 'Briefing Created', color: '#2e7d32', icon: <Create sx={{ fontSize: 13 }} /> },
  updated: { label: 'Updated', color: '#1565c0', icon: <Update sx={{ fontSize: 13 }} /> },
  archived: { label: 'Archived', color: '#616161', icon: <Inventory2 sx={{ fontSize: 13 }} /> },
};

const isArabic = (t: string) => /[؀-ۿ]/.test(t);

const dueDaysLeft = (due: string | null) => {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const BriefingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSupervisor, isTeamLeader } = useAuth();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [phases, setPhases] = useState<BriefingPhase[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  // Edit state
  const [editForm, setEditForm] = useState({ title: '', body: '', duration_notes: '', due_date: '', resources: '', phase_ids: [] as number[] });
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [newAtt, setNewAtt] = useState({ name: '', path: '', type: 'pdf' });
  const [allPhases, setAllPhases] = useState<any[]>([]);

  const toast = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiService.getBriefingById(parseInt(id));
      setBriefing(res.data?.briefing);
      setPhases(res.data?.phases || []);
      setHistory(res.data?.history || []);
    } catch { toast('Failed to load briefing', 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async () => {
    if (!briefing) return;
    setEditForm({
      title: briefing.title, body: briefing.body || '',
      duration_notes: briefing.duration_notes || '',
      due_date: briefing.due_date ? briefing.due_date.split('T')[0] : '',
      resources: briefing.resources || '',
      phase_ids: phases.map(p => p.phase_id),
    });
    setEditAttachments(briefing.attachments || []);
    try { const res = await apiService.getProjectPhases(briefing.project_id); setAllPhases(res.data?.phases || []); } catch {}
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!briefing || !editForm.title.trim()) return;
    setActionLoading(true);
    try {
      await apiService.updateBriefing(briefing.id, {
        title: editForm.title.trim(),
        body: editForm.body.trim() || undefined,
        duration_notes: editForm.duration_notes.trim() || undefined,
        due_date: editForm.due_date || undefined,
        resources: editForm.resources.trim() || undefined,
        attachments: editAttachments,
        phase_ids: editForm.phase_ids,
      });
      setEditDialog(false);
      toast('Briefing updated successfully');
      load();
    } catch (err: any) { toast(err.response?.data?.error || 'Failed to update', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleArchive = async () => {
    if (!briefing) return;
    setActionLoading(true);
    try { await apiService.archiveBriefing(briefing.id); setArchiveDialog(false); toast('Briefing archived'); load(); }
    catch { toast('Failed to archive', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleAssignToEngineers = () => {
    if (!briefing) return;
    const phaseParam = phases.map(p => p.phase_id).join(',');
    navigate(`/task-board?briefing_id=${briefing.id}&project_id=${briefing.project_id}&phase_ids=${phaseParam}&briefing_title=${encodeURIComponent(briefing.title)}`);
  };

  const addAtt = () => {
    if (!newAtt.name.trim() || !newAtt.path.trim()) return;
    setEditAttachments(p => [...p, { ...newAtt, name: newAtt.name.trim(), path: newAtt.path.trim() }]);
    setNewAtt({ name: '', path: '', type: 'pdf' });
  };

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton height={40} width={220} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
    </Box>
  );

  if (!briefing) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="text.secondary">Briefing not found.</Typography>
    </Box>
  );

  const days = dueDaysLeft(briefing.due_date);
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 5;
  const rtlBody = isArabic(briefing.body || '');
  const rtlTitle = isArabic(briefing.title);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2.5 }}>
        <Link component={RouterLink} to="/briefings" color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
          <ArrowBack sx={{ fontSize: 14 }} /> Briefings
        </Link>
        <Typography color="text.primary" fontSize="0.85rem" noWrap sx={{ maxWidth: 300 }}>{briefing.title}</Typography>
      </Breadcrumbs>

      {/* Overdue alert */}
      {isOverdue && briefing.status === 'active' && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>Overdue by {Math.abs(days!)} day{Math.abs(days!) > 1 ? 's' : ''}.</strong> This briefing is past its delivery date.
        </Alert>
      )}
      {isUrgent && !isOverdue && briefing.status === 'active' && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>Due {days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`}.</strong> Make sure engineers are on track.
        </Alert>
      )}

      {/* TL action panel */}
      {isTeamLeader && briefing.status === 'active' && (
        <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 2.5, border: '2px solid', borderColor: 'primary.main',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f8faff 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <People sx={{ color: 'primary.main', fontSize: 28, mt: 0.2 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="primary.dark">Action Required</Typography>
                <Typography variant="body2" color="primary.main">
                  Review this briefing and assign the deliverables to engineers on your team.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<People />}
              endIcon={<OpenInNew />}
              onClick={handleAssignToEngineers}
              sx={{ fontWeight: 700, borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}
            >
              Assign to Engineers
            </Button>
          </Box>
        </Paper>
      )}

      {/* Hero card */}
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: isOverdue ? 'error.light' : isUrgent ? 'warning.light' : 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip size="small"
                  label={briefing.status === 'archived' ? 'Archived' : 'Active'}
                  icon={briefing.status === 'archived' ? <Archive sx={{ fontSize: 12 }} /> : <CheckCircle sx={{ fontSize: 12 }} />}
                  sx={{ bgcolor: briefing.status === 'archived' ? 'grey.200' : '#e8f5e9',
                    color: briefing.status === 'archived' ? 'grey.600' : '#2e7d32', fontWeight: 700 }} />
                <Chip size="small" label="Project Briefing" icon={<Description sx={{ fontSize: 12 }} />} variant="outlined" />
                {briefing.due_date && (
                  <Chip size="small"
                    icon={isOverdue ? <Warning sx={{ fontSize: 12 }} /> : <CalendarToday sx={{ fontSize: 12 }} />}
                    label={isOverdue ? `${Math.abs(days!)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                    sx={{ height: 24, fontWeight: 700,
                      bgcolor: isOverdue ? '#ffebee' : isUrgent ? '#fff3e0' : '#e8f5e9',
                      color: isOverdue ? '#c62828' : isUrgent ? '#e65100' : '#2e7d32' }} />
                )}
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, direction: rtlTitle ? 'rtl' : 'ltr', lineHeight: 1.3 }}>
                {briefing.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarToday sx={{ fontSize: 11 }} />
                Created {new Date(briefing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {briefing.created_by_name && ` · By ${briefing.created_by_name}`}
                {briefing.updated_at !== briefing.created_at && ` · Updated ${new Date(briefing.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
              </Typography>
            </Box>

            {isSupervisor && briefing.status === 'active' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<Edit />} onClick={openEdit} size="small">Edit</Button>
                <Button variant="outlined" color="warning" startIcon={<Archive />} onClick={() => setArchiveDialog(true)} size="small">Archive</Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <FolderOpen sx={{ color: 'primary.main', fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2" fontWeight={700}>{briefing.project_name}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned Team Leader</Typography>
                  <Typography variant="body2" fontWeight={700}>{briefing.team_leader_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{briefing.team_leader_email}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              {briefing.due_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <AccessTime sx={{ color: isOverdue ? 'error.main' : 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Delivery Due Date</Typography>
                    <Typography variant="body2" fontWeight={700} color={isOverdue ? 'error.main' : 'text.primary'}>
                      {new Date(briefing.due_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.8 }}>
                  Assigned Phases ({phases.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                  {phases.map(ph => (
                    <Chip key={ph.phase_id} label={ph.phase_name} size="small"
                      sx={{ bgcolor: 'primary.50', color: 'primary.dark', fontWeight: 600, fontSize: '0.72rem' }} />
                  ))}
                  {phases.length === 0 && <Typography variant="caption" color="text.disabled">No phases listed</Typography>}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Content */}
        <Grid item xs={12} md={7}>
          {briefing.body && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.67rem', display: 'block', mb: 1.5 }}>
                  Instructions & Notes
                </Typography>
                <Typography variant="body1" sx={{
                  whiteSpace: 'pre-wrap', lineHeight: 1.95,
                  direction: rtlBody ? 'rtl' : 'ltr',
                  textAlign: rtlBody ? 'right' : 'left',
                  fontFamily: rtlBody ? '"Cairo", "Noto Naskh Arabic", sans-serif' : 'inherit',
                }}>
                  {briefing.body}
                </Typography>
              </CardContent>
            </Card>
          )}

          {briefing.duration_notes && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTime sx={{ fontSize: 16, color: 'warning.dark' }} />
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.67rem' }}>
                    Timeline Notes
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ direction: isArabic(briefing.duration_notes) ? 'rtl' : 'ltr', lineHeight: 1.8 }}>
                  {briefing.duration_notes}
                </Typography>
              </CardContent>
            </Card>
          )}

          {briefing.resources && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.67rem', display: 'block', mb: 1.5 }}>
                  Resources
                </Typography>
                <Typography variant="body2" sx={{ direction: isArabic(briefing.resources) ? 'rtl' : 'ltr', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {briefing.resources}
                </Typography>
              </CardContent>
            </Card>
          )}

          {briefing.attachments?.length > 0 && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.67rem', display: 'block', mb: 1.5 }}>
                  File References ({briefing.attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {briefing.attachments.map((a, i) => (
                    <Paper key={i} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2 }}>
                      <AttachFile sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{a.name}</Typography>
                        <Tooltip title={a.path}>
                          <Typography variant="caption" color="text.disabled"
                            sx={{ fontFamily: 'monospace', fontSize: '0.65rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.path}
                          </Typography>
                        </Tooltip>
                      </Box>
                      <Chip label={a.type.toUpperCase()} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {!briefing.body && !briefing.duration_notes && !briefing.resources && (!briefing.attachments || briefing.attachments.length === 0) && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">No additional content has been added yet.</Typography>
            </Paper>
          )}
        </Grid>

        {/* History timeline */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', position: { md: 'sticky' }, top: 24 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <History sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="caption" fontWeight={800} color="text.secondary"
                  sx={{ textTransform: 'uppercase', fontSize: '0.67rem', letterSpacing: 0.8 }}>
                  Activity Log
                </Typography>
              </Box>
              {history.length === 0 ? (
                <Typography variant="caption" color="text.disabled">No activity recorded yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {history.map((entry, idx) => {
                    const meta = ACTION_META[entry.action] || { label: entry.action, color: '#9e9e9e', icon: <History sx={{ fontSize: 13 }} /> };
                    const isLast = idx === history.length - 1;
                    return (
                      <Box key={entry.id} sx={{ display: 'flex', gap: 1.5, pb: isLast ? 0 : 2.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <Box sx={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: meta.color, color: 'white', flexShrink: 0 }}>
                            {meta.icon}
                          </Box>
                          {!isLast && <Box sx={{ width: 2, flex: 1, minHeight: 18, bgcolor: 'divider', mt: 0.5 }} />}
                        </Box>
                        <Box sx={{ flex: 1, pt: 0.3 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>{meta.label}</Typography>
                          {entry.changed_by_name && (
                            <Typography variant="caption" color="text.secondary" display="block">by {entry.changed_by_name}</Typography>
                          )}
                          {entry.note && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>{entry.note}</Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.63rem' }}>
                            {new Date(entry.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit sx={{ color: 'primary.main' }} /> Edit Briefing
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 0.5 }}>
            <TextField label="Title *" fullWidth value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} inputProps={{ dir: 'auto' }} />

            {allPhases.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Phases</Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 180, overflowY: 'auto' }}>
                  {allPhases.map(ph => (
                    <Box key={ph.id} onClick={() => {
                      const ids = editForm.phase_ids;
                      setEditForm(p => ({ ...p, phase_ids: ids.includes(ph.id) ? ids.filter(x => x !== ph.id) : [...ids, ph.id] }));
                    }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, cursor: 'pointer',
                      bgcolor: editForm.phase_ids.includes(ph.id) ? 'primary.50' : 'transparent',
                      borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Checkbox size="small" checked={editForm.phase_ids.includes(ph.id)} onChange={() => {}} sx={{ p: 0 }} />
                      <Typography variant="body2">{ph.phase_name}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Due Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={editForm.due_date} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))} />
              <TextField label="Timeline Notes" fullWidth value={editForm.duration_notes}
                onChange={e => setEditForm(p => ({ ...p, duration_notes: e.target.value }))} inputProps={{ dir: 'auto' }} />
            </Box>

            <TextField label="Instructions / Body" fullWidth multiline rows={5} value={editForm.body}
              onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))} inputProps={{ dir: 'auto', style: { lineHeight: 1.8 } }} />
            <TextField label="Resources" fullWidth multiline rows={2} value={editForm.resources}
              onChange={e => setEditForm(p => ({ ...p, resources: e.target.value }))} inputProps={{ dir: 'auto' }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>File References</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <TextField size="small" label="Name" value={newAtt.name}
                  onChange={e => setNewAtt(p => ({ ...p, name: e.target.value }))} sx={{ flex: 2, minWidth: 120 }} />
                <TextField size="small" label="Path" value={newAtt.path}
                  onChange={e => setNewAtt(p => ({ ...p, path: e.target.value }))} sx={{ flex: 3, minWidth: 160 }} />
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newAtt.type} onChange={e => setNewAtt(p => ({ ...p, type: e.target.value }))} label="Type">
                    {['pdf','doc','image','dwg','other'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button onClick={addAtt} variant="outlined" disabled={!newAtt.name.trim() || !newAtt.path.trim()}>Add</Button>
              </Box>
              {editAttachments.map((a, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <AttachFile sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ flex: 1 }}>{a.name}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{a.path}</Typography>
                  <IconButton size="small" onClick={() => setEditAttachments(p => p.filter((_, j) => j !== i))}>
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditDialog(false)} color="inherit">Cancel</Button>
          <Button variant="contained" startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={actionLoading || !editForm.title.trim()}>
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={archiveDialog} onClose={() => setArchiveDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.dark' }}>Archive Briefing</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Archiving removes this briefing from the active list. The team leader will no longer see it as requiring action.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setArchiveDialog(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleArchive} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }} onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BriefingDetailPage;
