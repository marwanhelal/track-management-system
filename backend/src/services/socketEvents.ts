import { Server } from 'socket.io';

let io: Server | null = null;

export const initializeSocketEvents = (socketServer: Server): void => {
  io = socketServer;
};

export const emitToProject = (projectId: number, event: string, data: any): void => {
  if (io) {
    io.to(`project_${projectId}`).emit(event, data);
  }
};

export const emitToUser = (userId: number, event: string, data: any): void => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};

export const emitNotification = (userId: number | 'all', message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void => {
  const notification = {
    type,
    message,
    timestamp: new Date()
  };

  if (userId === 'all') {
    emitToAll('notification', notification);
  } else {
    emitToUser(userId, 'notification', notification);
  }
};

// Early Access Socket Events
export const emitEarlyAccessGranted = (projectId: number, phaseData: any, grantedBy: any): void => {
  const eventData = {
    type: 'early_access_granted',
    projectId,
    phase: phaseData,
    grantedBy,
    timestamp: new Date()
  };

  // Emit to all users in this project
  emitToProject(projectId, 'early_access_granted', eventData);

  // Send notification to project team
  emitToProject(projectId, 'notification', {
    type: 'success',
    message: `Early access granted for ${phaseData.phase_name} by ${grantedBy.name}`,
    timestamp: new Date()
  });
};

export const emitEarlyAccessRevoked = (projectId: number, phaseData: any, revokedBy: any): void => {
  const eventData = {
    type: 'early_access_revoked',
    projectId,
    phase: phaseData,
    revokedBy,
    timestamp: new Date()
  };

  // Emit to all users in this project
  emitToProject(projectId, 'early_access_revoked', eventData);

  // Send notification to project team
  emitToProject(projectId, 'notification', {
    type: 'warning',
    message: `Early access revoked for ${phaseData.phase_name} by ${revokedBy.name}`,
    timestamp: new Date()
  });
};

export const emitEarlyAccessPhaseStarted = (projectId: number, phaseData: any, startedBy: any): void => {
  const eventData = {
    type: 'early_access_phase_started',
    projectId,
    phase: phaseData,
    startedBy,
    timestamp: new Date()
  };

  // Emit to all users in this project
  emitToProject(projectId, 'early_access_phase_started', eventData);

  // Send notification to project team
  emitToProject(projectId, 'notification', {
    type: 'info',
    message: `${phaseData.phase_name} started with early access by ${startedBy.name}`,
    timestamp: new Date()
  });
};