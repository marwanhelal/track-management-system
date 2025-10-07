import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Reorder as ReorderIcon,
  DragIndicator as DragIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ProjectPhase } from '../../types';

export interface ReorderPhasesDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (reorderedPhases: { phaseId: number; order: number }[]) => Promise<void>;
  phases: ProjectPhase[];
  loading?: boolean;
}

interface PhaseWithOrder extends ProjectPhase {
  tempOrder: number;
}

const ReorderPhasesDialog: React.FC<ReorderPhasesDialogProps> = ({
  open,
  onClose,
  onSave,
  phases,
  loading = false
}) => {
  const [orderedPhases, setOrderedPhases] = useState<PhaseWithOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize ordered phases
  useEffect(() => {
    if (open && phases.length > 0) {
      const phasesWithTempOrder: PhaseWithOrder[] = phases
        .map((phase, index) => ({
          ...phase,
          tempOrder: index + 1
        }))
        .sort((a, b) => a.phase_order - b.phase_order);

      setOrderedPhases(phasesWithTempOrder);
      setHasChanges(false);
    }
  }, [open, phases]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    const newPhases = Array.from(orderedPhases);
    const [reorderedPhase] = newPhases.splice(sourceIndex, 1);
    newPhases.splice(destinationIndex, 0, reorderedPhase);

    // Update temporary order numbers
    const updatedPhases = newPhases.map((phase, index) => ({
      ...phase,
      tempOrder: index + 1
    }));

    setOrderedPhases(updatedPhases);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newPhases = Array.from(orderedPhases);
    [newPhases[index - 1], newPhases[index]] = [newPhases[index], newPhases[index - 1]];

    const updatedPhases = newPhases.map((phase, idx) => ({
      ...phase,
      tempOrder: idx + 1
    }));

    setOrderedPhases(updatedPhases);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === orderedPhases.length - 1) return;

    const newPhases = Array.from(orderedPhases);
    [newPhases[index], newPhases[index + 1]] = [newPhases[index + 1], newPhases[index]];

    const updatedPhases = newPhases.map((phase, idx) => ({
      ...phase,
      tempOrder: idx + 1
    }));

    setOrderedPhases(updatedPhases);
    setHasChanges(true);
  };

  const handleReset = () => {
    const resetPhases: PhaseWithOrder[] = phases
      .map((phase, index) => ({
        ...phase,
        tempOrder: index + 1
      }))
      .sort((a, b) => a.phase_order - b.phase_order);

    setOrderedPhases(resetPhases);
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const reorderData = orderedPhases.map((phase, index) => ({
        phaseId: phase.id,
        order: index + 1
      }));

      await onSave(reorderData);
      onClose();
    } catch (error) {
      console.error('Failed to reorder phases:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmDiscard) return;
    }
    setHasChanges(false);
    onClose();
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'in_progress':
        return 'primary';
      case 'submitted':
        return 'info';
      case 'approved':
        return 'success';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '🔄';
      case 'submitted':
        return '📋';
      case 'approved':
        return '✅';
      case 'completed':
        return '🎉';
      default:
        return '⚪';
    }
  };

  const calculateTotalDuration = () => {
    return orderedPhases.reduce((total, phase) => total + phase.planned_weeks, 0);
  };

  const calculateTotalHours = () => {
    return orderedPhases.reduce((total, phase) => total + (phase.predicted_hours || 0), 0);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <ReorderIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Reorder Project Phases
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag and drop phases to change their order • {orderedPhases.length} phases
            </Typography>
          </Box>
          <Tooltip title="Reset to original order">
            <IconButton onClick={handleReset} disabled={saving || !hasChanges}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {saving && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>

      <DialogContent>
        {/* Summary Cards */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            Project Timeline Summary
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Card variant="outlined" sx={{ flex: 1, bgcolor: 'primary.50' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {orderedPhases.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Phases
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1, bgcolor: 'success.50' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {calculateTotalDuration()}w
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Duration
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1, bgcolor: 'info.50' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  {calculateTotalHours()}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Drag and Drop Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>How to reorder:</strong> Drag phases by the drag handle (⋮⋮) or use the arrow buttons to move phases up/down.
            The new order will determine the project timeline sequence.
          </Typography>
        </Alert>

        {/* Phase List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="phases">
            {(provided, snapshot) => (
              <Box
                {...provided.droppableProps}
                ref={provided.innerRef}
                sx={{
                  bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                  borderRadius: 1,
                  p: snapshot.isDraggingOver ? 1 : 0,
                  transition: 'all 0.2s'
                }}
              >
                {orderedPhases.map((phase, index) => (
                  <Draggable
                    key={phase.id}
                    draggableId={phase.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        variant="outlined"
                        sx={{
                          mb: 2,
                          cursor: 'grab',
                          transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                          bgcolor: snapshot.isDragging ? 'primary.50' : 'background.paper',
                          border: snapshot.isDragging ? 2 : 1,
                          borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                          boxShadow: snapshot.isDragging ? 4 : 1,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 2,
                            borderColor: 'primary.light'
                          }
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {/* Drag Handle */}
                            <Box
                              {...provided.dragHandleProps}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: 'text.secondary',
                                cursor: 'grab',
                                '&:active': {
                                  cursor: 'grabbing'
                                }
                              }}
                            >
                              <DragIcon />
                            </Box>

                            {/* Phase Order */}
                            <Box
                              sx={{
                                minWidth: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                              }}
                            >
                              {phase.tempOrder}
                            </Box>

                            {/* Phase Info */}
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="h6" component="div">
                                  {phase.phase_name}
                                </Typography>
                                <Chip
                                  label={phase.status}
                                  size="small"
                                  color={getPhaseStatusColor(phase.status) as any}
                                  icon={<span>{getPhaseStatusIcon(phase.status)}</span>}
                                />
                                {phase.is_custom && (
                                  <Chip label="Custom" size="small" variant="outlined" />
                                )}
                              </Box>

                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  {phase.planned_weeks} weeks
                                </Typography>
                                {phase.predicted_hours && (
                                  <Typography variant="body2" color="text.secondary">
                                    {phase.predicted_hours}h estimated
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Move Buttons */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Tooltip title="Move up">
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveUp(index)}
                                  disabled={index === 0 || saving}
                                  sx={{ p: 0.5 }}
                                >
                                  <ArrowUpIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Move down">
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveDown(index)}
                                  disabled={index === orderedPhases.length - 1 || saving}
                                  sx={{ p: 0.5 }}
                                >
                                  <ArrowDownIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>

        {/* Changes Summary */}
        {hasChanges && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Changes Detected
            </Typography>
            <Typography variant="body2">
              The phase order has been modified. Click "Save Changes" to apply the new order to your project timeline.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          variant="outlined"
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !hasChanges}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ minWidth: 140 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReorderPhasesDialog;