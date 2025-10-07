import { Router } from 'express';
import {
  setWorkLogProgress,
  setPhaseEngineerProgress,
  getPhaseProgressHistory,
  getPhaseProgressSummaryController,
  getEngineerProgressBreakdown,
  getPhaseProgressDetailController,
  calculateProgress
} from '@/controllers/progress';
import { authenticate } from '@/middleware/auth';
import { validateIdParam } from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Set manual progress on a work log entry (supervisor only)
router.post('/work-log/:workLogId', validateIdParam, setWorkLogProgress);

// Set overall phase progress for an engineer (supervisor only)
router.post('/phase/:phaseId/engineer/:engineerId', setPhaseEngineerProgress);

// Get progress history for a phase (optionally filtered by engineer)
// Query param: ?engineerId=123
router.get('/phase/:phaseId/history', validateIdParam, getPhaseProgressHistory);

// Get progress summary for a phase (all engineers)
router.get('/phase/:phaseId/summary', validateIdParam, getPhaseProgressSummaryController);

// Get detailed progress breakdown for an engineer on a phase
router.get('/phase/:phaseId/engineer/:engineerId', getEngineerProgressBreakdown);

// Get detailed progress information for a phase (includes all engineers)
router.get('/phase/:phaseId/detail', validateIdParam, getPhaseProgressDetailController);

// Calculate progress percentage for given hours (helper endpoint)
router.post('/calculate', calculateProgress);

export default router;
