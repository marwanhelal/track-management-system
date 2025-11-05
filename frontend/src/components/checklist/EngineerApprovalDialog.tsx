import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';
import { ProjectChecklistItem, ChecklistPhaseName } from '../../types';
import apiService from '../../services/api';

interface EngineerApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  phaseName: ChecklistPhaseName;
  completedItems: ProjectChecklistItem[];
  onSuccess: () => void;
}

const EngineerApprovalDialog = ({
  open,
  onClose,
  projectId,
  phaseName,
  completedItems,
  onSuccess,
}: EngineerApprovalDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<number[]>(
    completedItems.map((item) => item.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleItem = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(completedItems.map((item) => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('الرجاء اختيار مهمة واحدة على الأقل / Please select at least one task');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiService.engineerApproval({ items: selectedItems });

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'فشل في الموافقة / Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedItems(completedItems.map((item) => item.id));
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" gutterBottom>
            Engineer Approval
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Phase: {phaseName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Alert severity="info" icon={<CheckCircle />} sx={{ mb: 2 }}>
          <Typography variant="body2">
            You are about to approve the following completed tasks. <strong>Multiple engineers can approve the same task.</strong> Supervisors will be notified after engineer approvals.
          </Typography>
        </Alert>

        {completedItems.length === 0 ? (
          <Alert severity="warning" icon={<Warning />}>
            No completed tasks available for approval
          </Alert>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2">
                Completed Tasks ({completedItems.length}):
              </Typography>
              <Box>
                <Button size="small" onClick={handleSelectAll} disabled={loading}>
                  Select All
                </Button>
                <Button size="small" onClick={handleDeselectAll} disabled={loading}>
                  Deselect All
                </Button>
              </Box>
            </Box>

            <Divider />

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {completedItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    dense
                    button
                    onClick={() => handleToggleItem(item.id)}
                    disabled={loading}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      tabIndex={-1}
                      disableRipple
                      disabled={loading}
                    />
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2">
                            {item.task_title_ar}
                          </Typography>
                          {item.task_title_en && (
                            <Typography variant="caption" color="text.secondary">
                              {item.task_title_en}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                          {item.section_name && (
                            <Chip label={item.section_name} size="small" />
                          )}
                          {item.engineer_approvals && item.engineer_approvals.length > 0 && (
                            <Chip
                              label={`Already approved by: ${item.engineer_approvals.map(e => e.engineer_name).join(', ')}`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < completedItems.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>

            <Box mt={2} p={2} bgcolor="primary.50" borderRadius={1}>
              <Typography variant="body2" fontWeight="medium">
                Summary:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedItems.length} of {completedItems.length} tasks selected
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedItems.length === 0}
          color="success"
        >
          {loading ? 'Approving...' : `Approve (${selectedItems.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EngineerApprovalDialog;
