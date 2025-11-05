import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Add, CheckCircle } from '@mui/icons-material';
import { ChecklistPhaseName } from '../../types';
import apiService from '../../services/api';

interface AddPhaseDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  existingPhases: ChecklistPhaseName[];
  onSuccess: () => void;
}

// Phase information with task counts
const PHASE_INFO: Record<ChecklistPhaseName, { tasks: number; description: string }> = {
  VIS: { tasks: 35, description: 'Vision & Initial Study Phase' },
  DD: { tasks: 7, description: 'Design Development Phase' },
  License: { tasks: 12, description: 'License Documentation Phase' },
  Working: { tasks: 10, description: 'Working Drawings Phase' },
  BOQ: { tasks: 0, description: 'Bill of Quantities Phase (Tasks added manually)' },
};

const AddPhaseDialog = ({
  open,
  onClose,
  projectId,
  existingPhases,
  onSuccess,
}: AddPhaseDialogProps) => {
  const [selectedPhase, setSelectedPhase] = useState<ChecklistPhaseName | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedPhase) {
      setError('Please select a phase to add');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.addPhaseToProject(projectId, selectedPhase);

      setSuccess(
        `✓ Phase "${selectedPhase}" added successfully with ${response.data?.tasks_added || 0} tasks!`
      );

      // Reset form after short delay
      setTimeout(() => {
        setSelectedPhase('');
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to add phase');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedPhase('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  // Get available phases (phases not yet added to the project)
  const availablePhases = (['VIS', 'DD', 'License', 'Working', 'BOQ'] as ChecklistPhaseName[]).filter(
    (phase) => !existingPhases.includes(phase)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Add color="primary" />
          <Box>
            <Typography variant="h6" gutterBottom>
              Add Phase to Project
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a complete phase with all its predefined tasks
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

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
            {success}
          </Alert>
        )}

        {availablePhases.length === 0 ? (
          <Alert severity="info">
            All phases have already been added to this project.
          </Alert>
        ) : (
          <>
            {/* Phase Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Phase to Add</InputLabel>
              <Select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as ChecklistPhaseName)}
                label="Select Phase to Add"
                disabled={loading}
              >
                {availablePhases.map((phase) => (
                  <MenuItem key={phase} value={phase}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                      <Typography>{phase}</Typography>
                      <Chip
                        label={`${PHASE_INFO[phase].tasks} tasks`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Selected Phase Info */}
            {selectedPhase && (
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {selectedPhase} Phase Details:
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {PHASE_INFO[selectedPhase].description}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">
                  <strong>{PHASE_INFO[selectedPhase].tasks} tasks</strong> will be added to this project
                  {selectedPhase === 'BOQ' && ' (Tasks for BOQ phase can be added manually later)'}
                </Typography>
              </Box>
            )}

            {/* Existing Phases */}
            {existingPhases.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Existing Phases in this Project:
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {existingPhases.map((phase) => (
                    <Chip
                      key={phase}
                      label={phase}
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<CheckCircle />}
                    />
                  ))}
                </Box>
              </Box>
            )}
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
          disabled={loading || !selectedPhase || availablePhases.length === 0}
          color="primary"
          startIcon={<Add />}
        >
          {loading ? 'Adding Phase...' : `Add Phase`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPhaseDialog;
