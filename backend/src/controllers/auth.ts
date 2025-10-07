import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query } from '@/database/connection';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken
} from '@/utils/auth';
import {
  User,
  LoginInput,
  RegisterInput,
  ApiResponse,
  AuthTokens
} from '@/types';

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { name, email, password, role, job_description }: RegisterInput = req.body;

    // Check if user already exists
    const existingUserResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role, job_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, job_description, is_active, created_at`,
      [name, email, passwordHash, role, job_description || null]
    );

    const user = userResult.rows[0];

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', user.id, 'REGISTER', user.id, `User registered with role: ${role}`]
    );

    const response: ApiResponse<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.created_at
        },
        tokens
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password }: LoginInput = req.body;

    // Get user from database
    const userResult = await query(
      'SELECT id, name, email, password_hash, role, job_description, is_active, is_super_admin FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        error: 'User account is deactivated'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', user.id, 'LOGIN', user.id, 'User logged in']
    );

    const response: ApiResponse<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          job_description: user.job_description,
          is_active: user.is_active,
          is_super_admin: user.is_super_admin || false,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        tokens
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
      return;
    }

    // Get user from database
    const userResult = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
      return;
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const response: ApiResponse<{ tokens: AuthTokens }> = {
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh'
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Get full user details from database
    const userResult = await query(
      'SELECT id, name, email, role, job_description, is_active, created_at, updated_at FROM users WHERE id = $1',
      [authReq.user.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = userResult.rows[0];

    const response: ApiResponse<{ user: Omit<User, 'password_hash'> }> = {
      success: true,
      data: { user }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Logout (client-side token removal, server-side audit log)
export const logout = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    if (authReq.user) {
      // Log audit event
      await query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['users', authReq.user.id, 'LOGOUT', authReq.user.id, 'User logged out']
      );
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
      return;
    }

    // Get user's current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [authReq.user.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, authReq.user.id]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', authReq.user.id, 'PASSWORD_CHANGE', authReq.user.id, 'User changed password']
    );

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during password change'
    });
  }
};