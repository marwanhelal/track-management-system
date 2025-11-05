import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle,
  HowToReg,
  SupervisorAccount,
  Person,
  Add,
} from '@mui/icons-material';
import {
  ChecklistPhaseName,
  ChecklistStatistics,
  ChecklistSection,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ChecklistItemRow from './ChecklistItemRow';
import EngineerApprovalDialog from './EngineerApprovalDialog';
import SupervisorApprovalDialog from './SupervisorApprovalDialog';
import AddChecklistItemDialog from './AddChecklistItemDialog';

interface ProjectChecklistViewProps {
  projectId: number;
  phaseName: ChecklistPhaseName;
  statistics: ChecklistStatistics;
  sections: ChecklistSection[];
  onUpdate: () => void;
}

const ProjectChecklistView = ({
  projectId,
  phaseName,
  statistics,
  sections,
  onUpdate,
}: ProjectChecklistViewProps) => {
  const { user } = useAuth();
  const [engineerDialogOpen, setEngineerDialogOpen] = useState(false);
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  const isEngineer = user?.role === 'engineer';
  const isSupervisor = user?.role === 'supervisor';

  const handleEngineerApproval = () => {
    setEngineerDialogOpen(true);
  };

  const handleSupervisorApproval = (level: 1 | 2 | 3) => {
    setSelectedLevel(level);
    setSupervisorDialogOpen(true);
  };

  // Get all items from all sections
  const allItems = (sections || []).flatMap((section) => section.items || []);

  // Get completed items for engineer approval
  // Show items that are completed but NOT yet approved by THIS engineer
  const completedItems = allItems.filter((item) => {
    if (!item.is_completed) return false;

    // If no engineer approvals yet, this engineer can approve
    if (!item.engineer_approvals || item.engineer_approvals.length === 0) return true;

    // Check if THIS engineer has already approved
    // Handle both string and number ID comparisons
    const currentUserId = user?.id;
    const currentEngineerApproved = item.engineer_approvals.some(
      (approval) => approval.engineer_id == currentUserId // Use == for loose equality
    );

    // Show item only if current engineer hasn't approved it yet
    return !currentEngineerApproved;
  });

  // Get items ready for supervisor approval at each level
  // Items need at least one engineer approval to proceed to supervisor level
  const itemsReadyForSupervisor1 = allItems.filter(
    (item) => item.engineer_approvals && item.engineer_approvals.length > 0 && !item.supervisor_1_approved_by
  );
  const itemsReadyForSupervisor2 = allItems.filter(
    (item) => item.supervisor_1_approved_by && !item.supervisor_2_approved_by
  );
  const itemsReadyForSupervisor3 = allItems.filter(
    (item) => item.supervisor_2_approved_by && !item.supervisor_3_approved_by
  );

  return (
    <Paper elevation={3} sx={{ mb: 4, overflow: 'hidden', borderRadius: 2 }}>
      {/* Phase Header */}
      <Box
        sx={{
          p: 3,
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Phase: {phaseName}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                icon={<CheckCircle />}
                label={`${statistics.total_tasks} Total Tasks`}
                size="medium"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
              <Chip
                label={`${statistics.completion_percentage}% Complete`}
                size="medium"
                sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 'bold' }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              {/* Supervisor Add New Item Button */}
              {isSupervisor && (
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  sx={{
                    bgcolor: 'white',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.dark' }
                  }}
                >
                  Add New Item
                </Button>
              )}


              {/* Supervisor Approval Buttons */}
              {isSupervisor && (
                <>
                  {itemsReadyForSupervisor1.length > 0 && (
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<SupervisorAccount />}
                      onClick={() => handleSupervisorApproval(1)}
                      sx={{ bgcolor: 'secondary.light', fontWeight: 'bold' }}
                    >
                      Approve L1 ({itemsReadyForSupervisor1.length})
                    </Button>
                  )}
                  {itemsReadyForSupervisor2.length > 0 && (
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<SupervisorAccount />}
                      onClick={() => handleSupervisorApproval(2)}
                      sx={{ bgcolor: 'secondary.main', fontWeight: 'bold' }}
                    >
                      Approve L2 ({itemsReadyForSupervisor2.length})
                    </Button>
                  )}
                  {itemsReadyForSupervisor3.length > 0 && (
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<SupervisorAccount />}
                      onClick={() => handleSupervisorApproval(3)}
                      sx={{ bgcolor: 'secondary.dark', fontWeight: 'bold' }}
                    >
                      Approve L3 ({itemsReadyForSupervisor3.length})
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={statistics.completion_percentage}
          sx={{
            mt: 2,
            height: 10,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'success.light',
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Statistics Summary */}
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {statistics.completed_tasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Completed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {statistics.engineer_approved_tasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Engineer Approved
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {statistics.supervisor_1_approved_tasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Supervisor L1
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {statistics.supervisor_2_approved_tasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Supervisor L2
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {statistics.supervisor_3_approved_tasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Supervisor L3
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Checklist Items Table */}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell width="5%" align="center">
                <Typography variant="caption" fontWeight="bold">
                  #
                </Typography>
              </TableCell>
              <TableCell width="30%">
                <Typography variant="caption" fontWeight="bold">
                  Task Name
                </Typography>
              </TableCell>
              <TableCell width="53%">
                <Typography variant="caption" fontWeight="bold">
                  Approval Workflow
                </Typography>
              </TableCell>
              <TableCell width="12%" align="center">
                <Typography variant="caption" fontWeight="bold">
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allItems.map((item, index) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                index={index + 1}
                onUpdate={onUpdate}
              />
            ))}
            {allItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks found for this phase
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Approval Dialogs */}
      {isEngineer && (
        <EngineerApprovalDialog
          open={engineerDialogOpen}
          onClose={() => setEngineerDialogOpen(false)}
          projectId={projectId}
          phaseName={phaseName}
          completedItems={completedItems}
          onSuccess={onUpdate}
        />
      )}

      {isSupervisor && (
        <SupervisorApprovalDialog
          open={supervisorDialogOpen}
          onClose={() => setSupervisorDialogOpen(false)}
          projectId={projectId}
          phaseName={phaseName}
          level={selectedLevel}
          items={
            selectedLevel === 1
              ? itemsReadyForSupervisor1
              : selectedLevel === 2
              ? itemsReadyForSupervisor2
              : itemsReadyForSupervisor3
          }
          onSuccess={onUpdate}
        />
      )}

      {/* Add New Item Dialog */}
      {isSupervisor && (
        <AddChecklistItemDialog
          open={addItemDialogOpen}
          onClose={() => setAddItemDialogOpen(false)}
          projectId={projectId}
          phaseName={phaseName}
          existingItemsCount={allItems.length}
          onSuccess={onUpdate}
        />
      )}
    </Paper>
  );
};

export default ProjectChecklistView;
