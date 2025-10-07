import { Router } from 'express';
import {
  getPhaseWorkLogs,
  getEngineerWorkLogs,
  createWorkLog,
  createWorkLogAdmin,
  updateWorkLog,
  deleteWorkLog,
  getWorkLogsSummary
} from '@/controllers/work-logs';
import { authenticate, canAccessProject, supervisorOnly } from '@/middleware/auth';
import { validateIdParam, validateWorkLogCreation, validateWorkLogUpdate } from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get work logs for a specific phase
router.get('/phase/:phaseId', validateIdParam, getPhaseWorkLogs);

// Get work logs for an engineer (own logs for engineers, any for supervisors)
router.get('/engineer/:engineerId', validateIdParam, getEngineerWorkLogs);

// Get work logs summary for dashboard
router.get('/summary', getWorkLogsSummary);

// Create work log entry
router.post('/', validateWorkLogCreation, createWorkLog);

// Admin endpoint for creating work logs with specified engineer (for historical imports)
router.post('/admin', supervisorOnly, createWorkLogAdmin);

// Update work log
router.put('/:id', validateIdParam, validateWorkLogUpdate, updateWorkLog);

// Delete work log
router.delete('/:id', validateIdParam, deleteWorkLog);

export default router;