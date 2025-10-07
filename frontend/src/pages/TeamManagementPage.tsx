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
  DeleteForever as DeleteForeverIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'engineer';
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
        {state.selectedUser && (state.selectedUser.role === 'engineer' ||
          (state.selectedUser.role === 'supervisor' &&
           (state.selectedUser.email.toLowerCase().includes('test') ||
            state.selectedUser.email.toLowerCase().includes('example') ||
            state.selectedUser.name.toLowerCase().includes('test')))) && (
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
    </Box>
  );
};

export default TeamManagementPage;