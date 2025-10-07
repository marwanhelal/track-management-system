import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { getProfile, updateProfile } from '@/controllers/profile';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
