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
  const completedItems = allItems.filter((item) => item.is_completed && !item.engineer_approved_by);

  // Get items ready for supervisor approval at each level
  const itemsReadyForSupervisor1 = allItems.filter(
    (item) => item.engineer_approved_by && !item.supervisor_1_approved_by
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
              {/* Engineer Approval Button */}
              {isEngineer && completedItems.length > 0 && (
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<HowToReg />}
                  onClick={handleEngineerApproval}
                  sx={{
                    bgcolor: 'success.light',
                    color: 'white',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: 'success.main' }
                  }}
                >
                  Engineer Approve ({completedItems.length})
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
              <TableCell width="35%">
                <Typography variant="caption" fontWeight="bold">
                  Task Name
                </Typography>
              </TableCell>
              <TableCell width="10%" align="center">
                <Typography variant="caption" fontWeight="bold">
                  Status
                </Typography>
              </TableCell>
              <TableCell width="30%" align="center">
                <Typography variant="caption" fontWeight="bold">
                  Approval Workflow
                </Typography>
              </TableCell>
              <TableCell width="20%" align="center">
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
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
    </Paper>
  );
};

export default ProjectChecklistView;
