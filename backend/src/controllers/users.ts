import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query, transaction } from '@/database/connection';
import { hashPassword, validatePasswordStrength } from '@/utils/auth';
import {
  User,
  RegisterInput,
  ApiResponse
} from '@/types';

// Get all users (for team management)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors can view all users
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can view all users'
      });
      return;
    }

    const result = await query(`
      SELECT
        id, name, email, role, is_active, created_at, updated_at,
        (SELECT COUNT(*) FROM work_logs WHERE engineer_id = users.id) as total_work_logs,
        (SELECT SUM(hours) FROM work_logs WHERE engineer_id = users.id) as total_hours
      FROM users
      ORDER BY created_at DESC
    `);

    const response: ApiResponse<{ users: any[] }> = {
      success: true,
      data: { users: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get single user
export const getUser = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Only supervisors can view other users, or users can view themselves
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== parseInt(id as string)) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const result = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const response: ApiResponse<{ user: Omit<User, 'password_hash'> }> = {
      success: true,
      data: { user: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Create new engineer (supervisor only)
export const createEngineer = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    // Only supervisors can create engineers
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can create engineer accounts'
      });
      return;
    }

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

    const { name, email, password }: RegisterInput = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
      return;
    }

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

    // Create engineer user (role is always 'engineer' for this endpoint)
    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash, 'engineer']
    );

    const user = userResult.rows[0];

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', user.id, 'CREATE_ENGINEER', authReq.user.id, `Engineer account created for: ${email}`]
    );

    const response: ApiResponse<{ user: Omit<User, 'password_hash'> }> = {
      success: true,
      message: 'Engineer account created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.created_at
        }
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create engineer error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during engineer creation'
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Only supervisors can update other users, or users can update themselves (limited fields)
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== parseInt(id as string)) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Define allowed fields based on role
    let allowedFields: string[];
    if (authReq.user.role === 'supervisor') {
      // Supervisors can update all fields except password
      allowedFields = ['name', 'email', 'is_active'];
    } else {
      // Users can only update their own name
      allowedFields = ['name'];
    }

    // Build update query safely using whitelist approach
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, is_active, created_at, updated_at
    `;

    const result = await query(updateQuery, updateValues);

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', id, 'UPDATE', authReq.user.id, `User updated: ${Object.keys(updates).join(', ')}`]
    );

    const response: ApiResponse<{ user: Omit<User, 'password_hash'> }> = {
      success: true,
      message: 'User updated successfully',
      data: { user: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Deactivate user (soft delete)
export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Only supervisors can deactivate users
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can deactivate users'
      });
      return;
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = existingUser.rows[0];

    // Prevent self-deactivation
    if (parseInt(id as string) === authReq.user.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
      return;
    }

    // Prevent deactivation of other supervisors
    if (user.role === 'supervisor') {
      res.status(400).json({
        success: false,
        error: 'Cannot deactivate supervisor accounts'
      });
      return;
    }

    // Soft delete by deactivating the user
    await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', id, 'DEACTIVATE', authReq.user.id, `User account deactivated: ${user.email}`]
    );

    const response: ApiResponse = {
      success: true,
      message: 'User account deactivated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete user (permanent deletion)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Only supervisors can delete users
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can delete users'
      });
      return;
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = existingUser.rows[0];

    // Prevent self-deletion
    if (parseInt(id as string) === authReq.user.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
      return;
    }

    // Prevent deletion of production supervisors (but allow test accounts)
    if (user.role === 'supervisor') {
      const isTestAccount = user.email.toLowerCase().includes('test') ||
                           user.email.toLowerCase().includes('example') ||
                           user.name.toLowerCase().includes('test');

      if (!isTestAccount) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete production supervisor accounts'
        });
        return;
      }
    }

    // Use a transaction to ensure data consistency
    await transaction(async (client) => {
      // First delete all work logs associated with this user
      await client.query(
        'DELETE FROM work_logs WHERE engineer_id = $1',
        [id]
      );

      // Delete any audit logs associated with this user (except the deletion log we're about to create)
      await client.query(
        'DELETE FROM audit_logs WHERE user_id = $1',
        [id]
      );

      // Log the deletion audit event BEFORE deleting the user (using the supervisor's ID)
      await client.query(
        'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
        ['users', id, 'DELETE', authReq.user.id, `User account and all associated work logs permanently deleted: ${user.email}`]
      );

      // Finally, permanently delete the user
      await client.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );
    });

    const response: ApiResponse = {
      success: true,
      message: 'User account deleted permanently'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Reactivate user
export const reactivateUser = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Only supervisors can reactivate users
    if (authReq.user.role !== 'supervisor') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can reactivate users'
      });
      return;
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const user = existingUser.rows[0];

    // Reactivate the user
    await query(
      'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
      [id]
    );

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['users', id, 'REACTIVATE', authReq.user.id, `User account reactivated: ${user.email}`]
    );

    const response: ApiResponse = {
      success: true,
      message: 'User account reactivated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};