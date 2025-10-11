import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  DeleteForever as DeleteForeverIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'engineer' | 'administrator';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_work_logs?: number;
  total_hours?: number;
}

interface TeamManagementState {
  users: User[];
  loading: boolean;
  error: string | null;
  createDialog: {
    open: boolean;
    loading: boolean;
    formData: {
      name: string;
      email: string;
      password: string;
    };
    errors: Record<string, string>;
  };
  createSupervisorDialog: {
    open: boolean;
    loading: boolean;
    formData: {
      name: string;
      email: string;
      password: string;
    };
    errors: Record<string, string>;
  };
  createAdministratorDialog: {
    open: boolean;
    loading: boolean;
    formData: {
      name: string;
      email: string;
      password: string;
    };
    errors: Record<string, string>;
  };
  editDialog: {
    open: boolean;
    loading: boolean;
    user: User | null;
    formData: {
      name: string;
      email: string;
      is_active: boolean;
    };
    errors: Record<string, string>;
  };
  deleteDialog: {
    open: boolean;
    user: User | null;
  };
  permanentDeleteDialog: {
    open: boolean;
    user: User | null;
  };
  exportDialog: {
    open: boolean;
    loading: boolean;
    format: 'csv' | 'json' | 'pdf';
  };
  actionMenuAnchor: HTMLElement | null;
  selectedUser: User | null;
}

