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
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Person,
  SupervisorAccount,
  Edit,
  Cancel,
} from '@mui/icons-material';
import { ProjectChecklistItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

interface ChecklistItemRowProps {
  item: ProjectChecklistItem;
  onUpdate: () => void;
}

const ChecklistItemRow = ({ item, onUpdate }: ChecklistItemRowProps) => {
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

  const handleRevokeEngineerApproval = async () => {
    if (!isSupervisor) return;

    try {
      setLoading(true);
      setError(null);
      await apiService.revokeEngineerApproval(item.id);
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to revoke approval');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSupervisorApproval = async (level: 1 | 2 | 3) => {
    if (!isSupervisor) return;

    try {
      setLoading(true);
      setError(null);
      await apiService.revokeSupervisorApproval(item.id, level);
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to revoke approval');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' },
          opacity: item.is_completed ? 0.8 : 1,
        }}
      >
        {/* Checkbox */}
        <Checkbox
          checked={item.is_completed}
          onChange={handleToggleCompletion}
          disabled={loading || (!isEngineer && !isSupervisor)}
          icon={<RadioButtonUnchecked />}
          checkedIcon={<CheckCircle color="success" />}
        />

        {/* Task Info */}
        <Box flex={1}>
          <Typography
            variant="body1"
            sx={{
              textDecoration: item.is_completed ? 'line-through' : 'none',
              color: item.is_completed ? 'text.secondary' : 'text.primary',
            }}
          >
            {item.task_title_ar}
          </Typography>
          {item.task_title_en && (
            <Typography variant="caption" color="text.secondary" display="block">
              {item.task_title_en}
            </Typography>
          )}

          {/* Client Notes */}
          {item.client_notes && (
            <Box mt={1}>
              <Chip
                label={`ملاحظات العميل: ${item.client_notes}`}
                size="small"
                variant="outlined"
                color="warning"
                sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
              />
            </Box>
          )}
        </Box>

        {/* Approval Status Indicators */}
        <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
          {/* Engineer Approval */}
          {item.engineer_approved_by ? (
            <Tooltip title={`موافقة المهندس: ${item.engineer_approved_name || 'Unknown'}`}>
              <Chip
                icon={<Person />}
                label="E"
                size="small"
                color="info"
                onDelete={isSupervisor ? handleRevokeEngineerApproval : undefined}
                deleteIcon={<Cancel />}
              />
            </Tooltip>
          ) : (
            <Tooltip title="في انتظار موافقة المهندس">
              <Chip
                icon={<Person />}
                label="E"
                size="small"
                variant="outlined"
                disabled
              />
            </Tooltip>
          )}

          {/* Supervisor Level 1 */}
          {item.supervisor_1_approved_by ? (
            <Tooltip title={`موافقة المشرف 1: ${item.supervisor_1_approved_name || 'Unknown'}`}>
              <Chip
                icon={<SupervisorAccount />}
                label="S1"
                size="small"
                color="secondary"
                onDelete={isSupervisor ? () => handleRevokeSupervisorApproval(1) : undefined}
                deleteIcon={<Cancel />}
              />
            </Tooltip>
          ) : (
            <Tooltip title="في انتظار موافقة المشرف 1">
              <Chip
                icon={<SupervisorAccount />}
                label="S1"
                size="small"
                variant="outlined"
                disabled
              />
            </Tooltip>
          )}

          {/* Supervisor Level 2 */}
          {item.supervisor_2_approved_by ? (
            <Tooltip title={`موافقة المشرف 2: ${item.supervisor_2_approved_name || 'Unknown'}`}>
              <Chip
                icon={<SupervisorAccount />}
                label="S2"
                size="small"
                color="secondary"
                onDelete={isSupervisor ? () => handleRevokeSupervisorApproval(2) : undefined}
                deleteIcon={<Cancel />}
              />
            </Tooltip>
          ) : (
            <Tooltip title="في انتظار موافقة المشرف 2">
              <Chip
                icon={<SupervisorAccount />}
                label="S2"
                size="small"
                variant="outlined"
                disabled
              />
            </Tooltip>
          )}

          {/* Supervisor Level 3 */}
          {item.supervisor_3_approved_by ? (
            <Tooltip title={`موافقة المشرف 3: ${item.supervisor_3_approved_name || 'Unknown'}`}>
              <Chip
                icon={<SupervisorAccount />}
                label="S3"
                size="small"
                color="secondary"
                onDelete={isSupervisor ? () => handleRevokeSupervisorApproval(3) : undefined}
                deleteIcon={<Cancel />}
              />
            </Tooltip>
          ) : (
            <Tooltip title="في انتظار موافقة المشرف 3">
              <Chip
                icon={<SupervisorAccount />}
                label="S3"
                size="small"
                variant="outlined"
                disabled
              />
            </Tooltip>
          )}

          {/* Edit Client Notes (Supervisors Only) */}
          {isSupervisor && (
            <Tooltip title="تعديل ملاحظات العميل / Edit Client Notes">
              <IconButton
                size="small"
                onClick={() => setClientNotesDialogOpen(true)}
                color="primary"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Client Notes Dialog */}
      <Dialog
        open={clientNotesDialogOpen}
        onClose={() => setClientNotesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ملاحظات العميل / Client Notes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            المهمة: {item.task_title_ar}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder="أدخل ملاحظات العميل الخاصة / Enter special client requirements or notes"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientNotesDialogOpen(false)} disabled={loading}>
            إلغاء / Cancel
          </Button>
          <Button onClick={handleSaveClientNotes} variant="contained" disabled={loading}>
            {loading ? 'جاري الحفظ... / Saving...' : 'حفظ / Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChecklistItemRow;
