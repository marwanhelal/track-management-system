import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import {
  Person,
  Assignment,
  AccessTime,
  TrendingUp,
} from '@mui/icons-material';
import { WorkLogSummary, PhaseSummary } from '../../types';

interface WorkLogSummaryCardProps {
  summary: {
    projectSummary: WorkLogSummary[];
    phaseSummary: PhaseSummary[];
    phaseEngineerDetail: any[];
  };
  isSupervisor: boolean;
}

const WorkLogSummaryCard = ({
  summary,
  isSupervisor,
}: WorkLogSummaryCardProps) => {
  const formatHours = (hours: string | number) => {
    return parseFloat(hours?.toString() || '0').toFixed(1);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {isSupervisor ? 'Team Summary' : 'My Work Summary'}
      </Typography>

      {/* Project Summary */}
      {summary.projectSummary.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
            By Project
          </Typography>
          <List dense>
            {summary.projectSummary.slice(0, 5).map((item, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.project_name}
                      </Typography>
                      {isSupervisor && (
                        <Typography variant="caption" color="text.secondary">
                          {item.engineer_name}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip
                        label={`${formatHours(item.total_hours)}h`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`${item.days_worked} days`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Detailed Phase-Engineer Breakdown */}
      {isSupervisor && summary.phaseEngineerDetail.length > 0 && (
        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            Detailed Phase Breakdown
          </Typography>
          <List dense>
            {summary.phaseEngineerDetail.slice(0, 10).map((item, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.phase_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.project_name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box display="flex" gap={1} mt={0.5} alignItems="center">
                      <Typography variant="body2" fontWeight="medium" color="primary" component="span">
                        {item.engineer_name}
                      </Typography>
                      <Chip
                        label={`${formatHours(item.engineer_hours)}h`}
                        size="small"
                        color="success"
                        variant="filled"
                      />
                      <Chip
                        label={`${item.engineer_days_worked} days`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Simple Phase Summary for Engineers */}
      {!isSupervisor && summary.phaseSummary.length > 0 && (
        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            By Phase
          </Typography>
          <List dense>
            {summary.phaseSummary.slice(0, 5).map((item, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <AccessTime />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {item.phase_name}
                    </Typography>
                  }
                  secondary={
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip
                        label={`${formatHours(item.total_hours)}h`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {summary.projectSummary.length === 0 && summary.phaseSummary.length === 0 && summary.phaseEngineerDetail.length === 0 && (
        <Box textAlign="center" py={4}>
          <AccessTime sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No work logs found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isSupervisor
              ? 'Your team will see their work summary here'
              : 'Start logging time to see your summary here'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default WorkLogSummaryCard;