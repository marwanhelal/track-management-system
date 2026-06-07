import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, Chip, LinearProgress,
  IconButton, Button, TextField, InputAdornment, Skeleton, Alert, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Divider, Tooltip, Badge, Snackbar,
  List, ListItem, ListItemAvatar, ListItemText, CircularProgress,
  AvatarGroup
} from '@mui/material';
import {
  Add, Search, Refresh, Person, Assignment, CheckCircle,
  Block, AccessTime, TrendingUp, ArrowForward, Close, Warning,
  FiberManualRecord, GroupAdd, PersonAdd, MoreVert, CheckBox,
  CheckBoxOutlineBlank
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface TeamMember {
  id: number;        // membership id (tm.id)
  engineer_id: number;
  engineer_name: string;
  engineer_email: string;
  project_id: number;
  project_name: string;
  is_active?: boolean;
  active_tasks?: number;
  total_hours_logged?: number;
}

interface AddEngineerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const AddEngineerDialog: React.FC<AddEngineerDialogProps> = ({ open, onClose, onAdded }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedProject('');
      setSelectedEngineers([]);
      setError(null);
      setAddedCount(0);
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

  const loadAvailableEngineers = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await apiService.getAvailableEngineers(parseInt(projectId));
      setEngineers(res.data?.engineers || []);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    setSelectedEngineers([]);
    setError(null);
    if (value) loadAvailableEngineers(value);
  };

  const handleToggleAll = () => {
    if (selectedEngineers.length === engineers.length) {
      setSelectedEngineers([]);
    } else {
      setSelectedEngineers(engineers.map((e: any) => String(e.id)));
    }
  };

  const handleAdd = async () => {
    if (selectedEngineers.length === 0) return;
    setSubmitting(true);
    setError(null);
    const errors: string[] = [];
    let added = 0;
    for (const engId of selectedEngineers) {
      try {
        await apiService.createMembership({
          engineer_id: parseInt(engId),
          project_id: parseInt(selectedProject),
        });
        added++;
      } catch (err: any) {
        const name = engineers.find((e: any) => String(e.id) === engId)?.name || engId;
        errors.push(`${name}: ${err.response?.data?.error || 'Failed'}`);
      }
    }
    setSubmitting(false);
    if (added > 0) onAdded();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      if (added > 0) setAddedCount(added);
    } else {
      onClose();
    }
  };

  const allSelected = engineers.length > 0 && selectedEngineers.length === engineers.length;
  const someSelected = selectedEngineers.length > 0 && selectedEngineers.length < engineers.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add Engineers to Team
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity={addedCount > 0 ? 'warning' : 'error'} sx={{ mb: 2, borderRadius: 2, whiteSpace: 'pre-line' }}>
            {addedCount > 0 && <strong>{addedCount} engineer(s) added successfully. </strong>}
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth required disabled={loading}>
            <InputLabel>Project</InputLabel>
            <Select value={selectedProject} onChange={e => handleProjectChange(e.target.value)} label="Project">
              {projects.map((p: any) => (
                <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProject && (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Loading engineers...</Typography>
                </Box>
              ) : engineers.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>All engineers are already in your team for this project.</Alert>
              ) : (
                <Box>
                  {/* Select All row */}
                  <Box
                    onClick={handleToggleAll}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                      borderRadius: 2, cursor: 'pointer', mb: 0.5,
                      bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200',
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      size="small"
                      sx={{ p: 0 }}
                      onChange={handleToggleAll}
                      onClick={e => e.stopPropagation()}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {allSelected ? 'Deselect All' : 'Select All'} ({engineers.length} engineers)
                    </Typography>
                  </Box>

                  {/* Engineer list */}
                  <Box sx={{
                    maxHeight: 280, overflowY: 'auto', border: '1px solid', borderColor: 'grey.200',
                    borderRadius: 2, bgcolor: 'background.paper'
                  }}>
                    {engineers.map((eng: any) => {
                      const checked = selectedEngineers.includes(String(eng.id));
                      return (
                        <Box
                          key={eng.id}
                          onClick={() => {
                            setSelectedEngineers(prev =>
                              checked ? prev.filter(id => id !== String(eng.id)) : [...prev, String(eng.id)]
                            );
                          }}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1,
                            cursor: 'pointer', borderBottom: '1px solid', borderColor: 'grey.100',
                            bgcolor: checked ? 'primary.50' : 'transparent',
                            '&:hover': { bgcolor: checked ? 'primary.100' : 'grey.50' },
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Checkbox checked={checked} size="small" sx={{ p: 0 }} readOnly />
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: checked ? 'primary.main' : 'grey.400' }}>
                            {eng.name[0]}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={checked ? 600 : 400} noWrap>{eng.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{eng.email}</Typography>
                          </Box>
                          {checked && <CheckCircle sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Selection summary */}
                  {selectedEngineers.length > 0 && (
                    <Box sx={{ mt: 1, px: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={600}>
                        {selectedEngineers.length} engineer{selectedEngineers.length > 1 ? 's' : ''} selected
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        — will be added to the project
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!selectedProject || selectedEngineers.length === 0 || submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : <PersonAdd />}
        >
          {submitting
            ? 'Adding...'
            : selectedEngineers.length > 0
              ? `Add ${selectedEngineers.length} Engineer${selectedEngineers.length > 1 ? 's' : ''} to Team`
              : 'Add to Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Engineer Card ──────────────────────────────────────────────────────────────
const EngineerCard: React.FC<{
  member: TeamMember;
  onViewTasks: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}> = ({ member, onViewTasks, onRemove, isRemoving }) => {
  const activeTasks = member.active_tasks || 0;
  const loggedHours = member.total_hours_logged || 0;

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48, height: 48, fontSize: 18, fontWeight: 700,
                bgcolor: 'primary.main',
                boxShadow: 2
              }}
            >
              {member.engineer_name[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{member.engineer_name}</Typography>
              <Typography variant="caption" color="text.secondary">{member.engineer_email}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip
              size="small"
              label={activeTasks > 0 ? `${activeTasks} active` : 'Available'}
              color={activeTasks > 2 ? 'warning' : activeTasks > 0 ? 'primary' : 'default'}
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Project badge */}
        <Chip
          label={member.project_name}
          size="small"
          variant="outlined"
          sx={{ mb: 2, fontSize: '0.7rem' }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Stats Grid */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[
            { label: 'Active Tasks', value: activeTasks, color: 'primary.main' },
            { label: 'Hours Logged', value: `${loggedHours}h`, color: 'text.primary' },
          ].map(({ label, value, color }) => (
            <Grid item xs={6} key={label}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>

      {/* Actions */}
      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<Assignment />}
          onClick={onViewTasks}
          sx={{ borderRadius: 2 }}
        >
          View Tasks
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={onRemove}
          disabled={isRemoving}
          sx={{ borderRadius: 2, minWidth: 'auto', px: 1.5 }}
        >
          {isRemoving ? <CircularProgress size={14} /> : <Close sx={{ fontSize: 16 }} />}
        </Button>
      </Box>
    </Card>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const MyTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isTeamLeader, isSupervisor } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getMyTeam();
      setMembers(res.data?.memberships || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleRemove = async (membershipId: number, engineerName: string) => {
    if (!window.confirm(`Remove ${engineerName} from this project team?`)) return;
    setRemovingId(membershipId);
    try {
      await apiService.deactivateMembership(membershipId);
      setSnack({ open: true, msg: `${engineerName} removed from team.`, severity: 'success' });
      loadTeam();
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.error || 'Failed to remove', severity: 'error' });
    } finally {
      setRemovingId(null);
    }
  };

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    return (
      m.engineer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.engineer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.project_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalActiveTasks = members.reduce((sum, m) => sum + (m.active_tasks || 0), 0);
  const totalLoggedHours = members.reduce((sum, m) => sum + (m.total_hours_logged || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>My Team</Typography>
          <Typography variant="body2" color="text.secondary">
            {members.length} engineer{members.length !== 1 ? 's' : ''} in your team
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadTeam} size="small" sx={{ bgcolor: 'action.hover' }}><Refresh /></IconButton>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddDialog(true)} sx={{ borderRadius: 2 }}>
            Add Engineer
          </Button>
        </Box>
      </Box>

      {/* Summary Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Team Size', value: members.length, color: 'primary.main', icon: <Person /> },
          { label: 'Active Tasks', value: totalActiveTasks, color: 'info.main', icon: <Assignment /> },
          { label: 'Hours Logged', value: `${totalLoggedHours}h`, color: 'text.primary', icon: <AccessTime /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ color }}>
                  {loading ? <Skeleton width={50} /> : value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by name, email, or project..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        size="small"
        sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {/* Team Grid */}
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredMembers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '2px dashed', borderColor: 'divider' }}>
          <Person sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No engineers match your search' : 'No engineers in your team yet'}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Add engineers to your team to start assigning tasks.
          </Typography>
          {!searchQuery && (
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddDialog(true)}>
              Add First Engineer
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredMembers.map(member => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <EngineerCard
                member={member}
                onViewTasks={() => navigate(`/task-board?engineer=${member.engineer_id}`)}
                onRemove={() => handleRemove(member.id, member.engineer_name)}
                isRemoving={removingId === member.id}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <AddEngineerDialog
        open={addDialog}
        onClose={() => setAddDialog(false)}
        onAdded={() => {
          loadTeam();
          setSnack({ open: true, msg: 'Engineer added to your team!', severity: 'success' });
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MyTeamPage;
