// Export all checklist controllers

// Template Controllers
export {
  getTemplates,
  getTemplateByPhaseType,
  getAllTemplatesWithStructure,
  addTemplateItem,
  addTemplateSubsection,
  deleteTemplateItem,
  updateTemplateItem
} from './templates.crud';

// Instance Controllers
export {
  getAllProjectsWithChecklists,
  getProjectChecklists,
  getPhaseChecklist,
  getChecklistProgress,
  updateClientNotes,
  addCustomItem,
  addCustomSubsection,
  deleteChecklistItem,
  createChecklistForPhase
} from './instances.crud';

// Approval Controllers
export {
  approveChecklistItem,
  revokeApproval,
  bulkApproveItems
} from './approvals';
