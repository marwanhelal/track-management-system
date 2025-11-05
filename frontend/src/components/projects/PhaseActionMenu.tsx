import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
  AccessTime as AccessTimeIcon,
  Info as InfoIcon
} from '@mui/icons-material';
// DatePicker replaced with HTML date input for React 19 compatibility
import { ProjectPhase } from '../../types';
import ConfirmationDialog from '../common/ConfirmationDialog';

export interface PhaseActionMenuProps {
  phase: ProjectPhase;
  onEdit: (phaseId: number, updates: Partial<ProjectPhase>) => Promise<void>;
  onDelete: (phaseId: number) => Promise<void>;
  onStart: (phaseId: number, note?: string) => Promise<void>;
  onComplete: (phaseId: number, note?: string) => Promise<void>;
  disabled?: boolean;
}

interface EditFormData {
  phase_name: string;
  planned_weeks: number;
  predicted_hours: number;
  planned_start_date: string;
  planned_end_date: string;
}

const PhaseActionMenu: React.FC<PhaseActionMenuProps> = ({
  phase,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  disabled = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'start' | 'complete';
    loading: boolean;
  }>({ open: false, type: 'start', loading: false });

  // Helper function to convert ISO datetime to yyyy-MM-dd format
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    // Extract just the date portion (yyyy-MM-dd) from ISO string
    return dateString.split('T')[0];
  };

  const [editForm, setEditForm] = useState<EditFormData>({
    phase_name: phase.phase_name,
    planned_weeks: phase.planned_weeks,
    predicted_hours: phase.predicted_hours || 0,
    planned_start_date: formatDateForInput(phase.planned_start_date),
    planned_end_date: formatDateForInput(phase.planned_end_date)
  });

  const [actionNote, setActionNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditOpen = () => {
    setEditForm({
      phase_name: phase.phase_name,
      planned_weeks: phase.planned_weeks,
      predicted_hours: phase.predicted_hours || 0,
      planned_start_date: formatDateForInput(phase.planned_start_date),
      planned_end_date: formatDateForInput(phase.planned_end_date)
    });
    setEditDialog(true);
    handleMenuClose();
  };

  const handleEditSave = async () => {
    try {
      setLoading(true);
      await onEdit(phase.id, {
        phase_name: editForm.phase_name,
        planned_weeks: editForm.planned_weeks,
        predicted_hours: editForm.predicted_hours,
        planned_start_date: editForm.planned_start_date || undefined,
        planned_end_date: editForm.planned_end_date || undefined
      });
      setEditDialog(false);
    } catch (error) {
      console.error('Failed to edit phase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(phase.id);
      setDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete phase:', error);
    }
  };

  const handlePhaseAction = async (actionType: 'start' | 'complete') => {
    try {
      setActionDialog(prev => ({ ...prev, loading: true }));

      if (actionType === 'start') {
        await onStart(phase.id, actionNote);
      } else {
        await onComplete(phase.id, actionNote);
      }

      setActionDialog({ open: false, type: 'start', loading: false });
      setActionNote('');
    } catch (error) {
      console.error(`Failed to ${actionType} phase:`, error);
      setActionDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const openActionDialog = (type: 'start' | 'complete') => {
    setActionDialog({ open: true, type, loading: false });
    setActionNote('');
    handleMenuClose();
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'default';
      case 'ready':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'submitted':
        return 'warning';
      case 'approved':
        return 'success';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const canStartPhase = phase.status === 'not_started' || phase.status === 'ready' || phase.status === 'approved';
  const canCompletePhase = phase.status === 'in_progress' || phase.status === 'submitted';

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        disabled={disabled}
        size="small"
        sx={{
          '&:hover': {
            bgcolor: 'primary.50'
          }
        }}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 200,
            borderRadius: 2
          }
        }}
      >
        {/* Basic Actions */}
        <MenuItem onClick={handleEditOpen}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit Phase Details" />
        </MenuItem>

        <MenuItem onClick={() => setDateDialog(true)}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Set Dates" />
        </MenuItem>

        <Divider />

        {/* Status Actions */}
        {canStartPhase && (
          <MenuItem onClick={() => openActionDialog('start')}>
            <ListItemIcon>
              <StartIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Start Phase" />
          </MenuItem>
        )}

        {canCompletePhase && (
          <MenuItem onClick={() => openActionDialog('complete')}>
            <ListItemIcon>
              <CompleteIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Complete Phase" />
          </MenuItem>
        )}

        <Divider />

        {/* Destructive Actions */}
        <MenuItem onClick={() => { setDeleteDialog(true); handleMenuClose(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete Phase" />
        </MenuItem>
      </Menu>

      {/* Edit Phase Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            Edit Phase: {phase.phase_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phase Name"
                value={editForm.phase_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, phase_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Planned Weeks"
                type="number"
                value={editForm.planned_weeks}
                onChange={(e) => setEditForm(prev => ({ ...prev, planned_weeks: parseInt(e.target.value) || 0 }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Predicted Hours"
                type="number"
                value={editForm.predicted_hours}
                onChange={(e) => setEditForm(prev => ({ ...prev, predicted_hours: parseInt(e.target.value) || 0 }))}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2">Current Status:</Typography>
                <Chip
                  label={phase.status}
                  size="small"
                  color={getPhaseStatusColor(phase.status) as any}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Dates Dialog */}
      <Dialog open={dateDialog} onClose={() => setDateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            Set Phase Dates: {phase.phase_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Planned Start Date"
                type="date"
                value={editForm.planned_start_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, planned_start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Planned End Date"
                type="date"
                value={editForm.planned_end_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, planned_end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  These dates help with project planning and timeline visualization.
                  Actual dates will be tracked automatically when phases are started and completed.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save Dates'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Phase Action Dialog (Start/Complete) */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: 'start', loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actionDialog.type === 'start' ? <StartIcon /> : <CompleteIcon />}
            {actionDialog.type === 'start' ? 'Start' : 'Complete'} Phase: {phase.phase_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label={`${actionDialog.type === 'start' ? 'Start' : 'Completion'} Note (Optional)`}
              multiline
              rows={3}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={`Add a note about ${actionDialog.type === 'start' ? 'starting' : 'completing'} this phase...`}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                This action will change the phase status and be recorded in the project timeline.
                {actionDialog.type === 'start' && ' The actual start date will be set to today.'}
                {actionDialog.type === 'complete' && ' The actual end date will be set to today.'}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setActionDialog({ open: false, type: 'start', loading: false })}
            disabled={actionDialog.loading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handlePhaseAction(actionDialog.type)}
            variant="contained"
            disabled={actionDialog.loading}
            color={actionDialog.type === 'start' ? 'primary' : 'success'}
          >
            {actionDialog.loading ? 'Processing...' : `${actionDialog.type === 'start' ? 'Start' : 'Complete'} Phase`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Phase"
        message={`Are you sure you want to delete the phase "${phase.phase_name}"?`}
        confirmText="Delete Phase"
        severity="error"
        actionIcon="delete"
        details={[
          'This action cannot be undone',
          'All work logs associated with this phase will be preserved',
          'Phase order will be automatically adjusted'
        ]}
        impactMessage="This will permanently remove the phase from the project timeline."
      />
    </>
  );
};

export default PhaseActionMenu;