import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Layers as LayersIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { ProjectWithDetails } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ChecklistSubsection from '../components/checklist/ChecklistSubsection';

interface ProjectChecklistPageState {
  project: ProjectWithDetails | null;
  checklists: any[]; // Will be populated with checklist data
  activeTab: number;
  loading: boolean;
  error: string | null;
  // Dialogs
  editClientNotesDialog: { open: boolean; instanceId: number | null; currentNotes: string };
  editProjectDialog: { open: boolean };
  addItemDialog: { open: boolean; subsectionId: number | null };
  addSubsectionDialog: { open: boolean; instanceId: number | null };
}

const ProjectChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isSupervisor } = useAuth();

  const [state, setState] = useState<ProjectChecklistPageState>({
    project: null,
    checklists: [],
    activeTab: 0,
    loading: true,
    error: null,
    editClientNotesDialog: { open: false, instanceId: null, currentNotes: '' },
    editProjectDialog: { open: false },
    addItemDialog: { open: false, subsectionId: null },
    addSubsectionDialog: { open: false, instanceId: null }
  });

  const fetchProjectAndChecklists = useCallback(async () => {
    if (!projectId) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch project details
      const projectResponse = await apiService.getProject(parseInt(projectId));

      if (!projectResponse.success || !projectResponse.data?.project) {
        throw new Error('Failed to load project');
      }

      // Fetch project checklists (basic info)
      const checklistsResponse = await apiService.getProjectChecklists(parseInt(projectId));

      if (!checklistsResponse.success) {
        throw new Error('Failed to load checklists');
      }

      const basicChecklists = checklistsResponse.data?.checklists || [];

      // Fetch full checklist data (with subsections and items) for each phase
      const fullChecklists = await Promise.all(
        basicChecklists.map(async (checklist: any) => {
          try {
            const fullChecklistResponse = await apiService.getPhaseChecklist(checklist.phase_id);
            if (fullChecklistResponse.success && fullChecklistResponse.data) {
              return {
                ...checklist,
                ...fullChecklistResponse.data,
                subsections: fullChecklistResponse.data.subsections || []
              };
            }
            return checklist;
          } catch (error) {
            console.error(`Error fetching checklist for phase ${checklist.phase_id}:`, error);
            return checklist;
          }
        })
      );

      setState(prev => ({
        ...prev,
        project: projectResponse.data!.project,
        checklists: fullChecklists,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false
      }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectAndChecklists();
  }, [fetchProjectAndChecklists]);

  const handleBack = () => {
    navigate('/checklist');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, activeTab: newValue }));
  };

  // Dialog handlers
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [clientNotesInput, setClientNotesInput] = useState('');
  const [projectDetailsInput, setProjectDetailsInput] = useState({
    land_area: '',
    building_type: '',
    floors_count: '',
    location: '',
    client_name: ''
  });
  const [customItemInput, setCustomItemInput] = useState({ name_ar: '', name_en: '', is_required: false });
  const [customSubsectionInput, setCustomSubsectionInput] = useState({ name_ar: '', name_en: '' });
  const [dialogLoading, setDialogLoading] = useState(false);

  const handleEditClientNotes = (instanceId: number, currentNotes: string) => {
    setClientNotesInput(currentNotes || '');
    setState(prev => ({
      ...prev,
      editClientNotesDialog: { open: true, instanceId, currentNotes }
    }));
  };

  const handleSaveClientNotes = async () => {
    if (!state.editClientNotesDialog.instanceId) return;

    try {
      setDialogLoading(true);
      const response = await apiService.updateClientNotes(
        state.editClientNotesDialog.instanceId,
        clientNotesInput
      );

      if (response.success) {
        setSnackbar({ open: true, message: 'Client notes updated successfully', severity: 'success' });
        setState(prev => ({ ...prev, editClientNotesDialog: { open: false, instanceId: null, currentNotes: '' } }));
        await fetchProjectAndChecklists();
      } else {
        throw new Error(response.error || 'Failed to update client notes');
      }
    } catch (error) {
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to update client notes', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleEditProjectDetails = () => {
    if (state.project) {
      setProjectDetailsInput({
        land_area: state.project.land_area || '',
        building_type: state.project.building_type || '',
        floors_count: state.project.floors_count?.toString() || '',
        location: state.project.location || '',
        client_name: state.project.client_name || ''
      });
      setState(prev => ({ ...prev, editProjectDialog: { open: true } }));
    }
  };

  const handleSaveProjectDetails = async () => {
    if (!projectId) return;

    try {
      setDialogLoading(true);
      const response = await apiService.updateProjectDetails(parseInt(projectId), {
        land_area: projectDetailsInput.land_area,
        building_type: projectDetailsInput.building_type,
        floors_count: projectDetailsInput.floors_count ? parseInt(projectDetailsInput.floors_count) : undefined,
        location: projectDetailsInput.location,
        client_name: projectDetailsInput.client_name
      });

      if (response.success) {
        setSnackbar({ open: true, message: 'Project details updated successfully', severity: 'success' });
        setState(prev => ({ ...prev, editProjectDialog: { open: false } }));
        await fetchProjectAndChecklists();
      } else {
        throw new Error(response.error || 'Failed to update project details');
      }
    } catch (error) {
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to update project details', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleAddCustomItem = (subsectionId: number) => {
    setCustomItemInput({ name_ar: '', name_en: '', is_required: false });
    setState(prev => ({ ...prev, addItemDialog: { open: true, subsectionId } }));
  };

  const handleSaveCustomItem = async () => {
    if (!state.addItemDialog.subsectionId || !customItemInput.name_ar.trim()) {
      setSnackbar({ open: true, message: 'Arabic name is required', severity: 'error' });
      return;
    }

    try {
      setDialogLoading(true);
      const response = await apiService.addCustomItem({
        instance_subsection_id: state.addItemDialog.subsectionId,
        name_ar: customItemInput.name_ar,
        name_en: customItemInput.name_en || undefined,
        is_required: customItemInput.is_required
      });

      if (response.success) {
        setSnackbar({ open: true, message: 'Custom item added successfully', severity: 'success' });
        setState(prev => ({ ...prev, addItemDialog: { open: false, subsectionId: null } }));
        await fetchProjectAndChecklists();
      } else {
        throw new Error(response.error || 'Failed to add custom item');
      }
    } catch (error) {
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to add custom item', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleAddCustomSubsection = (instanceId: number) => {
    setCustomSubsectionInput({ name_ar: '', name_en: '' });
    setState(prev => ({ ...prev, addSubsectionDialog: { open: true, instanceId } }));
  };

  const handleSaveCustomSubsection = async () => {
    if (!state.addSubsectionDialog.instanceId || !customSubsectionInput.name_ar.trim()) {
      setSnackbar({ open: true, message: 'Arabic name is required', severity: 'error' });
      return;
    }

    try {
      setDialogLoading(true);
      const response = await apiService.addCustomSubsection({
        instance_id: state.addSubsectionDialog.instanceId,
        name_ar: customSubsectionInput.name_ar,
        name_en: customSubsectionInput.name_en || undefined
      });

      if (response.success) {
        setSnackbar({ open: true, message: 'Custom subsection added successfully', severity: 'success' });
        setState(prev => ({ ...prev, addSubsectionDialog: { open: false, instanceId: null } }));
        await fetchProjectAndChecklists();
      } else {
        throw new Error(response.error || 'Failed to add custom subsection');
      }
    } catch (error) {
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to add custom subsection', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  if (state.loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading checklist...
        </Typography>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={handleBack}>
          {state.error}
        </Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!state.project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Project not found</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {state.project.name} - Checklist
        </Typography>
        {isSupervisor && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            size="small"
            onClick={handleEditProjectDetails}
          >
            Edit Project Details
          </Button>
        )}
      </Box>

      {/* Project Details Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Details (بيانات المشروع)
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {state.project.client_name && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Client Name
                    </Typography>
                    <Typography variant="body2">
                      {state.project.client_name}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.location && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body2">
                      {state.project.location}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.building_type && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Building Type
                    </Typography>
                    <Typography variant="body2">
                      {state.project.building_type}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.floors_count && (
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Floors
                    </Typography>
                    <Typography variant="body2">
                      {state.project.floors_count} floors
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {state.project.land_area && (
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Land Area
                  </Typography>
                  <Typography variant="body2">
                    {state.project.land_area}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Phase Tabs */}
      {state.checklists.length > 0 ? (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={state.activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {state.checklists.map((checklist, index) => (
              <Tab key={checklist.phase_id} label={checklist.phase_name || `Phase ${index + 1}`} />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {state.checklists[state.activeTab] && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {state.checklists[state.activeTab].phase_name}
                </Typography>

                {/* Client Notes */}
                {state.checklists[state.activeTab].client_notes && (
                  <Alert severity="info" icon={<NoteIcon />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Client Notes (ملحوظات العميل)
                    </Typography>
                    <Typography variant="body2">
                      {state.checklists[state.activeTab].client_notes}
                    </Typography>
                  </Alert>
                )}

                {isSupervisor && (
                  <Button
                    variant="text"
                    startIcon={<EditIcon />}
                    size="small"
                    sx={{ mb: 2 }}
                    onClick={() => handleEditClientNotes(state.checklists[state.activeTab].id, state.checklists[state.activeTab].client_notes || '')}
                  >
                    Edit Client Notes
                  </Button>
                )}

                {isSupervisor && (
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2, ml: 1 }}
                    onClick={() => handleAddCustomSubsection(state.checklists[state.activeTab].id)}
                  >
                    Add Custom Subsection
                  </Button>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Checklist Subsections and Items */}
                {state.checklists[state.activeTab].subsections && state.checklists[state.activeTab].subsections.length > 0 ? (
                  <Box>
                    {state.checklists[state.activeTab].subsections.map((subsection: any) => (
                      <ChecklistSubsection
                        key={subsection.id}
                        subsection={subsection}
                        onUpdate={fetchProjectAndChecklists}
                        onAddCustomItem={isSupervisor ? handleAddCustomItem : undefined}
                      />
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">
                    No checklist items found for this phase
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No checklists found for this project
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Checklists are automatically created when you create a new project with phases.
          </Typography>
        </Paper>
      )}

      {/* Edit Client Notes Dialog */}
      <Dialog
        open={state.editClientNotesDialog.open}
        onClose={() => setState(prev => ({ ...prev, editClientNotesDialog: { open: false, instanceId: null, currentNotes: '' } }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Client Notes (ملحوظات العميل)</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Client Notes"
            value={clientNotesInput}
            onChange={(e) => setClientNotesInput(e.target.value)}
            placeholder="Enter client-specific requirements and notes for this phase..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, editClientNotesDialog: { open: false, instanceId: null, currentNotes: '' } }))}>
            Cancel
          </Button>
          <Button onClick={handleSaveClientNotes} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Details Dialog */}
      <Dialog
        open={state.editProjectDialog.open}
        onClose={() => setState(prev => ({ ...prev, editProjectDialog: { open: false } }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Project Details (بيانات المشروع)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client Name (اسم العميل)"
                value={projectDetailsInput.client_name}
                onChange={(e) => setProjectDetailsInput(prev => ({ ...prev, client_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location (الموقع)"
                value={projectDetailsInput.location}
                onChange={(e) => setProjectDetailsInput(prev => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Building Type (نوع البناء)"
                value={projectDetailsInput.building_type}
                onChange={(e) => setProjectDetailsInput(prev => ({ ...prev, building_type: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Land Area (مساحة الأرض)"
                value={projectDetailsInput.land_area}
                onChange={(e) => setProjectDetailsInput(prev => ({ ...prev, land_area: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Floors Count (عدد الأدوار)"
                value={projectDetailsInput.floors_count}
                onChange={(e) => setProjectDetailsInput(prev => ({ ...prev, floors_count: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, editProjectDialog: { open: false } }))}>
            Cancel
          </Button>
          <Button onClick={handleSaveProjectDetails} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Custom Item Dialog */}
      <Dialog
        open={state.addItemDialog.open}
        onClose={() => setState(prev => ({ ...prev, addItemDialog: { open: false, subsectionId: null } }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Custom Item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Arabic Name *"
            value={customItemInput.name_ar}
            onChange={(e) => setCustomItemInput(prev => ({ ...prev, name_ar: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="English Name (Optional)"
            value={customItemInput.name_en}
            onChange={(e) => setCustomItemInput(prev => ({ ...prev, name_en: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={customItemInput.is_required}
              onChange={(e) => setCustomItemInput(prev => ({ ...prev, is_required: e.target.checked }))}
              style={{ marginRight: 8 }}
            />
            <Typography variant="body2">Mark as Required</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, addItemDialog: { open: false, subsectionId: null } }))}>
            Cancel
          </Button>
          <Button onClick={handleSaveCustomItem} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Custom Subsection Dialog */}
      <Dialog
        open={state.addSubsectionDialog.open}
        onClose={() => setState(prev => ({ ...prev, addSubsectionDialog: { open: false, instanceId: null } }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Custom Subsection</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Arabic Name *"
            value={customSubsectionInput.name_ar}
            onChange={(e) => setCustomSubsectionInput(prev => ({ ...prev, name_ar: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="English Name (Optional)"
            value={customSubsectionInput.name_en}
            onChange={(e) => setCustomSubsectionInput(prev => ({ ...prev, name_en: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, addSubsectionDialog: { open: false, instanceId: null } }))}>
            Cancel
          </Button>
          <Button onClick={handleSaveCustomSubsection} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Adding...' : 'Add Subsection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default ProjectChecklistPage;
