import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse } from '@/types';

export const logHistory = async (
  assignment_id: number,
  action: string,
  from_status: string | null,
  to_status: string | null,
  note: string | null,
  performed_by: number,
  performed_by_name: string
): Promise<void> => {
  try {
    await query(
      `INSERT INTO task_history
         (assignment_id, action, from_status, to_status, note, performed_by, performed_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [assignment_id, action, from_status, to_status, note, performed_by, performed_by_name]
    );
  } catch (err) {
    console.error('logHistory error (non-fatal):', err);
  }
};

// GET /task-assignments/:assignmentId/history
export const getTaskHistory = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;

    const taskResult = await query(
      `SELECT team_leader_id, engineer_id FROM task_assignments WHERE id = $1`,
      [assignmentId]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];
    const role = authReq.user.role;
    if (
      role !== 'supervisor' &&
      role !== 'administrator' &&
      authReq.user.id !== task.engineer_id &&
      authReq.user.id !== task.team_leader_id
    ) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await query(
      `SELECT * FROM task_history WHERE assignment_id = $1 ORDER BY created_at ASC`,
      [assignmentId]
    );

    res.status(200).json({
      success: true,
      data: { history: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getTaskHistory error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
