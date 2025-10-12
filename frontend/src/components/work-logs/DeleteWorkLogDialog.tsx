import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { DeleteForever as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';

interface DeleteWorkLogDialogProps {
  open: boolean;
  onClose: () => void;
  workLog: any;
  onDelete: (id: number, delete_note?: string) => Promise<void>;
}

const DeleteWorkLogDialog: React.FC<DeleteWorkLogDialogProps> = ({ open, onClose, workLog, onDelete }) => {
  const [deleteNote, setDeleteNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await onDelete(workLog.id, deleteNote || undefined);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete work log');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeleteNote('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DeleteIcon color="error" />
          <Typography variant="h6">Delete Work Log</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2" fontWeight="bold">
              Warning: This action cannot be undone!
            </Typography>
            <Typography variant="body2" mt={0.5}>
              This work log will be permanently deleted from the system.
            </Typography>
          </Alert>

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Work Log Details:
            </Typography>
            <Box pl={2}>
              <Typography variant="body2">
                <strong>Engineer:</strong> {workLog?.engineer_name}
              </Typography>
              <Typography variant="body2">
                <strong>Phase:</strong> {workLog?.phase_name}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {workLog?.date ? new Date(workLog.date).toLocaleDateString() : 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Hours:</strong> {workLog?.hours}h
              </Typography>
              {workLog?.description && (
                <Typography variant="body2">
                  <strong>Description:</strong> {workLog.description}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider />

          <TextField
            label="Reason for Deletion (Optional)"
            value={deleteNote}
            onChange={(e) => setDeleteNote(e.target.value)}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            placeholder="Explain why this work log is being deleted..."
            helperText="This reason will be recorded in the audit log"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
        >
          {loading ? 'Deleting...' : 'Delete Permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteWorkLogDialog;
