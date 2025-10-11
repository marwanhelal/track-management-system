import { Router } from 'express';
import {
  getPredefinedPhases,
  getProjectPhases,
  startPhase,
  submitPhase,
  approvePhase,
  completePhase,
  markPhaseWarning,
  handlePhaseDelay,
  createPhase,
  updatePhase,
  updatePhaseHistorical,
  deletePhase,
  reorderPhases,
  grantEarlyAccess,
  revokeEarlyAccess,
  getEarlyAccessOverview
} from '@/controllers/phases';
import { authenticate, supervisorOnly, canAccessProject } from '@/middleware/auth';
import { validateIdParam, validatePhaseIdParam } from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get predefined phases (available to all authenticated users)
router.get('/predefined', getPredefinedPhases);

// Get project phases
router.get('/project/:projectId', validateIdParam, canAccessProject, getProjectPhases);

// Phase workflow management (supervisors only)
router.post('/:phaseId/start', supervisorOnly, validatePhaseIdParam, startPhase);
router.post('/:phaseId/submit', supervisorOnly, validatePhaseIdParam, submitPhase);
router.post('/:phaseId/approve', supervisorOnly, validatePhaseIdParam, approvePhase);
router.post('/:phaseId/complete', supervisorOnly, validatePhaseIdParam, completePhase);
router.post('/:phaseId/warning', supervisorOnly, validatePhaseIdParam, markPhaseWarning);
router.post('/:phaseId/delay', supervisorOnly, validatePhaseIdParam, handlePhaseDelay);

// Enhanced Phase Management (supervisors only)
router.post('/project/:projectId', supervisorOnly, validateIdParam, createPhase);
router.put('/:phaseId', supervisorOnly, validatePhaseIdParam, updatePhase);
router.put('/:phaseId/historical', supervisorOnly, validatePhaseIdParam, updatePhaseHistorical);
router.delete('/:phaseId', supervisorOnly, validatePhaseIdParam, deletePhase);
router.put('/project/:projectId/reorder', supervisorOnly, validateIdParam, reorderPhases);

// Early Access Management (supervisors only)
router.post('/:phaseId/grant-early-access', supervisorOnly, validatePhaseIdParam, grantEarlyAccess);
router.post('/:phaseId/revoke-early-access', supervisorOnly, validatePhaseIdParam, revokeEarlyAccess);
router.get('/project/:projectId/early-access-overview', supervisorOnly, validateIdParam, getEarlyAccessOverview);

export default router;