const TeamManagementPage: React.FC = () => {
  const [state, setState] = useState<TeamManagementState>({
    users: [],
    loading: true,
    error: null,
    createDialog: {
      open: false,
      loading: false,
      formData: {
        name: '',
        email: '',
        password: ''
      },
      errors: {}
    },
    createSupervisorDialog: {
      open: false,
      loading: false,
      formData: {
        name: '',
        email: '',
        password: ''
      },
      errors: {}
    },
    createAdministratorDialog: {
      open: false,
      loading: false,
      formData: {
        name: '',
        email: '',
        password: ''
      },
      errors: {}
    },
    editDialog: {
      open: false,
      loading: false,
      user: null,
      formData: {
        name: '',
        email: '',
        is_active: true
      },
      errors: {}
    },
    deleteDialog: {
      open: false,
      user: null
    },
    permanentDeleteDialog: {
      open: false,
      user: null
    },
    exportDialog: {
      open: false,
      loading: false,
      format: 'pdf'
    },
    actionMenuAnchor: null,
    selectedUser: null
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiService.getUsers();

      if (response.success && response.data) {
        const { users } = response.data;
        setState(prev => ({
          ...prev,
          users,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch users',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch users',
        loading: false
      }));
    }
  };

  const handleCreateEngineer = () => {
    setState(prev => ({
      ...prev,
      createDialog: {
        ...prev.createDialog,
        open: true,
        formData: { name: '', email: '', password: '' },
        errors: {}
      }
    }));
  };

  const handleCreateSubmit = async () => {
    const { formData } = state.createDialog;
    const errors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        createDialog: { ...prev.createDialog, errors }
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        createDialog: { ...prev.createDialog, loading: true, errors: {} }
      }));

      const response = await apiService.createEngineer(formData);

      if (response.success) {
        setState(prev => ({
          ...prev,
          createDialog: {
            open: false,
            loading: false,
            formData: { name: '', email: '', password: '' },
            errors: {}
          }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          createDialog: {
            ...prev.createDialog,
            loading: false,
            errors: { general: response.error || 'Failed to create engineer account' }
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        createDialog: {
          ...prev.createDialog,
          loading: false,
          errors: { general: 'Failed to create engineer account' }
        }
      }));
    }
  };

  const handleCreateSupervisor = () => {
    setState(prev => ({
      ...prev,
      createSupervisorDialog: {
        ...prev.createSupervisorDialog,
        open: true,
        formData: { name: '', email: '', password: '' },
        errors: {}
      }
    }));
  };

  const handleCreateSupervisorSubmit = async () => {
    const { formData } = state.createSupervisorDialog;
    const errors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        createSupervisorDialog: { ...prev.createSupervisorDialog, errors }
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        createSupervisorDialog: { ...prev.createSupervisorDialog, loading: true, errors: {} }
      }));

      const response = await apiService.createSupervisor(formData);

      if (response.success) {
        setState(prev => ({
          ...prev,
          createSupervisorDialog: {
            open: false,
            loading: false,
            formData: { name: '', email: '', password: '' },
            errors: {}
          }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          createSupervisorDialog: {
            ...prev.createSupervisorDialog,
            loading: false,
            errors: { general: response.error || 'Failed to create supervisor account' }
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        createSupervisorDialog: {
          ...prev.createSupervisorDialog,
          loading: false,
          errors: { general: 'Failed to create supervisor account' }
        }
      }));
    }
  };

  const handleCreateAdministrator = () => {
    setState(prev => ({
      ...prev,
      createAdministratorDialog: {
        ...prev.createAdministratorDialog,
        open: true,
        formData: { name: '', email: '', password: '' },
        errors: {}
      }
    }));
  };

  const handleCreateAdministratorSubmit = async () => {
    const { formData } = state.createAdministratorDialog;
    const errors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        createAdministratorDialog: { ...prev.createAdministratorDialog, errors }
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        createAdministratorDialog: { ...prev.createAdministratorDialog, loading: true, errors: {} }
      }));

      const response = await apiService.createAdministrator(formData);

      if (response.success) {
        setState(prev => ({
          ...prev,
          createAdministratorDialog: {
            open: false,
            loading: false,
            formData: { name: '', email: '', password: '' },
            errors: {}
          }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          createAdministratorDialog: {
            ...prev.createAdministratorDialog,
            loading: false,
            errors: { general: response.error || 'Failed to create administrator account' }
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        createAdministratorDialog: {
          ...prev.createAdministratorDialog,
          loading: false,
          errors: { general: 'Failed to create administrator account' }
        }
      }));
    }
  };

  const handleEditUser = (user: User) => {
    setState(prev => ({
      ...prev,
      editDialog: {
        open: true,
        loading: false,
        user,
        formData: {
          name: user.name,
          email: user.email,
          is_active: user.is_active
        },
        errors: {}
      },
      actionMenuAnchor: null,
      selectedUser: null
    }));
  };

  const handleEditSubmit = async () => {
    const { user, formData } = state.editDialog;
    if (!user) return;

    const errors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        editDialog: { ...prev.editDialog, errors }
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        editDialog: { ...prev.editDialog, loading: true, errors: {} }
      }));

      const response = await apiService.updateUser(user.id, formData);

      if (response.success) {
        setState(prev => ({
          ...prev,
          editDialog: {
            open: false,
            loading: false,
            user: null,
            formData: { name: '', email: '', is_active: true },
            errors: {}
          }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          editDialog: {
            ...prev.editDialog,
            loading: false,
            errors: { general: response.error || 'Failed to update user' }
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        editDialog: {
          ...prev.editDialog,
          loading: false,
          errors: { general: 'Failed to update user' }
        }
      }));
    }
  };

  const handleDeactivateUser = (user: User) => {
    setState(prev => ({
      ...prev,
      deleteDialog: { open: true, user },
      actionMenuAnchor: null,
      selectedUser: null
    }));
  };

  const handleDeleteUser = (user: User) => {
    setState(prev => ({
      ...prev,
      permanentDeleteDialog: { open: true, user },
      actionMenuAnchor: null,
      selectedUser: null
    }));
  };

  const confirmDeactivateUser = async () => {
    const { user } = state.deleteDialog;
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.deactivateUser(user.id);

      if (response.success) {
        setState(prev => ({
          ...prev,
          deleteDialog: { open: false, user: null }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to deactivate user',
          loading: false,
          deleteDialog: { open: false, user: null }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to deactivate user',
        loading: false,
        deleteDialog: { open: false, user: null }
      }));
    }
  };

  const confirmDeleteUser = async () => {
    const { user } = state.permanentDeleteDialog;
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.deleteUser(user.id);

      if (response.success) {
        setState(prev => ({
          ...prev,
          permanentDeleteDialog: { open: false, user: null }
        }));
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to delete user permanently',
          loading: false,
          permanentDeleteDialog: { open: false, user: null }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete user permanently',
        loading: false,
        permanentDeleteDialog: { open: false, user: null }
      }));
    }
  };

  const handleReactivateUser = async (user: User) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await apiService.reactivateUser(user.id);

      if (response.success) {
        await fetchUsers();
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to reactivate user',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to reactivate user',
        loading: false
      }));
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setState(prev => ({
      ...prev,
      actionMenuAnchor: event.currentTarget,
      selectedUser: user
    }));
  };

  const handleActionClose = () => {
    setState(prev => ({
      ...prev,
      actionMenuAnchor: null,
      selectedUser: null
    }));
  };

  const handleExportReport = () => {
    setState(prev => ({
      ...prev,
      exportDialog: { ...prev.exportDialog, open: true }
    }));
  };

  const handleExportSubmit = async () => {
    try {
      setState(prev => ({
        ...prev,
        exportDialog: { ...prev.exportDialog, loading: true }
      }));

      const format = state.exportDialog.format;
      const exportData = state.users.map(user => ({
        Name: user.name,
        Email: user.email,
        Role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        Status: user.is_active ? 'Active' : 'Inactive',
        'Work Logs': user.total_work_logs || 0,
        'Total Hours': user.total_hours || 0,
        'Created Date': new Date(user.created_at).toLocaleDateString()
      }));

      if (format === 'json') {
        // Export as JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `team-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Export as CSV
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [
          headers.join(','),
          ...exportData.map(row => headers.map(header => {
            const value = row[header as keyof typeof row];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(','))
        ];
        const csvStr = csvRows.join('\n');
        const dataBlob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `team-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // Export as PDF - open a new window with printable view
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Team Report</title>
              <style>
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
                body {
                  font-family: Arial, sans-serif;
                  padding: 40px;
                  color: #333;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 3px solid #1976d2;
                  padding-bottom: 20px;
                }
                .header h1 {
                  margin: 0;
                  color: #1976d2;
                  font-size: 28px;
                }
                .header p {
                  margin: 10px 0 0 0;
                  color: #666;
                  font-size: 14px;
                }
                .summary {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 20px;
                  margin-bottom: 30px;
                }
                .summary-card {
                  background: #f5f5f5;
                  padding: 20px;
                  border-radius: 8px;
                  text-align: center;
                  border-left: 4px solid #1976d2;
                }
                .summary-card h3 {
                  margin: 0;
                  font-size: 32px;
                  color: #1976d2;
                }
                .summary-card p {
                  margin: 10px 0 0 0;
                  color: #666;
                  font-size: 14px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 20px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                th {
                  background: #1976d2;
                  color: white;
                  padding: 12px;
                  text-align: left;
                  font-weight: 600;
                  font-size: 14px;
                }
                td {
                  padding: 12px;
                  border-bottom: 1px solid #ddd;
                  font-size: 13px;
                }
                tr:hover {
                  background: #f5f5f5;
                }
                .status-active {
                  color: #4caf50;
                  font-weight: 600;
                }
                .status-inactive {
                  color: #f44336;
                  font-weight: 600;
                }
                .role-supervisor {
                  background: #1976d2;
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  display: inline-block;
                }
                .role-engineer {
                  background: #757575;
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  display: inline-block;
                }
                .footer {
                  margin-top: 40px;
                  text-align: center;
                  color: #999;
                  font-size: 12px;
                  border-top: 1px solid #ddd;
                  padding-top: 20px;
                }
                .print-button {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #1976d2;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .print-button:hover {
                  background: #1565c0;
                }
              </style>
            </head>
            <body>
              <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>

              <div class="header">
                <h1>Team Management Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
              </div>

              <div class="summary">
                <div class="summary-card">
                  <h3>${state.users.length}</h3>
                  <p>Total Users</p>
                </div>
                <div class="summary-card">
                  <h3>${state.users.filter(u => u.is_active).length}</h3>
                  <p>Active Users</p>
                </div>
                <div class="summary-card">
                  <h3>${state.users.filter(u => u.role === 'engineer').length}</h3>
                  <p>Engineers</p>
                </div>
                <div class="summary-card">
                  <h3>${state.users.filter(u => u.role === 'supervisor').length}</h3>
                  <p>Supervisors</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Work Logs</th>
                    <th>Total Hours</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.users.map(user => `
                    <tr>
                      <td><strong>${user.name}</strong></td>
                      <td>${user.email}</td>
                      <td><span class="role-${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></td>
                      <td class="status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</td>
                      <td>${user.total_work_logs || 0}</td>
                      <td>${user.total_hours || 0}</td>
                      <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="footer">
                <p>Track Management System - Team Report</p>
                <p>This report contains ${state.users.length} team members with a total of ${state.users.reduce((sum, u) => sum + (u.total_hours || 0), 0)} hours logged</p>
              </div>
            </body>
            </html>
          `;
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      }

      setState(prev => ({
        ...prev,
        exportDialog: { open: false, loading: false, format: 'pdf' }
      }));
    } catch (error) {
      console.error('Export error:', error);
      setState(prev => ({
        ...prev,
        exportDialog: { ...prev.exportDialog, loading: false },
        error: 'Failed to export report'
      }));
    }
  };

  const getStatusChip = (user: User) => {
    if (user.is_active) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Active"
          color="success"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<CancelIcon />}
          label="Inactive"
          color="error"
          size="small"
        />
      );
    }
  };

  const getRoleChip = (role: string) => {
    return (
      <Chip
        label={role.charAt(0).toUpperCase() + role.slice(1)}
        color={role === 'supervisor' ? 'primary' : 'default'}
        size="small"
      />
    );
  };

  const activeUsers = state.users.filter(user => user.is_active);
  const engineers = state.users.filter(user => user.role === 'engineer');
  const supervisors = state.users.filter(user => user.role === 'supervisor');

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Team Management
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            disabled={state.loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportReport}
            disabled={state.loading}
          >
            Export Report
          </Button>
          {apiService.isSuperAdmin() && (
            <>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleCreateSupervisor}
                color="primary"
              >
                Add Supervisor
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleCreateAdministrator}
                color="secondary"
              >
                Add Administrator
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleCreateEngineer}
          >
            Add Engineer
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          {state.error}
        </Alert>
      )}

      {/* Team Overview Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {state.users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {activeUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {engineers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Engineers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {supervisors.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supervisors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading Indicator */}
      {state.loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Work Logs</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {user.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{getStatusChip(user)}</TableCell>
                  <TableCell>{user.total_work_logs || 0}</TableCell>
                  <TableCell>{user.total_hours || 0}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleActionClick(e, user)}
                      disabled={state.loading}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {state.users.length === 0 && !state.loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={state.actionMenuAnchor}
        open={Boolean(state.actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => state.selectedUser && handleEditUser(state.selectedUser)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {state.selectedUser && !state.selectedUser.is_active && (
          <MenuItem onClick={() => state.selectedUser && handleReactivateUser(state.selectedUser)}>
            <CheckCircleIcon sx={{ mr: 1 }} />
            Reactivate
          </MenuItem>
        )}
        {state.selectedUser && state.selectedUser.is_active && state.selectedUser.role === 'engineer' && (
          <MenuItem onClick={() => state.selectedUser && handleDeactivateUser(state.selectedUser)}>
            <BlockIcon sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        )}
        {state.selectedUser && (
          // Super admin can delete anyone
          apiService.isSuperAdmin() ||
          // Regular supervisors can only delete engineers
          state.selectedUser.role === 'engineer'
        ) && (
          <MenuItem
            onClick={() => state.selectedUser && handleDeleteUser(state.selectedUser)}
            sx={{ color: 'error.main' }}
          >
            <DeleteForeverIcon sx={{ mr: 1 }} />
            Delete Permanently
          </MenuItem>
        )}
        {/* Debug info - remove after testing */}
        <MenuItem disabled sx={{ fontSize: '0.75rem', opacity: 0.5 }}>
          Role: {state.selectedUser?.role} | Active: {state.selectedUser?.is_active?.toString()}
        </MenuItem>
      </Menu>

      {/* Create Engineer Dialog */}
      <Dialog open={state.createDialog.open} onClose={() => setState(prev => ({ ...prev, createDialog: { ...prev.createDialog, open: false } }))}>
        <DialogTitle>Create Engineer Account</DialogTitle>
        <DialogContent>
          {state.createDialog.errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.createDialog.errors.general}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={state.createDialog.formData.name}
            onChange={(e) => setState(prev => ({
              ...prev,
              createDialog: {
                ...prev.createDialog,
                formData: { ...prev.createDialog.formData, name: e.target.value }
              }
            }))}
            error={!!state.createDialog.errors.name}
            helperText={state.createDialog.errors.name}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={state.createDialog.formData.email}
            onChange={(e) => setState(prev => ({
              ...prev,
              createDialog: {
                ...prev.createDialog,
                formData: { ...prev.createDialog.formData, email: e.target.value }
              }
            }))}
            error={!!state.createDialog.errors.email}
            helperText={state.createDialog.errors.email}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={state.createDialog.formData.password}
            onChange={(e) => setState(prev => ({
              ...prev,
              createDialog: {
                ...prev.createDialog,
                formData: { ...prev.createDialog.formData, password: e.target.value }
              }
            }))}
            error={!!state.createDialog.errors.password}
            helperText={state.createDialog.errors.password || 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, createDialog: { ...prev.createDialog, open: false } }))}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={state.createDialog.loading}
          >
            Create Engineer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Supervisor Dialog */}
      <Dialog open={state.createSupervisorDialog.open} onClose={() => setState(prev => ({ ...prev, createSupervisorDialog: { ...prev.createSupervisorDialog, open: false } }))}>
        <DialogTitle>Create Supervisor Account</DialogTitle>
        <DialogContent>
          {state.createSupervisorDialog.errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.createSupervisorDialog.errors.general}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={state.createSupervisorDialog.formData.name}
            onChange={(e) => setState(prev => ({
              ...prev,
              createSupervisorDialog: {
                ...prev.createSupervisorDialog,
                formData: { ...prev.createSupervisorDialog.formData, name: e.target.value }
              }
            }))}
            error={!!state.createSupervisorDialog.errors.name}
            helperText={state.createSupervisorDialog.errors.name}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={state.createSupervisorDialog.formData.email}
            onChange={(e) => setState(prev => ({
              ...prev,
              createSupervisorDialog: {
                ...prev.createSupervisorDialog,
                formData: { ...prev.createSupervisorDialog.formData, email: e.target.value }
              }
            }))}
            error={!!state.createSupervisorDialog.errors.email}
            helperText={state.createSupervisorDialog.errors.email}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={state.createSupervisorDialog.formData.password}
            onChange={(e) => setState(prev => ({
              ...prev,
              createSupervisorDialog: {
                ...prev.createSupervisorDialog,
                formData: { ...prev.createSupervisorDialog.formData, password: e.target.value }
              }
            }))}
            error={!!state.createSupervisorDialog.errors.password}
            helperText={state.createSupervisorDialog.errors.password || 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, createSupervisorDialog: { ...prev.createSupervisorDialog, open: false } }))}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSupervisorSubmit}
            variant="contained"
            disabled={state.createSupervisorDialog.loading}
          >
            Create Supervisor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Administrator Dialog */}
      <Dialog open={state.createAdministratorDialog.open} onClose={() => setState(prev => ({ ...prev, createAdministratorDialog: { ...prev.createAdministratorDialog, open: false } }))}>
        <DialogTitle>Create Administrator Account</DialogTitle>
        <DialogContent>
          {state.createAdministratorDialog.errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.createAdministratorDialog.errors.general}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={state.createAdministratorDialog.formData.name}
            onChange={(e) => setState(prev => ({
              ...prev,
              createAdministratorDialog: {
                ...prev.createAdministratorDialog,
                formData: { ...prev.createAdministratorDialog.formData, name: e.target.value }
              }
            }))}
            error={!!state.createAdministratorDialog.errors.name}
            helperText={state.createAdministratorDialog.errors.name}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={state.createAdministratorDialog.formData.email}
            onChange={(e) => setState(prev => ({
              ...prev,
              createAdministratorDialog: {
                ...prev.createAdministratorDialog,
                formData: { ...prev.createAdministratorDialog.formData, email: e.target.value }
              }
            }))}
            error={!!state.createAdministratorDialog.errors.email}
            helperText={state.createAdministratorDialog.errors.email}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={state.createAdministratorDialog.formData.password}
            onChange={(e) => setState(prev => ({
              ...prev,
              createAdministratorDialog: {
                ...prev.createAdministratorDialog,
                formData: { ...prev.createAdministratorDialog.formData, password: e.target.value }
              }
            }))}
            error={!!state.createAdministratorDialog.errors.password}
            helperText={state.createAdministratorDialog.errors.password || 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, createAdministratorDialog: { ...prev.createAdministratorDialog, open: false } }))}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAdministratorSubmit}
            variant="contained"
            disabled={state.createAdministratorDialog.loading}
          >
            Create Administrator
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={state.editDialog.open} onClose={() => setState(prev => ({ ...prev, editDialog: { ...prev.editDialog, open: false } }))}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {state.editDialog.errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.editDialog.errors.general}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={state.editDialog.formData.name}
            onChange={(e) => setState(prev => ({
              ...prev,
              editDialog: {
                ...prev.editDialog,
                formData: { ...prev.editDialog.formData, name: e.target.value }
              }
            }))}
            error={!!state.editDialog.errors.name}
            helperText={state.editDialog.errors.name}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={state.editDialog.formData.email}
            onChange={(e) => setState(prev => ({
              ...prev,
              editDialog: {
                ...prev.editDialog,
                formData: { ...prev.editDialog.formData, email: e.target.value }
              }
            }))}
            error={!!state.editDialog.errors.email}
            helperText={state.editDialog.errors.email}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={state.editDialog.formData.is_active}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  editDialog: {
                    ...prev.editDialog,
                    formData: { ...prev.editDialog.formData, is_active: e.target.checked }
                  }
                }))}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, editDialog: { ...prev.editDialog, open: false } }))}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={state.editDialog.loading}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={state.deleteDialog.open} onClose={() => setState(prev => ({ ...prev, deleteDialog: { open: false, user: null } }))}>
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate "{state.deleteDialog.user?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This will deactivate their account. They will no longer be able to log in, but their work logs and data will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, deleteDialog: { open: false, user: null } }))}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeactivateUser}
            color="error"
            variant="contained"
            disabled={state.loading}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={state.permanentDeleteDialog.open} onClose={() => setState(prev => ({ ...prev, permanentDeleteDialog: { open: false, user: null } }))}>
        <DialogTitle>Delete User Permanently</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete "{state.permanentDeleteDialog.user?.name}"?
          </Typography>
          <Typography variant="body2" color="error.main" mt={1} fontWeight="bold">
            WARNING: This action cannot be undone. All user data, work logs, and history will be permanently removed from the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, permanentDeleteDialog: { open: false, user: null } }))}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteUser}
            color="error"
            variant="contained"
            disabled={state.loading}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Report Dialog */}
      <Dialog open={state.exportDialog.open} onClose={() => setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, open: false } }))}>
        <DialogTitle>Export Team Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Select the export format for the team report
          </Typography>

          <Box display="flex" flexDirection="column" gap={2}>
            <Box
              onClick={() => setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, format: 'pdf' } }))}
              sx={{
                p: 2,
                border: state.exportDialog.format === 'pdf' ? '2px solid' : '1px solid',
                borderColor: state.exportDialog.format === 'pdf' ? 'primary.main' : 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: state.exportDialog.format === 'pdf' ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Typography variant="subtitle1" fontWeight="medium">
                PDF (Professional)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Formatted report with professional layout, perfect for printing
              </Typography>
            </Box>

            <Box
              onClick={() => setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, format: 'csv' } }))}
              sx={{
                p: 2,
                border: state.exportDialog.format === 'csv' ? '2px solid' : '1px solid',
                borderColor: state.exportDialog.format === 'csv' ? 'primary.main' : 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: state.exportDialog.format === 'csv' ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Typography variant="subtitle1" fontWeight="medium">
                CSV (Spreadsheet)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comma-separated values, import into Excel or Google Sheets
              </Typography>
            </Box>

            <Box
              onClick={() => setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, format: 'json' } }))}
              sx={{
                p: 2,
                border: state.exportDialog.format === 'json' ? '2px solid' : '1px solid',
                borderColor: state.exportDialog.format === 'json' ? 'primary.main' : 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: state.exportDialog.format === 'json' ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Typography variant="subtitle1" fontWeight="medium">
                JSON (Data)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Structured data format for developers and integrations
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState(prev => ({ ...prev, exportDialog: { ...prev.exportDialog, open: false } }))}>
            Cancel
          </Button>
          <Button
            onClick={handleExportSubmit}
            variant="contained"
            startIcon={<FileDownloadIcon />}
            disabled={state.exportDialog.loading}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagementPage;