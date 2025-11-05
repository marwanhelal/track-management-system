import express from 'express';
import {
  // Template CRUD
  getChecklistTemplates,
  getChecklistTemplatesGrouped,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,

  // Project Checklist Items
  getProjectChecklistItems,
  getProjectChecklistGrouped,
  createProjectChecklistItem,
  updateProjectChecklistItem,
  deleteProjectChecklistItem,

  // Approval Workflow
  toggleItemCompletion,
  engineerApproval,
  supervisorApproval,
  revokeEngineerApproval,
  revokeSupervisorApproval,

  // Statistics & Progress
  getChecklistStatistics,
  updateClientNotes,

  // Checklist Generation
  generateProjectChecklist
} from '../controllers/checklist';

import { authenticate, supervisorOnly, engineerOnly, authorize } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// CHECKLIST TEMPLATES ROUTES (Supervisor only)
// ============================================================================

// Get all templates or filtered by phase
router.get('/templates', authenticate, getChecklistTemplates);

// Get templates grouped by phase
router.get('/templates/grouped', authenticate, getChecklistTemplatesGrouped);

// Create new template (supervisor only)
router.post('/templates', authenticate, supervisorOnly, createChecklistTemplate);

// Update template (supervisor only)
router.put('/templates/:id', authenticate, supervisorOnly, updateChecklistTemplate);

// Delete template (supervisor only)
router.delete('/templates/:id', authenticate, supervisorOnly, deleteChecklistTemplate);

// ============================================================================
// PROJECT CHECKLIST ITEMS ROUTES
// ============================================================================

// Generate checklist for a project from templates (called during project creation)
router.post('/projects/:project_id/generate', authenticate, supervisorOnly, generateProjectChecklist);

// Get project checklist items (all roles)
router.get('/projects/:project_id', authenticate, getProjectChecklistItems);

// Get project checklist grouped by phase with statistics (all roles)
router.get('/projects/:project_id/grouped', authenticate, getProjectChecklistGrouped);

// Get statistics for a specific phase (all roles)
router.get('/projects/:project_id/phases/:phase_name/statistics', authenticate, getChecklistStatistics);

// Create new checklist item for project (supervisor only - mainly for BOQ phase)
router.post('/projects/:project_id/items', authenticate, supervisorOnly, createProjectChecklistItem);

// Update checklist item (supervisor only for most fields, engineers can toggle completion)
router.put('/items/:id', authenticate, updateProjectChecklistItem);

// Delete checklist item (supervisor only)
router.delete('/items/:id', authenticate, supervisorOnly, deleteProjectChecklistItem);

// ============================================================================
// TASK COMPLETION & APPROVAL ROUTES
// ============================================================================

// Toggle task completion (engineers can check/uncheck tasks)
router.post('/items/:id/toggle-completion', authenticate, toggleItemCompletion);

// Engineer approval - Level 1 (engineers only)
router.post('/approve/engineer', authenticate, engineerOnly, engineerApproval);

// Supervisor approval - Levels 1, 2, 3 (supervisors only)
router.post('/approve/supervisor', authenticate, supervisorOnly, supervisorApproval);

// Revoke engineer approval (supervisors only)
router.post('/items/:id/revoke-engineer-approval', authenticate, supervisorOnly, revokeEngineerApproval);

// Revoke supervisor approval (supervisors only)
router.post('/items/:id/revoke-supervisor-approval', authenticate, supervisorOnly, revokeSupervisorApproval);

// ============================================================================
// CLIENT NOTES ROUTES
// ============================================================================

// Update client notes (supervisors only)
router.put('/items/:id/client-notes', authenticate, supervisorOnly, updateClientNotes);

export default router;
