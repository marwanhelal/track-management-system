import { Router } from 'express';
import {
  getPhasePayments,
  updatePhasePaymentInfo,
  addPhasePayment,
  updatePhasePayment,
  deletePhasePayment
} from '@/controllers/phase-payments';
import { authenticate, supervisorOnly } from '@/middleware/auth';

const router = Router();

// All routes require authentication and supervisor role
router.use(authenticate);
router.use(supervisorOnly);

// Get all payments for a specific phase
router.get('/:phaseId', getPhasePayments);

// Update phase payment information (total amount, deadline, etc.)
router.put('/:phaseId/info', updatePhasePaymentInfo);

// Add a new payment transaction
router.post('/:phaseId/payments', addPhasePayment);

// Update a payment transaction
router.put('/payments/:paymentId', updatePhasePayment);

// Delete a payment transaction
router.delete('/payments/:paymentId', deletePhasePayment);

export default router;
