import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Avatar,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CardActions,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  AlertColor
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  GetApp as ExportIcon,
  Archive as ArchiveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Psychology as PsychologyIcon,
  Groups as GroupsIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Email as EmailIcon,
  VpnKey as EarlyAccessIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  FastForward as FastForwardIcon,
  StarBorder as StarBorderIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { Project, ProjectPhase, WorkLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ExportDialog from '../components/projects/ExportDialog';
import EditProjectDialog from '../components/projects/EditProjectDialog';
import AddPhaseDialog from '../components/projects/AddPhaseDialog';
import PhaseActionMenu from '../components/projects/PhaseActionMenu';
import PhaseProgressSummary from '../components/progress/PhaseProgressSummary';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import EditPhaseDatesDialog from '../components/phases/EditPhaseDatesDialog';
import EditWorkLogDialog from '../components/work-logs/EditWorkLogDialog';
import DeleteWorkLogDialog from '../components/work-logs/DeleteWorkLogDialog';
import AddManualWorkLogDialog from '../components/work-logs/AddManualWorkLogDialog';
import PhasePaymentDialog from '../components/payments/PhasePaymentDialog';

interface ProjectDetailsState {
  project: Project | null;
  phases: ProjectPhase[];
  workLogs: WorkLog[];
  settings: any;
  loading: boolean;
  error: string | null;
  activeTab: number;
  deleteDialog: {
    open: boolean;
    project: Project | null;
  };
  exportDialog: {
    open: boolean;
  };
  // Team Management State
  teamSortBy: 'hours' | 'productivity' | 'recent' | 'alphabetical';
  teamFilterPhase: string;
  teamSearchTerm: string;
  teamViewMode: 'cards' | 'table' | 'analytics';
  selectedTeamMember: any;
  teamAnalytics: {
    totalProductivity: number;
    averageHoursPerDay: number;
    topPerformer: any;
    teamVelocity: number;
  };
  // Settings State
  editingProject: boolean;
  projectForm: {
    name: string;
    status: 'active' | 'on_hold' | 'completed' | 'cancelled';
    planned_total_weeks: number;
    predicted_hours: number;
    start_date: string;
  };
  phaseManagement: {
    editingPhase: ProjectPhase | null;
    addingPhase: boolean;
    phaseForm: {
      phase_name: string;
      predicted_hours: number;
      planned_weeks: number;
    };
  };
  // New Dialog States
  editProjectDialog: {
    open: boolean;
  };
  addPhaseDialog: {
    open: boolean;
  };
  archiveConfirmDialog: {
    open: boolean;
  };
  editPhaseDatesDialog: {
    open: boolean;
    phase: ProjectPhase | null;
  };
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'info' | 'error';
  };
  editWorkLogDialog: {
    open: boolean;
    workLog: WorkLog | null;
  };
  deleteWorkLogDialog: {
    open: boolean;
    workLog: WorkLog | null;
  };
  addManualWorkLogDialog: {
    open: boolean;
    phase: ProjectPhase | null;
  };
  paymentDialog: {
    open: boolean;
    phase: ProjectPhase | null;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSupervisor, isEngineer, user } = useAuth();
  const { on, off, joinProject, leaveProject } = useSocket();

  // Professional notification navigation parameters
  const urlTab = searchParams.get('tab');
  const urlPhase = searchParams.get('phase');
  const urlFilter = searchParams.get('filter');
  const urlHighlight = searchParams.get('highlight');
  const urlSection = searchParams.get('section');
  const urlFocus = searchParams.get('focus');

  // Progress Management State
  const [progressSummaryOpen, setProgressSummaryOpen] = useState(false);
  const [selectedPhaseForProgress, setSelectedPhaseForProgress] = useState<ProjectPhase | null>(null);

  const [state, setState] = useState<ProjectDetailsState>({
    project: null,
    phases: [],
    workLogs: [],
    settings: {},
    loading: true,
    error: null,
    activeTab: 0,
    deleteDialog: {
      open: false,
      project: null
    },
    exportDialog: {
      open: false
    },
    // Team Management State
    teamSortBy: 'hours',
    teamFilterPhase: '',
    teamSearchTerm: '',
    teamViewMode: 'cards',
    selectedTeamMember: null,
    teamAnalytics: {
      totalProductivity: 0,
      averageHoursPerDay: 0,
      topPerformer: null,
      teamVelocity: 0
    },
    // Settings State
    editingProject: false,
    projectForm: {
      name: '',
      status: 'active',
      planned_total_weeks: 0,
      predicted_hours: 0,
      start_date: ''
    },
    phaseManagement: {
      editingPhase: null,
      addingPhase: false,
      phaseForm: {
        phase_name: '',
        predicted_hours: 0,
        planned_weeks: 0
      }
    },
    // New Dialog States
    editProjectDialog: {
      open: false
    },
    addPhaseDialog: {
      open: false
    },
    archiveConfirmDialog: {
      open: false
    },
    editPhaseDatesDialog: {
      open: false,
      phase: null
    },
    snackbar: {
      open: false,
      message: '',
      severity: 'info'
    },
    editWorkLogDialog: {
      open: false,
      workLog: null
    },
    deleteWorkLogDialog: {
      open: false,
      workLog: null
    },
    addManualWorkLogDialog: {
      open: false,
      phase: null
    },
    paymentDialog: {
      open: false,
      phase: null
    }
  });

  const fetchProjectDetails = useCallback(async () => {
    if (!id || id === 'undefined' || isNaN(parseInt(id))) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Invalid project ID. Please check the URL and try again.'
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiService.getProject(parseInt(id));

      if (response.success && response.data) {
        const { project, phases, workLogs, settings } = response.data;

        // Calculate dynamic actual hours from work logs
        const totalActualHours = (workLogs || []).reduce((sum: number, log: any) => {
          return sum + parseFloat(log.hours?.toString() || '0');
        }, 0);

        // Update project with calculated actual hours
        const updatedProject = {
          ...project,
          actual_hours: parseFloat(totalActualHours.toFixed(1))
        };

        setState(prev => ({
          ...prev,
          project: updatedProject,
          phases: phases || [],
          workLogs: workLogs || [],
          settings: settings || {},
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch project details',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch project details',
        loading: false
      }));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id, fetchProjectDetails]);

  // Professional notification navigation handler
  useEffect(() => {
    if (!state.project || state.loading) return;

    console.log('🎯 Processing notification navigation parameters:', {
      tab: urlTab,
      phase: urlPhase,
      filter: urlFilter,
      highlight: urlHighlight,
      section: urlSection,
      focus: urlFocus
    });

    // Handle tab navigation
    if (urlTab) {
      const tabMap: { [key: string]: number } = {
        'overview': 0,
        'timeline': 1,
        'worklogs': 2,
        'team': 3,
        'settings': 4
      };

      const tabIndex = tabMap[urlTab];
      if (tabIndex !== undefined && tabIndex !== state.activeTab) {
        setState(prev => ({ ...prev, activeTab: tabIndex }));
        console.log(`📍 Navigated to ${urlTab} tab (index ${tabIndex})`);
      }
    }

    // Handle phase-specific navigation
    if (urlPhase && state.phases.length > 0) {
      const phaseId = parseInt(urlPhase);
      const targetPhase = state.phases.find(p => p.id === phaseId);
      if (targetPhase) {
        console.log(`🎯 Highlighting phase: ${targetPhase.phase_name} (ID: ${phaseId})`);
        // You can add phase highlighting logic here
      }
    }

    // Handle work logs filtering
    if (urlFilter === 'pending' && urlTab === 'worklogs') {
      console.log('🔍 Filtering work logs for pending approvals');
      // You can add work logs filtering logic here
    }

    // Log successful navigation
    if (urlTab || urlPhase || urlFilter) {
      console.log('✅ Professional notification navigation completed');
    }
  }, [state.project, state.loading, state.phases.length, urlTab, urlPhase, urlFilter, urlHighlight, urlSection, urlFocus, state.activeTab]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (state.project?.id) {
      const projectId = state.project.id;

      // Join project room for real-time updates
      joinProject(projectId);

      // Early Access Event Handlers
      const handleEarlyAccessGranted = (data: any) => {
        console.log('Early access granted:', data);
        if (data.projectId === projectId) {
          // Refresh project data to show updated phase status
          fetchProjectDetails();

          // Show success notification
          setState(prev => ({
            ...prev,
            snackbar: {
              open: true,
              message: `Early access granted for ${data.phase.phase_name} by ${data.grantedBy.name}`,
              severity: 'success'
            }
          }));
        }
      };

      const handleEarlyAccessRevoked = (data: any) => {
        console.log('Early access revoked:', data);
        if (data.projectId === projectId) {
          // Refresh project data to show updated phase status
          fetchProjectDetails();

          // Show warning notification
          setState(prev => ({
            ...prev,
            snackbar: {
              open: true,
              message: `Early access revoked for ${data.phase.phase_name} by ${data.revokedBy.name}`,
              severity: 'warning'
            }
          }));
        }
      };

      const handleEarlyAccessPhaseStarted = (data: any) => {
        console.log('Early access phase started:', data);
        if (data.projectId === projectId) {
          // Refresh project data to show updated phase status
          fetchProjectDetails();

          // Show info notification
          setState(prev => ({
            ...prev,
            snackbar: {
              open: true,
              message: `${data.phase.phase_name} started with early access by ${data.startedBy.name}`,
              severity: 'info'
            }
          }));
        }
      };

      // Register event listeners
      on('early_access_granted', handleEarlyAccessGranted);
      on('early_access_revoked', handleEarlyAccessRevoked);
      on('early_access_phase_started', handleEarlyAccessPhaseStarted);

      // Cleanup function
      return () => {
        // Remove event listeners
        off('early_access_granted', handleEarlyAccessGranted);
        off('early_access_revoked', handleEarlyAccessRevoked);
        off('early_access_phase_started', handleEarlyAccessPhaseStarted);

        // Leave project room
        leaveProject(projectId);
      };
    }
  }, [state.project?.id, on, off, joinProject, leaveProject, fetchProjectDetails]);

  const handleDeleteProject = async () => {
    if (!state.project) return;

    setState(prev => ({
      ...prev,
      deleteDialog: { open: true, project: state.project }
    }));
  };

  const confirmDeleteProject = async () => {
    if (!state.deleteDialog.project) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.deleteProject(state.deleteDialog.project.id);

      if (response.success) {
        navigate('/projects');
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to delete project',
          loading: false,
          deleteDialog: { open: false, project: null }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete project',
        loading: false,
        deleteDialog: { open: false, project: null }
      }));
    }
  };

  const handlePhaseAction = async (phaseId: number, action: string, note?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      let response: any;

      switch (action) {
        case 'start':
          response = await apiService.startPhase(phaseId, note);
          break;
        case 'submit':
          response = await apiService.submitPhase(phaseId, note);
          break;
        case 'approve':
          response = await apiService.approvePhase(phaseId, note);
          break;
        case 'complete':
          response = await apiService.completePhase(phaseId, note);
          break;
        default:
          return;
      }

      if (response.success) {
        await fetchProjectDetails();
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || `Failed to ${action} phase`,
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to ${action} phase`,
        loading: false
      }));
    }
  };

  // Team Management Handlers
  const handleTeamSort = (sortBy: 'hours' | 'productivity' | 'recent' | 'alphabetical') => {
    setState(prev => ({ ...prev, teamSortBy: sortBy }));
  };

  const handleTeamFilter = (phase: string) => {
    setState(prev => ({ ...prev, teamFilterPhase: phase }));
  };

  const handleTeamSearch = (searchTerm: string) => {
    setState(prev => ({ ...prev, teamSearchTerm: searchTerm }));
  };

  const handleTeamViewMode = (viewMode: 'cards' | 'table' | 'analytics') => {
    setState(prev => ({ ...prev, teamViewMode: viewMode }));
  };

  // Early Access Handlers
  const handleGrantEarlyAccess = async (phaseId: number, note?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.grantEarlyAccess(phaseId, note);

      if (response.success) {
        await fetchProjectDetails();
        setState(prev => ({ ...prev, error: null }));
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to grant early access' }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to grant early access' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeEarlyAccess = async (phaseId: number, note?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.revokeEarlyAccess(phaseId, note);

      if (response.success) {
        await fetchProjectDetails();
        setState(prev => ({ ...prev, error: null }));
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to revoke early access' }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to revoke early access' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleStartPhaseWithEarlyAccess = async (phaseId: number, note?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.startPhase(phaseId, note);

      if (response.success) {
        await fetchProjectDetails();
        setState(prev => ({ ...prev, error: null }));
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to start phase' }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to start phase' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Project Settings Handlers
  const handleEditProject = () => {
    setState(prev => ({
      ...prev,
      editingProject: true,
      projectForm: {
        name: state.project?.name || '',
        status: state.project?.status || 'active',
        planned_total_weeks: state.project?.planned_total_weeks || 0,
        predicted_hours: state.project?.predicted_hours || 0,
        start_date: state.project?.start_date || ''
      }
    }));
  };

  const handleSaveProject = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.updateProject(state.project!.id, state.projectForm);

      if (response.success) {
        setState(prev => ({
          ...prev,
          editingProject: false,
          loading: false
        }));
        await fetchProjectDetails();
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to update project',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update project',
        loading: false
      }));
    }
  };

  const handleCancelEdit = () => {
    setState(prev => ({ ...prev, editingProject: false }));
  };



  const handleArchiveProject = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.archiveProject(state.project!.id);

      if (response.success) {
        navigate('/projects');
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to archive project',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to archive project',
        loading: false
      }));
    }
  };

  const handleExportProject = async (exportOptions: any) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await apiService.exportProject(state.project!.id, {
        format: exportOptions.format,
        dateFrom: exportOptions.dateFrom,
        dateTo: exportOptions.dateTo,
        phases: exportOptions.phases
      });

      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `project-${state.project?.name}-export-${currentDate}`;

      if (exportOptions.format === 'csv' || exportOptions.format === 'pdf') {
        // Handle blob response for CSV and PDF
        const blob = new Blob([response], {
          type: exportOptions.format === 'pdf' ? 'application/pdf' : 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.${exportOptions.format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Handle JSON response
        if (response.success) {
          const blob = new Blob([JSON.stringify(response.data, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.json`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          setState(prev => ({ ...prev, error: 'Failed to export project data' }));
          return;
        }
      }

      setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, open: false } }));
    } catch (error) {
      console.error('Export error:', error);
      setState(prev => ({ ...prev, error: 'Failed to export project data' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Work Log Handlers
  const handleEditWorkLog = (workLog: WorkLog) => {
    setState(prev => ({
      ...prev,
      editWorkLogDialog: {
        open: true,
        workLog
      }
    }));
  };

  const handleDeleteWorkLog = (workLog: WorkLog) => {
    setState(prev => ({
      ...prev,
      deleteWorkLogDialog: {
        open: true,
        workLog
      }
    }));
  };

  const handleSaveWorkLog = async (id: number, updateData: { hours: number; description: string; date: string }) => {
    try {
      const response = await apiService.updateWorkLog(id, updateData);

      if (response.success) {
        setState(prev => ({
          ...prev,
          snackbar: {
            open: true,
            message: 'Work log updated successfully',
            severity: 'success'
          }
        }));
        await fetchProjectDetails();
      } else {
        throw new Error(response.error || 'Failed to update work log');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        snackbar: {
          open: true,
          message: error.response?.data?.error || 'Failed to update work log',
          severity: 'error'
        }
      }));
      throw error;
    }
  };

  const handleConfirmDeleteWorkLog = async (id: number, delete_note?: string) => {
    try {
      const response = await apiService.deleteWorkLog(id, delete_note);

      if (response.success) {
        setState(prev => ({
          ...prev,
          snackbar: {
            open: true,
            message: 'Work log deleted successfully',
            severity: 'success'
          }
        }));
        await fetchProjectDetails();
      } else {
        throw new Error(response.error || 'Failed to delete work log');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        snackbar: {
          open: true,
          message: error.response?.data?.error || 'Failed to delete work log',
          severity: 'error'
        }
      }));
      throw error;
    }
  };

  const handleCloseEditWorkLogDialog = () => {
    setState(prev => ({
      ...prev,
      editWorkLogDialog: {
        open: false,
        workLog: null
      }
    }));
  };

  const handleCloseDeleteWorkLogDialog = () => {
    setState(prev => ({
      ...prev,
      deleteWorkLogDialog: {
        open: false,
        workLog: null
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'ready':
      case 'in_progress':
        return 'success';
      case 'submitted':
      case 'approved':
        return 'info';
      case 'completed':
        return 'primary';
      case 'on_hold':
      case 'warning':
        return 'warning';
      case 'cancelled':
      case 'not_started':
        return 'default';
      default:
        return 'default';
    }
  };

  const calculateProjectProgress = () => {
    if (state.phases.length === 0) return 0;

    // Calculate progress based on individual phase progress
    const totalProgress = state.phases.reduce((sum, phase) => {
      // Count fully completed phases as 100%
      if (phase.status === 'completed' || phase.status === 'approved') {
        return sum + 100;
      }
      // For other phases, use actual work progress
      return sum + calculatePhaseProgress(phase);
    }, 0);

    return totalProgress / state.phases.length;
  };

  const calculatePhaseProgress = (phase: ProjectPhase) => {
    // Calculate progress based on work logs for this phase
    const phaseWorkLogs = state.workLogs.filter(log => log.phase_id === phase.id);
    const totalHours = phaseWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);

    // Check if predicted_hours is a valid number greater than 0
    if (phase.predicted_hours && !isNaN(phase.predicted_hours) && phase.predicted_hours > 0) {
      const progress = (totalHours / phase.predicted_hours) * 100;
      return isNaN(progress) ? 0 : Math.min(progress, 100);
    }
    return 0;
  };

  // Early Access Utility Functions
  const getEarlyAccessStatusColor = (status: string) => {
    switch (status) {
      case 'accessible': return 'success';
      case 'in_progress': return 'primary';
      case 'not_accessible': return 'default';
      default: return 'default';
    }
  };

  const canStartWithEarlyAccess = (phase: ProjectPhase) => {
    return phase.status === 'ready' ||
           (phase.early_access_granted && phase.early_access_status === 'accessible');
  };

  const isEarlyAccessAvailable = (phase: ProjectPhase) => {
    // Early access is available for phases that are not ready but could be started
    return phase.status === 'not_started' && !phase.early_access_granted;
  };

  const getPhaseDisplayStatus = (phase: ProjectPhase) => {
    if (phase.early_access_granted && phase.early_access_status === 'in_progress') {
      return 'Early Access - In Progress';
    }
    if (phase.early_access_granted && phase.early_access_status === 'accessible') {
      return 'Early Access - Available';
    }
    return phase.status.replace('_', ' ');
  };

  // Team Management Utility Functions
  const getFilteredAndSortedTeamMembers = () => {
    // Group work logs by engineer
    const teamStats = state.workLogs.reduce((acc, log) => {
      const engineerId = log.engineer_id;
      if (!acc[engineerId]) {
        acc[engineerId] = {
          id: engineerId,
          name: log.engineer_name,
          totalHours: 0,
          entries: 0,
          phases: new Set(),
          dates: new Set(),
          lastActivity: '',
          avgHoursPerEntry: 0,
          productivity: 0,
          recentActivity: 0
        };
      }
      acc[engineerId].totalHours += parseFloat(log.hours?.toString() || '0');
      acc[engineerId].entries += 1;
      acc[engineerId].phases.add(log.phase_name);
      acc[engineerId].dates.add(log.date);

      // Track latest activity
      if (!acc[engineerId].lastActivity || log.date > acc[engineerId].lastActivity) {
        acc[engineerId].lastActivity = log.date;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate metrics for each team member
    Object.values(teamStats).forEach((member: any) => {
      member.avgHoursPerEntry = member.entries > 0 ? member.totalHours / member.entries : 0;
      member.phases = Array.from(member.phases);
      member.workingDays = member.dates.size;
      member.productivity = member.workingDays > 0 ? member.totalHours / member.workingDays : 0;

      // Calculate recent activity (last 7 days)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      member.recentActivity = state.workLogs
        .filter(log => log.engineer_id === member.id && new Date(log.date) >= recentDate)
        .reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);
    });

    let teamMembers = Object.values(teamStats);

    // Apply filters
    if (state.teamFilterPhase) {
      teamMembers = teamMembers.filter((member: any) =>
        member.phases.includes(state.teamFilterPhase)
      );
    }

    if (state.teamSearchTerm) {
      teamMembers = teamMembers.filter((member: any) =>
        member.name.toLowerCase().includes(state.teamSearchTerm.toLowerCase())
      );
    }

    // Apply sorting
    switch (state.teamSortBy) {
      case 'hours':
        teamMembers.sort((a: any, b: any) => b.totalHours - a.totalHours);
        break;
      case 'productivity':
        teamMembers.sort((a: any, b: any) => b.productivity - a.productivity);
        break;
      case 'recent':
        teamMembers.sort((a: any, b: any) => b.recentActivity - a.recentActivity);
        break;
      case 'alphabetical':
        teamMembers.sort((a: any, b: any) => a.name.localeCompare(b.name));
        break;
    }

    return teamMembers;
  };

  const calculateTeamAnalytics = () => {
    const teamMembers = getFilteredAndSortedTeamMembers();
    const totalHours = teamMembers.reduce((sum, member: any) => sum + member.totalHours, 0);
    const totalDays = new Set(state.workLogs.map(log => log.date)).size;

    return {
      totalProductivity: totalHours / Math.max(teamMembers.length, 1),
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      topPerformer: teamMembers[0] || null,
      teamVelocity: teamMembers.reduce((sum, member: any) => sum + member.productivity, 0) / Math.max(teamMembers.length, 1)
    };
  };

  const getPerformanceIndicator = (member: any) => {
    const avgHours = calculateTeamAnalytics().averageHoursPerDay;
    if (member.productivity > avgHours * 1.2) return { icon: TrendingUpIcon, color: 'success.main', label: 'High Performer' };
    if (member.productivity < avgHours * 0.8) return { icon: TrendingDownIcon, color: 'warning.main', label: 'Needs Support' };
    return { icon: TimelineIcon, color: 'info.main', label: 'Average' };
  };

  if (state.loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading project details...</Typography>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!state.project) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Project not found
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/projects')}>
            <ArrowBackIcon />
          </IconButton>
          <div>
            <Typography variant="h4" component="h1">
              {state.project.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Chip
                label={state.project.status.replace('_', ' ')}
                color={getStatusColor(state.project.status) as any}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                Created {new Date(state.project.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </div>
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteProject}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Project Overview Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 3,
          '& > *': {
            flex: { xs: '1 1 100%', md: '1 1 calc(25% - 18px)' }
          }
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              {state.project.planned_total_weeks}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Planned Weeks
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              {state.project.predicted_hours}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Predicted Hours
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main">
              {state.project.actual_hours || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actual Hours
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="info.main">
              {Math.round(calculateProjectProgress())}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={calculateProjectProgress()}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {state.phases.filter(p => p.status === 'completed' || p.status === 'approved').length} of {state.phases.length} phases fully completed
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={state.activeTab}
            onChange={(_, newValue) => setState(prev => ({ ...prev, activeTab: newValue }))}
          >
            <Tab label="Phases" icon={<AssignmentIcon />} />
            <Tab label="Work Logs" icon={<AccessTimeIcon />} />
            <Tab label="Team" icon={<PersonIcon />} />
            <Tab label="Settings" icon={<EditIcon />} />
          </Tabs>
        </Box>

        {/* Phases Tab */}
        <TabPanel value={state.activeTab} index={0}>
          {state.phases.map((phase) => (
            <Accordion key={phase.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">{phase.phase_name}</Typography>
                    <Chip
                      label={getPhaseDisplayStatus(phase)}
                      color={phase.early_access_granted
                        ? getEarlyAccessStatusColor(phase.early_access_status) as any
                        : getStatusColor(phase.status) as any}
                      size="small"
                    />
                    {phase.early_access_granted && (
                      <Chip
                        icon={<EarlyAccessIcon />}
                        label="Early Access"
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                      {phase.planned_weeks} weeks
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(calculatePhaseProgress(phase))}%
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Phase Information and Hours - Responsive Layout */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 3
                  }}>
                    {/* Phase Information */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Phase Details
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="body2">
                          <strong>Order:</strong> {phase.phase_order}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Type:</strong> {phase.is_custom ? 'Custom Phase' : 'Standard Phase'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Planned Start:</strong> {phase.planned_start_date ? new Date(phase.planned_start_date).toLocaleDateString() : 'Not set'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Planned End:</strong> {phase.planned_end_date ? new Date(phase.planned_end_date).toLocaleDateString() : 'Not set'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Actual Start:</strong> {phase.actual_start_date ? new Date(phase.actual_start_date).toLocaleDateString() : 'Not started'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Actual End:</strong> {phase.actual_end_date ? new Date(phase.actual_end_date).toLocaleDateString() : 'Not completed'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Submitted Date:</strong> {(phase as any).submitted_date ? new Date((phase as any).submitted_date).toLocaleDateString() : 'Not submitted'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Approved Date:</strong> {(phase as any).approved_date ? new Date((phase as any).approved_date).toLocaleDateString() : 'Not approved'}
                        </Typography>
                        {isSupervisor && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DateRangeIcon />}
                              onClick={() => setState(prev => ({
                                ...prev,
                                editPhaseDatesDialog: { open: true, phase }
                              }))}
                            >
                              Edit Phase Dates
                            </Button>
                          </Box>
                        )}
                        {phase.early_access_granted && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                              <EarlyAccessIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' }} />
                              Early Access Granted
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong> {phase.early_access_status?.replace('_', ' ') || 'Unknown'}
                            </Typography>
                            {phase.early_access_granted_at && (
                              <Typography variant="body2">
                                <strong>Granted At:</strong> {new Date(phase.early_access_granted_at).toLocaleDateString()}
                              </Typography>
                            )}
                            {phase.early_access_note && (
                              <Typography variant="body2">
                                <strong>Note:</strong> {phase.early_access_note}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>

                    {/* Phase Hours and Progress */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Hours & Progress
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="body2">
                          <strong>Planned Weeks:</strong> {phase.planned_weeks}
                        </Typography>
                        {phase.predicted_hours && (
                          <Typography variant="body2">
                            <strong>Predicted Hours:</strong> {phase.predicted_hours}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          <strong>Actual Hours:</strong> {phase.actual_hours || 0}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Progress Hours:</strong> {Math.round(calculatePhaseProgress(phase))}%
                        </Typography>
                        {phase.actual_progress !== undefined && phase.actual_progress !== null && (
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            <strong>Actual Working Progress (Supervisor):</strong> {Math.round(phase.actual_progress)}%
                          </Typography>
                        )}
                        <Typography variant="body2">
                          <strong>Delay Reason:</strong> {phase.delay_reason === 'none' ? 'No delays' : phase.delay_reason}
                        </Typography>
                        {phase.warning_flag && (
                          <Chip
                            icon={<WarningIcon />}
                            label="Warning Flag"
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Phase Actions */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Phase Actions
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {/* Standard Phase Actions */}
                      {(phase.status === 'ready' || canStartWithEarlyAccess(phase)) && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={phase.early_access_granted && phase.early_access_status === 'accessible' ? <FastForwardIcon /> : <PlayArrowIcon />}
                          onClick={() => handleStartPhaseWithEarlyAccess(phase.id,
                            phase.early_access_granted ? 'Starting phase with early access' : 'Starting phase normally')}
                        >
                          {phase.early_access_granted && phase.early_access_status === 'accessible' ? 'Start with Early Access' : 'Start Phase'}
                        </Button>
                      )}
                      {phase.status === 'in_progress' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handlePhaseAction(phase.id, 'submit')}
                        >
                          Submit for Review
                        </Button>
                      )}
                      {phase.status === 'submitted' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handlePhaseAction(phase.id, 'approve')}
                        >
                          Approve Phase
                        </Button>
                      )}
                      {phase.status === 'approved' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handlePhaseAction(phase.id, 'complete')}
                        >
                          Mark Complete
                        </Button>
                      )}

                      {/* Early Access Controls - Supervisor Only */}
                      {isSupervisor && (
                        <>
                          {isEarlyAccessAvailable(phase) && (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<LockOpenIcon />}
                              onClick={() => handleGrantEarlyAccess(phase.id, `Early access granted for ${phase.phase_name} by ${user?.name}`)}
                            >
                              Grant Early Access
                            </Button>
                          )}
                          {phase.early_access_granted && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<LockIcon />}
                              onClick={() => handleRevokeEarlyAccess(phase.id, `Early access revoked for ${phase.phase_name} by ${user?.name}`)}
                            >
                              Revoke Early Access
                            </Button>
                          )}
                        </>
                      )}

                      {/* Warning Toggle */}
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={async () => {
                          try {
                            await apiService.markPhaseWarning(phase.id, !phase.warning_flag);
                            await fetchProjectDetails();
                          } catch (error) {
                            console.error('Error toggling warning:', error);
                          }
                        }}
                      >
                        {phase.warning_flag ? 'Remove Warning' : 'Add Warning'}
                      </Button>

                      {/* Manage Progress Button */}
                      {isSupervisor && phase.predicted_hours && phase.predicted_hours > 0 && (
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          startIcon={<AssessmentIcon />}
                          onClick={() => {
                            setSelectedPhaseForProgress(phase);
                            setProgressSummaryOpen(true);
                          }}
                        >
                          Manage Progress
                        </Button>
                      )}

                      {/* Manual Work Log Button - Supervisor/Administrator Only */}
                      {(user?.role === 'supervisor' || user?.role === 'administrator') && (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          startIcon={<AccessTimeIcon />}
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              addManualWorkLogDialog: {
                                open: true,
                                phase: phase
                              }
                            }));
                          }}
                        >
                          Add Work Log
                        </Button>
                      )}

                      {/* Payment Tracking Button - Supervisor/Administrator Only */}
                      {(user?.role === 'supervisor' || user?.role === 'administrator') && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<TrendingUpIcon />}
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              paymentDialog: {
                                open: true,
                                phase: phase
                              }
                            }));
                          }}
                        >
                          Payment Tracking
                        </Button>
                      )}
                    </Box>

                    {/* Progress Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" gutterBottom sx={{ mb: 0 }}>
                          Progress Hours: {Math.round(calculatePhaseProgress(phase))}%
                        </Typography>
                        {phase.actual_progress !== undefined && phase.actual_progress !== calculatePhaseProgress(phase) && (
                          <Typography variant="body2" gutterBottom sx={{ mb: 0, fontWeight: 'bold', color: 'success.main' }}>
                            Actual Work: {Math.round(phase.actual_progress)}%
                          </Typography>
                        )}
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={phase.actual_progress !== undefined ? phase.actual_progress : calculatePhaseProgress(phase)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>

                  {/* Phase Work Logs Summary */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Work Logs for this Phase
                    </Typography>
                    {(() => {
                      const phaseWorkLogs = state.workLogs.filter(log => log.phase_id === phase.id);
                      if (phaseWorkLogs.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            No work logs recorded for this phase yet.
                          </Typography>
                        );
                      }
                      // Group work logs by engineer
                      const engineerSummary = phaseWorkLogs.reduce((acc, log) => {
                        const engineerId = log.engineer_id;
                        if (!acc[engineerId]) {
                          acc[engineerId] = {
                            name: log.engineer_name,
                            totalHours: 0,
                            entries: 0,
                            dates: new Set()
                          };
                        }
                        acc[engineerId].totalHours += parseFloat(log.hours?.toString() || '0');
                        acc[engineerId].entries += 1;
                        acc[engineerId].dates.add(log.date);
                        return acc;
                      }, {} as Record<string, any>);

                      const totalPhaseHours = phaseWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);

                      return (
                        <Box>
                          <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                            Total: {phaseWorkLogs.length} entries | {totalPhaseHours.toFixed(1)} hours | {Object.keys(engineerSummary).length} engineers
                          </Typography>

                          {/* Engineer Summary Cards */}
                          <Box display="flex" flexDirection="column" gap={1} maxHeight={250} overflow="auto">
                            {Object.values(engineerSummary).map((engineer: any, index) => (
                              <Box key={index} sx={{
                                p: 2,
                                backgroundColor: 'grey.50',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'grey.200'
                              }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                  <Typography variant="body1" fontWeight="bold" color="primary">
                                    👨‍💼 {engineer.name}
                                  </Typography>
                                  <Typography variant="h6" color="success.main" fontWeight="bold">
                                    {engineer.totalHours.toFixed(1)}h
                                  </Typography>
                                </Box>
                                <Box display="flex" gap={2} alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    📝 {engineer.entries} entries
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    📅 {engineer.dates.size} working days
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ⚡ {(engineer.totalHours / engineer.entries).toFixed(1)}h avg/entry
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        {/* Work Logs Tab */}
        <TabPanel value={state.activeTab} index={1}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              All Project Work Logs
            </Typography>
            <Box display="flex" gap={2} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Total entries: {state.workLogs.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total hours: {state.workLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0).toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Engineers: {new Set(state.workLogs.map(log => log.engineer_name)).size}
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.workLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.date ? new Date(log.date).toLocaleDateString() : 'Invalid Date'}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" />
                        {log.engineer_name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.phase_name}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {log.hours || 0}h
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.supervisor_approved ? 'Approved' : 'Pending'}
                        color={log.supervisor_approved ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={log.description || ''}
                      >
                        {log.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {/* Supervisors can edit any log */}
                        {isSupervisor && (
                          <>
                            <Tooltip title="Edit work log">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditWorkLog(log)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete work log permanently">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteWorkLog(log)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {!log.supervisor_approved && (
                          <IconButton
                            size="small"
                            color="success"
                            title="Approve work log"
                            onClick={() => {
                              console.log('Approve work log:', log.id);
                            }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {state.workLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <AccessTimeIcon fontSize="large" color="disabled" />
                        <Typography variant="body1" color="text.secondary">
                          No work logs found for this project
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Work logs will appear here once engineers start logging their time
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Team Tab */}
        <TabPanel value={state.activeTab} index={2}>
          <Box>
            {/* Enhanced Header with Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupsIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" fontWeight="bold">
                  Team Analytics & Management
                </Typography>
                <Badge badgeContent={getFilteredAndSortedTeamMembers().length} color="primary">
                  <PersonIcon />
                </Badge>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchProjectDetails}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Advanced Filter and Sort Controls */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <TextField
                    size="small"
                    placeholder="Search team members..."
                    value={state.teamSearchTerm}
                    onChange={(e) => handleTeamSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ minWidth: 200 }}
                  />

                  {/* Sort By */}
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={state.teamSortBy}
                      onChange={(e) => handleTeamSort(e.target.value as any)}
                      label="Sort By"
                      startAdornment={<SortIcon sx={{ mr: 1 }} />}
                    >
                      <MenuItem value="hours">Total Hours</MenuItem>
                      <MenuItem value="productivity">Productivity</MenuItem>
                      <MenuItem value="recent">Recent Activity</MenuItem>
                      <MenuItem value="alphabetical">Name (A-Z)</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Filter by Phase */}
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Filter Phase</InputLabel>
                    <Select
                      value={state.teamFilterPhase}
                      onChange={(e) => handleTeamFilter(e.target.value)}
                      label="Filter Phase"
                      startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                    >
                      <MenuItem value="">All Phases</MenuItem>
                      {Array.from(new Set(state.phases.map(p => p.phase_name))).map(phaseName => (
                        <MenuItem key={phaseName} value={phaseName}>{phaseName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* View Mode Toggle */}
                  <ToggleButtonGroup
                    value={state.teamViewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && handleTeamViewMode(newMode)}
                    size="small"
                  >
                    <ToggleButton value="cards">
                      <Tooltip title="Card View">
                        <PersonIcon />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="table">
                      <Tooltip title="Table View">
                        <AssessmentIcon />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="analytics">
                      <Tooltip title="Analytics View">
                        <BarChartIcon />
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </CardContent>
            </Card>

            {/* Enhanced Team Analytics Dashboard */}
            {(() => {
              const analytics = calculateTeamAnalytics();
              const teamMembers = getFilteredAndSortedTeamMembers();

              return (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)', color: 'white' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="h6">Team Members</Typography>
                            <Typography variant="h3" fontWeight="bold">{teamMembers.length}</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>Active Contributors</Typography>
                          </Box>
                          <GroupsIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(45deg, #388e3c 30%, #66bb6a 90%)', color: 'white' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="h6">Team Productivity</Typography>
                            <Typography variant="h3" fontWeight="bold">{analytics.averageHoursPerDay.toFixed(1)}</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>Hours/Day Average</Typography>
                          </Box>
                          <SpeedIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(45deg, #f57c00 30%, #ffb74d 90%)', color: 'white' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="h6">Top Performer</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {analytics.topPerformer?.name || 'N/A'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              {analytics.topPerformer ? `${analytics.topPerformer.totalHours.toFixed(1)}h` : 'No data'}
                            </Typography>
                          </Box>
                          <TrophyIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(45deg, #7b1fa2 30%, #ba68c8 90%)', color: 'white' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="h6">Team Velocity</Typography>
                            <Typography variant="h3" fontWeight="bold">{analytics.teamVelocity.toFixed(1)}</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>Productivity Index</Typography>
                          </Box>
                          <TimelineIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              );
            })()}

            {/* Dynamic Content Based on View Mode */}
            {(() => {
              const teamMembers = getFilteredAndSortedTeamMembers();

              if (teamMembers.length === 0) {
                return (
                  <Card sx={{ py: 6 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <GroupsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No team members found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {state.teamSearchTerm || state.teamFilterPhase
                          ? 'Try adjusting your search criteria or filters'
                          : 'Team members will appear here once they start logging work hours'
                        }
                      </Typography>
                    </CardContent>
                  </Card>
                );
              }

              // Card View (Enhanced)
              if (state.teamViewMode === 'cards') {
                return (
                  <Grid container spacing={2}>
                    {teamMembers.map((member: any, index) => {
                      const performance = getPerformanceIndicator(member);
                      const PerformanceIcon = performance.icon;

                      return (
                        <Grid item xs={12} md={6} lg={4} key={member.id}>
                          <Card
                            elevation={3}
                            sx={{
                              height: '100%',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6
                              },
                              position: 'relative',
                              overflow: 'visible'
                            }}
                          >
                            {/* Performance Badge */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: -8,
                                right: 12,
                                zIndex: 1
                              }}
                            >
                              <Tooltip title={performance.label}>
                                <Avatar sx={{ bgcolor: performance.color, width: 32, height: 32 }}>
                                  <PerformanceIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                              </Tooltip>
                            </Box>

                            {/* Rank Badge */}
                            {index < 3 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  left: 12,
                                  zIndex: 1
                                }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : '#cd7f32',
                                    color: 'white',
                                    width: 32,
                                    height: 32,
                                    fontSize: 14,
                                    fontWeight: 'bold'
                                  }}
                                >
                                  #{index + 1}
                                </Avatar>
                              </Box>
                            )}

                            <CardContent sx={{ pt: 3 }}>
                              {/* Member Header */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                  {member.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" fontWeight="bold">
                                    {member.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Last activity: {new Date(member.lastActivity).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Key Metrics */}
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                                  <Typography variant="h6" color="primary" fontWeight="bold">
                                    {member.totalHours.toFixed(1)}h
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Productivity</Typography>
                                  <Typography variant="body1" fontWeight="medium">
                                    {member.productivity.toFixed(1)}h/day
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Recent Activity</Typography>
                                  <Chip
                                    size="small"
                                    label={`${member.recentActivity.toFixed(1)}h`}
                                    color={member.recentActivity > 0 ? 'success' : 'default'}
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>

                              {/* Progress Bar */}
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Project Contribution
                                  </Typography>
                                  <Typography variant="caption" fontWeight="bold">
                                    {((member.totalHours / state.workLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0)) * 100).toFixed(1)}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(member.totalHours / state.workLogs.reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0)) * 100}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>

                              {/* Phases */}
                              <Box>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                  Active Phases ({member.phases.length})
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {member.phases.slice(0, 3).map((phase: string, idx: number) => (
                                    <Chip
                                      key={idx}
                                      label={phase}
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                    />
                                  ))}
                                  {member.phases.length > 3 && (
                                    <Chip
                                      label={`+${member.phases.length - 3}`}
                                      size="small"
                                      variant="filled"
                                      color="default"
                                    />
                                  )}
                                </Box>
                              </Box>
                            </CardContent>

                            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="View Details">
                                  <IconButton size="small" color="primary">
                                    <AssessmentIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Contact">
                                  <IconButton size="small" color="info">
                                    <EmailIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {member.entries} entries
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  • {member.workingDays} days
                                </Typography>
                              </Box>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                );
              }

              // Table View (Professional)
              if (state.teamViewMode === 'table') {
                return (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell align="right">Total Hours</TableCell>
                          <TableCell align="right">Productivity</TableCell>
                          <TableCell align="right">Recent Activity</TableCell>
                          <TableCell align="center">Performance</TableCell>
                          <TableCell>Phases</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {teamMembers.map((member: any, index) => {
                          const performance = getPerformanceIndicator(member);
                          const PerformanceIcon = performance.icon;

                          return (
                            <TableRow key={member.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="h6" fontWeight="bold" color="primary">
                                    #{index + 1}
                                  </Typography>
                                  {index < 3 && <TrophyIcon sx={{ color: 'gold', fontSize: 20 }} />}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" fontWeight="medium">
                                      {member.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Last: {new Date(member.lastActivity).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                  {member.totalHours.toFixed(1)}h
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {member.entries} entries
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight="medium">
                                  {member.productivity.toFixed(1)}h/day
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {member.workingDays} days
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${member.recentActivity.toFixed(1)}h`}
                                  color={member.recentActivity > 0 ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title={performance.label}>
                                  <PerformanceIcon sx={{ color: performance.color, fontSize: 24 }} />
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                                  {member.phases.slice(0, 2).map((phase: string, idx: number) => (
                                    <Chip
                                      key={idx}
                                      label={phase}
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                    />
                                  ))}
                                  {member.phases.length > 2 && (
                                    <Chip
                                      label={`+${member.phases.length - 2}`}
                                      size="small"
                                      variant="filled"
                                      color="default"
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="View Details">
                                    <IconButton size="small" color="primary">
                                      <AssessmentIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Contact">
                                    <IconButton size="small" color="info">
                                      <EmailIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              }

              // Analytics View (Advanced)
              if (state.teamViewMode === 'analytics') {
                const analytics = calculateTeamAnalytics();

                return (
                  <Box>
                    {/* Performance Distribution */}
                    <Card sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Team Performance Analysis
                        </Typography>

                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" gutterBottom>Performance Distribution</Typography>
                            {teamMembers.map((member: any, index) => {
                              const performance = getPerformanceIndicator(member);
                              return (
                                <Box key={member.id} sx={{ mb: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2">{member.name}</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                      {member.productivity.toFixed(1)}h/day
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(member.productivity / Math.max(...teamMembers.map(m => m.productivity))) * 100}
                                    sx={{ height: 8, borderRadius: 4 }}
                                    color={
                                      performance.color.includes('success') ? 'success' :
                                      performance.color.includes('warning') ? 'warning' : 'info'
                                    }
                                  />
                                </Box>
                              );
                            })}
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" gutterBottom>Key Insights</Typography>
                            <List dense>
                              <ListItem>
                                <ListItemIcon>
                                  <TrophyIcon color="warning" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Top Performer"
                                  secondary={`${analytics.topPerformer?.name || 'N/A'} with ${analytics.topPerformer?.totalHours.toFixed(1) || 0}h`}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <SpeedIcon color="info" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Team Velocity"
                                  secondary={`${analytics.teamVelocity.toFixed(1)}h/day average productivity`}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <GroupsIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Active Contributors"
                                  secondary={`${teamMembers.filter(m => m.recentActivity > 0).length} members active in last 7 days`}
                                />
                              </ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Detailed Analytics */}
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Detailed Member Analytics
                        </Typography>

                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Member</TableCell>
                                <TableCell align="right">Total Hours</TableCell>
                                <TableCell align="right">Avg/Entry</TableCell>
                                <TableCell align="right">Efficiency</TableCell>
                                <TableCell align="right">Consistency</TableCell>
                                <TableCell align="right">Recent Trend</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {teamMembers.map((member: any) => (
                                <TableRow key={member.id}>
                                  <TableCell>{member.name}</TableCell>
                                  <TableCell align="right">{member.totalHours.toFixed(1)}h</TableCell>
                                  <TableCell align="right">{member.avgHoursPerEntry.toFixed(1)}h</TableCell>
                                  <TableCell align="right">
                                    {((member.productivity / analytics.averageHoursPerDay) * 100).toFixed(0)}%
                                  </TableCell>
                                  <TableCell align="right">
                                    {((member.workingDays / new Set(state.workLogs.map(l => l.date)).size) * 100).toFixed(0)}%
                                  </TableCell>
                                  <TableCell align="right">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                      {member.recentActivity > member.productivity ? (
                                        <TrendingUpIcon color="success" />
                                      ) : member.recentActivity < member.productivity * 0.7 ? (
                                        <TrendingDownIcon color="warning" />
                                      ) : (
                                        <TimelineIcon color="info" />
                                      )}
                                      <Typography variant="caption">
                                        {member.recentActivity > member.productivity ? 'Rising' :
                                         member.recentActivity < member.productivity * 0.7 ? 'Declining' : 'Stable'}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Box>
                );
              }

              return null;
            })()}
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={state.activeTab} index={3}>
          <Box>
            {/* Enhanced Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" fontWeight="bold">
                  Project Settings & Configuration
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchProjectDetails}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Project Information Section - Enhanced with Live Editing */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    <EditIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Project Information
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setState(prev => ({ ...prev, editProjectDialog: { open: true } }))}
                    size="small"
                  >
                    Edit Project
                  </Button>
                </Box>

                {(
                  // Display Mode
                  <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Project Name
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {state.project?.name}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status
                      </Typography>
                      <Chip
                        label={state.project?.status.replace('_', ' ')}
                        color={getStatusColor(state.project?.status) as any}
                        size="medium"
                      />
                    </Box>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Start Date
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DateRangeIcon color="action" />
                        {state.project?.start_date ? new Date(state.project.start_date).toLocaleDateString() : 'Not set'}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Created Date
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TodayIcon color="action" />
                        {state.project?.created_at ? new Date(state.project.created_at).toLocaleDateString() : 'Unknown'}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Planned Duration
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon color="action" />
                        {state.project?.planned_total_weeks} weeks
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Predicted Hours
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon color="action" />
                        {state.project?.predicted_hours || 'Not set'}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Statistics
                </Typography>

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {state.phases.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Phases
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {state.phases.filter(p => p.status === 'completed' || p.status === 'approved').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed Phases
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {new Set(state.workLogs.map(log => log.engineer_id)).size}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Team Members
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Phase Management */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Phase Management
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Phase</TableCell>
                        <TableCell>Order</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Predicted Hours</TableCell>
                        <TableCell>Actual Hours</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {state.phases.map((phase) => {
                        const phaseHours = state.workLogs
                          .filter(log => log.phase_id === phase.id)
                          .reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);
                        const progress = phase.predicted_hours ? (phaseHours / phase.predicted_hours) * 100 : 0;

                        return (
                          <TableRow key={phase.id}>
                            <TableCell>{phase.phase_name}</TableCell>
                            <TableCell>{phase.phase_order}</TableCell>
                            <TableCell>
                              <Chip
                                label={phase.status.replace('_', ' ')}
                                color={getStatusColor(phase.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{phase.predicted_hours || '-'}</TableCell>
                            <TableCell>{phaseHours.toFixed(1)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(progress, 100)}
                                    sx={{ height: 6, borderRadius: 3 }}
                                  />
                                </Box>
                                <Typography variant="caption">
                                  {Math.round(progress)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <PhaseActionMenu
                                phase={phase}
                                onEdit={async (phaseId, updates) => {
                                  try {
                                    const response = await apiService.updatePhase(phaseId, updates);
                                    if (response.success) {
                                      await fetchProjectDetails();
                                      setState(prev => ({
                                        ...prev,
                                        snackbar: {
                                          open: true,
                                          message: 'Phase updated successfully!',
                                          severity: 'success'
                                        }
                                      }));
                                    }
                                  } catch (error) {
                                    setState(prev => ({
                                      ...prev,
                                      snackbar: {
                                        open: true,
                                        message: 'Failed to update phase',
                                        severity: 'error'
                                      }
                                    }));
                                  }
                                }}
                                onDelete={async (phaseId) => {
                                  try {
                                    const response = await apiService.deletePhase(phaseId);
                                    if (response.success) {
                                      await fetchProjectDetails();
                                      setState(prev => ({
                                        ...prev,
                                        snackbar: {
                                          open: true,
                                          message: 'Phase deleted successfully!',
                                          severity: 'success'
                                        }
                                      }));
                                    }
                                  } catch (error) {
                                    setState(prev => ({
                                      ...prev,
                                      snackbar: {
                                        open: true,
                                        message: 'Failed to delete phase',
                                        severity: 'error'
                                      }
                                    }));
                                  }
                                }}
                                onStart={async (phaseId, note) => {
                                  try {
                                    const response = await apiService.startPhase(phaseId, note);
                                    if (response.success) {
                                      await fetchProjectDetails();
                                      setState(prev => ({
                                        ...prev,
                                        snackbar: {
                                          open: true,
                                          message: 'Phase started successfully!',
                                          severity: 'success'
                                        }
                                      }));
                                    }
                                  } catch (error) {
                                    setState(prev => ({
                                      ...prev,
                                      snackbar: {
                                        open: true,
                                        message: 'Failed to start phase',
                                        severity: 'error'
                                      }
                                    }));
                                  }
                                }}
                                onComplete={async (phaseId, note) => {
                                  try {
                                    const response = await apiService.completePhase(phaseId, note);
                                    if (response.success) {
                                      await fetchProjectDetails();
                                      setState(prev => ({
                                        ...prev,
                                        snackbar: {
                                          open: true,
                                          message: 'Phase completed successfully!',
                                          severity: 'success'
                                        }
                                      }));
                                    }
                                  } catch (error) {
                                    setState(prev => ({
                                      ...prev,
                                      snackbar: {
                                        open: true,
                                        message: 'Failed to complete phase',
                                        severity: 'error'
                                      }
                                    }));
                                  }
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setState(prev => ({ ...prev, addPhaseDialog: { open: true } }))}
                  >
                    Add Phase
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Project Actions */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Actions
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Export Project Data
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Download all project data including work logs and reports
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setState(prev => ({ ...prev, exportDialog: { open: true } }))}
                      startIcon={<ExportIcon />}
                    >
                      Export
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Archive Project
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Archive this project to remove it from active projects list
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      onClick={handleArchiveProject}
                      startIcon={<ArchiveIcon />}
                    >
                      Archive
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 1, bgcolor: 'error.50' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium" color="error">
                        Delete Project
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Permanently delete this project and all associated data
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={handleDeleteProject}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>


            {/* Project Actions - Enhanced */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" />
                  Project Actions & Operations
                </Typography>

                <Grid container spacing={2}>
                  {/* Export Actions */}
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <ExportIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                          <Typography variant="h6" fontWeight="bold">
                            Export Data
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Download complete project data including work logs, phase details, and team analytics
                        </Typography>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<ExportIcon />}
                          onClick={() => setState(prev => ({ ...prev, exportDialog: { open: true } }))}
                          sx={{ mt: 2 }}
                          color="info"
                        >
                          Export Project
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Archive Actions */}
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <ArchiveIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                          <Typography variant="h6" fontWeight="bold">
                            Archive Project
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Archive this project to move it out of active projects while preserving all data
                        </Typography>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<ArchiveIcon />}
                          onClick={handleArchiveProject}
                          sx={{ mt: 2 }}
                          color="warning"
                        >
                          Archive Project
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Danger Zone */}
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%', border: '2px solid', borderColor: 'error.main' }}>
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <DeleteIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                          <Typography variant="h6" fontWeight="bold" color="error">
                            Danger Zone
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Permanently delete this project and all associated data. This action cannot be undone!
                        </Typography>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<DeleteIcon />}
                          onClick={handleDeleteProject}
                          sx={{ mt: 2 }}
                          color="error"
                        >
                          Delete Project
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={state.deleteDialog.open}
        onClose={() => setState(prev => ({ ...prev, deleteDialog: { open: false, project: null } }))}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{state.deleteDialog.project?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action will set the project status to cancelled. All project data will be preserved for historical purposes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setState(prev => ({ ...prev, deleteDialog: { open: false, project: null } }))}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteProject}
            color="error"
            variant="contained"
            disabled={state.loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        open={state.exportDialog.open}
        onClose={() => setState(prev => ({ ...prev, exportDialog: { open: false } }))}
        onExport={handleExportProject}
        phases={state.phases}
        projectName={state.project?.name || ''}
        loading={state.loading}
      />

      {/* New Dialog Components */}
      <EditProjectDialog
        open={state.editProjectDialog.open}
        onClose={() => setState(prev => ({ ...prev, editProjectDialog: { open: false } }))}
        onSave={async (updatedProject) => {
          try {
            const response = await apiService.updateProject(state.project!.id, updatedProject);
            if (response.success) {
              await fetchProjectDetails();
              setState(prev => ({
                ...prev,
                snackbar: {
                  open: true,
                  message: 'Project updated successfully!',
                  severity: 'success'
                }
              }));
            }
          } catch (error) {
            setState(prev => ({
              ...prev,
              snackbar: {
                open: true,
                message: 'Failed to update project',
                severity: 'error'
              }
            }));
          }
        }}
        project={state.project}
        loading={state.loading}
      />

      <AddPhaseDialog
        open={state.addPhaseDialog.open}
        onClose={() => setState(prev => ({ ...prev, addPhaseDialog: { open: false } }))}
        onSave={async (phaseData) => {
          try {
            const response = await apiService.createPhase(state.project!.id, phaseData);
            if (response.success) {
              await fetchProjectDetails();
              setState(prev => ({
                ...prev,
                snackbar: {
                  open: true,
                  message: 'Phase added successfully!',
                  severity: 'success'
                }
              }));
            }
          } catch (error) {
            setState(prev => ({
              ...prev,
              snackbar: {
                open: true,
                message: 'Failed to add phase',
                severity: 'error'
              }
            }));
          }
        }}
        projectId={state.project?.id || 0}
        existingPhases={state.phases.length}
        loading={state.loading}
      />

      {/* Progress Summary Dialog */}
      {selectedPhaseForProgress && (
        <PhaseProgressSummary
          open={progressSummaryOpen}
          onClose={() => {
            setProgressSummaryOpen(false);
            setSelectedPhaseForProgress(null);
          }}
          phaseId={selectedPhaseForProgress.id}
          phaseName={selectedPhaseForProgress.phase_name}
          predictedHours={selectedPhaseForProgress.predicted_hours || 0}
          isSupervisor={isSupervisor}
          onProgressUpdated={fetchProjectDetails}
        />
      )}

      {/* Edit Phase Dates Dialog */}
      <EditPhaseDatesDialog
        open={state.editPhaseDatesDialog.open}
        phase={state.editPhaseDatesDialog.phase}
        onClose={() => setState(prev => ({ ...prev, editPhaseDatesDialog: { open: false, phase: null } }))}
        onSuccess={() => {
          fetchProjectDetails();
          setState(prev => ({
            ...prev,
            editPhaseDatesDialog: { open: false, phase: null },
            snackbar: {
              open: true,
              message: 'Phase dates updated successfully!',
              severity: 'success'
            }
          }));
        }}
      />

      {/* Edit Work Log Dialog */}
      <EditWorkLogDialog
        open={state.editWorkLogDialog.open}
        onClose={handleCloseEditWorkLogDialog}
        workLog={state.editWorkLogDialog.workLog}
        onSave={handleSaveWorkLog}
      />

      {/* Delete Work Log Confirmation Dialog */}
      <DeleteWorkLogDialog
        open={state.deleteWorkLogDialog.open}
        onClose={handleCloseDeleteWorkLogDialog}
        workLog={state.deleteWorkLogDialog.workLog}
        onDelete={handleConfirmDeleteWorkLog}
      />

      {/* Add Manual Work Log Dialog - For Supervisors/Administrators */}
      {state.addManualWorkLogDialog.phase && (
        <AddManualWorkLogDialog
          open={state.addManualWorkLogDialog.open}
          onClose={() => setState(prev => ({
            ...prev,
            addManualWorkLogDialog: {
              open: false,
              phase: null
            }
          }))}
          projectId={state.addManualWorkLogDialog.phase.project_id}
          phaseId={state.addManualWorkLogDialog.phase.id}
          phaseName={state.addManualWorkLogDialog.phase.phase_name}
          phaseStatus={state.addManualWorkLogDialog.phase.status}
          onSuccess={() => {
            fetchProjectDetails();
            setState(prev => ({
              ...prev,
              snackbar: {
                open: true,
                message: 'Work log added successfully!',
                severity: 'success'
              }
            }));
          }}
        />
      )}

      {/* Phase Payment Dialog - For Supervisors/Administrators */}
      {state.paymentDialog.phase && (
        <PhasePaymentDialog
          open={state.paymentDialog.open}
          onClose={() => setState(prev => ({
            ...prev,
            paymentDialog: {
              open: false,
              phase: null
            }
          }))}
          phaseId={state.paymentDialog.phase.id}
          phaseName={state.paymentDialog.phase.phase_name}
          onSuccess={() => {
            fetchProjectDetails();
            setState(prev => ({
              ...prev,
              snackbar: {
                open: true,
                message: 'Payment information updated successfully!',
                severity: 'success'
              }
            }));
          }}
        />
      )}

      {/* Early Access Notifications Snackbar */}
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={6000}
        onClose={() => setState(prev => ({ ...prev, snackbar: { ...prev.snackbar, open: false } }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setState(prev => ({ ...prev, snackbar: { ...prev.snackbar, open: false } }))}
          severity={state.snackbar.severity}
          sx={{ width: '100%' }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectDetailsPage;