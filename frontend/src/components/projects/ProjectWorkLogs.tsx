import React, { memo, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Avatar,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { WorkLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectWorkLogsProps {
  workLogs: WorkLog[];
  loading: boolean;
  onApproveWorkLog?: (workLogId: number) => void;
}

const ProjectWorkLogs: React.FC<ProjectWorkLogsProps> = memo(({
  workLogs,
  loading,
  onApproveWorkLog
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Get unique values for filters
  const uniquePhases = useMemo(() => {
    const phases = Array.from(new Set(workLogs.map(log => log.phase_name)));
    return phases.sort();
  }, [workLogs]);

  const uniqueEngineers = useMemo(() => {
    const engineers = Array.from(new Set(workLogs.map(log => log.engineer_name)));
    return engineers.sort();
  }, [workLogs]);

  // Filter work logs based on current filters
  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter(log => {
      const matchesSearch = !searchTerm ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.engineer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.phase_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPhase = !phaseFilter || log.phase_name === phaseFilter;
      const matchesEngineer = !engineerFilter || log.engineer_name === engineerFilter;

      const matchesApproval = !approvalFilter ||
        (approvalFilter === 'approved' && log.supervisor_approved) ||
        (approvalFilter === 'pending' && !log.supervisor_approved);

      return matchesSearch && matchesPhase && matchesEngineer && matchesApproval;
    });
  }, [workLogs, searchTerm, phaseFilter, engineerFilter, approvalFilter]);

  // Paginated work logs
  const paginatedWorkLogs = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredWorkLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredWorkLogs, page, rowsPerPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEngineerInitials = (name: string | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPhaseFilter('');
    setEngineerFilter('');
    setApprovalFilter('');
    setPage(0);
  };

  if (workLogs.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Work Logs
          </Typography>
          <Alert severity="info">
            No work logs have been recorded for this project yet.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Work Logs ({workLogs.length})
          </Typography>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search work logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Phase</InputLabel>
            <Select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              label="Phase"
            >
              <MenuItem value="">All Phases</MenuItem>
              {uniquePhases.map(phase => (
                <MenuItem key={phase} value={phase}>{phase}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Engineer</InputLabel>
            <Select
              value={engineerFilter}
              onChange={(e) => setEngineerFilter(e.target.value)}
              label="Engineer"
            >
              <MenuItem value="">All Engineers</MenuItem>
              {uniqueEngineers.map(engineer => (
                <MenuItem key={engineer} value={engineer}>{engineer}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {isSupervisor && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Approval</InputLabel>
              <Select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                label="Approval"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          )}

          {(searchTerm || phaseFilter || engineerFilter || approvalFilter) && (
            <Chip
              label="Clear Filters"
              onDelete={clearFilters}
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        {filteredWorkLogs.length === 0 ? (
          <Alert severity="info">
            No work logs match the current filters.
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Engineer</TableCell>
                    <TableCell>Phase</TableCell>
                    <TableCell align="right">Hours</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Logged At</TableCell>
                    {isSupervisor && <TableCell align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedWorkLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(log.date)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {getEngineerInitials(log.engineer_name)}
                          </Avatar>
                          <Typography variant="body2">
                            {log.engineer_name}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {log.phase_name}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {log.hours}h
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {log.description || 'No description'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          icon={log.supervisor_approved ? <ApprovedIcon /> : <PendingIcon />}
                          label={log.supervisor_approved ? 'Approved' : 'Pending'}
                          color={log.supervisor_approved ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(log.created_at)} {formatTime(log.created_at)}
                        </Typography>
                      </TableCell>

                      {isSupervisor && (
                        <TableCell align="center">
                          {!log.supervisor_approved && onApproveWorkLog && (
                            <Tooltip title="Approve Work Log">
                              <IconButton
                                size="small"
                                onClick={() => onApproveWorkLog(log.id)}
                                disabled={loading}
                              >
                                <ApprovedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredWorkLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
});

ProjectWorkLogs.displayName = 'ProjectWorkLogs';

export default ProjectWorkLogs;