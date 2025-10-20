import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Snackbar, Alert, Box, IconButton, Collapse, Typography, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import axios from 'axios';

interface ConnectionStatus {
  isConnected: boolean;
  lastChecked: Date | null;
  consecutiveFailures: number;
  isRecovering: boolean;
}

const ConnectionMonitor: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: true,
    lastChecked: null,
    consecutiveFailures: 0,
    isRecovering: false,
  });
  const [showBanner, setShowBanner] = useState(false);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number | null>(null);

  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration
  const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds
  const MAX_CONSECUTIVE_FAILURES = 5; // Auto-refresh after 5 consecutive failures (2.5 minutes)
  const AUTO_REFRESH_DELAY = 10; // Seconds before auto-refresh (give PM2 time to restart)
  const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/v1';

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await axios.get(`${BACKEND_URL.replace('/api/v1', '')}/health`, {
        signal: controller.signal,
        timeout: 5000,
      });

      clearTimeout(timeoutId);

      // Backend is healthy
      if (response.status === 200) {
        setStatus(prev => {
          const wasDisconnected = !prev.isConnected;

          return {
            isConnected: true,
            lastChecked: new Date(),
            consecutiveFailures: 0,
            isRecovering: wasDisconnected,
          };
        });

        // If we were disconnected and now connected, wait a bit then hide banner
        if (!status.isConnected && status.consecutiveFailures > 0) {
          setTimeout(() => {
            setShowBanner(false);
            setStatus(prev => ({ ...prev, isRecovering: false }));
          }, 2000);
        }

        return true;
      }

      throw new Error('Health check failed');
    } catch (error: any) {
      // Backend is not responding
      console.warn('⚠️ Backend health check failed:', error.message);

      setStatus(prev => {
        const newFailures = prev.consecutiveFailures + 1;
        const shouldAutoRefresh = newFailures >= MAX_CONSECUTIVE_FAILURES;

        if (shouldAutoRefresh && !autoRefreshCountdown) {
          // Start auto-refresh countdown
          startAutoRefreshCountdown();
        }

        return {
          isConnected: false,
          lastChecked: new Date(),
          consecutiveFailures: newFailures,
          isRecovering: false,
        };
      });

      setShowBanner(true);
      return false;
    }
  }, [BACKEND_URL, autoRefreshCountdown, status.isConnected, status.consecutiveFailures]);

  // Start auto-refresh countdown
  const startAutoRefreshCountdown = useCallback(() => {
    setAutoRefreshCountdown(AUTO_REFRESH_DELAY);

    countdownIntervalRef.current = setInterval(() => {
      setAutoRefreshCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Time's up, refresh the page
          console.log('🔄 Auto-refreshing due to persistent backend connection failure...');

          // Increment refresh attempts to prevent infinite loops
          const attempts = parseInt(sessionStorage.getItem('connectionMonitorRefreshAttempts') || '0', 10);
          sessionStorage.setItem('connectionMonitorRefreshAttempts', (attempts + 1).toString());

          // Clear after 5 minutes
          setTimeout(() => {
            sessionStorage.removeItem('connectionMonitorRefreshAttempts');
          }, 5 * 60 * 1000);

          window.location.reload();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Stop auto-refresh countdown
  const stopAutoRefreshCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoRefreshCountdown(null);
  }, []);

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 User triggered manual refresh from connection monitor');
    window.location.reload();
  }, []);

  // Retry connection (without full page reload)
  const handleRetry = useCallback(async () => {
    console.log('🔄 User triggered manual retry from connection monitor');
    setStatus(prev => ({ ...prev, consecutiveFailures: 0 }));
    stopAutoRefreshCountdown();
    await checkHealth();
  }, [checkHealth, stopAutoRefreshCountdown]);

  // Close banner
  const handleCloseBanner = useCallback(() => {
    setShowBanner(false);
    stopAutoRefreshCountdown();
  }, [stopAutoRefreshCountdown]);

  // Initialize health checking
  useEffect(() => {
    // Initial health check
    checkHealth();

    // Start periodic health checks
    healthCheckIntervalRef.current = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    // Cleanup
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      stopAutoRefreshCountdown();
    };
  }, [checkHealth, stopAutoRefreshCountdown, HEALTH_CHECK_INTERVAL]);

  // Stop countdown when connection is restored
  useEffect(() => {
    if (status.isConnected && autoRefreshCountdown !== null) {
      stopAutoRefreshCountdown();
    }
  }, [status.isConnected, autoRefreshCountdown, stopAutoRefreshCountdown]);

  // Check if we've exceeded max refresh attempts
  const refreshAttempts = parseInt(sessionStorage.getItem('connectionMonitorRefreshAttempts') || '0', 10);
  const maxAttemptsReached = refreshAttempts >= 3;

  return (
    <>
      {/* Connection Lost Banner */}
      <Collapse in={showBanner && !status.isConnected}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'error.main',
            color: 'white',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <WifiOffIcon sx={{ fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                ⚠️ Connection Lost - Server Temporarily Unavailable
              </Typography>
              <Typography variant="body2">
                {status.consecutiveFailures < MAX_CONSECUTIVE_FAILURES ? (
                  <>The server is restarting. This usually takes 5-10 seconds. Click "Try Again" to reconnect.</>
                ) : (
                  <>
                    Cannot connect to the server.
                    {autoRefreshCountdown !== null && !maxAttemptsReached && (
                      <> Auto-refreshing in {autoRefreshCountdown} seconds...</>
                    )}
                    {maxAttemptsReached && (
                      <> Multiple reconnection attempts failed. Please contact support if this persists.</>
                    )}
                  </>
                )}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="inherit"
              size="small"
              startIcon={<ReplayIcon />}
              onClick={handleRetry}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
                fontWeight: 'bold'
              }}
            >
              Try Again
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleManualRefresh}
              title="Refresh Page"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleCloseBanner}
              title="Dismiss"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Collapse>

      {/* Connection Restored Banner */}
      <Snackbar
        open={status.isRecovering}
        autoHideDuration={3000}
        onClose={() => setStatus(prev => ({ ...prev, isRecovering: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<WifiIcon />}
          sx={{ width: '100%' }}
        >
          Connection Restored - You're back online!
        </Alert>
      </Snackbar>
    </>
  );
};

export default ConnectionMonitor;
