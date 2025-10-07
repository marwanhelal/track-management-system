import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { ComprehensiveOverviewResponse, ComprehensiveOverviewData } from '../../types';
import ProjectOverviewTable from './ProjectOverviewTable';
import ExportOverviewDialog from './ExportOverviewDialog';

interface ComprehensiveOverviewProps {
  onClose?: () => void;
}

const ComprehensiveOverview: React.FC<ComprehensiveOverviewProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComprehensiveOverviewResponse | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await apiService.getComprehensiveOverview();
      setData(response);
    } catch (err: any) {
      console.error('Failed to fetch comprehensive overview:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={60} />
        <Box ml={2}>
          <Typography variant="h6">Loading comprehensive overview...</Typography>
          <Typography variant="body2" color="text.secondary">
            Aggregating project data, phases, and engineer metrics
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error || 'No data available'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Company Branding Header */}
      <Box mb={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
          <CardContent sx={{ py: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={3}>
                <Box
                  component="img"
                  src="/logo.png"
                  alt="Criteria Design Group"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    p: 1,
                    objectFit: 'contain'
                  }}
                />
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    CRITERIA DESIGN GROUP
                  </Typography>
                  <Typography variant="h5" sx={{ opacity: 0.9 }}>
                    CEO Project Overview Dashboard
                  </Typography>
                </Box>
              </Box>
              <Box textAlign="right">
                <Typography variant="h6" fontWeight="600">
                  Arch. Hesham Helal
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  System Engineer Developer: Marwan Helal
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  Generated: {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Summary Cards */}
      <Box mb={4}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Typography variant="h5" color="primary" fontWeight="600">
            📊 Executive Summary
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setShowExportDialog(true)}
            >
              Export PDF
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                  {data.data.summary.total_projects}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500">
                  Total Projects
                </Typography>
                <Chip
                  size="medium"
                  label={`${data.data.summary.active_projects} Active`}
                  color="success"
                  variant="outlined"
                  sx={{ mt: 2, fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                  {data.data.summary.total_engineers}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500">
                  Active Engineers
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                  <TrendingUpIcon fontSize="medium" color="success" />
                  <Typography variant="body2" color="success.main" ml={1} fontWeight="600">
                    Contributing
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                  {formatHours(data.data.summary.total_hours_logged)}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500">
                  Hours Logged
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                  <ScheduleIcon fontSize="medium" color="info" />
                  <Typography variant="body2" color="info.main" ml={1} fontWeight="600">
                    Total Time
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3" color={getHealthScoreColor(data.data.summary.overall_health_score)} fontWeight="bold" gutterBottom>
                  {data.data.summary.overall_health_score}%
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500">
                  Health Score
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                  {data.data.summary.overall_health_score >= 80 ? (
                    <>
                      <CheckCircleIcon fontSize="medium" color="success" />
                      <Typography variant="body2" color="success.main" ml={1} fontWeight="600">
                        Excellent
                      </Typography>
                    </>
                  ) : (
                    <>
                      <WarningIcon fontSize="medium" color="warning" />
                      <Typography variant="body2" color="warning.main" ml={1} fontWeight="600">
                        Needs Attention
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3" color="error" fontWeight="bold" gutterBottom>
                  {data.data.summary.projects_with_warnings}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500">
                  Projects with Warnings
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                  <WarningIcon fontSize="medium" color="error" />
                  <Typography variant="body2" color="error.main" ml={1} fontWeight="600">
                    Critical
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Projects Overview Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6" color="primary">
              Detailed Project Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete breakdown of all active projects with phases, engineers, and metrics
            </Typography>
          </Box>
          <ProjectOverviewTable projects={data.data.projects} refreshing={refreshing} />
        </CardContent>
      </Card>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportOverviewDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={data.data}
        />
      )}
    </Box>
  );
};

export default ComprehensiveOverview;