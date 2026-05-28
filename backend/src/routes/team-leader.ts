import { Router } from 'express';
import { authenticate, teamLeaderOrSupervisor, authenticatedUser, canLogTime } from '@/middleware/auth';

// Controllers
import * as memberships from '@/controllers/team-memberships';
import * as tasks from '@/controllers/task-assignments';
import * as milestones from '@/controllers/task-milestones';
import * as notes from '@/controllers/task-notes';
import * as resources from '@/controllers/task-resources';
import * as blockers from '@/controllers/task-blockers';
import * as notifications from '@/controllers/notifications';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Team Memberships ─────────────────────────────────────────
router.get('/team-memberships/my-team',
  teamLeaderOrSupervisor,
  memberships.getMyTeam
);
router.get('/team-memberships/my-projects',
  teamLeaderOrSupervisor,
  memberships.getMyProjects
);
router.get('/team-memberships/available-engineers',
  teamLeaderOrSupervisor,
  memberships.getAvailableEngineers
);
router.get('/team-memberships/engineer/:engineerId',
  authenticatedUser,
  memberships.getEngineerMemberships
);
router.post('/team-memberships',
  teamLeaderOrSupervisor,
  memberships.createMembership
);
router.patch('/team-memberships/:id/deactivate',
  teamLeaderOrSupervisor,
  memberships.deactivateMembership
);

// ─── Task Assignments ─────────────────────────────────────────
router.get('/task-assignments/my-assigned-phases',
  authenticatedUser,
  tasks.getMyAssignedPhases
);
router.get('/task-assignments',
  authenticatedUser,
  tasks.getTaskAssignments
);
router.get('/task-assignments/:id',
  authenticatedUser,
  tasks.getTaskAssignmentById
);
router.post('/task-assignments',
  teamLeaderOrSupervisor,
  tasks.createTaskAssignment
);
router.patch('/task-assignments/:id',
  teamLeaderOrSupervisor,
  tasks.updateTaskAssignment
);
router.patch('/task-assignments/:id/start',
  canLogTime,
  tasks.startTask
);
router.patch('/task-assignments/:id/submit',
  canLogTime,
  tasks.submitTask
);
router.patch('/task-assignments/:id/review',
  teamLeaderOrSupervisor,
  tasks.reviewTask
);
router.patch('/task-assignments/:id/cancel',
  teamLeaderOrSupervisor,
  tasks.cancelTask
);

// ─── Milestones ───────────────────────────────────────────────
router.get('/task-assignments/:assignmentId/milestones',
  authenticatedUser,
  milestones.getMilestones
);
router.post('/task-assignments/:assignmentId/milestones',
  teamLeaderOrSupervisor,
  milestones.createMilestone
);
router.patch('/milestones/:id/complete',
  canLogTime,
  milestones.completeMilestone
);
router.patch('/milestones/:id/review-note',
  teamLeaderOrSupervisor,
  milestones.addMilestoneReviewNote
);
router.delete('/milestones/:id',
  teamLeaderOrSupervisor,
  milestones.deleteMilestone
);

// ─── Notes ────────────────────────────────────────────────────
router.get('/task-assignments/:assignmentId/notes',
  authenticatedUser,
  notes.getNotes
);
router.post('/task-assignments/:assignmentId/notes',
  authenticatedUser,
  notes.addNote
);
router.delete('/task-assignments/:assignmentId/notes/:noteId',
  authenticatedUser,
  notes.deleteNote
);

// ─── Resources ────────────────────────────────────────────────
router.get('/task-assignments/:assignmentId/resources',
  authenticatedUser,
  resources.getResources
);
router.post('/task-assignments/:assignmentId/resources',
  canLogTime,
  resources.addResource
);
router.delete('/task-assignments/:assignmentId/resources/:resourceId',
  authenticatedUser,
  resources.deleteResource
);

// ─── Blockers ─────────────────────────────────────────────────
router.get('/task-assignments/:assignmentId/blockers',
  authenticatedUser,
  blockers.getBlockers
);
router.post('/task-assignments/:assignmentId/blockers',
  canLogTime,
  blockers.reportBlocker
);
router.patch('/task-assignments/:assignmentId/blockers/:blockerId/resolve',
  teamLeaderOrSupervisor,
  blockers.resolveBlocker
);

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications',
  authenticatedUser,
  notifications.getMyNotifications
);
router.get('/notifications/unread-count',
  authenticatedUser,
  notifications.getUnreadCount
);
router.patch('/notifications/read-all',
  authenticatedUser,
  notifications.markAllRead
);
router.patch('/notifications/:id/read',
  authenticatedUser,
  notifications.markOneRead
);

export default router;
