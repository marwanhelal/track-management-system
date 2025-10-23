import { Router } from 'express';
import {
  startTimerSession,
  stopTimerSession,
  getActiveTimerSession,
  cancelTimerSession,
  getTimerSessionHistory
} from '@/controllers/timer-sessions';
import { authenticate } from '@/middleware/auth';
import { body, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware
const validateStartTimer = [
  body('phase_id')
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 3, max: 1000 })
    .withMessage('Description must be between 3 and 1000 characters')
];

const validateSessionId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Session ID must be a positive integer')
];

const validateStopTimer = [
  ...validateSessionId,
  body('elapsed_time_ms')
    .isInt({ min: 0 })
    .withMessage('Elapsed time must be a non-negative integer')
];

// Routes

// Get engineer's active timer session
router.get('/active', getActiveTimerSession);

// Get timer session history
router.get('/history', getTimerSessionHistory);

// Start new timer session
router.post('/', validateStartTimer, startTimerSession);

// Stop timer session and create work log
router.put('/:id/stop', validateStopTimer, stopTimerSession);

// Cancel/delete timer session
router.delete('/:id', validateSessionId, cancelTimerSession);

export default router;
