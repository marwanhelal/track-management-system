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
  ArrowBack, CheckCircle, PlayArrow, Warning, Send,
  Add, Delete, AccessTime, CalendarToday,
  Assignment, Link as LinkIcon, Code,
  Description, CheckCircleOutline,
  ThumbUp, ThumbDown, Timeline, Cancel, Edit
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { TaskAssignment, TaskStatus, TaskMilestone, TaskNote, TaskResource, ResourceType } from '../types';

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
  canLogTime: boolean;
  onComplete: (id: number, note: string) => void;
  onLogTime?: (milestone: TaskMilestone) => void;
  onDelete?: (id: number) => void;
  onEdit?: (milestone: TaskMilestone) => void;
}> = ({ milestones, canComplete, canLogTime, onComplete, onLogTime, onDelete, onEdit }) => {
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
          const loggedHours = (ms as any).logged_hours ? parseFloat((ms as any).logged_hours) : 0;
          const allocatedHours = (ms as any).allocated_hours ? parseFloat((ms as any).allocated_hours) : 0;
          const hoursPercent = allocatedHours > 0 ? Math.min(100, (loggedHours / allocatedHours) * 100) : 0;
          const isOverBudget = allocatedHours > 0 && loggedHours > allocatedHours;

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
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color={isOverdue && !ms.completed_at ? 'error.main' : 'text.secondary'}>
                        <CalendarToday sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />
                        {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                        {isOverdue && !ms.completed_at && ' — Overdue'}
                      </Typography>
                      {allocatedHours > 0 && (
                        <Typography variant="caption" color={isOverBudget ? 'error.main' : 'text.secondary'}>
                          <AccessTime sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />
                          {loggedHours}h / {allocatedHours}h
                        </Typography>
                      )}
                    </Box>
                    {allocatedHours > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={hoursPercent}
                        sx={{ height: 3, borderRadius: 2, mt: 0.5, width: 120, '& .MuiLinearProgress-bar': { bgcolor: isOverBudget ? 'error.main' : 'primary.main' } }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canLogTime && !ms.completed_at && onLogTime && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<AccessTime sx={{ fontSize: 12 }} />}
                        onClick={() => onLogTime(ms)}
                        sx={{ fontSize: '0.7rem', px: 1, py: 0.3 }}
                      >
                        Log Time
                      </Button>
                    )}
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
                    {onEdit && !ms.completed_at && (
                      <IconButton size="small" color="default" onClick={() => onEdit(ms)}>
                        <Edit sx={{ fontSize: 14 }} />
                      </IconButton>
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

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  // Dialogs
  const [submitDialog, setSubmitDialog] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; action: 'approve' | 'reject' }>({ open: false, action: 'approve' });
  const [reviewNote, setReviewNote] = useState('');
  const [reopenDialog, setReopenDialog] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [addMilestoneDialog, setAddMilestoneDialog] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', due_date: '', allocated_hours: '' });
  const [addResourceDialog, setAddResourceDialog] = useState(false);
  const [logTimeDialog, setLogTimeDialog] = useState<{ open: boolean; milestone: TaskMilestone | null }>({ open: false, milestone: null });
  const [logTimeForm, setLogTimeForm] = useState({ hours: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', allocated_hours: '', deadline: '' });
  const [editMilestoneDialog, setEditMilestoneDialog] = useState<{ open: boolean; milestone: TaskMilestone | null }>({ open: false, milestone: null });
  const [editMilestoneForm, setEditMilestoneForm] = useState({ title: '', description: '', due_date: '', allocated_hours: '' });

  const taskId = parseInt(id || '0');

  const toast = (msg: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, msg, severity });
  };

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, msRes, notesRes, resRes] = await Promise.all([
        apiService.getTaskAssignment(taskId),
        apiService.getTaskMilestones(taskId),
        apiService.getTaskNotes(taskId),
        apiService.getTaskResources(taskId),
      ]);
      if (taskRes.success) setTask(taskRes.data?.task || taskRes.data);
      if (msRes.success) setMilestones(msRes.data?.milestones || msRes.data || []);
      if (notesRes.success) setNotes(notesRes.data?.notes || notesRes.data || []);
      if (resRes.success) setResources(resRes.data?.resources || resRes.data || []);
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

  const handleCancelTask = async () => {
    setActionLoading(true);
    try {
      await apiService.cancelTask(taskId, cancelReason.trim() || undefined);
      toast('Task cancelled.');
      setCancelDialog(false);
      setCancelReason('');
      navigate(isEngineer ? '/my-tasks' : '/task-board');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel task', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReopenTask = async () => {
    setActionLoading(true);
    try {
      await apiService.reopenTask(taskId, { reopen_note: reopenNote });
      toast('Task reopened and assigned back to engineer!');
      setReopenDialog(false);
      setReopenNote('');
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reopen task', 'error');
    } finally { setActionLoading(false); }
  };

  const handleOpenEditTask = () => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description || '',
      allocated_hours: String(task.allocated_hours || ''),
      deadline: ((task as any).deadline || (task as any).due_date || '').split('T')[0],
    });
    setEditDialog(true);
  };

  const handleEditTask = async () => {
    if (!editForm.title.trim() || !editForm.allocated_hours) return;
    setActionLoading(true);
    try {
      await apiService.updateTaskAssignment(taskId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        allocated_hours: parseFloat(editForm.allocated_hours),
        deadline: editForm.deadline || undefined,
      });
      toast('Task updated!');
      setEditDialog(false);
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update task', 'error');
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
      await apiService.createTaskMilestone(taskId, {
        ...newMilestone,
        allocated_hours: newMilestone.allocated_hours ? parseFloat(newMilestone.allocated_hours) : undefined,
      } as any);
      const res = await apiService.getTaskMilestones(taskId);
      if (res.success) setMilestones(res.data?.milestones || res.data || []);
      toast('Milestone added!');
      setAddMilestoneDialog(false);
      setNewMilestone({ title: '', description: '', due_date: '', allocated_hours: '' });
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

  const handleOpenEditMilestone = (ms: TaskMilestone) => {
    setEditMilestoneForm({
      title: ms.title,
      description: ms.description || '',
      due_date: ms.due_date ? ms.due_date.split('T')[0] : '',
      allocated_hours: (ms as any).allocated_hours ? String((ms as any).allocated_hours) : '',
    });
    setEditMilestoneDialog({ open: true, milestone: ms });
  };

  const handleEditMilestone = async () => {
    if (!editMilestoneDialog.milestone || !editMilestoneForm.title.trim()) return;
    setActionLoading(true);
    try {
      await apiService.updateTaskMilestone(editMilestoneDialog.milestone.id, {
        title: editMilestoneForm.title.trim(),
        description: editMilestoneForm.description.trim() || undefined,
        due_date: editMilestoneForm.due_date || undefined,
        allocated_hours: editMilestoneForm.allocated_hours ? parseFloat(editMilestoneForm.allocated_hours) : null,
      });
      toast('Milestone updated!');
      setEditMilestoneDialog({ open: false, milestone: null });
      const res = await apiService.getTaskMilestones(taskId);
      if (res.success) setMilestones(res.data?.milestones || res.data || []);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update milestone', 'error');
    } finally { setActionLoading(false); }
  };

  const handleOpenLogTime = (milestone: TaskMilestone) => {
    setLogTimeForm({ hours: '', date: new Date().toISOString().split('T')[0], description: '' });
    setLogTimeDialog({ open: true, milestone });
  };

  const handleLogTime = async () => {
    if (!task || !logTimeDialog.milestone) return;
    const hours = parseFloat(logTimeForm.hours);
    if (isNaN(hours) || hours <= 0) {
      toast('Hours must be greater than 0', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await apiService.createWorkLog({
        phase_id: task.phase_id,
        hours,
        description: logTimeForm.description.trim() || undefined,
        date: logTimeForm.date,
        task_milestone_id: logTimeDialog.milestone.id,
      } as any);
      toast('Time logged successfully!');
      setLogTimeDialog({ open: false, milestone: null });
      // Refresh milestones to update logged hours
      const res = await apiService.getTaskMilestones(taskId);
      if (res.success) setMilestones(res.data?.milestones || res.data || []);
      // Also reload full task to refresh hours budget
      loadTask();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to log time', 'error');
    } finally {
      setActionLoading(false);
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
  const canSubmit = isEngineer && ['in_progress', 'blocked'].includes(task.status);
  const canReview = (isTeamLeader || isSupervisor) && task.status === 'submitted';
  const canReopen = (isTeamLeader || isSupervisor) && task.status === 'rejected';
  const canCancel = (isTeamLeader || isSupervisor) && !['approved', 'cancelled'].includes(task.status);
  const canEdit = (isTeamLeader || isSupervisor) && !['approved', 'cancelled'].includes(task.status);
  const canManageMilestones = isTeamLeader || isSupervisor;
  const canAddResources = isEngineer || isTeamLeader;

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
                <Chip label={task.project_name || `Project #${task.project_id}`} variant="outlined" size="small" />
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
              {canReopen && (
                <Button variant="contained" color="warning" startIcon={<PlayArrow />} onClick={() => setReopenDialog(true)}>
                  Reopen Task
                </Button>
              )}
              {canEdit && (
                <Button variant="outlined" color="primary" startIcon={<Edit />} onClick={handleOpenEditTask}>
                  Edit Task
                </Button>
              )}
              {canCancel && (
                <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setCancelDialog(true)}>
                  Cancel Task
                </Button>
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

          {/* Review Note (rejection reason) */}
          {task.review_note && task.status === 'rejected' && (
            <Paper sx={{ mt: 1, p: 2, bgcolor: 'error.50', borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="caption" fontWeight={700} color="error.dark" sx={{ display: 'block', mb: 0.5 }}>
                Rejection Reason
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{task.review_note}</Typography>
            </Paper>
          )}

          {/* Reopen Note — shown when task was reopened (status is 'assigned' and reopen_note exists) */}
          {(task as any).reopen_note && task.status === 'assigned' && (
            <Paper sx={{ mt: 1, p: 2, bgcolor: 'warning.50', borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}>
              <Typography variant="caption" fontWeight={700} color="warning.dark" sx={{ display: 'block', mb: 0.5 }}>
                Task Reopened — Instructions from Team Leader
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{(task as any).reopen_note}</Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Milestones (${milestones.length})`} />
          <Tab label={`Notes (${notes.length})`} />
          <Tab label={`Resources (${resources.length})`} />
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
              canLogTime={isEngineer && ['in_progress', 'blocked'].includes(task.status)}
              onComplete={handleCompleteMilestone}
              onLogTime={handleOpenLogTime}
              onDelete={canManageMilestones ? handleDeleteMilestone : undefined}
              onEdit={canManageMilestones ? handleOpenEditMilestone : undefined}
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

      {/* Cancel Task Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Cancel Task</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            This will permanently cancel the task. The engineer will be notified.
          </Alert>
          <TextField
            autoFocus
            multiline
            rows={3}
            fullWidth
            label="Reason (optional)"
            placeholder="Why is this task being cancelled?"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialog(false)}>Keep Task</Button>
          <Button variant="contained" color="error" onClick={handleCancelTask} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Cancel Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={reopenDialog} onClose={() => setReopenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.dark' }}>Reopen Task</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will send the task back to the engineer as <strong>Assigned</strong>. Tell them what to fix or what to do differently.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Instructions for Engineer (optional)"
            placeholder="e.g. The structural report is missing the load calculations. Please revise section 3 and resubmit."
            value={reopenNote}
            onChange={e => setReopenNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReopenDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleReopenTask} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Reopen & Reassign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title" required fullWidth size="small"
              value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
            />
            <TextField
              label="Description" fullWidth size="small" multiline rows={3}
              value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hours Budget" type="number" size="small" required sx={{ flex: 1 }}
                inputProps={{ min: 0.5, step: 0.5 }}
                value={editForm.allocated_hours}
                onChange={e => setEditForm(p => ({ ...p, allocated_hours: e.target.value }))}
                InputProps={{ endAdornment: <span style={{ fontSize: '0.8rem', color: '#888' }}>h</span> }}
              />
              <TextField
                label="Due Date" type="date" size="small" sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                value={editForm.deadline}
                onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditTask}
            disabled={!editForm.title.trim() || !editForm.allocated_hours || actionLoading}
          >
            {actionLoading ? <CircularProgress size={18} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Milestone Dialog */}
      <Dialog open={editMilestoneDialog.open} onClose={() => setEditMilestoneDialog({ open: false, milestone: null })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Milestone</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title" required fullWidth size="small"
              value={editMilestoneForm.title}
              onChange={e => setEditMilestoneForm(p => ({ ...p, title: e.target.value }))}
            />
            <TextField
              label="Description" fullWidth size="small" multiline rows={2}
              value={editMilestoneForm.description}
              onChange={e => setEditMilestoneForm(p => ({ ...p, description: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Due Date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={editMilestoneForm.due_date}
                onChange={e => setEditMilestoneForm(p => ({ ...p, due_date: e.target.value }))}
              />
              <TextField
                label="Hours Budget" type="number" size="small" sx={{ width: 160 }}
                inputProps={{ min: 0.5, step: 0.5 }}
                value={editMilestoneForm.allocated_hours}
                onChange={e => setEditMilestoneForm(p => ({ ...p, allocated_hours: e.target.value }))}
                InputProps={{ endAdornment: <span style={{ fontSize: '0.8rem', color: '#888' }}>h</span> }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditMilestoneDialog({ open: false, milestone: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditMilestone} disabled={!editMilestoneForm.title.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : 'Save Changes'}
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Due Date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={newMilestone.due_date}
                onChange={e => setNewMilestone(p => ({ ...p, due_date: e.target.value }))}
              />
              <TextField
                label="Hours Budget" type="number" size="small" sx={{ width: 160 }}
                inputProps={{ min: 0.5, step: 0.5 }}
                value={newMilestone.allocated_hours}
                onChange={e => setNewMilestone(p => ({ ...p, allocated_hours: e.target.value }))}
                InputProps={{ endAdornment: <span style={{ fontSize: '0.8rem', color: '#888' }}>h</span> }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddMilestoneDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMilestone} disabled={!newMilestone.title.trim()}>
            Add Milestone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={logTimeDialog.open} onClose={() => setLogTimeDialog({ open: false, milestone: null })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Log Time
          {logTimeDialog.milestone && (
            <Typography variant="body2" color="text.secondary" fontWeight={400}>
              {logTimeDialog.milestone.title}
              {(logTimeDialog.milestone as any).allocated_hours && ` · Budget: ${(logTimeDialog.milestone as any).allocated_hours}h`}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Date" type="date" required size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: new Date().toISOString().split('T')[0] }}
                value={logTimeForm.date}
                onChange={e => setLogTimeForm(p => ({ ...p, date: e.target.value }))}
              />
              <TextField
                label="Hours" type="number" required size="small" sx={{ width: 140 }}
                inputProps={{ min: 0.25, step: 0.25 }}
                value={logTimeForm.hours}
                onChange={e => setLogTimeForm(p => ({ ...p, hours: e.target.value }))}
                InputProps={{ endAdornment: <span style={{ fontSize: '0.8rem', color: '#888' }}>h</span> }}
              />
            </Box>
            <TextField
              label="Description (optional)" multiline rows={3} fullWidth size="small"
              placeholder="What did you work on?"
              value={logTimeForm.description}
              onChange={e => setLogTimeForm(p => ({ ...p, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogTimeDialog({ open: false, milestone: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLogTime}
            disabled={!logTimeForm.hours || parseFloat(logTimeForm.hours) <= 0 || actionLoading}
          >
            {actionLoading ? <CircularProgress size={18} /> : 'Save Time'}
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
