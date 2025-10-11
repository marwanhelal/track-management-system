import { Router, Request, Response } from 'express';
import {
  getProjects,
  getArchivedProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
  exportProject,
  getProjectHealth,
  getProjectMetrics,
  searchProjects,
  searchTeamMembers,
  getTeamAnalytics,
  exportTeamReport,
  getComprehensiveOverview,
} from '@/controllers/projects';
import { testGetProjects } from '@/controllers/test-projects';
import { authenticate, supervisorOnly, canAccessProject, viewerAccess } from '@/middleware/auth';
import {
  validateProjectCreation,
  validateProjectUpdate,
  validateProjectFilters,
  validateIdParam,
  handleValidationErrors
} from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all projects (with filters and pagination)
router.get('/', getProjects);

// Get archived projects (supervisors and administrators can view)
router.get('/archived', viewerAccess, getArchivedProjects);

// CEO Comprehensive Overview (Supervisors and Administrators can view) - Must be before /:id route
router.get('/comprehensive-overview', viewerAccess, getComprehensiveOverview);

// Get single project details
router.get('/:id', canAccessProject, getProject);

// Create new project (supervisors only)
router.post('/', supervisorOnly, validateProjectCreation, createProject);

// Update project (supervisors only)
router.put('/:id', supervisorOnly, validateIdParam, validateProjectUpdate, updateProject);

// Delete project (supervisors only)
router.delete('/:id', supervisorOnly, validateIdParam, deleteProject);

// Enhanced Project Settings & Management
router.post('/:id/archive', supervisorOnly, validateIdParam, archiveProject);
router.post('/:id/unarchive', supervisorOnly, validateIdParam, unarchiveProject);
router.get('/:id/export', canAccessProject, validateIdParam, exportProject);

// Project Health Monitoring
router.get('/:id/health', canAccessProject, validateIdParam, getProjectHealth);
router.get('/:id/metrics', canAccessProject, validateIdParam, getProjectMetrics);

// Advanced Search & Filtering
router.get('/search', searchProjects);
router.get('/:id/team/search', canAccessProject, validateIdParam, searchTeamMembers);

// Team Analytics & Reports
router.get('/analytics/team', getTeamAnalytics);
router.get('/:id/team/export', canAccessProject, validateIdParam, exportTeamReport);

export default router;