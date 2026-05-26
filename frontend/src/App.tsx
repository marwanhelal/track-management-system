import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConnectionMonitor from './components/common/ConnectionMonitor';

// Lazy-loaded pages for optimal performance
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailsPage = React.lazy(() => import('./pages/ProjectDetailsPage'));
const TeamManagementPage = React.lazy(() => import('./pages/TeamManagementPage'));
const TimeTrackingPage = React.lazy(() => import('./pages/TimeTrackingPage'));
const MyWorkLogsPage = React.lazy(() => import('./pages/MyWorkLogsPage'));
const SmartWarningDashboard = React.lazy(() => import('./pages/SmartWarningDashboard'));
const EngineerActivityPage = React.lazy(() => import('./pages/EngineerActivityPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

// Team Leader System pages
const MyTasksPage = React.lazy(() => import('./pages/MyTasksPage'));
const TaskDetailPage = React.lazy(() => import('./pages/TaskDetailPage'));
const MyCalendarPage = React.lazy(() => import('./pages/MyCalendarPage'));
const MyPerformancePage = React.lazy(() => import('./pages/MyPerformancePage'));
const MyTeamPage = React.lazy(() => import('./pages/MyTeamPage'));
const TaskBoardPage = React.lazy(() => import('./pages/TaskBoardPage'));

// Loading component for Suspense fallback
const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      width: '100%'
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <ConnectionMonitor />
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<AuthPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <Dashboard />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Supervisor and Administrator Routes */}
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute requireRole={["supervisor", "administrator", "team_leader", "engineer"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <ProjectsPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <ProjectDetailsPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/team"
                  element={
                    <ProtectedRoute requireRole="supervisor">
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <TeamManagementPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/engineer-activity"
                  element={
                    <ProtectedRoute requireRole={["supervisor", "administrator"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <EngineerActivityPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Engineer Only Routes */}
                <Route
                  path="/time-tracking"
                  element={
                    <ProtectedRoute requireRole="engineer">
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <TimeTrackingPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/my-work-logs"
                  element={
                    <ProtectedRoute requireRole="engineer">
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <MyWorkLogsPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Smart Warning Dashboard - Available to all authenticated users */}
                <Route
                  path="/smart-warnings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <SmartWarningDashboard />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Settings - Available to all authenticated users */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <SettingsPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Team Leader Routes */}
                <Route
                  path="/my-team"
                  element={
                    <ProtectedRoute requireRole={["team_leader", "supervisor"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <MyTeamPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/task-board"
                  element={
                    <ProtectedRoute requireRole={["team_leader", "supervisor"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <TaskBoardPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Engineer Routes */}
                <Route
                  path="/my-tasks"
                  element={
                    <ProtectedRoute requireRole={["engineer", "team_leader"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <MyTasksPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/my-calendar"
                  element={
                    <ProtectedRoute requireRole={["engineer", "team_leader"]}>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <MyCalendarPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/my-performance"
                  element={
                    <ProtectedRoute requireRole="engineer">
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <MyPerformancePage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Shared Task Detail - all authenticated users */}
                <Route
                  path="/tasks/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <TaskDetailPage />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Default Redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
