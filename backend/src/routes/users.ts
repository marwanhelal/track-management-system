import { Router } from 'express';
import {
  getUsers,
  getUser,
  createEngineer,
  createSupervisor,
  createAdministrator,
  updateUser,
  deactivateUser,
  deleteUser,
  reactivateUser,
  getUserProjectBreakdown
} from '@/controllers/users';
import { authenticate, supervisorOnly, superAdminOnly, viewerAccess } from '@/middleware/auth';
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

// Get user project breakdown (detailed hours per project and phase)
router.get('/:id/project-breakdown', validateIdParam, viewerAccess, getUserProjectBreakdown);

// Create engineer (supervisor only)
router.post('/engineers', supervisorOnly, validateEngineerCreation, handleValidationErrors, createEngineer);

// Create supervisor (super admin only)
router.post('/supervisors', superAdminOnly, validateEngineerCreation, handleValidationErrors, createSupervisor);

// Create administrator (super admin only)
router.post('/administrators', superAdminOnly, validateEngineerCreation, handleValidationErrors, createAdministrator);

// Update user
router.put('/:id', validateIdParam, validateUserUpdate, updateUser);

// Deactivate user (supervisor only)
router.post('/:id/deactivate', supervisorOnly, validateIdParam, deactivateUser);

// Delete user permanently (supervisor only)
router.delete('/:id', supervisorOnly, validateIdParam, deleteUser);

// Reactivate user (supervisor only)
router.post('/:id/reactivate', supervisorOnly, validateIdParam, reactivateUser);

export default router;