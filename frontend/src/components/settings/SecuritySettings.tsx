import React, { useState } from 'react';
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import apiService from '../../services/api';

const SecuritySettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setSuccess(false);
    setError(null);
  };

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  };

  const passwordRequirements = [
    {
      label: 'At least 8 characters',
      met: formData.newPassword.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(formData.newPassword)
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(formData.newPassword)
    },
    {
      label: 'Contains number',
      met: /[0-9]/.test(formData.newPassword)
    },
    {
      label: 'Passwords match',
      met: formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0
    }
  ];

  const canSubmit =
    formData.currentPassword.length > 0 &&
    validatePassword(formData.newPassword) &&
    formData.newPassword === formData.confirmPassword;

  const handleSave = async () => {
    if (!canSubmit) {
      setError('Please check all password requirements');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await apiService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.success) {
        setSuccess(true);
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your password and account security
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password changed successfully! Please use your new password on your next login.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Change Password
          </Typography>

          {/* Current Password */}
          <TextField
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={handleChange('currentPassword')}
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Divider />

          {/* New Password */}
          <TextField
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange('newPassword')}
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Confirm Password */}
          <TextField
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            fullWidth
            disabled={loading}
            error={formData.confirmPassword.length > 0 && formData.newPassword !== formData.confirmPassword}
            helperText={
              formData.confirmPassword.length > 0 && formData.newPassword !== formData.confirmPassword
                ? 'Passwords do not match'
                : ''
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Password Requirements */}
          {formData.newPassword.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Password Requirements
              </Typography>
              <List dense sx={{ py: 0 }}>
                {passwordRequirements.map((req, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {req.met ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <CancelIcon color="error" fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={req.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: req.met ? 'success.main' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          <Divider />

          {/* Security Tips */}
          <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1, border: '1px solid', borderColor: 'warning.light' }}>
            <Typography variant="body2" fontWeight={600} gutterBottom color="warning.dark">
              Security Tips
            </Typography>
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
              • Use a strong, unique password that you don't use for other accounts
            </Typography>
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
              • Avoid using personal information in your password
            </Typography>
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
              • Change your password regularly (recommended every 90 days)
            </Typography>
            <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
              • Never share your password with anyone
            </Typography>
          </Box>

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || !canSubmit}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SecuritySettings;
