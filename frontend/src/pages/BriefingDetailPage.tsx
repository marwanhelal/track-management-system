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
  AccessTime, Create, Update, Inventory2, Save,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Attachment { name: string; path: string; type: string }

interface Briefing {
  id: number;
  project_id: number; project_name: string;
  team_leader_id: number; team_leader_name: string; team_leader_email: string;
  created_by: number; created_by_name: string;
  title: string; body: string | null; duration_notes: string | null;
  resources: string | null; attachments: Attachment[];
  status: 'active' | 'archived';
  created_at: string; updated_at: string;
}

interface BriefingPhase {
  briefing_phase_id: number; phase_id: number;
  phase_name: string; phase_type: string; phase_status: string;
}

interface HistoryEntry {
  id: number; briefing_id: number; action: string;
  changed_by: number; changed_by_name: string;
  note: string | null; snapshot: any;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'error' | 'grey'; icon: React.ReactNode }> = {
  created: { label: 'Created', color: 'success', icon: <Create sx={{ fontSize: 14 }} /> },
  updated: { label: 'Updated', color: 'primary', icon: <Update sx={{ fontSize: 14 }} /> },
  archived: { label: 'Archived', color: 'grey', icon: <Inventory2 sx={{ fontSize: 14 }} /> },
};

const isArabic = (text: string) => /[؀-ۿ]/.test(text);

