import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SocketEvents } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  on: <K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void) => void;
  off: <K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void) => void;
  emit: (event: string, data: any) => void;
  reconnect: () => void;
  getConnectionStats: () => {
    connected: boolean;
    reconnectAttempts: number;
    joinedRooms: string[];
  };
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Connection state tracking
  const reconnectAttemptsRef = useRef(0);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Maximum reconnection attempts
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  // Handle persistent socket reconnection failures by refreshing the page
  const handleSocketReconnectionFailure = useCallback(() => {
    const attemptKey = 'socketReconnectionFailureRefreshAttempts';
    const timestampKey = 'socketReconnectionFailureLastAttempt';
    const maxAttempts = 3;
    const resetWindow = 5 * 60 * 1000; // 5 minutes
    const refreshDelay = 3000; // 3 seconds

    // Get current attempts
    const attempts = parseInt(sessionStorage.getItem(attemptKey) || '0', 10);
    const lastAttempt = parseInt(sessionStorage.getItem(timestampKey) || '0', 10);
    const now = Date.now();

    // Reset counter if outside the time window
    if (now - lastAttempt > resetWindow) {
      sessionStorage.setItem(attemptKey, '1');
      sessionStorage.setItem(timestampKey, now.toString());
      console.log(`🔄 Socket reconnection failed. Refreshing page in ${refreshDelay / 1000} seconds...`);
      setTimeout(() => window.location.reload(), refreshDelay);
      return;
    }

    // Check if we've exceeded max attempts
    if (attempts >= maxAttempts) {
      console.warn('⚠️ Max auto-refresh attempts reached for socket failures. Please manually refresh the page.');
      return;
    }

    // Increment attempts and schedule refresh
    sessionStorage.setItem(attemptKey, (attempts + 1).toString());
    sessionStorage.setItem(timestampKey, now.toString());
    console.log(`🔄 Socket reconnection failed. Refreshing page in ${refreshDelay / 1000} seconds... (Attempt ${attempts + 1}/${maxAttempts})`);
    setTimeout(() => window.location.reload(), refreshDelay);
  }, []);

  // Optimized socket initialization
  const initializeSocket = useCallback((): Socket | null => {
    if (!isAuthenticated || !user) return null;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5005';

    // Get access token for authentication
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('❌ No access token available for socket connection');
      return null;
    }

    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken, // Send JWT token for authentication
        userId: user.id,
        role: user.role,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      forceNew: false, // Reuse existing connection to prevent connection spam
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      // console.log(`✅ Socket connected: ${newSocket.id}`);
      setConnected(true);
      reconnectAttemptsRef.current = 0;

      // Join user's personal room
      newSocket.emit('join_user', user.id);

      // Re-join previously joined project rooms
      joinedRoomsRef.current.forEach(room => {
        if (room.startsWith('project_')) {
          const projectId = parseInt(room.replace('project_', ''));
          newSocket.emit('join_project', projectId);
        }
      });

      // Start heartbeat
      startHeartbeat(newSocket);

      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason: string) => {
      // console.log(`❌ Socket disconnected: ${reason}`);
      setConnected(false);
      stopHeartbeat();

      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        // console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

        connectionTimeoutRef.current = setTimeout(() => {
          if (!connected && isAuthenticated && user) {
            newSocket.connect();
          }
        }, RECONNECT_DELAY * reconnectAttemptsRef.current);
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
      reconnectAttemptsRef.current++;

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('🚫 Maximum reconnection attempts reached');
        newSocket.disconnect();
      }
    });

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('reconnect_error', (error: Error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('🚫 Socket reconnection failed - max attempts reached');
      setConnected(false);

      // Auto-refresh page if socket fails to reconnect (indicates backend crash/restart)
      handleSocketReconnectionFailure();
    });

    // Global notification handler with error handling
    newSocket.on('notification', (data: any) => {
      try {
        console.log('📱 Notification received:', data);
        // Integration point for notification system
      } catch (error) {
        console.error('❌ Error processing notification:', error);
      }
    });

    // Error handler for any uncaught socket errors
    newSocket.on('error', (error: Error) => {
      console.error('❌ Socket error:', error);
    });

    setSocket(newSocket);

    return newSocket;
  }, [isAuthenticated, user, handleSocketReconnectionFailure]);

  // Heartbeat mechanism to keep connection alive
  const startHeartbeat = useCallback((socket: Socket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Main effect for socket management
  useEffect(() => {
    let currentSocket: Socket | null = null;

    if (isAuthenticated && user) {
      currentSocket = initializeSocket();
    }

    return () => {
      // Cleanup function
      if (currentSocket) {
        stopHeartbeat();
        joinedRoomsRef.current.clear();
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
      }

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, user, initializeSocket, stopHeartbeat]);

  // Handle authentication changes
  useEffect(() => {
    if (!isAuthenticated && socket) {
      console.log('🔐 User logged out - disconnecting socket');
      stopHeartbeat();
      joinedRoomsRef.current.clear();
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [isAuthenticated, socket, stopHeartbeat]);

  // Optimized room management
  const joinProject = useCallback((projectId: number) => {
    if (socket && connected) {
      const roomName = `project_${projectId}`;
      joinedRoomsRef.current.add(roomName);
      socket.emit('join_project', projectId);
      // console.log(`📁 Joined project room: ${projectId}`);
    } else {
      // console.warn('⚠️ Cannot join project - socket not connected');
    }
  }, [socket, connected]);

  const leaveProject = useCallback((projectId: number) => {
    if (socket) {
      const roomName = `project_${projectId}`;
      joinedRoomsRef.current.delete(roomName);
      socket.emit('leave_project', projectId);
      // console.log(`📁 Left project room: ${projectId}`);
    }
  }, [socket]);

  // Optimized event listeners with error handling
  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback: (data: SocketEvents[K]) => void
  ) => {
    if (socket) {
      const wrappedCallback = (data: SocketEvents[K]) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in socket event handler for ${event as string}:`, error);
        }
      };
      socket.on(event as string, wrappedCallback);
    } else {
      console.warn(`⚠️ Cannot register event listener for ${event as string} - socket not available`);
    }
  }, [socket]);

  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback?: (data: SocketEvents[K]) => void
  ) => {
    if (socket) {
      if (callback) {
        socket.off(event as string, callback);
      } else {
        socket.off(event as string);
      }
    }
  }, [socket]);

  const emit = useCallback((event: string, data: any) => {
    if (socket && connected) {
      try {
        socket.emit(event, data);
      } catch (error) {
        console.error(`❌ Error emitting socket event ${event}:`, error);
      }
    } else {
      console.warn(`⚠️ Cannot emit event ${event} - socket not connected`);
    }
  }, [socket, connected]);

  // Manual reconnection method
  const reconnect = useCallback(() => {
    if (socket && !connected) {
      console.log('🔄 Manual reconnection attempt');
      reconnectAttemptsRef.current = 0;
      socket.connect();
    }
  }, [socket, connected]);

  // Connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      connected,
      reconnectAttempts: reconnectAttemptsRef.current,
      joinedRooms: Array.from(joinedRoomsRef.current),
    };
  }, [connected]);

  const value: SocketContextType = {
    socket,
    connected,
    joinProject,
    leaveProject,
    on,
    off,
    emit,
    reconnect,
    getConnectionStats,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};