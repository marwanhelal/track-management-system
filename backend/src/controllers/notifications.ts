import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, Notification, NotificationType } from '@/types';

// Internal helper — called by other controllers to create notifications
export const createNotification = async (data: {
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: number;
}): Promise<void> => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.user_id,
        data.type,
        data.title,
        data.message,
        data.reference_type || null,
        data.reference_id || null
      ]
    );
  } catch (error) {
    // Notification failure must never crash the main operation
    console.error('createNotification error (non-fatal):', error);
  }
};

// GET /notifications
// Returns unread + recent read notifications for the authenticated user
export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const limit = parseInt(req.query.limit as string) || 30;

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [authReq.user.id, limit]
    );

    const unreadCount = result.rows.filter((n: Notification) => !n.is_read).length;

    res.status(200).json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: unreadCount
      }
    } as ApiResponse);
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /notifications/read-all
export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [authReq.user.id]
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' } as ApiResponse);
  } catch (error) {
    console.error('markAllRead error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /notifications/:id/read
export const markOneRead = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, authReq.user.id]
    );

    res.status(200).json({ success: true, message: 'Notification marked as read' } as ApiResponse);
  } catch (error) {
    console.error('markOneRead error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /notifications/unread-count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [authReq.user.id]
    );

    res.status(200).json({
      success: true,
      data: { count: parseInt(result.rows[0].count) }
    } as ApiResponse);
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
