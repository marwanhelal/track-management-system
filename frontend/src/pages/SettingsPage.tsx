import React, { useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography
} from '@mui/material';
import {
  Person as PersonIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import ProfileSettings from '../components/settings/ProfileSettings';
import DisplaySettings from '../components/settings/DisplaySettings';
import SecuritySettings from '../components/settings/SecuritySettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Paper elevation={3}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<PaletteIcon />} label="Display" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <ProfileSettings />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <DisplaySettings />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <SecuritySettings />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
