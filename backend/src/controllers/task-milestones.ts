import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, TaskMilestoneCreateInput, TaskMilestoneCompleteInput } from '@/types';
import { createNotification } from './notifications';

// Helper: enrich milestones with computed 'overdue' status
const enrichMilestone = (row: any) => ({
  ...row,
  // status stays 'pending' in DB — we compute 'overdue' on the fly
  status: row.status === 'completed'
    ? 'completed'
    : new Date(row.due_date) < new Date()
      ? 'overdue'
      : 'pending'
});

// GET /task-assignments/:assignmentId/milestones
export const getMilestones = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;

    // Verify task exists and caller has access
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
      `SELECT m.*,
              u_comp.name AS completed_by_name,
              u_rev.name  AS reviewed_by_name,
              COALESCE(wl_sum.logged_hours, 0) AS logged_hours
       FROM task_milestones m
       LEFT JOIN users u_comp ON u_comp.id = m.completed_by
       LEFT JOIN users u_rev  ON u_rev.id  = m.reviewed_by
       LEFT JOIN (
         SELECT task_milestone_id, SUM(hours) AS logged_hours
         FROM work_logs
         WHERE task_milestone_id IS NOT NULL AND deleted_at IS NULL
         GROUP BY task_milestone_id
       ) wl_sum ON wl_sum.task_milestone_id = m.id
       WHERE m.assignment_id = $1
       ORDER BY m.display_order, m.due_date`,
      [assignmentId]
    );

    res.status(200).json({
      success: true,
      data: { milestones: result.rows.map(enrichMilestone) }
    } as ApiResponse);
  } catch (error) {
    console.error('getMilestones error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-assignments/:assignmentId/milestones
// TL or supervisor adds a milestone to an existing task
export const createMilestone = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;
    const { title, description, due_date, display_order, allocated_hours }: TaskMilestoneCreateInput & { allocated_hours?: number } = req.body;

    if (!title || !due_date) {
      res.status(400).json({ success: false, error: 'title and due_date are required' });
      return;
    }

    const taskResult = await query(
      `SELECT team_leader_id, engineer_id FROM task_assignments WHERE id = $1`,
      [assignmentId]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== task.team_leader_id) {
      res.status(403).json({ success: false, error: 'Only the team leader or supervisor can add milestones' });
      return;
    }

    // Auto display_order if not provided
    const orderResult = await query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM task_milestones WHERE assignment_id = $1`,
      [assignmentId]
    );
    const nextOrder = display_order ?? orderResult.rows[0].next_order;

    const result = await query(
      `INSERT INTO task_milestones (assignment_id, title, description, due_date, display_order, allocated_hours)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [assignmentId, title, description || null, due_date, nextOrder, allocated_hours || null]
    );

    // Notify the engineer
    await createNotification({
      user_id: task.engineer_id,
      type: 'milestone_due_soon',
      title: 'New milestone added to your task',
      message: `Milestone "${title}" added — due ${due_date}.`,
      reference_type: 'task_milestone',
      reference_id: result.rows[0].id
    });

    res.status(201).json({
      success: true,
      message: 'Milestone added',
      data: { milestone: enrichMilestone(result.rows[0]) }
    } as ApiResponse);
  } catch (error) {
    console.error('createMilestone error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /milestones/:id
// TL or supervisor edits a milestone's title, description, due_date, allocated_hours
export const updateMilestone = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { title, description, due_date, allocated_hours } = req.body;

    const existing = await query(
      `SELECT m.*, ta.team_leader_id, ta.status AS task_status
       FROM task_milestones m
       JOIN task_assignments ta ON ta.id = m.assignment_id
       WHERE m.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Milestone not found' });
      return;
    }

    const milestone = existing.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== milestone.team_leader_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (['submitted', 'approved'].includes(milestone.task_status)) {
      res.status(400).json({ success: false, error: 'Cannot edit milestones on a submitted or approved task' });
      return;
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description || null); }
    if (due_date !== undefined) { fields.push(`due_date = $${idx++}`); values.push(due_date); }
    if (allocated_hours !== undefined) { fields.push(`allocated_hours = $${idx++}`); values.push(allocated_hours || null); }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE task_milestones SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Milestone updated',
      data: { milestone: enrichMilestone(result.rows[0]) }
    } as ApiResponse);
  } catch (error) {
    console.error('updateMilestone error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /milestones/:id/complete
// Engineer marks a milestone complete and writes what they did
export const completeMilestone = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { engineer_note }: TaskMilestoneCompleteInput = req.body;

    if (!engineer_note || !engineer_note.trim()) {
      res.status(400).json({ success: false, error: 'engineer_note is required' });
      return;
    }

    const existing = await query(
      `SELECT m.*, ta.engineer_id, ta.team_leader_id, ta.title AS task_title
       FROM task_milestones m
       JOIN task_assignments ta ON ta.id = m.assignment_id
       WHERE m.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Milestone not found' });
      return;
    }

    const milestone = existing.rows[0];

    // Only the assigned engineer (or supervisor) can complete
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== milestone.engineer_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (milestone.status === 'completed') {
      res.status(400).json({ success: false, error: 'Milestone is already completed' });
      return;
    }

    const result = await query(
      `UPDATE task_milestones
       SET status = 'completed',
           engineer_note = $1,
           completed_at = NOW(),
           completed_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [engineer_note.trim(), authReq.user.id, id]
    );

    // Notify TL
    await createNotification({
      user_id: milestone.team_leader_id,
      type: 'milestone_completed',
      title: 'Milestone completed',
      message: `"${milestone.title}" on task "${milestone.task_title}" has been completed.`,
      reference_type: 'task_milestone',
      reference_id: milestone.id
    });

    res.status(200).json({
      success: true,
      message: 'Milestone marked as complete',
      data: { milestone: enrichMilestone(result.rows[0]) }
    } as ApiResponse);
  } catch (error) {
    console.error('completeMilestone error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /milestones/:id/review-note
// TL adds a review note to a completed milestone
export const addMilestoneReviewNote = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { review_note } = req.body;

    if (!review_note || !review_note.trim()) {
      res.status(400).json({ success: false, error: 'review_note is required' });
      return;
    }

    const existing = await query(
      `SELECT m.*, ta.team_leader_id FROM task_milestones m
       JOIN task_assignments ta ON ta.id = m.assignment_id
       WHERE m.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Milestone not found' });
      return;
    }

    const milestone = existing.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== milestone.team_leader_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await query(
      `UPDATE task_milestones
       SET review_note = $1, reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [review_note.trim(), authReq.user.id, id]
    );

    res.status(200).json({
      success: true,
      message: 'Review note saved',
      data: { milestone: enrichMilestone(result.rows[0]) }
    } as ApiResponse);
  } catch (error) {
    console.error('addMilestoneReviewNote error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /milestones/:id
// TL or supervisor removes a milestone (only if task not yet submitted)
export const deleteMilestone = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT m.*, ta.team_leader_id, ta.status AS task_status
       FROM task_milestones m
       JOIN task_assignments ta ON ta.id = m.assignment_id
       WHERE m.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Milestone not found' });
      return;
    }

    const milestone = existing.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== milestone.team_leader_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (['submitted', 'approved'].includes(milestone.task_status)) {
      res.status(400).json({ success: false, error: 'Cannot delete milestones on a submitted or approved task' });
      return;
    }

    await query(`DELETE FROM task_milestones WHERE id = $1`, [id]);

    res.status(200).json({ success: true, message: 'Milestone deleted' } as ApiResponse);
  } catch (error) {
    console.error('deleteMilestone error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
