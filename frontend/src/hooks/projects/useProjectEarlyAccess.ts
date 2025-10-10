import { useCallback } from 'react';
import { ProjectPhase } from '../../types';
import { apiService } from '../../services/api';

interface UseProjectEarlyAccessResult {
  getEarlyAccessStatusColor: (status: string) => 'success' | 'primary' | 'default';
  canStartWithEarlyAccess: (phase: ProjectPhase) => boolean;
  isEarlyAccessAvailable: (phase: ProjectPhase) => boolean;
  getPhaseDisplayStatus: (phase: ProjectPhase) => string;
  grantEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
  revokeEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
  startPhaseWithEarlyAccess: (phaseId: number, note?: string) => Promise<void>;
}

export const useProjectEarlyAccess = (onRefresh: () => void): UseProjectEarlyAccessResult => {
  const getEarlyAccessStatusColor = (status: string): 'success' | 'primary' | 'default' => {
    switch (status) {
      case 'accessible':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'not_accessible':
        return 'default';
      default:
        return 'default';
    }
  };

  const canStartWithEarlyAccess = (phase: ProjectPhase): boolean => {
    return (
      phase.status === 'ready' ||
      (phase.early_access_granted && phase.early_access_status === 'accessible')
    );
  };

  const isEarlyAccessAvailable = (phase: ProjectPhase): boolean => {
    // Early access is available for phases that are not ready but could be started
    return phase.status === 'not_started' && !phase.early_access_granted;
  };

  const getPhaseDisplayStatus = (phase: ProjectPhase): string => {
    if (phase.early_access_granted && phase.early_access_status === 'in_progress') {
      return 'Early Access - In Progress';
    }
    if (phase.early_access_granted && phase.early_access_status === 'accessible') {
      return 'Early Access - Available';
    }
    return phase.status.replace('_', ' ');
  };

  const grantEarlyAccess = useCallback(
    async (phaseId: number, note?: string) => {
      try {
        const response = await apiService.grantEarlyAccess(phaseId, { note });
        if (response.success) {
          onRefresh();
        }
      } catch (error) {
        console.error('Failed to grant early access:', error);
        throw error;
      }
    },
    [onRefresh]
  );

  const revokeEarlyAccess = useCallback(
    async (phaseId: number, note?: string) => {
      try {
        const response = await apiService.revokeEarlyAccess(phaseId, { note });
        if (response.success) {
          onRefresh();
        }
      } catch (error) {
        console.error('Failed to revoke early access:', error);
        throw error;
      }
    },
    [onRefresh]
  );

  const startPhaseWithEarlyAccess = useCallback(
    async (phaseId: number, note?: string) => {
      try {
        const response = await apiService.startPhase(phaseId, { note });
        if (response.success) {
          onRefresh();
        }
      } catch (error) {
        console.error('Failed to start phase with early access:', error);
        throw error;
      }
    },
    [onRefresh]
  );

  return {
    getEarlyAccessStatusColor,
    canStartWithEarlyAccess,
    isEarlyAccessAvailable,
    getPhaseDisplayStatus,
    grantEarlyAccess,
    revokeEarlyAccess,
    startPhaseWithEarlyAccess
  };
};
