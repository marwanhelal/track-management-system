// Re-export all phase controller functions from their respective modules

// CRUD operations
export {
  getPredefinedPhases,
  getProjectPhases,
  createPhase,
  updatePhase,
  deletePhase,
  updatePhaseHistorical
} from './phases.crud';

// Lifecycle management
export {
  submitPhase,
  approvePhase,
  completePhase,
  markPhaseWarning,
  startPhase,
  handlePhaseDelay
} from './phases.lifecycle';

// Early access management
export {
  grantEarlyAccess,
  revokeEarlyAccess,
  getEarlyAccessOverview
} from './phases.earlyaccess';
