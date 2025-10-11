// Re-export all project controller functions from their respective modules

// CRUD operations
export {
  getProjects,
  getArchivedProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject
} from './projects.crud';

// Export functionality
export {
  exportProject
} from './projects.export';

// Analytics and metrics
export {
  getProjectHealth,
  getProjectMetrics,
  searchProjects,
  searchTeamMembers,
  getTeamAnalytics,
  exportTeamReport
} from './projects.analytics';

// Comprehensive overview
export {
  getComprehensiveOverview
} from './projects.overview';
