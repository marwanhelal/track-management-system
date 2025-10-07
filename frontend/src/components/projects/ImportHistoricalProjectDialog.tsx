import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Chip,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Add, Remove, Delete, CheckCircle } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { Project, User } from '../../types';
import apiService from '../../services/api';

interface ImportHistoricalProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

interface PhaseData {
  phase_name: string;
  planned_weeks: number;
  predicted_hours: number;
  start_date: Dayjs;
  end_date: Dayjs;
  status: string;
}

interface EngineerWorkLog {
  engineer_id: number;
  engineer_name: string;
  hours: number;
  date: Dayjs;
}

interface PhaseWorkLogs {
  [phaseIndex: number]: EngineerWorkLog[];
}

const steps = ['Project Details', 'Phases Setup', 'Work Logs', 'Review & Submit'];

const ImportHistoricalProjectDialog = ({
  open,
  onClose,
  onSuccess,
}: ImportHistoricalProjectDialogProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineers, setEngineers] = useState<User[]>([]);

  // Step 1: Project Details
  const [projectName, setProjectName] = useState('');
  const [projectStartDate, setProjectStartDate] = useState<Dayjs>(dayjs().subtract(6, 'month'));
  const [projectStatus, setProjectStatus] = useState<string>('active');

  // Step 2: Phases
  const [phases, setPhases] = useState<PhaseData[]>([
    {
      phase_name: '',
      planned_weeks: 2,
      predicted_hours: 80,
      start_date: dayjs().subtract(6, 'month'),
      end_date: dayjs().subtract(5, 'month'),
      status: 'completed',
    },
  ]);

  // Step 3: Work Logs
  const [phaseWorkLogs, setPhaseWorkLogs] = useState<PhaseWorkLogs>({});

  useEffect(() => {
    if (open) {
      loadEngineers();
    }
  }, [open]);

  const loadEngineers = async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        const engineerUsers = response.data.users.filter((u: User) => u.role === 'engineer' && u.is_active);
        setEngineers(engineerUsers);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load engineers');
    }
  };

  const handleNext = () => {
    // Validation for each step
    if (activeStep === 0) {
      if (!projectName.trim()) {
        setError('Project name is required');
        return;
      }
    } else if (activeStep === 1) {
      if (phases.length === 0) {
        setError('At least one phase is required');
        return;
      }
      if (phases.some(p => !p.phase_name.trim())) {
        setError('All phases must have a name');
        return;
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const newStartDate = lastPhase ? lastPhase.end_date.add(1, 'day') : projectStartDate;
    const newEndDate = newStartDate.add(2, 'week');

    setPhases([
      ...phases,
      {
        phase_name: '',
        planned_weeks: 2,
        predicted_hours: 80,
        start_date: newStartDate,
        end_date: newEndDate,
        status: 'in_progress',
      },
    ]);
  };

  const handleRemovePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
    // Remove associated work logs
    const newWorkLogs = { ...phaseWorkLogs };
    delete newWorkLogs[index];
    setPhaseWorkLogs(newWorkLogs);
  };

  const handlePhaseUpdate = (index: number, field: keyof PhaseData, value: any) => {
    setPhases(phases.map((phase, i) => (i === index ? { ...phase, [field]: value } : phase)));
  };

  const handleAddWorkLog = (phaseIndex: number) => {
    const currentLogs = phaseWorkLogs[phaseIndex] || [];
    const phase = phases[phaseIndex];

    setPhaseWorkLogs({
      ...phaseWorkLogs,
      [phaseIndex]: [
        ...currentLogs,
        {
          engineer_id: engineers.length > 0 ? engineers[0].id : 0,
          engineer_name: engineers.length > 0 ? engineers[0].name : '',
          hours: 0,
          date: phase.start_date,
        },
      ],
    });
  };

  const handleRemoveWorkLog = (phaseIndex: number, logIndex: number) => {
    const currentLogs = phaseWorkLogs[phaseIndex] || [];
    setPhaseWorkLogs({
      ...phaseWorkLogs,
      [phaseIndex]: currentLogs.filter((_, i) => i !== logIndex),
    });
  };

  const handleWorkLogUpdate = (
    phaseIndex: number,
    logIndex: number,
    field: keyof EngineerWorkLog,
    value: any
  ) => {
    const currentLogs = phaseWorkLogs[phaseIndex] || [];
    const updatedLogs = currentLogs.map((log, i) => {
      if (i === logIndex) {
        if (field === 'engineer_id') {
          const engineer = engineers.find(e => e.id === value);
          return {
            ...log,
            engineer_id: value,
            engineer_name: engineer?.name || '',
          };
        }
        return { ...log, [field]: value };
      }
      return log;
    });

    setPhaseWorkLogs({
      ...phaseWorkLogs,
      [phaseIndex]: updatedLogs,
    });
  };

  const calculateTotals = () => {
    const totalWeeks = phases.reduce((sum, phase) => sum + phase.planned_weeks, 0);
    const totalHours = phases.reduce((sum, phase) => sum + phase.predicted_hours, 0);
    const totalWorkLogs = Object.values(phaseWorkLogs).reduce(
      (sum, logs) => sum + logs.reduce((s: number, log: EngineerWorkLog) => s + log.hours, 0),
      0
    );
    return { totalWeeks, totalHours, totalWorkLogs };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { totalWeeks, totalHours } = calculateTotals();

      // Step 1: Create the project
      const projectData = {
        name: projectName.trim(),
        start_date: projectStartDate.format('YYYY-MM-DD'),
        planned_total_weeks: totalWeeks,
        predicted_hours: totalHours,
        selectedPhases: phases.map(phase => ({
          phase_name: phase.phase_name,
          is_custom: false,
          planned_weeks: phase.planned_weeks,
          predicted_hours: phase.predicted_hours,
        })),
      };

      const projectResponse = await apiService.createProject(projectData);

      if (!projectResponse.success || !projectResponse.data) {
        throw new Error(projectResponse.error || 'Failed to create project');
      }

      const createdProject = projectResponse.data.project;
      const createdPhases = projectResponse.data.phases;

      // Step 2: Update phase statuses and dates using historical endpoint
      for (let i = 0; i < createdPhases.length; i++) {
        const createdPhase = createdPhases[i];
        const phaseData = phases[i];

        if (phaseData && createdPhase) {
          await apiService.updatePhaseHistorical(createdPhase.id, {
            actual_start_date: phaseData.start_date.format('YYYY-MM-DD'),
            actual_end_date: phaseData.end_date.format('YYYY-MM-DD'),
            status: phaseData.status,
          });
        }
      }

      // Step 3: Create work logs using admin endpoint
      for (let i = 0; i < createdPhases.length; i++) {
        const createdPhase = createdPhases[i];
        const workLogs = phaseWorkLogs[i] || [];

        for (const workLog of workLogs) {
          if (workLog.engineer_id && workLog.hours > 0) {
            await apiService.createWorkLogAdmin({
              engineer_id: workLog.engineer_id,
              phase_id: createdPhase.id,
              date: workLog.date.format('YYYY-MM-DD'),
              hours: workLog.hours,
              description: `Historical import for ${phases[i].phase_name}`,
            });
          }
        }
      }

      // Step 4: Update project status if completed
      if (projectStatus !== 'active') {
        await apiService.updateProject(createdProject.id, {
          status: projectStatus as any,
        });
      }

      onSuccess(createdProject);
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to import project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProjectName('');
    setProjectStartDate(dayjs().subtract(6, 'month'));
    setProjectStatus('active');
    setPhases([
      {
        phase_name: '',
        planned_weeks: 2,
        predicted_hours: 80,
        start_date: dayjs().subtract(6, 'month'),
        end_date: dayjs().subtract(5, 'month'),
        status: 'completed',
      },
    ]);
    setPhaseWorkLogs({});
    setActiveStep(0);
    setError(null);
    onClose();
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return renderProjectDetails();
      case 1:
        return renderPhasesSetup();
      case 2:
        return renderWorkLogs();
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  const renderProjectDetails = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      <Alert severity="info">
        Enter the basic information for your historical project. You can set past dates.
      </Alert>

      <TextField
        fullWidth
        required
        label="Project Name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        disabled={loading}
        placeholder="e.g., Mall Badr"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Project Start Date"
            value={projectStartDate}
            onChange={(newValue) => setProjectStartDate(newValue || dayjs())}
            disabled={loading}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Project Status</InputLabel>
            <Select
              value={projectStatus}
              label="Project Status"
              onChange={(e) => setProjectStatus(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );

  const renderPhasesSetup = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Alert severity="info">
        Add all project phases with their actual start and end dates.
      </Alert>

      {phases.map((phase, index) => (
        <Paper key={index} sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1" fontWeight="bold">
              Phase {index + 1}
            </Typography>
            <IconButton
              onClick={() => handleRemovePhase(index)}
              disabled={loading || phases.length === 1}
              color="error"
              size="small"
            >
              <Delete />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Phase Name"
                value={phase.phase_name}
                onChange={(e) => handlePhaseUpdate(index, 'phase_name', e.target.value)}
                disabled={loading}
                placeholder="e.g., Concept Generation"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Planned Weeks"
                value={phase.planned_weeks}
                onChange={(e) => handlePhaseUpdate(index, 'planned_weeks', parseInt(e.target.value) || 0)}
                disabled={loading}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Predicted Hours"
                value={phase.predicted_hours}
                onChange={(e) => handlePhaseUpdate(index, 'predicted_hours', parseInt(e.target.value) || 0)}
                disabled={loading}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={phase.start_date}
                onChange={(newValue) => handlePhaseUpdate(index, 'start_date', newValue || dayjs())}
                disabled={loading}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={phase.end_date}
                onChange={(newValue) => handlePhaseUpdate(index, 'end_date', newValue || dayjs())}
                disabled={loading}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={phase.status}
                  label="Status"
                  onChange={(e) => handlePhaseUpdate(index, 'status', e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddPhase}
        disabled={loading}
      >
        Add Another Phase
      </Button>
    </Box>
  );

  const renderWorkLogs = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      <Alert severity="info">
        Add work logs for each phase. Specify which engineers worked and how many hours.
      </Alert>

      {phases.map((phase, phaseIndex) => {
        const workLogs = phaseWorkLogs[phaseIndex] || [];

        return (
          <Paper key={phaseIndex} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                {phase.phase_name || `Phase ${phaseIndex + 1}`}
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => handleAddWorkLog(phaseIndex)}
                disabled={loading}
              >
                Add Engineer
              </Button>
            </Box>

            {workLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                No work logs added. Click "Add Engineer" to add work entries.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {workLogs.map((log, logIndex) => (
                  <Box
                    key={logIndex}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}
                  >
                    <FormControl sx={{ flex: 2 }} size="small">
                      <InputLabel>Engineer</InputLabel>
                      <Select
                        value={log.engineer_id}
                        label="Engineer"
                        onChange={(e) =>
                          handleWorkLogUpdate(phaseIndex, logIndex, 'engineer_id', e.target.value)
                        }
                        disabled={loading}
                      >
                        {engineers.map((engineer) => (
                          <MenuItem key={engineer.id} value={engineer.id}>
                            {engineer.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      sx={{ flex: 1 }}
                      size="small"
                      type="number"
                      label="Hours"
                      value={log.hours}
                      onChange={(e) =>
                        handleWorkLogUpdate(phaseIndex, logIndex, 'hours', parseFloat(e.target.value) || 0)
                      }
                      disabled={loading}
                      inputProps={{ min: 0, step: 0.5 }}
                    />

                    <DatePicker
                      label="Date"
                      value={log.date}
                      onChange={(newValue) =>
                        handleWorkLogUpdate(phaseIndex, logIndex, 'date', newValue || dayjs())
                      }
                      disabled={loading}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { flex: 1 },
                        },
                      }}
                    />

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveWorkLog(phaseIndex, logIndex)}
                      disabled={loading}
                    >
                      <Remove />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );

  const renderReview = () => {
    const { totalWeeks, totalHours, totalWorkLogs } = calculateTotals();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
        <Alert severity="success" icon={<CheckCircle />}>
          Review your project data before importing. All information can be edited later.
        </Alert>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Project Summary
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Project Name
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {projectName}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Start Date
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {projectStartDate.format('MMMM D, YYYY')}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={projectStatus.replace('_', ' ').toUpperCase()}
                color={projectStatus === 'completed' ? 'success' : 'primary'}
                size="small"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Total Duration
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {totalWeeks} weeks
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Phases ({phases.length})
          </Typography>
          <Divider sx={{ my: 2 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Phase</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phases.map((phase, index) => (
                  <TableRow key={index}>
                    <TableCell>{phase.phase_name}</TableCell>
                    <TableCell>{phase.planned_weeks}w</TableCell>
                    <TableCell>{phase.predicted_hours}h</TableCell>
                    <TableCell>
                      <Chip
                        label={phase.status.replace('_', ' ')}
                        size="small"
                        color={phase.status === 'completed' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Work Logs Summary
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip
              label={`Total Hours Logged: ${totalWorkLogs.toFixed(1)}h`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Predicted Hours: ${totalHours}h`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`${Math.round((totalWorkLogs / totalHours) * 100)}% Complete`}
              color={totalWorkLogs >= totalHours ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>Import Historical Project</DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {renderStep()}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained" disabled={loading}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? null : <CheckCircle />}
            >
              {loading ? 'Importing...' : 'Import Project'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ImportHistoricalProjectDialog;
