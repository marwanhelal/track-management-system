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

  const isEngineer = user?.role === 'engineer';
  const isSupervisor = user?.role === 'supervisor';

  const handleToggleCompletion = async () => {
    if (!isEngineer && !isSupervisor) return;

    try {
      setLoading(true);
      setError(null);
      await apiService.toggleItemCompletion(item.id, !item.is_completed);
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
    if (item.engineer_approved_by) return 'primary.50';
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

        {/* Approval Workflow */}
        <TableCell align="center">
          <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap">
            {/* Engineer Approval */}
            <Tooltip title={item.engineer_approved_by ? `Engineer: ${item.engineer_approved_name || 'Unknown'}` : 'Waiting for engineer approval'}>
              <Chip
                icon={item.engineer_approved_by ? <CheckCircle /> : <HourglassEmpty />}
                label="E"
                size="small"
                color={item.engineer_approved_by ? 'info' : 'default'}
                variant={item.engineer_approved_by ? 'filled' : 'outlined'}
                sx={{ fontWeight: 'bold', minWidth: 50 }}
              />
            </Tooltip>

            {/* Supervisor Level 1 */}
            <Tooltip title={item.supervisor_1_approved_by ? `Supervisor L1: ${item.supervisor_1_approved_name || 'Unknown'}` : 'Waiting for supervisor L1 approval'}>
              <Chip
                icon={item.supervisor_1_approved_by ? <CheckCircle /> : <HourglassEmpty />}
                label="S1"
                size="small"
                color={item.supervisor_1_approved_by ? 'secondary' : 'default'}
                variant={item.supervisor_1_approved_by ? 'filled' : 'outlined'}
                sx={{ fontWeight: 'bold', minWidth: 50 }}
              />
            </Tooltip>

            {/* Supervisor Level 2 */}
            <Tooltip title={item.supervisor_2_approved_by ? `Supervisor L2: ${item.supervisor_2_approved_name || 'Unknown'}` : 'Waiting for supervisor L2 approval'}>
              <Chip
                icon={item.supervisor_2_approved_by ? <CheckCircle /> : <HourglassEmpty />}
                label="S2"
                size="small"
                color={item.supervisor_2_approved_by ? 'secondary' : 'default'}
                variant={item.supervisor_2_approved_by ? 'filled' : 'outlined'}
                sx={{ fontWeight: 'bold', minWidth: 50 }}
              />
            </Tooltip>

            {/* Supervisor Level 3 */}
            <Tooltip title={item.supervisor_3_approved_by ? `Supervisor L3: ${item.supervisor_3_approved_name || 'Unknown'}` : 'Waiting for supervisor L3 approval'}>
              <Chip
                icon={item.supervisor_3_approved_by ? <CheckCircle /> : <HourglassEmpty />}
                label="S3"
                size="small"
                color={item.supervisor_3_approved_by ? 'success' : 'default'}
                variant={item.supervisor_3_approved_by ? 'filled' : 'outlined'}
                sx={{ fontWeight: 'bold', minWidth: 50 }}
              />
            </Tooltip>
          </Box>
        </TableCell>

        {/* Actions */}
        <TableCell align="center">
          {isSupervisor && (
            <Tooltip title="Edit Client Notes">
              <IconButton
                size="small"
                onClick={() => setClientNotesDialogOpen(true)}
                color="primary"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
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
            <Edit color="primary" />
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
    </>
  );
};

export default ChecklistItemRow;
