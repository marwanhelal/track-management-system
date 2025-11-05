import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Button,
  Divider,
  Grid,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  PendingActions,
  HowToReg,
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [engineerDialogOpen, setEngineerDialogOpen] = useState(false);
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  const isEngineer = user?.role === 'engineer';
  const isSupervisor = user?.role === 'supervisor';

  const handleSectionToggle = (sectionName: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const allSections = sections.map((s) => s.section_name || 'general');
    setExpandedSections(new Set(allSections));
  };

  const handleCollapseAll = () => {
    setExpandedSections(new Set());
  };

  const handleEngineerApproval = () => {
    setEngineerDialogOpen(true);
  };

  const handleSupervisorApproval = (level: 1 | 2 | 3) => {
    setSelectedLevel(level);
    setSupervisorDialogOpen(true);
  };

  // Get all items from all sections
  const allItems = sections.flatMap((section) => section.items);

  // Get completed items for engineer approval
  const completedItems = allItems.filter((item) => item.is_completed);

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
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      {/* Phase Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight="bold">
              {phaseName}
            </Typography>
            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
              <Chip
                label={`${statistics.total_tasks} مهمة / tasks`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={`${statistics.completion_percentage}% مكتمل / completed`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              {/* Engineer Approval Button */}
              {isEngineer && completedItems.length > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<HowToReg />}
                  onClick={handleEngineerApproval}
                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                >
                  موافقة ({completedItems.length})
                </Button>
              )}

              {/* Supervisor Approval Buttons */}
              {isSupervisor && (
                <>
                  {itemsReadyForSupervisor1.length > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSupervisorApproval(1)}
                      sx={{ bgcolor: 'secondary.main' }}
                    >
                      موافقة L1 ({itemsReadyForSupervisor1.length})
                    </Button>
                  )}
                  {itemsReadyForSupervisor2.length > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSupervisorApproval(2)}
                      sx={{ bgcolor: 'secondary.main' }}
                    >
                      موافقة L2 ({itemsReadyForSupervisor2.length})
                    </Button>
                  )}
                  {itemsReadyForSupervisor3.length > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSupervisorApproval(3)}
                      sx={{ bgcolor: 'secondary.main' }}
                    >
                      موافقة L3 ({itemsReadyForSupervisor3.length})
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
            height: 8,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'white',
            },
          }}
        />
      </Box>

      {/* Statistics */}
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <CheckCircle fontSize="small" color="success" />
              <Typography variant="body2" color="text.secondary">
                مكتمل:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {statistics.completed_tasks} / {statistics.total_tasks}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <PendingActions fontSize="small" color="info" />
              <Typography variant="body2" color="text.secondary">
                مهندس:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {statistics.engineer_approved_tasks}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography variant="body2" color="text.secondary">
              مشرف L1:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.supervisor_1_approved_tasks}
            </Typography>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography variant="body2" color="text.secondary">
              مشرف L2:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.supervisor_2_approved_tasks}
            </Typography>
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography variant="body2" color="text.secondary">
              مشرف L3:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.supervisor_3_approved_tasks}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Expand/Collapse Controls */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', bgcolor: 'grey.50' }}>
        <Button size="small" onClick={handleExpandAll}>
          توسيع الكل / Expand All
        </Button>
        <Button size="small" onClick={handleCollapseAll}>
          طي الكل / Collapse All
        </Button>
      </Box>

      {/* Checklist Items by Section */}
      <Box>
        {sections.map((section, index) => {
          const sectionName = section.section_name || 'عام / General';
          const isExpanded = expandedSections.has(sectionName);

          return (
            <Accordion
              key={index}
              expanded={isExpanded}
              onChange={() => handleSectionToggle(sectionName)}
              disableGutters
              elevation={0}
              sx={{
                '&:before': { display: 'none' },
                borderTop: index > 0 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  bgcolor: 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <Typography fontWeight="medium">{sectionName}</Typography>
                  <Chip
                    label={`${section.items.length} ${section.items.length === 1 ? 'مهمة / task' : 'مهام / tasks'}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {section.items.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

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
