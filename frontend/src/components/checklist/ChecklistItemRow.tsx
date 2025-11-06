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

  // Check if task is locked (L3 supervisor approved - task is final)
  const isTaskLocked = !!item.supervisor_3_approved_by;

  // Check if task is waiting for supervisor approval (has engineer approvals but no supervisor approval)
  const isWaitingForSupervisor =
    item.engineer_approvals &&
    item.engineer_approvals.length > 0 &&
    !item.supervisor_1_approved_by &&
    !item.supervisor_2_approved_by &&
    !item.supervisor_3_approved_by;

  const handleToggleEngineerApproval = async () => {
    if (!isEngineer) return;
    if (isTaskLocked) {
      setError('Cannot modify approval - task has been finalized by L3 Supervisor');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if current engineer has already approved
      const currentUserId = user?.id;
      const hasApproved = item.engineer_approvals?.some(
        (approval) => approval.engineer_id == currentUserId
      );

      // Toggle approval
      await apiService.toggleEngineerApproval(item.id, !hasApproved);
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to update approval');
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
  // Green: At least one supervisor approved
  // Yellow: At least one engineer approved (but no supervisor yet)
  // White: No approvals
  const getRowBgColor = () => {
    // Green if any supervisor approved
    if (item.supervisor_1_approved_by || item.supervisor_2_approved_by || item.supervisor_3_approved_by) {
      return '#d4edda'; // Light green
    }
    // Yellow if any engineer approved
    if (item.engineer_approvals && item.engineer_approvals.length > 0) {
      return '#fff3cd'; // Light yellow
    }
    // White if no approvals
    return 'white';
  };

  // Get hover color - slightly darker version of current color
  const getHoverColor = () => {
    // Darker green for supervisor approved tasks
    if (item.supervisor_1_approved_by || item.supervisor_2_approved_by || item.supervisor_3_approved_by) {
      return '#c3e6cb'; // Darker green
    }
    // Darker yellow for engineer approved tasks
    if (item.engineer_approvals && item.engineer_approvals.length > 0) {
      return '#ffe69c'; // Darker yellow
    }
    // Light gray for no approvals
    return '#f5f5f5';
  };

  // Check if task is fully completed (has supervisor approval)
  const isFullyCompleted = item.supervisor_1_approved_by || item.supervisor_2_approved_by || item.supervisor_3_approved_by;

  return (
    <>
      <TableRow
        sx={{
          bgcolor: getRowBgColor(),
          '&:hover': { bgcolor: getHoverColor() },
          opacity: loading ? 0.6 : 1,
          borderLeft: isFullyCompleted ? '4px solid #28a745' : 'none', // Bold green border for completed tasks
        }}
      >
        {/* Index Number */}
        <TableCell align="center" sx={{ py: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            <Typography variant="h6" fontWeight="bold" fontSize="1.2rem">
              {index}
            </Typography>
            {isFullyCompleted && (
              <CheckCircle
                sx={{
                  fontSize: '1.6rem',
                  color: '#28a745',
                  animation: 'none'
                }}
              />
            )}
          </Box>
        </TableCell>

        {/* Task Name & Client Notes */}
        <TableCell sx={{ py: 2 }}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography
                variant="body1"
                fontWeight="bold"
                fontSize="1.1rem"
                sx={{ lineHeight: 1.8 }}
              >
                {item.task_title_ar}
              </Typography>
              {/* Supervisor Indicator - Task waiting for approval */}
              {isSupervisor && isWaitingForSupervisor && (
                <Chip
                  label="Awaiting Your Approval"
                  size="medium"
                  color="warning"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                    },
                  }}
                />
              )}
              {/* Task Locked Indicator */}
              {isTaskLocked && (
                <Chip
                  label="Finalized"
                  size="medium"
                  color="success"
                  variant="outlined"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                  }}
                />
              )}
            </Box>
            {item.client_notes && (
              <Chip
                label={`Client Notes: ${item.client_notes}`}
                size="medium"
                color="warning"
                variant="outlined"
                sx={{
                  maxWidth: '100%',
                  height: 'auto',
                  '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.85rem', py: 1 },
                  mt: 0.5,
                }}
              />
            )}
          </Box>
        </TableCell>

        {/* Approval Workflow - Professional Display */}
        <TableCell sx={{ py: 2 }}>
          <Box display="flex" flexDirection="column" gap={1}>
            {/* Current Engineer's Checkbox (if engineer) */}
            {isEngineer && (
              <Tooltip
                title={
                  isTaskLocked
                    ? 'Task finalized by L3 Supervisor - cannot modify'
                    : 'Click to toggle your approval'
                }
                arrow
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Checkbox
                    checked={item.engineer_approvals?.some((approval) => approval.engineer_id == user?.id) || false}
                    onChange={handleToggleEngineerApproval}
                    disabled={loading || isTaskLocked}
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle color="success" />}
                    sx={{
                      p: 0,
                      opacity: isTaskLocked ? 0.5 : 1,
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    fontSize="0.95rem"
                    sx={{ opacity: isTaskLocked ? 0.5 : 1 }}
                  >
                    My Approval {isTaskLocked && '(Locked)'}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* All Engineer Approvals - Show all engineers who approved */}
            <Box>
              <Typography variant="body2" fontWeight="bold" color="text.secondary" display="block" gutterBottom fontSize="0.9rem">
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
                        size="medium"
                        color="info"
                        variant={isCurrentUser ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: isCurrentUser ? 'bold' : 'medium',
                          fontSize: '0.85rem',
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
                  size="medium"
                  color="default"
                  variant="outlined"
                  sx={{ fontSize: '0.8rem' }}
                />
              )}
            </Box>

            {/* Supervisor Approvals */}
            <Box>
              <Typography variant="body2" fontWeight="bold" color="text.secondary" display="block" gutterBottom fontSize="0.9rem">
                Supervisors:
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {/* Supervisor Level 1 */}
                {item.supervisor_1_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L1: ${item.supervisor_1_approved_name}`}
                    size="medium"
                    color="secondary"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.85rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L1"
                    size="medium"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.8rem' }}
                  />
                )}

                {/* Supervisor Level 2 */}
                {item.supervisor_2_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L2: ${item.supervisor_2_approved_name}`}
                    size="medium"
                    color="secondary"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.85rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L2"
                    size="medium"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.8rem' }}
                  />
                )}

                {/* Supervisor Level 3 */}
                {item.supervisor_3_approved_by ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={`L3: ${item.supervisor_3_approved_name}`}
                    size="medium"
                    color="success"
                    variant="filled"
                    sx={{ fontWeight: 'medium', fontSize: '0.85rem' }}
                  />
                ) : (
                  <Chip
                    icon={<HourglassEmpty />}
                    label="L3"
                    size="medium"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.8rem' }}
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
              <Tooltip title={isTaskLocked ? "Cannot edit - task finalized" : "Edit Task"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setEditTaskDialogOpen(true)}
                    color="primary"
                    disabled={isTaskLocked}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </span>
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
          <TableCell colSpan={4}>
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
