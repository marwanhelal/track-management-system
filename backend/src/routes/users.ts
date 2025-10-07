import { Router } from 'express';
import {
  getUsers,
  getUser,
  createEngineer,
  updateUser,
  deactivateUser,
  deleteUser,
  reactivateUser
} from '@/controllers/users';
import { authenticate, supervisorOnly } from '@/middleware/auth';
import {
  validateUserRegistration,
  validateEngineerCreation,
  validateUserUpdate,
  validateIdParam,
  handleValidationErrors
} from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (supervisor only)
router.get('/', supervisorOnly, getUsers);

// Get single user
router.get('/:id', validateIdParam, getUser);

// Create engineer (supervisor only)
router.post('/engineers', supervisorOnly, validateEngineerCreation, handleValidationErrors, createEngineer);

// Update user
router.put('/:id', validateIdParam, validateUserUpdate, updateUser);

// Deactivate user (supervisor only)
router.post('/:id/deactivate', supervisorOnly, validateIdParam, deactivateUser);

// Delete user permanently (supervisor only)
router.delete('/:id', supervisorOnly, validateIdParam, deleteUser);

// Reactivate user (supervisor only)
router.post('/:id/reactivate', supervisorOnly, validateIdParam, reactivateUser);

export default router;