// ── Main Page ──────────────────────────────────────────────────────────────────
const BriefingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [phases, setPhases] = useState<BriefingPhase[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [editDialog, setEditDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  // Edit form
  const [editForm, setEditForm] = useState({
    title: '', body: '', duration_notes: '', resources: '',
    phase_ids: [] as number[],
  });
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [newAtt, setNewAtt] = useState({ name: '', path: '', type: 'pdf' });
  const [allPhases, setAllPhases] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiService.getBriefingById(parseInt(id));
      setBriefing(res.data?.briefing);
      setPhases(res.data?.phases || []);
      setHistory(res.data?.history || []);
    } catch {
      setSnack({ open: true, msg: 'Failed to load briefing', severity: 'error' });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async () => {
    if (!briefing) return;
    setEditForm({
      title: briefing.title,
      body: briefing.body || '',
      duration_notes: briefing.duration_notes || '',
      resources: briefing.resources || '',
      phase_ids: phases.map(p => p.phase_id),
    });
    setEditAttachments(briefing.attachments || []);
    // Load phases for project
    try {
      const res = await apiService.getProjectPhases(briefing.project_id);
      setAllPhases(res.data?.phases || []);
    } catch {}
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!briefing || !editForm.title.trim()) return;
    setEditLoading(true);
    try {
      await apiService.updateBriefing(briefing.id, {
        title: editForm.title.trim(),
        body: editForm.body.trim() || undefined,
        duration_notes: editForm.duration_notes.trim() || undefined,
        resources: editForm.resources.trim() || undefined,
        attachments: editAttachments,
        phase_ids: editForm.phase_ids,
      });
      setEditDialog(false);
      setSnack({ open: true, msg: 'Briefing updated successfully', severity: 'success' });
      load();
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.error || 'Failed to update', severity: 'error' });
    } finally { setEditLoading(false); }
  };

  const handleArchive = async () => {
    if (!briefing) return;
    setEditLoading(true);
    try {
      await apiService.archiveBriefing(briefing.id);
      setArchiveDialog(false);
      setSnack({ open: true, msg: 'Briefing archived', severity: 'success' });
      load();
    } catch {
      setSnack({ open: true, msg: 'Failed to archive', severity: 'error' });
    } finally { setEditLoading(false); }
  };

  const addAtt = () => {
    if (!newAtt.name.trim() || !newAtt.path.trim()) return;
    setEditAttachments(p => [...p, { ...newAtt, name: newAtt.name.trim(), path: newAtt.path.trim() }]);
    setNewAtt({ name: '', path: '', type: 'pdf' });
  };

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton height={40} width={200} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
    </Box>
  );

  if (!briefing) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="text.secondary">Briefing not found.</Typography>
    </Box>
  );

  const rtlBody = isArabic(briefing.body || '');
  const rtlTitle = isArabic(briefing.title);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2.5 }}>
        <Link component={RouterLink} to="/briefings" color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
          <ArrowBack sx={{ fontSize: 14 }} /> Briefings
        </Link>
        <Typography color="text.primary" fontSize="0.85rem" noWrap sx={{ maxWidth: 260 }}>{briefing.title}</Typography>
      </Breadcrumbs>

      {/* Hero Card */}
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={briefing.status === 'archived' ? 'Archived' : 'Active'}
                  icon={briefing.status === 'archived' ? <Archive sx={{ fontSize: 12 }} /> : <CheckCircle sx={{ fontSize: 12 }} />}
                  sx={{ bgcolor: briefing.status === 'archived' ? 'grey.200' : '#e8f5e9', color: briefing.status === 'archived' ? 'grey.600' : '#2e7d32', fontWeight: 700 }}
                />
                <Chip size="small" label="Project Briefing" icon={<Description sx={{ fontSize: 12 }} />} variant="outlined" />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, direction: rtlTitle ? 'rtl' : 'ltr', lineHeight: 1.3 }}>
                {briefing.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <CalendarToday sx={{ fontSize: 11 }} />
                Created {new Date(briefing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {briefing.created_by_name && ` by ${briefing.created_by_name}`}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <FolderOpen sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2" fontWeight={700}>{briefing.project_name}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Person sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned Team Leader</Typography>
                  <Typography variant="body2" fontWeight={700}>{briefing.team_leader_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{briefing.team_leader_email}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                Assigned Phases ({phases.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {phases.map(ph => (
                  <Chip key={ph.phase_id} label={ph.phase_name} size="small"
                    sx={{ bgcolor: 'primary.50', color: 'primary.dark', fontWeight: 600, fontSize: '0.72rem' }} />
                ))}
                {phases.length === 0 && <Typography variant="caption" color="text.disabled">No phases listed</Typography>}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left: content sections */}
        <Grid item xs={12} md={7}>
          {/* Instructions */}
          {briefing.body && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Instructions & Notes
                </Typography>
                <Typography variant="body1" sx={{
                  whiteSpace: 'pre-wrap', lineHeight: 1.9,
                  direction: rtlBody ? 'rtl' : 'ltr',
                  textAlign: rtlBody ? 'right' : 'left',
                  fontFamily: rtlBody ? '"Cairo", "Noto Naskh Arabic", sans-serif' : 'inherit',
                }}>
                  {briefing.body}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Duration */}
          {briefing.duration_notes && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTime sx={{ fontSize: 16, color: 'warning.dark' }} />
                  <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                    Duration
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ direction: isArabic(briefing.duration_notes) ? 'rtl' : 'ltr', lineHeight: 1.7 }}>
                  {briefing.duration_notes}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Resources */}
          {briefing.resources && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  Resources
                </Typography>
                <Typography variant="body2" sx={{ direction: isArabic(briefing.resources) ? 'rtl' : 'ltr', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {briefing.resources}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {briefing.attachments?.length > 0 && (
            <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  Attachments ({briefing.attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {briefing.attachments.map((att, i) => (
                    <Paper key={i} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2 }}>
                      <AttachFile sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{att.name}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} noWrap>
                          {att.path}
                        </Typography>
                      </Box>
                      <Chip label={att.type.toUpperCase()} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {!briefing.body && !briefing.duration_notes && !briefing.resources && briefing.attachments?.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">No additional content has been added to this briefing yet.</Typography>
            </Paper>
          )}
        </Grid>

        {/* Right: History */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'sticky', top: 24 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  Activity History
                </Typography>
              </Box>
              {history.length === 0 ? (
                <Typography variant="caption" color="text.disabled">No history yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {history.map((entry, idx) => {
                    const meta = ACTION_META[entry.action] || { label: entry.action, color: 'grey', icon: <History sx={{ fontSize: 14 }} /> };
                    const isLast = idx === history.length - 1;
                    return (
                      <Box key={entry.id} sx={{ display: 'flex', gap: 1.5, pb: isLast ? 0 : 2 }}>
                        {/* Timeline dot + line */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: `${meta.color}.main`, flexShrink: 0,
                            background: meta.color === 'grey'
                              ? '#bdbdbd'
                              : meta.color === 'success' ? '#2e7d32'
                              : meta.color === 'warning' ? '#ed6c02'
                              : meta.color === 'error' ? '#d32f2f'
                              : '#1976d2',
                          }}>
                            <Box sx={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {meta.icon}
                            </Box>
                          </Box>
                          {!isLast && <Box sx={{ width: 2, flex: 1, minHeight: 16, bgcolor: 'divider', mt: 0.5 }} />}
                        </Box>
                        {/* Content */}
                        <Box sx={{ flex: 1, pb: 0.5 }}>
                          <Typography variant="body2" fontWeight={700}>{meta.label}</Typography>
                          {entry.changed_by_name && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              by {entry.changed_by_name}
                            </Typography>
                          )}
                          {entry.note && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                              {entry.note}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
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
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit sx={{ color: 'primary.main' }} /> Edit Briefing
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 0.5 }}>
            <TextField label="Title *" fullWidth value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
              inputProps={{ dir: 'auto' }} />

            {allPhases.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Phases</Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 180, overflowY: 'auto' }}>
                  {allPhases.map(ph => (
                    <Box key={ph.id} onClick={() => {
                      const ids = editForm.phase_ids;
                      setEditForm(p => ({
                        ...p, phase_ids: ids.includes(ph.id) ? ids.filter(x => x !== ph.id) : [...ids, ph.id]
                      }));
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

            <TextField label="Instructions / Body" fullWidth multiline rows={5} value={editForm.body}
              onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
              inputProps={{ dir: 'auto', style: { lineHeight: 1.8 } }} />
            <TextField label="Duration Notes" fullWidth value={editForm.duration_notes}
              onChange={e => setEditForm(p => ({ ...p, duration_notes: e.target.value }))}
              inputProps={{ dir: 'auto' }} />
            <TextField label="Resources" fullWidth multiline rows={2} value={editForm.resources}
              onChange={e => setEditForm(p => ({ ...p, resources: e.target.value }))}
              inputProps={{ dir: 'auto' }} />

            {/* Attachments */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Attachments</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <TextField size="small" label="Name" value={newAtt.name}
                  onChange={e => setNewAtt(p => ({ ...p, name: e.target.value }))} sx={{ flex: 2, minWidth: 120 }} />
                <TextField size="small" label="Path" value={newAtt.path}
                  onChange={e => setNewAtt(p => ({ ...p, path: e.target.value }))} sx={{ flex: 3, minWidth: 160 }} />
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={newAtt.type} onChange={e => setNewAtt(p => ({ ...p, type: e.target.value }))} label="Type">
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="doc">DOC</MenuItem>
                    <MenuItem value="image">Image</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
                <Button onClick={addAtt} variant="outlined" disabled={!newAtt.name.trim() || !newAtt.path.trim()}>Add</Button>
              </Box>
              {editAttachments.map((att, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <AttachFile sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ flex: 1 }}>{att.name}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{att.path}</Typography>
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
          <Button variant="contained" startIcon={editLoading ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={editLoading || !editForm.title.trim()}>
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={archiveDialog} onClose={() => setArchiveDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.dark' }}>Archive Briefing</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Archiving hides this briefing from the active list. The team leader will no longer see it prominently.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setArchiveDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleArchive} disabled={editLoading}>
            {editLoading ? <CircularProgress size={18} /> : 'Archive'}
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
