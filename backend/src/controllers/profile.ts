import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ProfileUpdateInput, User, ApiResponse } from '@/types';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const result = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [authReq.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;

  try {
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const updates: ProfileUpdateInput = req.body;
    const allowedFields = ['name', 'email'];

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Validate and prepare updates
    for (const field of allowedFields) {
      if (updates[field as keyof ProfileUpdateInput] !== undefined) {
        const value = updates[field as keyof ProfileUpdateInput];

        // Validation
        if (field === 'name' && (!value || typeof value !== 'string' || value.trim().length === 0)) {
          res.status(400).json({
            success: false,
            error: 'Name cannot be empty'
          });
          return;
        }

        if (field === 'email') {
          if (!value || typeof value !== 'string') {
            res.status(400).json({
              success: false,
              error: 'Invalid email'
            });
            return;
          }

          // Check if email is already taken by another user
          const emailCheck = await query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [value, authReq.user.id]
          );

          if (emailCheck.rows.length > 0) {
            res.status(409).json({
              success: false,
              error: 'Email already taken'
            });
            return;
          }
        }

        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(value);
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

    updateValues.push(authReq.user.id);

    const result = await query(
      `UPDATE users
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};
