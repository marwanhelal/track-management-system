import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { ChecklistInstanceItemWithUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { format } from 'date-fns';

interface ChecklistItemProps {
  item: ChecklistInstanceItemWithUser;
  onUpdate: () => void;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ item, onUpdate }) => {
  const { user, isSupervisor } = useAuth();
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; level: 1 | 2 | 3 | 4 | null }>({ open: false, level: null });
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const canApproveLevel = (level: 1 | 2 | 3 | 4): boolean => {
    if (level === 1) {
      // Anyone can approve level 1
      return true;
    }
    // Levels 2, 3, 4 require supervisor/admin
    return isSupervisor;
  };

  const handleApproveClick = (level: 1 | 2 | 3 | 4) => {
    if (!canApproveLevel(level)) return;
    setApprovalDialog({ open: true, level });
    setNote('');
  };

  const handleApproveConfirm = async () => {
    if (!approvalDialog.level) return;

    try {
      setLoading(true);
      const response = await apiService.approveChecklistItem(item.id, approvalDialog.level, note || undefined);

      if (response.success) {
        setApprovalDialog({ open: false, level: null });
        setNote('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error approving item:', error);
    } finally {
      setLoading(false);
    }
  };

  const getApprovalStatus = (level: 1 | 2 | 3 | 4) => {
    const approved = item[`approval_level_${level}` as keyof ChecklistInstanceItemWithUser] as boolean;
    const approvedBy = item[`approval_level_${level}_user` as keyof ChecklistInstanceItemWithUser] as string | undefined;
    const approvedAt = item[`approval_level_${level}_at` as keyof ChecklistInstanceItemWithUser] as string | undefined;
    const approvalNote = item[`approval_level_${level}_note` as keyof ChecklistInstanceItemWithUser] as string | undefined;

    return { approved, approvedBy, approvedAt, approvalNote };
  };

  const getLevelLabel = (level: 1 | 2 | 3 | 4): string => {
    const labels = {
      1: 'Engineer',
      2: 'Supervisor 1',
      3: 'Supervisor 2',
      4: 'Final'
    };
    return labels[level];
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        {/* Item Text */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: item.is_required ? 600 : 400 }}>
            {item.name_ar}
            {item.is_required && <Chip label="Required" size="small" color="error" sx={{ ml: 1, height: 20 }} />}
            {item.is_custom && <Chip label="Custom" size="small" color="info" sx={{ ml: 1, height: 20 }} />}
          </Typography>
          {item.name_en && (
            <Typography variant="caption" color="text.secondary">
              {item.name_en}
            </Typography>
          )}
        </Box>

        {/* Approval Levels */}
        <Stack direction="row" spacing={1}>
          {([1, 2, 3, 4] as const).map((level) => {
            const { approved, approvedBy, approvedAt, approvalNote } = getApprovalStatus(level);
            const canApprove = canApproveLevel(level);

            return (
              <Tooltip
                key={level}
                title={
                  approved
                    ? `${getLevelLabel(level)} - Approved by ${approvedBy || 'Unknown'} ${approvedAt ? `on ${format(new Date(approvedAt), 'MMM dd, yyyy HH:mm')}` : ''}${approvalNote ? `\nNote: ${approvalNote}` : ''}`
                    : canApprove
                    ? `Click to approve as ${getLevelLabel(level)}`
                    : `${getLevelLabel(level)} - Requires supervisor`
                }
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={() => !approved && handleApproveClick(level)}
                    disabled={approved || !canApprove}
                    sx={{
                      color: approved ? 'success.main' : 'action.disabled',
                      '&:hover': !approved && canApprove ? { bgcolor: 'action.hover' } : {}
                    }}
                  >
                    {approved ? <CheckCircleIcon /> : <UncheckedIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false, level: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Approve - {approvalDialog.level && getLevelLabel(approvalDialog.level)}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {item.name_ar}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Note (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any notes or comments..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, level: null })}>
            Cancel
          </Button>
          <Button onClick={handleApproveConfirm} variant="contained" disabled={loading}>
            {loading ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChecklistItem;