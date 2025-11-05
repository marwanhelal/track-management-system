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
import { CheckCircle, Warning, SupervisorAccount } from '@mui/icons-material';
import { ProjectChecklistItem, ChecklistPhaseName } from '../../types';
import apiService from '../../services/api';

interface SupervisorApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  phaseName: ChecklistPhaseName;
  level: 1 | 2 | 3;
  items: ProjectChecklistItem[];
  onSuccess: () => void;
}

const SupervisorApprovalDialog = ({
  open,
  onClose,
  projectId,
  phaseName,
  level,
  items,
  onSuccess,
}: SupervisorApprovalDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<number[]>(
    items.map((item) => item.id)
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
    setSelectedItems(items.map((item) => item.id));
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

      await apiService.supervisorApproval({
        items: selectedItems,
        level,
      });

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
      setSelectedItems(items.map((item) => item.id));
      setError(null);
      onClose();
    }
  };

  const getLevelTitle = () => {
    switch (level) {
      case 1:
        return 'موافقة المشرف - المستوى 1 / Supervisor Approval - Level 1';
      case 2:
        return 'موافقة المشرف - المستوى 2 / Supervisor Approval - Level 2';
      case 3:
        return 'موافقة المشرف - المستوى 3 / Supervisor Approval - Level 3';
    }
  };

  const getLevelDescription = () => {
    switch (level) {
      case 1:
        return 'هذه المهام تم اعتمادها من قبل المهندس وتحتاج إلى الموافقة الإشرافية الأولى';
      case 2:
        return 'هذه المهام تم اعتمادها من قبل المشرف 1 وتحتاج إلى الموافقة الإشرافية الثانية';
      case 3:
        return 'هذه المهام تم اعتمادها من قبل المشرف 2 وتحتاج إلى الموافقة الإشرافية النهائية';
    }
  };

  const getLevelDescriptionEN = () => {
    switch (level) {
      case 1:
        return 'These tasks have been approved by the engineer and need first supervisor approval';
      case 2:
        return 'These tasks have been approved by Supervisor 1 and need second supervisor approval';
      case 3:
        return 'These tasks have been approved by Supervisor 2 and need final supervisor approval';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SupervisorAccount color="secondary" />
          <Box>
            <Typography variant="h6" gutterBottom>
              {getLevelTitle()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              المرحلة: {phaseName}
            </Typography>
          </Box>
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
            {getLevelDescription()}
            <br />
            {getLevelDescriptionEN()}
          </Typography>
        </Alert>

        {items.length === 0 ? (
          <Alert severity="warning" icon={<Warning />}>
            لا توجد مهام متاحة للموافقة في هذا المستوى
            <br />
            No tasks available for approval at this level
          </Alert>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2">
                المهام الجاهزة للموافقة ({items.length}):
              </Typography>
              <Box>
                <Button size="small" onClick={handleSelectAll} disabled={loading}>
                  تحديد الكل / Select All
                </Button>
                <Button size="small" onClick={handleDeselectAll} disabled={loading}>
                  إلغاء التحديد / Deselect All
                </Button>
              </Box>
            </Box>

            <Divider />

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {items.map((item, index) => (
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
                        <Box display="flex" gap={0.5} mt={0.5}>
                          {item.section_name && (
                            <Chip label={item.section_name} size="small" />
                          )}
                          {item.engineer_approved_by && (
                            <Chip label="E" size="small" color="info" />
                          )}
                          {item.supervisor_1_approved_by && level >= 2 && (
                            <Chip label="S1" size="small" color="secondary" />
                          )}
                          {item.supervisor_2_approved_by && level >= 3 && (
                            <Chip label="S2" size="small" color="secondary" />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < items.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>

            <Box mt={2} p={2} bgcolor="secondary.50" borderRadius={1}>
              <Typography variant="body2" fontWeight="medium">
                الملخص / Summary:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                تم تحديد {selectedItems.length} من أصل {items.length} مهمة للموافقة في المستوى {level}
                <br />
                {selectedItems.length} of {items.length} tasks selected for Level {level} approval
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          إلغاء / Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedItems.length === 0}
          color="secondary"
        >
          {loading ? 'جاري الموافقة... / Approving...' : `موافقة L${level} (${selectedItems.length}) / Approve`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupervisorApprovalDialog;
