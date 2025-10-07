import React, { useState } from 'react';
import {
  Box,
  Alert,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useTheme as useThemeContext } from '../../contexts/ThemeContext';

const DisplaySettings: React.FC = () => {
  const { mode, setThemeMode } = useThemeContext();
  const [success, setSuccess] = useState(false);

  const handleThemeChange = (event: any) => {
    const newTheme = event.target.value as 'light' | 'dark' | 'system';
    setThemeMode(newTheme);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Display Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize your display preferences
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Theme changed successfully!
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <FormControl fullWidth>
          <InputLabel>Theme Mode</InputLabel>
          <Select
            value={mode}
            onChange={handleThemeChange}
            label="Theme Mode"
          >
            <MenuItem value="light">Light Mode</MenuItem>
            <MenuItem value="dark">Dark Mode</MenuItem>
            <MenuItem value="system">System Default</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Theme Mode:</strong> Controls the appearance of the application.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default DisplaySettings;
