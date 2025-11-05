import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
  Chip,
  Paper,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Add, Remove, ArrowUpward, ArrowDownward, ExpandMore } from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  Project,
  PredefinedPhase,
  ProjectPhaseInput,
  ChecklistTemplate,
  ChecklistPhaseName
} from '../../types';
import apiService from '../../services/api';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

// Step titles in Arabic
const steps = [
  'اسم المشروع', // Project Basic Info
  'بيانات المشروع', // Project Phases
  'خطوات المشروع', // Checklist Review
];

const CreateProjectDialog = ({
  open,
  onClose,
  onSuccess,
}: CreateProjectDialogProps) => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Project basic info + extended fields
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(dayjs());
  const [landArea, setLandArea] = useState('');
  const [buildingType, setBuildingType] = useState('');
  const [floorsCount, setFloorsCount] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [bua, setBua] = useState('');
  const [clientName, setClientName] = useState('');

  // Step 2: Phases selection (existing functionality)
  const [predefinedPhases, setPredefinedPhases] = useState<PredefinedPhase[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<ProjectPhaseInput[]>([]);

  // Step 3: Checklist templates
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [checklistStats, setChecklistStats] = useState<{ [key: string]: number }>({});

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load predefined phases and checklist templates
  useEffect(() => {
    if (open) {
      loadPredefinedPhases();
      loadChecklistTemplates();
    }
  }, [open]);

  const loadPredefinedPhases = async () => {
    try {
      const response = await apiService.getPredefinedPhases();
      if (response.success && response.data) {
        // Remove duplicates by name (keep first occurrence)
        const uniquePhases = response.data.phases.filter((phase, index, self) =>
          index === self.findIndex((p) => p.name === phase.name)
        );
        setPredefinedPhases(uniquePhases);
        // Pre-select all phases with default values
        const defaultPhases = uniquePhases.map(phase => ({
          phase_name: phase.name,
          is_custom: false,
          planned_weeks: phase.typical_duration_weeks,
          predicted_hours: phase.typical_duration_weeks * 40, // Default: 40 hours per week
        }));
        setSelectedPhases(defaultPhases);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load phases');
    }
  };

  const loadChecklistTemplates = async () => {
    try {
      const response = await apiService.getChecklistTemplates();
      if (response.success && response.data) {
        setChecklistTemplates(response.data.templates);

        // Calculate statistics per phase
        const stats: { [key: string]: number } = {};
        response.data.templates.forEach((template: ChecklistTemplate) => {
          stats[template.phase_name] = (stats[template.phase_name] || 0) + 1;
        });
        setChecklistStats(stats);
      }
    } catch (error: any) {
      console.error('Failed to load checklist templates:', error);
    }
  };

  const handlePhaseToggle = (phase: PredefinedPhase) => {
    setSelectedPhases(prev => {
      const exists = prev.find(p => p.phase_name === phase.name);
      if (exists) {
        return prev.filter(p => p.phase_name !== phase.name);
      } else {
        return [...prev, {
          phase_name: phase.name,
          is_custom: false,
          planned_weeks: phase.typical_duration_weeks,
          predicted_hours: phase.typical_duration_weeks * 40,
        }];
      }
    });
  };

  const handlePhaseUpdate = (index: number, field: keyof ProjectPhaseInput, value: any) => {
    setSelectedPhases(prev =>
      prev.map((phase, i) =>
        i === index ? { ...phase, [field]: value } : phase
      )
    );
  };

  const addCustomPhase = () => {
    setSelectedPhases(prev => [...prev, {
      phase_name: '',
      is_custom: true,
      planned_weeks: 1,
      predicted_hours: 40,
    }]);
  };

  const removeCustomPhase = (index: number) => {
    setSelectedPhases(prev => prev.filter((_, i) => i !== index));
  };

  const movePhaseUp = (index: number) => {
    if (index === 0) return;
    const items = Array.from(selectedPhases);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    setSelectedPhases(items);
  };

  const movePhaseDown = (index: number) => {
    if (index === selectedPhases.length - 1) return;
    const items = Array.from(selectedPhases);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    setSelectedPhases(items);
  };

  const calculateTotals = () => {
    const totalWeeks = selectedPhases.reduce((sum, phase) => sum + phase.planned_weeks, 0);
    const totalHours = selectedPhases.reduce((sum, phase) => sum + (phase.predicted_hours || 0), 0);
    return { totalWeeks, totalHours };
  };

  // Step navigation validation
  const validateStep1 = () => {
    if (!name.trim()) {
      setError('اسم المشروع مطلوب / Project name is required');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (selectedPhases.length === 0) {
      setError('يجب اختيار مرحلة واحدة على الأقل / At least one phase must be selected');
      return false;
    }

    // Validate custom phase names
    const emptyCustomPhase = selectedPhases.find(p => p.is_custom && !p.phase_name.trim());
    if (emptyCustomPhase) {
      setError('جميع المراحل المخصصة يجب أن تحتوي على اسم / All custom phases must have a name');
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1 && !validateStep2()) return;

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;

    const { totalWeeks, totalHours } = calculateTotals();

    try {
      setLoading(true);
      setError(null);

      const projectData: any = {
        name: name.trim(),
        start_date: startDate.format('YYYY-MM-DD'),
        planned_total_weeks: totalWeeks,
        predicted_hours: totalHours,
        selectedPhases,
      };

      // Add extended fields if provided
      if (landArea) projectData.land_area = landArea;
      if (buildingType) projectData.building_type = buildingType;
      if (floorsCount !== '') projectData.floors_count = floorsCount;
      if (location) projectData.location = location;
      if (bua) projectData.bua = bua;
      if (clientName) projectData.client_name = clientName;

      const response = await apiService.createProject(projectData);

      if (response.success && response.data) {
        onSuccess(response.data.project);
        handleClose();
      } else {
        setError(response.error || 'فشل في إنشاء المشروع / Failed to create project');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'فشل في إنشاء المشروع / Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state
    setActiveStep(0);
    setName('');
    setStartDate(dayjs());
    setLandArea('');
    setBuildingType('');
    setFloorsCount('');
    setLocation('');
    setBua('');
    setClientName('');
    setSelectedPhases([]);
    setError(null);
    onClose();
  };

  const { totalWeeks, totalHours } = calculateTotals();

  // Get checklist templates for selected phases
  const getChecklistForPhase = (phaseName: string) => {
    return checklistTemplates.filter(t => t.phase_name === phaseName);
  };

  // Group checklist templates by section
  const groupBySection = (templates: ChecklistTemplate[]) => {
    const grouped: { [key: string]: ChecklistTemplate[] } = {};
    templates.forEach(template => {
      const section = template.section_name || 'عام / General';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(template);
    });
    return grouped;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box>
            <Typography variant="h6" gutterBottom>
              إنشاء مشروع جديد / Create New Project
            </Typography>
            <Stepper activeStep={activeStep} sx={{ pt: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ minHeight: 400 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* STEP 1: PROJECT BASIC INFO + EXTENDED FIELDS */}
          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Typography variant="h6" color="primary">
                معلومات المشروع الأساسية / Basic Project Information
              </Typography>

              <TextField
                fullWidth
                label="اسم المشروع / Project Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                placeholder="أدخل اسم المشروع / Enter project name"
              />

              <DatePicker
                label="تاريخ البدء / Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue ? dayjs(newValue) : dayjs())}
                disabled={loading}
                slotProps={{ textField: { fullWidth: true } }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" color="primary">
                تفاصيل المشروع الإضافية / Additional Project Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="مساحة الأرض / Land Area"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                    disabled={loading}
                    placeholder="مثال: 500 متر مربع"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="نوع البناء / Building Type"
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    disabled={loading}
                    placeholder="مثال: فيلا سكنية، عمارة تجارية"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="عدد الأدوار / Number of Floors"
                    type="number"
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(e.target.value ? parseInt(e.target.value) : '')}
                    disabled={loading}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الموقع / Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={loading}
                    placeholder="مثال: الرياض - حي النرجس"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="المساحة البنائية / BUA (Built-Up Area)"
                    value={bua}
                    onChange={(e) => setBua(e.target.value)}
                    disabled={loading}
                    placeholder="مثال: 750 متر مربع"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم العميل / Client Name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    disabled={loading}
                    placeholder="أدخل اسم العميل"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 2: PHASES SELECTION (EXISTING FUNCTIONALITY) */}
          {activeStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="primary">
                  اختيار مراحل المشروع / Select Project Phases
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip label={`${totalWeeks} أسبوع / weeks`} color="primary" variant="outlined" />
                  <Chip label={`${totalHours} ساعة / hours`} color="secondary" variant="outlined" />
                </Box>
              </Box>

              {/* Predefined Phases - Selection Only */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  اختر المراحل المطلوبة / Select required phases:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {predefinedPhases.map((phase) => {
                    const isSelected = selectedPhases.some(p => p.phase_name === phase.name);
                    return (
                      <FormControlLabel
                        key={phase.id}
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handlePhaseToggle(phase)}
                            disabled={loading}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {phase.name}
                          </Typography>
                        }
                      />
                    );
                  })}
                </Box>
              </Paper>

              {/* Selected Phases - Ordered List */}
              <Typography variant="subtitle1" fontWeight="bold">
                ترتيب المراحل وإعداداتها / Phase Sequence & Configuration
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                استخدم الأسهم لإعادة ترتيب المراحل / Use arrows to reorder phases. The order determines the workflow.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedPhases.map((phase, index) => (
                  <Paper
                    key={`phase-${index}`}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      {/* Phase Order Number */}
                      <Chip
                        label={index + 1}
                        size="small"
                        color="primary"
                        sx={{ minWidth: 40, fontWeight: 'bold' }}
                      />

                      {/* Phase Name */}
                      {phase.is_custom ? (
                        <TextField
                          size="small"
                          label="اسم المرحلة / Phase Name"
                          value={phase.phase_name}
                          onChange={(e) => handlePhaseUpdate(index, 'phase_name', e.target.value)}
                          disabled={loading}
                          sx={{ flexGrow: 1, minWidth: 200 }}
                          placeholder="أدخل اسم المرحلة المخصصة"
                        />
                      ) : (
                        <Typography variant="body1" fontWeight="medium" sx={{ flexGrow: 1, minWidth: 200 }}>
                          {phase.phase_name}
                        </Typography>
                      )}

                      {/* Weeks Input */}
                      <TextField
                        size="small"
                        label="أسابيع / Weeks"
                        type="number"
                        value={phase.planned_weeks}
                        onChange={(e) => handlePhaseUpdate(index, 'planned_weeks', parseInt(e.target.value) || 1)}
                        disabled={loading}
                        sx={{ width: 100 }}
                        inputProps={{ min: 1 }}
                      />

                      {/* Hours Input */}
                      <TextField
                        size="small"
                        label="ساعات / Hours"
                        type="number"
                        value={phase.predicted_hours}
                        onChange={(e) => handlePhaseUpdate(index, 'predicted_hours', parseInt(e.target.value) || 0)}
                        disabled={loading}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />

                      {/* Move Up/Down Buttons */}
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => movePhaseUp(index)}
                          disabled={loading || index === 0}
                          color="primary"
                          title="Move Up"
                        >
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => movePhaseDown(index)}
                          disabled={loading || index === selectedPhases.length - 1}
                          color="primary"
                          title="Move Down"
                        >
                          <ArrowDownward fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Remove Button */}
                      <IconButton
                        onClick={() => {
                          if (phase.is_custom) {
                            removeCustomPhase(index);
                          } else {
                            const predefinedPhase = predefinedPhases.find(p => p.name === phase.phase_name);
                            if (predefinedPhase) {
                              handlePhaseToggle(predefinedPhase);
                            }
                          }
                        }}
                        disabled={loading}
                        color="error"
                        size="small"
                        title="حذف / Remove"
                      >
                        <Remove />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {selectedPhases.length === 0 && (
                <Alert severity="warning">
                  الرجاء اختيار مرحلة واحدة على الأقل / Please select at least one phase.
                </Alert>
              )}

              <Button
                startIcon={<Add />}
                onClick={addCustomPhase}
                disabled={loading}
                variant="outlined"
              >
                إضافة مرحلة مخصصة / Add Custom Phase
              </Button>
            </Box>
          )}

          {/* STEP 3: CHECKLIST REVIEW */}
          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Typography variant="h6" color="primary">
                مراجعة قوائم المهام / Checklist Review
              </Typography>

              <Alert severity="info">
                سيتم إنشاء قوائم المهام تلقائياً للمراحل المحددة. يمكن تعديلها لاحقاً من صفحة المشروع.
                <br />
                Checklists will be automatically generated for selected phases. You can customize them later from the project page.
              </Alert>

              {selectedPhases.length === 0 ? (
                <Alert severity="warning">
                  لم يتم اختيار أي مراحل / No phases selected
                </Alert>
              ) : (
                <Box>
                  {selectedPhases.map((phase, index) => {
                    const phaseTemplates = getChecklistForPhase(phase.phase_name);
                    const taskCount = phaseTemplates.length;
                    const groupedTemplates = groupBySection(phaseTemplates);

                    return (
                      <Accordion key={index} defaultExpanded={index === 0}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Chip label={index + 1} size="small" color="primary" />
                            <Typography fontWeight="bold">{phase.phase_name}</Typography>
                            <Chip
                              label={`${taskCount} ${taskCount === 1 ? 'مهمة / task' : 'مهام / tasks'}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {taskCount === 0 ? (
                            <Alert severity="info">
                              لا توجد مهام محددة مسبقاً لهذه المرحلة. يمكن إضافتها يدوياً لاحقاً.
                              <br />
                              No predefined tasks for this phase. You can add them manually later.
                            </Alert>
                          ) : (
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell width="50px">#</TableCell>
                                    <TableCell>المهمة / Task</TableCell>
                                    <TableCell>القسم / Section</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {Object.entries(groupedTemplates).map(([section, templates]) => (
                                    <React.Fragment key={section}>
                                      {templates.map((template, idx) => (
                                        <TableRow key={template.id}>
                                          <TableCell>{template.display_order}</TableCell>
                                          <TableCell>
                                            <Typography variant="body2">
                                              {template.task_title_ar}
                                              {template.task_title_en && (
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                  {template.task_title_en}
                                                </Typography>
                                              )}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Chip label={section} size="small" variant="outlined" />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Box>
              )}

              <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ملخص المشروع / Project Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">المراحل / Phases:</Typography>
                    <Typography variant="h6">{selectedPhases.length}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">الأسابيع / Weeks:</Typography>
                    <Typography variant="h6">{totalWeeks}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">الساعات / Hours:</Typography>
                    <Typography variant="h6">{totalHours}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">المهام / Tasks:</Typography>
                    <Typography variant="h6">
                      {selectedPhases.reduce((sum, phase) => sum + (checklistStats[phase.phase_name] || 0), 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            إلغاء / Cancel
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              السابق / Back
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              التالي / Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'جاري الإنشاء... / Creating...' : 'إنشاء المشروع / Create Project'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateProjectDialog;
