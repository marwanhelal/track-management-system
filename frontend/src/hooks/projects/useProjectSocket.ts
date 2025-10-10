import { useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';

interface SocketEventData {
  projectId: number;
  phase: any;
  grantedBy?: any;
  revokedBy?: any;
  startedBy?: any;
}

interface UseProjectSocketParams {
  projectId: number | undefined;
  onRefresh: () => void;
  onNotification: (message: string, severity: 'success' | 'info' | 'warning' | 'error') => void;
}

export const useProjectSocket = ({
  projectId,
  onRefresh,
  onNotification
}: UseProjectSocketParams) => {
  const { on, off, joinProject, leaveProject } = useSocket();

  useEffect(() => {
    if (!projectId) return;

    // Join project room for real-time updates
    joinProject(projectId);

    // Early Access Event Handlers
    const handleEarlyAccessGranted = (data: SocketEventData) => {
      console.log('Early access granted:', data);
      if (data.projectId === projectId) {
        // Refresh project data to show updated phase status
        onRefresh();

        // Show success notification
        onNotification(
          `Early access granted for ${data.phase.phase_name} by ${data.grantedBy?.name}`,
          'success'
        );
      }
    };

    const handleEarlyAccessRevoked = (data: SocketEventData) => {
      console.log('Early access revoked:', data);
      if (data.projectId === projectId) {
        // Refresh project data to show updated phase status
        onRefresh();

        // Show warning notification
        onNotification(
          `Early access revoked for ${data.phase.phase_name} by ${data.revokedBy?.name}`,
          'warning'
        );
      }
    };

    const handleEarlyAccessPhaseStarted = (data: SocketEventData) => {
      console.log('Early access phase started:', data);
      if (data.projectId === projectId) {
        // Refresh project data to show updated phase status
        onRefresh();

        // Show info notification
        onNotification(
          `${data.phase.phase_name} started with early access by ${data.startedBy?.name}`,
          'info'
        );
      }
    };

    // Register event listeners
    on('early_access_granted', handleEarlyAccessGranted);
    on('early_access_revoked', handleEarlyAccessRevoked);
    on('early_access_phase_started', handleEarlyAccessPhaseStarted);

    // Cleanup function
    return () => {
      // Remove event listeners
      off('early_access_granted', handleEarlyAccessGranted);
      off('early_access_revoked', handleEarlyAccessRevoked);
      off('early_access_phase_started', handleEarlyAccessPhaseStarted);

      // Leave project room
      leaveProject(projectId);
    };
  }, [projectId, on, off, joinProject, leaveProject, onRefresh, onNotification]);
};
