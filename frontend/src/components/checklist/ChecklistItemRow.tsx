import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  TableRow,
  TableCell,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Person,
  SupervisorAccount,
  Edit,
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import { ProjectChecklistItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import EditTaskDialog from './EditTaskDialog';

interface ChecklistItemRowProps {
  item: ProjectChecklistItem;
  index: number;
  onUpdate: () => void;
}

const ChecklistItemRow = ({ item, index, onUpdate }: ChecklistItemRowProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientNotesDialogOpen, setClientNotesDialogOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState(item.client_notes || '');
  const [error, setError] = useState<string | null>(null);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);

  const isEngineer = user?.role === 'engineer';
  const isSupervisor = user?.role === 'supervisor';

  const handleToggleCompletion = async () => {
    if (!isEngineer && !isSupervisor) return;

    // Don't allow unchecking if task is already completed
    // This prevents engineers from undoing each other's work
    if (item.is_completed) {
      setError('Cannot uncheck a completed task. Task completion cannot be reverted.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiService.toggleItemCompletion(item.id, true);
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to update completion status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiService.updateChecklistClientNotes(item.id, { client_notes: clientNotes });
      setClientNotesDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to update client notes');
    } finally {
      setLoading(false);
    }
  };

  // Get row background color based on status
  const getRowBgColor = () => {
    if (item.supervisor_3_approved_by) return 'success.50';
    if (item.supervisor_2_approved_by) return 'secondary.50';
    if (item.supervisor_1_approved_by) return 'info.50';
    if (item.engineer_approvals && item.engineer_approvals.length > 0) return 'primary.50';
    if (item.is_completed) return 'grey.50';
    return 'white';
  };

  return (
    <>
      <TableRow
        sx={{
          bgcolor: getRowBgColor(),
          '&:hover': { bgcolor: 'action.hover' },
          opacity: loading ? 0.6 : 1,
        }}
      >
        {/* Index Number */}
        <TableCell align="center">
          <Typography variant="body2" fontWeight="medium">
            {index}
          </Typography>
        </TableCell>

        {/* Task Name & Client Notes */}
        <TableCell>
          <Box>
            <Typography
              variant="body2"
              fontWeight={item.is_completed ? 'normal' : 'bold'}
              sx={{
                textDecoration: item.is_completed ? 'line-through' : 'none',
                color: item.is_completed ? 'text.secondary' : 'text.primary',
                mb: 0.5,
              }}
            >
              {item.task_title_ar}
            </Typography>
            {item.client_notes && (
              <Chip
                label={`Client Notes: ${item.client_notes}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{
                  maxWidth: '100%',
                  height: 'auto',
                  '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.7rem' },
                  mt: 0.5,
                }}
              />
            )}
          </Box>
        </TableCell>

        {/* Status */}
        <TableCell align="center">
          <Checkbox
            checked={item.is_completed}
            onChange={handleToggleCompletion}
            disabled={loading || (!isEngineer && !isSupervisor)}
            icon={<RadioButtonUnchecked />}
            checkedIcon={<CheckCircle color="success" />}
            sx={{ p: 0 }}
          />
          <Typography variant="caption" display="block" color={item.is_completed ? 'success.main' : 'text.secondary'} fontWeight="medium">
            {item.is_completed ? 'Done' : 'Pending'}
          </Typography>
        </TableCell>

        {/* Approval Workflow - Professional Display */}
        <TableCell>
          <Box display="flex" flexDirection="column" gap={1}>
            {/* Engineer Approvals - Show all engineers who approved */}
            <Box>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                Engineers:
              </Typography>
              {item.engineer_approvals && item.engineer_approvals.length > 0 ? (
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {item.engineer_approvals.map((approval, idx) => {
                    // Highlight current user's approval
                    const isCurrentUser = user && approval.engineer_id == user.id;
                    return (
                      <Chip
                        key={idx}
                        icon={<CheckCircle />}
                        label={approval.engineer_name}
                        size="small"
                        color="info"
                        variant={isCurrentUser ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: isCurrentUser ? 'bold' : 'medium',
                          fontSize: '0.75rem',
                          border: isCurrentUser ? '2px solid' : undefined,
                        }}
                      />
                    );
                  })}
                </Box>
              ) : (
                <Chip
                  icon={<HourglassEmpty />}
                  label="Pending"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>

            {/* Supervisor Approvals */}
            <Box>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                Supervisors:
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {/* Supervisor Level 1 */}
                {item.supervisor_1_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L1: ${item.supervisor_1_approved_name}`}
                    size="small"
                    color="secondary"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L1"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}

                {/* Supervisor Level 2 */}
                {item.supervisor_2_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L2: ${item.supervisor_2_approved_name}`}
                    size="small"
                    color="secondary"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L2"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}

                {/* Supervisor Level 3 */}
                {item.supervisor_3_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L3: ${item.supervisor_3_approved_name}`}
                    size="small"
                    color="success"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L3"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </TableCell>

        {/* Actions */}
        <TableCell align="center">
          {isSupervisor && (
            <Box display="flex" gap={0.5} justifyContent="center">
              <Tooltip title="Edit Task">
                <IconButton
                  size="small"
                  onClick={() => setEditTaskDialogOpen(true)}
                  color="primary"
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Client Notes">
                <IconButton
                  size="small"
                  onClick={() => setClientNotesDialogOpen(true)}
                  color="warning"
                >
                  <Person fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </TableCell>
      </TableRow>

      {/* Error Display Row */}
      {error && (
        <TableRow>
          <TableCell colSpan={5}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </TableCell>
        </TableRow>
      )}

      {/* Client Notes Dialog */}
      <Dialog
        open={clientNotesDialogOpen}
        onClose={() => setClientNotesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Person color="warning" />
            <Typography variant="h6">Client Notes</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom fontWeight="medium">
            Task: {item.task_title_ar}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <TextField
            fullWidth
            multiline
            rows={4}
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder="Enter special client requirements or notes here..."
            label="Client Notes"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientNotesDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSaveClientNotes} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <EditTaskDialog
        open={editTaskDialogOpen}
        onClose={() => setEditTaskDialogOpen(false)}
        item={item}
        onSuccess={onUpdate}
      />
    </>
  );
};

export default ChecklistItemRow;
