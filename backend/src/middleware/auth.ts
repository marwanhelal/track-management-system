import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '@/utils/auth';
import { query } from '@/database/connection';
import { AuthenticatedRequest } from '@/types';

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Get user from database to ensure they still exist and are active
    const userResult = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(401).json({
        success: false,
        error: 'User account is deactivated'
      });
      return;
    }

    // Attach user to request
    authReq.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    let errorMessage = 'Authentication failed';
    if (error instanceof Error) {
      if (error.message === 'Access token expired') {
        errorMessage = 'Access token expired';
      } else if (error.message === 'Invalid access token') {
        errorMessage = 'Invalid access token';
      }
    }

    res.status(401).json({
      success: false,
      error: errorMessage
    });
  }
};

// Authorization middleware for specific roles
export const authorize = (...roles: ('supervisor' | 'engineer' | 'administrator')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Supervisor only middleware
export const supervisorOnly = authorize('supervisor');

// Engineer only middleware
export const engineerOnly = authorize('engineer');

// Administrator only middleware (read-only + export)
export const administratorOnly = authorize('administrator');

// All authenticated users (supervisor, engineer, administrator)
export const authenticatedUser = authorize('supervisor', 'engineer', 'administrator');

// Supervisor and Administrator (for viewing and exporting)
export const viewerAccess = authorize('supervisor', 'administrator');

// Super Admin middleware - Only specific account can create/delete supervisor/administrator accounts
// For production: Consider moving this email to environment variable or database flag
export const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // Check if user is the designated super admin
  // TODO: Move this to environment variable SUPER_ADMIN_EMAIL or add is_super_admin column to users table
  const SUPER_ADMIN_EMAIL = 'marwanhelal5@gmail.com';

  if (authReq.user.email !== SUPER_ADMIN_EMAIL) {
    res.status(403).json({
      success: false,
      error: 'Only the super admin can perform this action'
    });
    return;
  }

  next();
};

// Optional authentication middleware (for public routes that can benefit from user context)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyAccessToken(token);

      const userResult = await query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1 AND is_active = true',
        [payload.userId]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        authReq.user = {
          id: user.id,
          email: user.email,
          role: user.role
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just proceed without user context
    next();
  }
};

// Middleware to check if user can access specific project (supervisors can access all, engineers can access assigned projects)
export const canAccessProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const projectId = req.params.id || req.params.projectId || req.body.project_id;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'Project ID required'
      });
      return;
    }

    // Supervisors can access all projects
    if (authReq.user.role === 'supervisor') {
      next();
      return;
    }

    // Administrators can view all projects (read-only)
    if (authReq.user.role === 'administrator') {
      next();
      return;
    }

    // Engineers can access all projects (as per requirements)
    // Note: Based on your requirements, engineers can view and work on any project
    if (authReq.user.role === 'engineer') {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  } catch (error) {
    console.error('Project access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to check if engineer can log time on specific phase (only unlocked phases)
export const canLogTimeOnPhase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Supervisors can log time on any phase (for editing purposes)
    if (authReq.user.role === 'supervisor') {
      next();
      return;
    }

    const phaseId = req.params.phaseId || req.body.phase_id;

    if (!phaseId) {
      res.status(400).json({
        success: false,
        error: 'Phase ID required'
      });
      return;
    }

    // Check if phase is unlocked for engineers
    const phaseResult = await query(
      'SELECT status FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];
    const allowedStatuses = ['ready', 'in_progress', 'submitted'];

    if (!allowedStatuses.includes(phase.status)) {
      res.status(403).json({
        success: false,
        error: 'Cannot log time on this phase. Phase must be unlocked (ready, in progress, or submitted).'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Phase access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};