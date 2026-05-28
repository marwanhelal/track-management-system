import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AccessTime, Save } from '@mui/icons-material';
import dayjs from 'dayjs';
import { ProjectPhase, WorkLogCreateInput } from '../../types';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectOption {
  id: number;
  name: string;
  status: string;
}

interface QuickTimeEntryProps {
  onSuccess?: () => void;
  filteredProjects?: ProjectOption[];
}

const QuickTimeEntry = ({ onSuccess, filteredProjects }: QuickTimeEntryProps) => {
  const { user } = useAuth();
  const isEngineer = user?.role === 'engineer';

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allAssignedPhases, setAllAssignedPhases] = useState<any[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [selectedPhase, setSelectedPhase] = useState<number | ''>('');
  const [date, setDate] = useState(dayjs());
  const [hours, setHours] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    if (isEngineer) {
      loadAssignedPhases();
    } else if (filteredProjects && filteredProjects.length > 0) {
      setProjects(filteredProjects);
    } else {
      loadProjects();
    }
  }, [isEngineer, filteredProjects]);

  // Filter phases when project changes
  useEffect(() => {
    if (!selectedProject) {
      setPhases([]);
      setSelectedPhase('');
      return;
    }
    if (isEngineer) {
      const filtered = allAssignedPhases.filter(
        p => p.project_id === selectedProject
      ) as any as ProjectPhase[];
      setPhases(filtered);
      if (filtered.length > 0) setSelectedPhase(filtered[0].id);
      else setSelectedPhase('');
    } else {
      loadProjectPhases(selectedProject as number);
    }
  }, [selectedProject, isEngineer, allAssignedPhases]);

  const loadAssignedPhases = async () => {
    try {
      const response = await apiService.getMyAssignedPhases();
      if (response.success && response.data) {
        setProjects(response.data.projects);
        // Map to ProjectPhase shape
        const mapped = response.data.phases.map((ph: any) => ({
          id: ph.phase_id,
          phase_name: ph.phase_name,
          project_id: ph.project_id,
          status: ph.phase_status,
          phase_order: ph.phase_order,
        }));
        setAllAssignedPhases(mapped);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load assigned phases');
    }
  };

  const loadProjects = async () => {
    try {
      const response = await apiService.getProjects();
      if (response.success && response.data) {
        const activeProjects = response.data.projects.filter(p => p.status === 'active');
        setProjects(activeProjects);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load projects');
    }
  };

  const loadProjectPhases = async (projectId: number) => {
    try {
      const response = await apiService.getProjectPhases(projectId);
      if (response.success && response.data) {
        const workablePhases = response.data.phases.filter(phase =>
          ['ready', 'in_progress', 'submitted'].includes(phase.status)
        );
        setPhases(workablePhases);
        if (workablePhases.length > 0) setSelectedPhase(workablePhases[0].id);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load project phases');
    }
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'submitted':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject || !selectedPhase || !hours) {
      setError('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Hours must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const workLogData: WorkLogCreateInput = {
        phase_id: selectedPhase as number,
        date: date.format('YYYY-MM-DD'),
        hours: hoursNum,
        description: description.trim() || undefined,
      };

      const response = await apiService.createWorkLog(workLogData);

      if (response.success) {
        setSuccess('Time entry saved successfully!');

        // Reset form
        setHours('');
        setDescription('');

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save time entry');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  const selectedPhaseData = phases.find(p => p.id === selectedPhase);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <AccessTime sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">
            Log Time Entry
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <FormControl fullWidth required>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={selectedProject}
                    label="Project"
                    onChange={(e) => setSelectedProject(Number(e.target.value))}
                    disabled={loading}
                  >
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <FormControl fullWidth required disabled={!selectedProject}>
                  <InputLabel>Phase</InputLabel>
                  <Select
                    value={selectedPhase}
                    label="Phase"
                    onChange={(e) => setSelectedPhase(Number(e.target.value))}
                    disabled={loading || !selectedProject}
                  >
                    {phases.map((phase) => (
                      <MenuItem key={phase.id} value={phase.id}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                          <span>{phase.phase_name}</span>
                          <Chip
                            label={phase.status.replace('_', ' ')}
                            size="small"
                            color={getPhaseStatusColor(phase.status) as any}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(newValue) => setDate(newValue ? dayjs(newValue) : dayjs())}
                  disabled={loading}
                  maxDate={dayjs()}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  required
                  label="Hours"
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={loading}
                  inputProps={{
                    min: 0.25,
                    step: 0.25
                  }}
                  helperText="Minimum 0.25 hours (no upper limit for catch-up logging)"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={loading || !selectedProject || !selectedPhase || !hours}
                  fullWidth
                  size="large"
                  sx={{ height: '56px' }}
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </Button>
              </Box>
            </Box>

            <Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="What did you work on during this time?"
              />
            </Box>
          </Box>
        </form>

        {selectedPhaseData && (
          <Box mt={3} p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Phase Info
            </Typography>
            <Typography variant="body2">
              <strong>Phase:</strong> {selectedPhaseData.phase_name} (Order: {selectedPhaseData.phase_order})
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {selectedPhaseData.status.replace('_', ' ').toUpperCase()}
            </Typography>
            <Typography variant="body2">
              <strong>Planned Duration:</strong> {selectedPhaseData.planned_weeks} weeks
            </Typography>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default QuickTimeEntry;