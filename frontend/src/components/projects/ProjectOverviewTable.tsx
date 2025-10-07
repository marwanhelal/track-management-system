import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Avatar,
  AvatarGroup,
  Tooltip,
  Badge,
  Button
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ExpandLessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { ComprehensiveOverviewData, PhaseDetail, DeadlineInfo } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ProjectOverviewTableProps {
  projects: ComprehensiveOverviewData[];
  refreshing?: boolean;
}

type Order = 'asc' | 'desc';

const ProjectOverviewTable: React.FC<ProjectOverviewTableProps> = ({
  projects,
  refreshing = false
}) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [orderBy, setOrderBy] = useState<keyof ComprehensiveOverviewData>('health_score');
  const [order, setOrder] = useState<Order>('desc');

  const handleSort = (property: keyof ComprehensiveOverviewData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const toggleExpanded = (projectId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedRows(newExpanded);
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (orderBy === 'project_name') {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      if (order === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    }

    const aVal = a[orderBy] as number;
    const bVal = b[orderBy] as number;
    if (order === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'on_hold': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'submitted': return 'info';
      case 'approved': return 'secondary';
      case 'ready': return 'warning';
      default: return 'default';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getDeadlineSeverityIcon = (deadline: DeadlineInfo) => {
    if (deadline.severity === 'critical') {
      return <ErrorIcon fontSize="small" color="error" />;
    }
    if (deadline.severity === 'warning') {
      return <WarningIcon fontSize="small" color="warning" />;
    }
    return <ScheduleIcon fontSize="small" color="info" />;
  };

  const renderPhaseRow = (phase: PhaseDetail) => (
    <Box key={phase.id} display="flex" alignItems="center" gap={2} mb={2} p={2}
         sx={{ backgroundColor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
      <Chip
        size="medium"
        label={phase.phase_name}
        color={getPhaseStatusColor(phase.status)}
        variant="filled"
        sx={{ minWidth: 120, fontWeight: 600 }}
      />
      <Box display="flex" flexDirection="column" alignItems="center" minWidth={100}>
        <Typography variant="body2" color="text.secondary" fontWeight="500">
          {formatHours(phase.actual_hours)} / {formatHours(phase.predicted_hours)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Hours logged
        </Typography>
      </Box>
      <Box flexGrow={1} mx={2}>
        <LinearProgress
          variant="determinate"
          value={phase.actual_progress !== undefined && phase.actual_progress !== null ? phase.actual_progress : phase.progress_percentage}
          sx={{ height: 10, borderRadius: 5 }}
          color={(phase.actual_progress !== undefined && phase.actual_progress !== null ? phase.actual_progress : phase.progress_percentage) >= 80 ? 'success' :
                 (phase.actual_progress !== undefined && phase.actual_progress !== null ? phase.actual_progress : phase.progress_percentage) >= 50 ? 'primary' : 'warning'}
        />
      </Box>
      <Box display="flex" flexDirection="column" alignItems="flex-end" minWidth={80}>
        {phase.actual_progress !== undefined && phase.actual_progress !== null ? (
          <>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              {Math.round(phase.actual_progress)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({phase.progress_percentage}% hours)
            </Typography>
          </>
        ) : (
          <Typography variant="h6" fontWeight="bold">
            {phase.progress_percentage}%
          </Typography>
        )}
      </Box>
      {phase.warning_flag && (
        <Tooltip title="Phase has warnings" arrow>
          <WarningIcon fontSize="medium" color="warning" />
        </Tooltip>
      )}
    </Box>
  );

  return (
    <Box>
      <TableContainer component={Paper} elevation={0}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: 'grey.50', fontWeight: 600, fontSize: '0.875rem' } }}>
              <TableCell width={50} sx={{ borderRight: '1px solid', borderColor: 'divider' }} />
              <TableCell sx={{ minWidth: 250, borderRight: '1px solid', borderColor: 'divider' }}>
                <TableSortLabel
                  active={orderBy === 'project_name'}
                  direction={orderBy === 'project_name' ? order : 'asc'}
                  onClick={() => handleSort('project_name')}
                  sx={{ fontWeight: 600 }}
                >
                  Project Details
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={600}>Status</Typography>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 140, borderRight: '1px solid', borderColor: 'divider' }}>
                <TableSortLabel
                  active={orderBy === 'progress_percentage'}
                  direction={orderBy === 'progress_percentage' ? order : 'asc'}
                  onClick={() => handleSort('progress_percentage')}
                  sx={{ fontWeight: 600 }}
                >
                  Progress & Phases
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={600}>Team</Typography>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 100, borderRight: '1px solid', borderColor: 'divider' }}>
                <TableSortLabel
                  active={orderBy === 'health_score'}
                  direction={orderBy === 'health_score' ? order : 'asc'}
                  onClick={() => handleSort('health_score')}
                  sx={{ fontWeight: 600 }}
                >
                  Health Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, borderRight: '1px solid', borderColor: 'divider' }}>
                <TableSortLabel
                  active={orderBy === 'warnings_count'}
                  direction={orderBy === 'warnings_count' ? order : 'asc'}
                  onClick={() => handleSort('warnings_count')}
                  sx={{ fontWeight: 600 }}
                >
                  Issues & Warnings
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 100 }}>
                <Typography variant="subtitle2" fontWeight={600}>Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedProjects.map((project) => (
              <React.Fragment key={project.project_id}>
                <TableRow hover sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'primary.50' },
                  '& .MuiTableCell-root': { borderRight: '1px solid', borderColor: 'divider', py: 2 }
                }}>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => toggleExpanded(project.project_id)}
                    >
                      {expandedRows.has(project.project_id) ? (
                        <ExpandMoreIcon />
                      ) : (
                        <ExpandLessIcon />
                      )}
                    </IconButton>
                  </TableCell>

                  <TableCell onClick={() => toggleExpanded(project.project_id)}>
                    <Box>
                      <Typography variant="h6" fontWeight="600" color="primary.main" gutterBottom>
                        {project.project_name}
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Typography variant="body2" fontWeight="500">
                          📊 {formatHours(project.actual_hours)} / {formatHours(project.predicted_hours)} hours logged
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          👤 Created by {project.created_by_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          📅 Started: {formatDate(project.start_date)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      size="medium"
                      label={project.project_status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(project.project_status)}
                      variant="filled"
                      sx={{ fontWeight: 600, fontSize: '0.75rem', minWidth: 80 }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      {project.actual_progress !== undefined && project.actual_progress !== null ? (
                        <>
                          <Typography variant="h6" fontWeight="bold" color="success.main">
                            {Math.round(project.actual_progress)}%
                          </Typography>
                          <Typography variant="caption" color="success.main" fontWeight="600">
                            Actual Working Progress
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={project.actual_progress}
                            sx={{ width: '100px', height: 10, borderRadius: 5 }}
                            color={project.actual_progress >= 80 ? 'success' :
                                   project.actual_progress >= 50 ? 'primary' : 'warning'}
                          />
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            ({project.progress_percentage}% hours-based)
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="h6" fontWeight="bold" color={project.progress_percentage >= 80 ? 'success.main' : project.progress_percentage >= 50 ? 'primary.main' : 'warning.main'}>
                            {project.progress_percentage}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress_percentage}
                            sx={{ width: '100px', height: 10, borderRadius: 5 }}
                            color={project.progress_percentage >= 80 ? 'success' :
                                   project.progress_percentage >= 50 ? 'primary' : 'warning'}
                          />
                        </>
                      )}
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        {project.completed_phases}/{project.current_phases.length} phases done
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <AvatarGroup max={4} sx={{ justifyContent: 'center', '& .MuiAvatar-root': { width: 36, height: 36, fontSize: '0.8rem', fontWeight: 600 } }}>
                        {project.engineer_breakdown.map((engineer) => (
                          <Tooltip
                            key={engineer.engineer_id}
                            title={`${engineer.engineer_name} - ${formatHours(engineer.total_hours)}`}
                            arrow
                          >
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {engineer.engineer_name.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        {project.engineer_breakdown.length} team members
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{ color: getHealthScoreColor(project.health_score) }}
                      >
                        {project.health_score}%
                      </Typography>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {project.health_score >= 80 ? (
                          <>
                            <CheckCircleIcon fontSize="medium" color="success" />
                            <Typography variant="caption" color="success.main" fontWeight="600">Excellent</Typography>
                          </>
                        ) : project.health_score >= 60 ? (
                          <>
                            <WarningIcon fontSize="medium" color="warning" />
                            <Typography variant="caption" color="warning.main" fontWeight="600">Good</Typography>
                          </>
                        ) : (
                          <>
                            <ErrorIcon fontSize="medium" color="error" />
                            <Typography variant="caption" color="error.main" fontWeight="600">Needs Attention</Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      {project.warnings_count > 0 ? (
                        <>
                          <Badge badgeContent={project.warnings_count} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', fontWeight: 600 } }}>
                            <WarningIcon fontSize="large" color="warning" />
                          </Badge>
                          <Typography variant="body2" color="error" fontWeight="600">
                            {project.warnings_count} active issues
                          </Typography>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon fontSize="large" color="success" />
                          <Typography variant="body2" color="success.main" fontWeight="600">
                            All Clear
                          </Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Tooltip title="View Project Details" arrow>
                      <IconButton
                        size="medium"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          width: 40,
                          height: 40
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.project_id}`);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                {/* Expanded Row Content */}
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 0 }}>
                    <Collapse in={expandedRows.has(project.project_id)} timeout="auto">
                      <Box sx={{ margin: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom color="primary.main" fontWeight="600">
                          📋 Active Phases ({project.total_active_phases} of {project.current_phases.length})
                        </Typography>

                        <Box mb={2}>
                          {project.current_phases
                            .filter(phase => phase.status !== 'completed')
                            .map(renderPhaseRow)}
                        </Box>

                        {project.approaching_deadlines.length > 0 && (
                          <>
                            <Typography variant="h6" color="error" gutterBottom fontWeight="600">
                              ⚠️ Approaching Deadlines
                            </Typography>
                            <Box mb={2}>
                              {project.approaching_deadlines.map((deadline) => (
                                <Box key={deadline.phase_id} display="flex" alignItems="center" gap={1} mb={1}>
                                  {getDeadlineSeverityIcon(deadline)}
                                  <Typography variant="body2">
                                    {deadline.phase_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Due: {formatDate(deadline.planned_end_date)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={deadline.is_overdue ? 'OVERDUE' : `${deadline.days_until_deadline} days`}
                                    color={deadline.is_overdue ? 'error' : deadline.severity === 'critical' ? 'error' : 'warning'}
                                    variant="filled"
                                  />
                                </Box>
                              ))}
                            </Box>
                          </>
                        )}

                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={2} borderTop={1} borderColor="divider">
                          <Box>
                            <Typography variant="body2" color="text.secondary" fontWeight="500">
                              📅 Last activity: {formatDate(project.last_activity_date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight="500">
                              🎯 Est. completion: {formatDate(project.estimated_completion_date)}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="medium"
                            startIcon={<TrendingUpIcon />}
                            onClick={() => navigate(`/projects/${project.project_id}`)}
                            sx={{ fontWeight: 600, px: 3 }}
                          >
                            View Full Details
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {projects.length === 0 && (
        <Box p={4} textAlign="center">
          <Typography variant="h6" color="text.secondary">
            No active projects found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new project to get started
          </Typography>
        </Box>
      )}

      {refreshing && (
        <Box position="fixed" top={16} right={16}>
          <Chip
            icon={<TrendingUpIcon />}
            label="Refreshing..."
            color="primary"
            variant="filled"
          />
        </Box>
      )}
    </Box>
  );
};

export default ProjectOverviewTable;