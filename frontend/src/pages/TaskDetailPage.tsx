import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
  Avatar, IconButton, Button, TextField, Divider, Paper, Alert,
  Tooltip, Badge, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemAvatar,
  CircularProgress, Skeleton, Breadcrumbs, Link, Stepper, Step,
  StepLabel, StepContent, Menu, MenuItem as MuiMenuItem, Snackbar
} from '@mui/material';
import {
  ArrowBack, CheckCircle, PlayArrow, Block, Warning, Send,
  Add, Delete, MoreVert, AccessTime, CalendarToday, Person,
  Assignment, Notifications, Edit, Link as LinkIcon, Code,
  Description, FiberManualRecord, CheckCircleOutline, Lock,
  ThumbUp, ThumbDown, Flag, Chat, Attachment, Download,
  Timeline, NotificationsActive, ContentCopy
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { TaskAssignment, TaskStatus, TaskMilestone, TaskNote, TaskResource, TaskBlocker, ResourceType } from '../types';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  assigned: { label: 'Assigned', color: 'info' },
  in_progress: { label: 'In Progress', color: 'primary' },
  blocked: { label: 'Blocked', color: 'error' },
  submitted: { label: 'Submitted', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'default' },
};

// ── Milestone Timeline ─────────────────────────────────────────────────────────
const MilestoneTimeline: React.FC<{
  milestones: TaskMilestone[];
  canComplete: boolean;
  onComplete: (id: number, note: string) => void;
  onDelete?: (id: number) => void;
}> = ({ milestones, canComplete, onComplete, onDelete }) => {
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  return (
    <Box>
      {milestones.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No milestones set for this task.
        </Typography>
      ) : (
        milestones.map((ms, idx) => {
          const isOverdue = ms.status === 'overdue' || (!ms.completed_at && ms.due_date && new Date(ms.due_date) < new Date());
          return (
            <Box key={ms.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {/* Timeline dot */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: ms.completed_at ? 'success.main' : isOverdue ? 'error.light' : 'primary.light',
                  color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0
                }}>
                  {ms.completed_at ? <CheckCircle sx={{ fontSize: 16 }} /> : idx + 1}
                </Box>
                {idx < milestones.length - 1 && (
                  <Box sx={{ width: 2, flex: 1, bgcolor: ms.completed_at ? 'success.light' : 'divider', minHeight: 20, mt: 0.5 }} />
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{
                      textDecoration: ms.completed_at ? 'line-through' : 'none',
                      color: ms.completed_at ? 'text.secondary' : 'text.primary'
                    }}>
                      {ms.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.3 }}>
                      <Typography variant="caption" color={isOverdue && !ms.completed_at ? 'error.main' : 'text.secondary'}>
                        <CalendarToday sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />
                        {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                        {isOverdue && !ms.completed_at && ' — Overdue'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {canComplete && !ms.completed_at && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => setCompletingId(ms.id)}
                        sx={{ fontSize: '0.7rem', px: 1, py: 0.3, minWidth: 'auto' }}
                      >
                        Mark Done
                      </Button>
                    )}
                    {onDelete && !ms.completed_at && (
                      <IconButton size="small" color="error" onClick={() => onDelete(ms.id)}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {ms.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                    {ms.description}
                  </Typography>
                )}

                {ms.completed_at && ms.engineer_note && (
                  <Paper sx={{ mt: 1, p: 1, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                    <Typography variant="caption" color="success.dark">
                      <CheckCircle sx={{ fontSize: 10, mr: 0.5, verticalAlign: 'middle' }} />
                      {ms.engineer_note}
                    </Typography>
                  </Paper>
                )}

                {completingId === ms.id && (
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Add a completion note (optional)..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" color="success" onClick={() => {
                        onComplete(ms.id, note);
                        setCompletingId(null);
                        setNote('');
                      }}>Confirm</Button>
                      <Button size="small" onClick={() => { setCompletingId(null); setNote(''); }}>Cancel</Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

// ── Resource Item ──────────────────────────────────────────────────────────────
const ResourceItem: React.FC<{ resource: TaskResource; canDelete: boolean; onDelete: () => void }> = ({ resource, canDelete, onDelete }) => {
  const iconMap: Record<ResourceType, React.ReactNode> = {
    text_document: <Description color="primary" />,
    external_link: <LinkIcon color="info" />,
    technical_data: <Code color="secondary" />,
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ mt: 0.3 }}>{iconMap[resource.resource_type]}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{resource.title}</Typography>
          <Chip
            label={resource.resource_type.replace('_', ' ')}
            size="small"
            sx={{ my: 0.5, fontSize: '0.65rem', height: 18 }}
          />
          {resource.resource_type === 'text_document' && resource.content && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
              {resource.content}
            </Typography>
          )}
          {resource.resource_type === 'external_link' && resource.content && (
            <Link href={resource.content} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mt: 0.5, fontSize: '0.8rem' }}>
              {resource.content}
            </Link>
          )}
          {resource.resource_type === 'technical_data' && resource.content && (
            <Box sx={{ mt: 0.5 }}>
              {(() => {
                try {
                  const parsed = JSON.parse(resource.content);
                  return Array.isArray(parsed) ? parsed.map((entry: any, i: number) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.3 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 100 }}>{entry.key}:</Typography>
                      <Typography variant="caption" color="text.secondary">{entry.value}</Typography>
                    </Box>
                  )) : null;
                } catch { return null; }
              })()}
            </Box>
          )}
        </Box>
        {canDelete && (
          <IconButton size="small" color="error" onClick={onDelete} sx={{ flexShrink: 0 }}>
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

// ── Note Thread ────────────────────────────────────────────────────────────────
const NoteThread: React.FC<{
  notes: TaskNote[];
  currentUserId: number;
  onAdd: (content: string) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}> = ({ notes, currentUserId, onAdd, onDelete, loading }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  return (
    <Box>
      <Box sx={{ maxHeight: 360, overflowY: 'auto', mb: 2, pr: 1 }}>
        {notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No messages yet. Start a conversation.
          </Typography>
        ) : (
          notes.map(note => {
            const isMine = note.author_id === currentUserId;
            return (
              <Box key={note.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                <Box sx={{ maxWidth: '80%' }}>
                  {!isMine && (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 1, mb: 0.3, display: 'block' }}>
                      {note.author_name}
                    </Typography>
                  )}
                  <Paper sx={{
                    p: 1.5, borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: isMine ? 'primary.main' : 'grey.100',
                    color: isMine ? 'white' : 'text.primary',
                    position: 'relative'
                  }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{note.content}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem' }}>
                        {new Date(note.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      {isMine && (
                        <IconButton size="small" onClick={() => onDelete(note.id)} sx={{ p: 0, ml: 1, color: 'rgba(255,255,255,0.7)' }}>
                          <Delete sx={{ fontSize: 12 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={3}
          placeholder="Write a note..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
              e.preventDefault();
              onAdd(text.trim());
              setText('');
            }
          }}
          sx={{ bgcolor: 'background.paper' }}
        />
        <IconButton
          color="primary"
          disabled={!text.trim() || loading}
          onClick={() => { onAdd(text.trim()); setText(''); }}
          sx={{ alignSelf: 'flex-end', bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'action.disabled' } }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <Send />}
        </IconButton>
      </Box>
    </Box>
  );
};

// ── Add Resource Dialog ────────────────────────────────────────────────────────
const AddResourceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}> = ({ open, onClose, onAdd }) => {
  const [type, setType] = useState<ResourceType>('text_document');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [techData, setTechData] = useState([{ key: '', value: '' }]);

  const handleAdd = () => {
    const base = { title, resource_type: type };
    if (type === 'text_document') onAdd({ ...base, content: body });
    else if (type === 'external_link') onAdd({ ...base, content: url });
    else onAdd({ ...base, content: JSON.stringify(techData.filter(e => e.key)) });
    setTitle(''); setBody(''); setUrl(''); setTechData([{ key: '', value: '' }]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Resource</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select label="Type" value={type}
            onChange={e => setType(e.target.value as ResourceType)}
            size="small" fullWidth
          >
            <MuiMenuItem value="text_document"><Description sx={{ mr: 1, fontSize: 18 }} />Text Document</MuiMenuItem>
            <MuiMenuItem value="external_link"><LinkIcon sx={{ mr: 1, fontSize: 18 }} />External Link</MuiMenuItem>
            <MuiMenuItem value="technical_data"><Code sx={{ mr: 1, fontSize: 18 }} />Technical Data</MuiMenuItem>
          </TextField>

          <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} size="small" fullWidth required />

          {type === 'text_document' && (
            <TextField label="Content" value={body} onChange={e => setBody(e.target.value)} multiline rows={5} size="small" fullWidth />
          )}
          {type === 'external_link' && (
            <TextField label="URL" value={url} onChange={e => setUrl(e.target.value)} size="small" fullWidth placeholder="https://..." />
          )}
          {type === 'technical_data' && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Key-Value Pairs</Typography>
              {techData.map((entry, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" placeholder="Key" value={entry.key} onChange={e => {
                    const n = [...techData]; n[i].key = e.target.value; setTechData(n);
                  }} />
                  <TextField size="small" placeholder="Value" value={entry.value} onChange={e => {
                    const n = [...techData]; n[i].value = e.target.value; setTechData(n);
                  }} sx={{ flex: 1 }} />
                  <IconButton size="small" onClick={() => setTechData(techData.filter((_, j) => j !== i))} disabled={techData.length === 1}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => setTechData([...techData, { key: '', value: '' }])}>
                Add Row
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={!title.trim()}>Add Resource</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isEngineer, isTeamLeader, isSupervisor } = useAuth();

  const [task, setTask] = useState<TaskAssignment | null>(null);
  const [milestones, setMilestones] = useState<TaskMilestone[]>([]);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [blockers, setBlockers] = useState<TaskBlocker[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  // Dialogs
  const [submitDialog, setSubmitDialog] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; action: 'approve' | 'reject' }>({ open: false, action: 'approve' });
  const [reviewNote, setReviewNote] = useState('');
  const [blockerDialog, setBlockerDialog] = useState(false);
  const [blockerText, setBlockerText] = useState('');
  const [addMilestoneDialog, setAddMilestoneDialog] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', due_date: '' });
  const [addResourceDialog, setAddResourceDialog] = useState(false);

  const taskId = parseInt(id || '0');

  const toast = (msg: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, msg, severity });
  };

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, msRes, notesRes, resRes, blockersRes] = await Promise.all([
        apiService.getTaskAssignment(taskId),
        apiService.getTaskMilestones(taskId),
        apiService.getTaskNotes(taskId),
        apiService.getTaskResources(taskId),
        apiService.getTaskBlockers(taskId),
      ]);
      if (taskRes.success) setTask(taskRes.data?.task || taskRes.data);
      if (msRes.success) setMilestones(msRes.data?.milestones || msRes.data || []);
      if (notesRes.success) setNotes(notesRes.data?.notes || notesRes.data || []);
      if (resRes.success) setResources(resRes.data?.resources || resRes.data || []);
      if (blockersRes.success) setBlockers(blockersRes.data?.blockers || blockersRes.data || []);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to load task', 'error');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const handleStartTask = async () => {
    setActionLoading(true);
    try {
      await apiService.startTask(taskId);
      toast('Task started!');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to start task', 'error');
    } finally { setActionLoading(false); }
  };

  const handleSubmitTask = async () => {
    if (!submitText.trim()) return;
    setActionLoading(true);
    try {
      await apiService.submitTask(taskId, { final_deliverable: submitText });
      toast('Task submitted for review!');
      setSubmitDialog(false);
      setSubmitText('');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to submit', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReviewTask = async () => {
    setActionLoading(true);
    try {
      await apiService.reviewTask(taskId, { action: reviewDialog.action, review_note: reviewNote || undefined });
      toast(`Task ${reviewDialog.action === 'approve' ? 'approved' : 'rejected'}!`);
      setReviewDialog({ open: false, action: 'approve' });
      setReviewNote('');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Review failed', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReportBlocker = async () => {
    if (!blockerText.trim()) return;
    setActionLoading(true);
    try {
      await apiService.reportBlocker(taskId, { reason: blockerText });
      toast('Blocker reported. Your team leader has been notified.');
      setBlockerDialog(false);
      setBlockerText('');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to report blocker', 'error');
    } finally { setActionLoading(false); }
  };

  const handleResolveBlocker = async (blockerId: number) => {
    const note = prompt('Resolution note:');
    if (note === null) return;
    setActionLoading(true);
    try {
      await apiService.resolveBlocker(taskId, blockerId, { resolved_note: note });
      toast('Blocker resolved!');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to resolve', 'error');
    } finally { setActionLoading(false); }
  };

  const handleAddNote = async (content: string) => {
    try {
      await apiService.addTaskNote(taskId, { content });
      const res = await apiService.getTaskNotes(taskId);
      if (res.success) setNotes(res.data?.notes || res.data || []);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add note', 'error');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await apiService.deleteTaskNote(taskId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete note', 'error');
    }
  };

  const handleAddResource = async (data: any) => {
    try {
      await apiService.addTaskResource(taskId, data);
      const res = await apiService.getTaskResources(taskId);
      if (res.success) setResources(res.data?.resources || res.data || []);
      toast('Resource added!');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add resource', 'error');
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    try {
      await apiService.deleteTaskResource(taskId, resourceId);
      setResources(prev => prev.filter(r => r.id !== resourceId));
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete resource', 'error');
    }
  };

  const handleAddMilestone = async () => {
    try {
      await apiService.createTaskMilestone(taskId, newMilestone);
      const res = await apiService.getTaskMilestones(taskId);
      if (res.success) setMilestones(res.data?.milestones || res.data || []);
      toast('Milestone added!');
      setAddMilestoneDialog(false);
      setNewMilestone({ title: '', description: '', due_date: '' });
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add milestone', 'error');
    }
  };

  const handleCompleteMilestone = async (msId: number, note: string) => {
    try {
      await apiService.completeMilestone(taskId, msId, { engineer_note: note });
      const res = await apiService.getTaskMilestones(taskId);
      if (res.success) setMilestones(res.data?.milestones || res.data || []);
      toast('Milestone marked complete!');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleDeleteMilestone = async (msId: number) => {
    try {
      await apiService.deleteMilestone(taskId, msId);
      setMilestones(prev => prev.filter(m => m.id !== msId));
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ mb: 2, borderRadius: 3 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} /></Grid>
        </Grid>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>Task not found or you don't have access.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const statusCfg = STATUS_CONFIG[task.status];
  const canStart = isEngineer && task.status === 'assigned';
  const canSubmit = isEngineer && task.status === 'in_progress';
  const canBlock = isEngineer && task.status === 'in_progress';
  const canReview = (isTeamLeader || isSupervisor) && task.status === 'submitted';
  const canManageMilestones = isTeamLeader || isSupervisor;
  const canAddResources = isEngineer || isTeamLeader;
  const hasActiveBlocker = blockers.some(b => !b.resolved_at);

  const hoursPercent = task.allocated_hours > 0
    ? Math.min(100, (((task as any).logged_hours || 0) / task.allocated_hours) * 100) : 0;
  const isOverBudget = ((task as any).logged_hours || 0) > task.allocated_hours;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to={isEngineer ? '/my-tasks' : '/task-board'} color="inherit" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ArrowBack sx={{ fontSize: 14 }} />
          {isEngineer ? 'My Tasks' : 'Task Board'}
        </Link>
        <Typography color="text.primary" noWrap sx={{ maxWidth: 300 }}>{task.title}</Typography>
      </Breadcrumbs>

      {/* Task Header Card */}
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider', overflow: 'visible' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" sx={{ fontWeight: 700 }} />
                {hasActiveBlocker && <Chip label="BLOCKED" color="error" variant="outlined" size="small" sx={{ fontWeight: 700 }} />}
                <Chip label={`Project #${task.project_id}`} variant="outlined" size="small" />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{task.title}</Typography>
              {task.description && (
                <Typography variant="body1" color="text.secondary">{task.description}</Typography>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {canStart && (
                <Button variant="contained" color="primary" startIcon={<PlayArrow />} onClick={handleStartTask} disabled={actionLoading}>
                  Start Task
                </Button>
              )}
              {canSubmit && (
                <Button variant="contained" color="success" startIcon={<Send />} onClick={() => setSubmitDialog(true)}>
                  Submit Work
                </Button>
              )}
              {canBlock && !hasActiveBlocker && (
                <Button variant="outlined" color="error" startIcon={<Flag />} onClick={() => setBlockerDialog(true)}>
                  Report Blocker
                </Button>
              )}
              {canReview && (
                <>
                  <Button variant="contained" color="success" startIcon={<ThumbUp />} onClick={() => setReviewDialog({ open: true, action: 'approve' })}>
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<ThumbDown />} onClick={() => setReviewDialog({ open: true, action: 'reject' })}>
                    Reject
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {/* Stats Row */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Hours Budget</Typography>
                <Typography variant="h6" fontWeight={700} color={isOverBudget ? 'error.main' : 'text.primary'}>
                  {(task as any).logged_hours || 0}h / {task.allocated_hours}h
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, hoursPercent)}
                  sx={{ height: 4, borderRadius: 2, mt: 0.5, '& .MuiLinearProgress-bar': { bgcolor: isOverBudget ? 'error.main' : 'primary.main' } }}
                />
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Milestones</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {milestones.filter(m => m.completed_at).length} / {milestones.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Resources</Typography>
                <Typography variant="h6" fontWeight={700}>{resources.length}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Final Deliverable (if submitted/approved) */}
          {task.final_deliverable && (
            <Paper sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.light' }}>
              <Typography variant="caption" color="success.dark" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                Final Deliverable
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{task.final_deliverable}</Typography>
            </Paper>
          )}

          {/* Review Note */}
          {task.review_note && (
            <Paper sx={{ mt: 1, p: 2, bgcolor: task.status === 'rejected' ? 'error.50' : 'success.50', borderRadius: 2, border: '1px solid', borderColor: task.status === 'rejected' ? 'error.light' : 'success.light' }}>
              <Typography variant="caption" fontWeight={700} color={task.status === 'rejected' ? 'error.dark' : 'success.dark'} sx={{ display: 'block', mb: 0.5 }}>
                Review Note
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{task.review_note}</Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Active Blocker Alert */}
      {hasActiveBlocker && blockers.filter(b => !b.resolved_at).map(b => (
        <Alert
          key={b.id}
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            (isTeamLeader || isSupervisor) && (
              <Button color="inherit" size="small" onClick={() => handleResolveBlocker(b.id)}>
                Resolve
              </Button>
            )
          }
        >
          <Typography variant="body2" fontWeight={700}>Active Blocker</Typography>
          <Typography variant="body2">{b.reason}</Typography>
          <Typography variant="caption" color="text.secondary">
            Reported by engineer · {new Date(b.created_at).toLocaleDateString()}
          </Typography>
        </Alert>
      ))}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Milestones (${milestones.length})`} />
          <Tab label={`Notes (${notes.length})`} />
          <Tab label={`Resources (${resources.length})`} />
          {(isTeamLeader || isSupervisor) && <Tab label={`Blockers (${blockers.length})`} />}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tab === 0 && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Milestones</Typography>
              {canManageMilestones && (
                <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setAddMilestoneDialog(true)}>
                  Add Milestone
                </Button>
              )}
            </Box>
            <MilestoneTimeline
              milestones={milestones}
              canComplete={isEngineer && ['in_progress', 'blocked'].includes(task.status)}
              onComplete={handleCompleteMilestone}
              onDelete={canManageMilestones ? handleDeleteMilestone : undefined}
            />
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Notes & Discussion</Typography>
            <NoteThread
              notes={notes}
              currentUserId={user?.id || 0}
              onAdd={handleAddNote}
              onDelete={handleDeleteNote}
              loading={actionLoading}
            />
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Resources</Typography>
              {canAddResources && (
                <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setAddResourceDialog(true)}>
                  Add Resource
                </Button>
              )}
            </Box>
            {resources.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No resources added yet.
              </Typography>
            ) : (
              resources.map(r => (
                <ResourceItem
                  key={r.id}
                  resource={r}
                  canDelete={canAddResources && r.author_id === user?.id}
                  onDelete={() => handleDeleteResource(r.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 3 && (isTeamLeader || isSupervisor) && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Blockers History</Typography>
            {blockers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No blockers reported.
              </Typography>
            ) : (
              blockers.map(b => (
                <Paper key={b.id} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: '1px solid', borderColor: b.resolved_at ? 'success.light' : 'error.light', bgcolor: b.resolved_at ? 'success.50' : 'error.50' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{b.reason}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Reported {new Date(b.created_at).toLocaleDateString('en-GB')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip label={b.resolved_at ? 'Resolved' : 'Active'} size="small" color={b.resolved_at ? 'success' : 'error'} />
                      {!b.resolved_at && (
                        <Button size="small" variant="outlined" color="success" onClick={() => handleResolveBlocker(b.id)}>
                          Resolve
                        </Button>
                      )}
                    </Box>
                  </Box>
                  {b.resolved_note && (
                    <Typography variant="body2" color="success.dark" sx={{ mt: 1, fontSize: '0.8rem' }}>
                      Resolution: {b.resolved_note}
                    </Typography>
                  )}
                </Paper>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ── */}

      {/* Submit Dialog */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Task for Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe the work you have completed. Be detailed so your team leader can review effectively.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            label="Final Deliverable"
            placeholder="Describe what you've completed, any decisions made, outcomes, files created..."
            value={submitText}
            onChange={e => setSubmitText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSubmitTask} disabled={!submitText.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Submit for Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, action: 'approve' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: reviewDialog.action === 'approve' ? 'success.main' : 'error.main' }}>
          {reviewDialog.action === 'approve' ? 'Approve Task' : 'Reject Task'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {reviewDialog.action === 'approve'
              ? 'Mark this task as complete. The engineer will be notified.'
              : 'Send the task back to the engineer with your feedback.'}
          </Typography>
          {task.final_deliverable && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Engineer's Submission</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{task.final_deliverable}</Typography>
            </Paper>
          )}
          <TextField
            multiline
            rows={3}
            fullWidth
            label={reviewDialog.action === 'approve' ? 'Approval Note (optional)' : 'Rejection Reason'}
            placeholder={reviewDialog.action === 'approve' ? 'Great work!' : 'Please revise...'}
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            required={reviewDialog.action === 'reject'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReviewDialog({ open: false, action: 'approve' })}>Cancel</Button>
          <Button
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleReviewTask}
            disabled={actionLoading || (reviewDialog.action === 'reject' && !reviewNote.trim())}
          >
            {actionLoading ? <CircularProgress size={18} /> : reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Blocker Dialog */}
      <Dialog open={blockerDialog} onClose={() => setBlockerDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Report a Blocker</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe what is blocking you. Your team leader will be notified immediately.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Blocker Description"
            placeholder="What is blocking you? Be specific..."
            value={blockerText}
            onChange={e => setBlockerText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBlockerDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReportBlocker} disabled={!blockerText.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Report Blocker'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={addMilestoneDialog} onClose={() => setAddMilestoneDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Milestone</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title" required fullWidth size="small"
              value={newMilestone.title}
              onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))}
            />
            <TextField
              label="Description" fullWidth size="small" multiline rows={2}
              value={newMilestone.description}
              onChange={e => setNewMilestone(p => ({ ...p, description: e.target.value }))}
            />
            <TextField
              label="Due Date" type="date" fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              value={newMilestone.due_date}
              onChange={e => setNewMilestone(p => ({ ...p, due_date: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddMilestoneDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMilestone} disabled={!newMilestone.title.trim()}>
            Add Milestone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Resource Dialog */}
      <AddResourceDialog
        open={addResourceDialog}
        onClose={() => setAddResourceDialog(false)}
        onAdd={handleAddResource}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskDetailPage;
