import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getProfile,
  logout,
  changePassword
} from '@/controllers/auth';
import { authenticate } from '@/middleware/auth';
import {
  validateUserRegistration,
  validateUserLogin
} from '@/utils/validation';

const router = Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/refresh', refreshToken);

// Protected routes (require authentication)
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

export default router;