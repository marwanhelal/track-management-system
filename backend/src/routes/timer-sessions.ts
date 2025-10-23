import { Router } from 'express';
import {
  startTimerSession,
  pauseTimerSession,
  resumeTimerSession,
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

const validatePauseTimer = [
  ...validateSessionId,
  body('elapsed_time_ms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Elapsed time must be a non-negative integer')
];

const validateResumeTimer = [
  ...validateSessionId,
  body('total_paused_ms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total paused time must be a non-negative integer')
];

const validateStopTimer = [
  ...validateSessionId,
  body('elapsed_time_ms')
    .isInt({ min: 0 })
    .withMessage('Elapsed time must be a non-negative integer'),
  body('total_paused_ms')
    .isInt({ min: 0 })
    .withMessage('Total paused time must be a non-negative integer')
];

// Routes

// Get engineer's active/paused timer session
router.get('/active', getActiveTimerSession);

// Get timer session history
router.get('/history', getTimerSessionHistory);

// Start new timer session
router.post('/', validateStartTimer, startTimerSession);

// Pause timer session
router.put('/:id/pause', validatePauseTimer, pauseTimerSession);

// Resume timer session
router.put('/:id/resume', validateResumeTimer, resumeTimerSession);

// Stop timer session and create work log
router.put('/:id/stop', validateStopTimer, stopTimerSession);

// Cancel/delete timer session
router.delete('/:id', validateSessionId, cancelTimerSession);

export default router;
