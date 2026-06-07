import { Router } from 'express';
import { authenticate, supervisorOnly, authenticatedUser } from '@/middleware/auth';
import * as briefings from '@/controllers/project-briefings';

const router = Router();
router.use(authenticate);

router.get('/', authenticatedUser, briefings.getBriefings);
router.get('/:id', authenticatedUser, briefings.getBriefingById);
router.post('/', supervisorOnly, briefings.createBriefing);
router.put('/:id', supervisorOnly, briefings.updateBriefing);
router.patch('/:id/archive', supervisorOnly, briefings.archiveBriefing);

export default router;
