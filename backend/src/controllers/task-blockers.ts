import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, TaskBlockerCreateInput, TaskBlockerResolveInput } from '@/types';
import { createNotification } from './notifications';

// POST /task-assignments/:assignmentId/blockers
// Engineer reports a blocker — task status switches to 'blocked'
export const reportBlocker = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;
    const { reason }: TaskBlockerCreateInput = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'reason is required' });
      return;
    }

    const taskResult = await query(
      `SELECT * FROM task_assignments WHERE id = $1`,
      [assignmentId]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];

    if (authReq.user.role !== 'supervisor' && authReq.user.id !== task.engineer_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (!['assigned', 'in_progress'].includes(task.status)) {
      res.status(400).json({ success: false, error: `Cannot report a blocker on a task with status "${task.status}"` });
      return;
    }

    // Check no active blocker already exists
    const activeBlocker = await query(
      `SELECT id FROM task_blockers WHERE assignment_id = $1 AND status = 'active'`,
      [assignmentId]
    );
    if (activeBlocker.rows.length > 0) {
      res.status(400).json({ success: false, error: 'An active blocker already exists on this task' });
      return;
    }

    // Insert blocker and set task status to 'blocked'
    const [blockerResult] = await Promise.all([
      query(
        `INSERT INTO task_blockers (assignment_id, reported_by, reason)
         VALUES ($1, $2, $3) RETURNING *`,
        [assignmentId, authReq.user.id, reason.trim()]
      ),
      query(
        `UPDATE task_assignments SET status = 'blocked', updated_at = NOW() WHERE id = $1`,
        [assignmentId]
      )
    ]);

    // Notify TL
    await createNotification({
      user_id: task.team_leader_id,
      type: 'blocker_reported',
      title: '🚧 Task blocked',
      message: `"${task.title}" is blocked: ${reason.trim().slice(0, 100)}`,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    res.status(201).json({
      success: true,
      message: 'Blocker reported. Task marked as blocked.',
      data: { blocker: blockerResult.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('reportBlocker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:assignmentId/blockers/:blockerId/resolve
// TL or supervisor resolves a blocker — task goes back to 'in_progress'
export const resolveBlocker = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId, blockerId } = req.params;
    const { resolved_note }: TaskBlockerResolveInput = req.body;

    const taskResult = await query(
      `SELECT * FROM task_assignments WHERE id = $1`,
      [assignmentId]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];

    if (authReq.user.role !== 'supervisor' && authReq.user.id !== task.team_leader_id) {
      res.status(403).json({ success: false, error: 'Only the team leader or supervisor can resolve a blocker' });
      return;
    }

    const blockerResult = await query(
      `SELECT * FROM task_blockers WHERE id = $1 AND assignment_id = $2`,
      [blockerId, assignmentId]
    );
    if (blockerResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Blocker not found' });
      return;
    }

    if (blockerResult.rows[0].status === 'resolved') {
      res.status(400).json({ success: false, error: 'Blocker is already resolved' });
      return;
    }

    // Resolve blocker and set task back to in_progress
    await Promise.all([
      query(
        `UPDATE task_blockers
         SET status = 'resolved', resolved_by = $1, resolved_note = $2, resolved_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [authReq.user.id, resolved_note || null, blockerId]
      ),
      query(
        `UPDATE task_assignments SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
        [assignmentId]
      )
    ]);

    // Notify the engineer
    await createNotification({
      user_id: task.engineer_id,
      type: 'blocker_resolved',
      title: 'Blocker resolved — you can proceed',
      message: `Your blocker on "${task.title}" has been resolved. ${resolved_note || ''}`,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    res.status(200).json({
      success: true,
      message: 'Blocker resolved. Task is back in progress.'
    } as ApiResponse);
  } catch (error) {
    console.error('resolveBlocker error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /task-assignments/:assignmentId/blockers
export const getBlockers = async (req: Request, res: Response): Promise<void> => {
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
      `SELECT b.*,
              u_rep.name AS reporter_name,
              u_res.name AS resolver_name
       FROM task_blockers b
       JOIN users u_rep ON u_rep.id = b.reported_by
       LEFT JOIN users u_res ON u_res.id = b.resolved_by
       WHERE b.assignment_id = $1
       ORDER BY b.created_at DESC`,
      [assignmentId]
    );

    res.status(200).json({
      success: true,
      data: { blockers: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getBlockers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
