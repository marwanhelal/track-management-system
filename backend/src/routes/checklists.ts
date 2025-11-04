import { Router } from 'express';
import {
  // Template Controllers
  getTemplates,
  getTemplateByPhaseType,
  getAllTemplatesWithStructure,
  addTemplateItem,
  addTemplateSubsection,
  deleteTemplateItem,
  updateTemplateItem,
  // Instance Controllers
  getAllProjectsWithChecklists,
  getProjectChecklists,
  getPhaseChecklist,
  getChecklistProgress,
  updateClientNotes,
  addCustomItem,
  addCustomSubsection,
  deleteChecklistItem,
  // Approval Controllers
  approveChecklistItem,
  revokeApproval,
  bulkApproveItems
} from '@/controllers/checklists';
import { authenticate, supervisorOnly, viewerAccess } from '@/middleware/auth';
import { validateIdParam } from '@/utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================================
// TEMPLATE ROUTES (Admin/Supervisor)
// ======================================

// Get all templates
router.get('/templates', supervisorOnly, getTemplates);

// Get all templates with full structure (Admin interface)
router.get('/templates/structure', supervisorOnly, getAllTemplatesWithStructure);

// Get template by phase type
router.get('/templates/phase/:phaseType', getTemplateByPhaseType);

// Add item to template
router.post('/templates/items', supervisorOnly, addTemplateItem);

// Add subsection to template
router.post('/templates/subsections', supervisorOnly, addTemplateSubsection);

// Update template item
router.put('/templates/items/:itemId', supervisorOnly, updateTemplateItem);

// Delete template item
router.delete('/templates/items/:itemId', supervisorOnly, deleteTemplateItem);

// ======================================
// INSTANCE ROUTES
// ======================================

// Get all projects with checklist summary
router.get('/projects', getAllProjectsWithChecklists);

// Get all checklists for a project
router.get('/projects/:projectId', getProjectChecklists);

// Get checklist for specific phase
router.get('/phases/:phaseId', getPhaseChecklist);

// Get checklist progress summary
router.get('/instances/:instanceId/progress', getChecklistProgress);

// Update client notes (Supervisor only)
router.put('/instances/:instanceId/client-notes', supervisorOnly, updateClientNotes);

// Add custom item to checklist (Supervisor only)
router.post('/instances/items', supervisorOnly, addCustomItem);

// Add custom subsection to checklist (Supervisor only)
router.post('/instances/subsections', supervisorOnly, addCustomSubsection);

// Delete checklist item (Supervisor only)
router.delete('/items/:itemId', supervisorOnly, deleteChecklistItem);

// ======================================
// APPROVAL ROUTES
// ======================================

// Approve checklist item
// Engineers can only approve Level 1
// Supervisors/Admins can approve any level
router.post('/items/:itemId/approve', approveChecklistItem);

// Revoke approval (Supervisor only)
router.post('/items/:itemId/revoke', supervisorOnly, revokeApproval);

// Bulk approve items (Supervisor only)
router.post('/items/bulk-approve', supervisorOnly, bulkApproveItems);

export default router;
