import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  countdown: number;
  isRefreshing: boolean;
  refreshAttempts: number;
}

const MAX_AUTO_REFRESH_ATTEMPTS = 3;
const REFRESH_COUNTDOWN_SECONDS = 3;

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      countdown: REFRESH_COUNTDOWN_SECONDS,
      isRefreshing: false,
      refreshAttempts: this.getRefreshAttempts(),
    };
  }

  // Track refresh attempts in sessionStorage to prevent infinite loops
  private getRefreshAttempts(): number {
    const attempts = sessionStorage.getItem('errorBoundaryRefreshAttempts');
    return attempts ? parseInt(attempts, 10) : 0;
  }

  private setRefreshAttempts(count: number): void {
    sessionStorage.setItem('errorBoundaryRefreshAttempts', count.toString());
  }

  private clearRefreshAttempts(): void {
    sessionStorage.removeItem('errorBoundaryRefreshAttempts');
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Check if this is a critical error that requires page refresh
    const isCriticalError = this.isCriticalError(error);

    if (isCriticalError) {
      const { refreshAttempts } = this.state;

      // Only auto-refresh if we haven't exceeded max attempts
      if (refreshAttempts < MAX_AUTO_REFRESH_ATTEMPTS) {
        console.log(`🔄 Critical error detected. Auto-refreshing in ${REFRESH_COUNTDOWN_SECONDS} seconds... (Attempt ${refreshAttempts + 1}/${MAX_AUTO_REFRESH_ATTEMPTS})`);
        this.startCountdown();
      } else {
        console.warn('⚠️ Max auto-refresh attempts reached. Please manually refresh the page.');
      }
    }
  }

  // Determine if error is critical enough to warrant auto-refresh
  private isCriticalError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // Critical errors that indicate backend crash or network issues
    const criticalPatterns = [
      'network error',
      'failed to fetch',
      'load failed',
      'networkerror',
      'econnrefused',
      'enotfound',
      'etimedout',
      'backend',
      'server',
      '500',
      '502',
      '503',
      '504',
      'internal server error',
      'bad gateway',
      'service unavailable',
      'gateway timeout',
    ];

    return criticalPatterns.some(
      pattern => errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
  }

  private startCountdown(): void {
    this.setState({ countdown: REFRESH_COUNTDOWN_SECONDS });

    this.countdownInterval = setInterval(() => {
      this.setState((prevState): ErrorBoundaryState => {
        const newCountdown = prevState.countdown - 1;

        if (newCountdown <= 0) {
          this.performRefresh();
          return prevState; // Don't update state, refresh is happening
        }

        return { ...prevState, countdown: newCountdown };
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private performRefresh(): void {
    this.stopCountdown();
    this.setState({ isRefreshing: true });

    // Increment refresh attempts
    const newAttempts = this.state.refreshAttempts + 1;
    this.setRefreshAttempts(newAttempts);

    // Set a timer to clear refresh attempts after 5 minutes of successful operation
    setTimeout(() => {
      this.clearRefreshAttempts();
    }, 5 * 60 * 1000);

    // Reload the page
    window.location.reload();
  }

  private handleManualRefresh = (): void => {
    console.log('🔄 User triggered manual refresh');
    this.performRefresh();
  };

  private handleTryAgain = (): void => {
    // Reset error state and try to continue without refresh
    this.stopCountdown();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      countdown: REFRESH_COUNTDOWN_SECONDS,
    });
  };

  componentWillUnmount(): void {
    this.stopCountdown();
  }

  render(): ReactNode {
    const { hasError, error, countdown, isRefreshing, refreshAttempts } = this.state;

    if (hasError && error) {
      const isCritical = this.isCriticalError(error);
      const canAutoRefresh = refreshAttempts < MAX_AUTO_REFRESH_ATTEMPTS;

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            padding: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 80,
                color: 'error.main',
                marginBottom: 2,
              }}
            />

            <Typography variant="h4" gutterBottom color="error">
              {isCritical ? 'Connection Error' : 'Something Went Wrong'}
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph>
              {isCritical
                ? 'We detected a connection issue with the server. The page will automatically refresh to restore your session.'
                : 'An unexpected error occurred. You can try refreshing the page to continue.'}
            </Typography>

            {isCritical && canAutoRefresh && countdown > 0 && !isRefreshing && (
              <Box sx={{ marginY: 3 }}>
                <Typography variant="h6" color="primary">
                  Auto-refreshing in {countdown} seconds...
                </Typography>
                <CircularProgress size={40} sx={{ marginTop: 2 }} />
              </Box>
            )}

            {isCritical && !canAutoRefresh && (
              <Typography variant="body2" color="warning.main" paragraph sx={{ marginY: 2 }}>
                Maximum auto-refresh attempts reached. Please refresh manually or contact support if the issue persists.
              </Typography>
            )}

            {isRefreshing && (
              <Box sx={{ marginY: 3 }}>
                <Typography variant="h6" color="primary">
                  Refreshing...
                </Typography>
                <CircularProgress size={40} sx={{ marginTop: 2 }} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleManualRefresh}
                disabled={isRefreshing}
              >
                Refresh Now
              </Button>

              {!isCritical && (
                <Button
                  variant="outlined"
                  onClick={this.handleTryAgain}
                  disabled={isRefreshing}
                >
                  Try Again
                </Button>
              )}
            </Box>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && (
              <Box
                sx={{
                  marginTop: 4,
                  padding: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                }}
              >
                <Typography variant="caption" component="div" color="text.secondary">
                  <strong>Error Details (Development Mode):</strong>
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {error.toString()}
                </Typography>
                {error.stack && (
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 1 }}>
                    {error.stack}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
