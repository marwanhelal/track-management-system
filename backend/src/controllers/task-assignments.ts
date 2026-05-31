import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import {
  ApiResponse,
  TaskAssignmentCreateInput,
  TaskAssignmentUpdateInput,
  TaskSubmitInput,
  TaskReviewInput
} from '@/types';
import { createNotification } from './notifications';
import { logHistory } from './task-history';

// ─── Helper: assert caller can manage a task ──────────────────
const assertCanManageTask = (authUser: any, task: any): string | null => {
  if (authUser.role === 'supervisor') return null;
  if (authUser.role === 'team_leader' && task.team_leader_id === authUser.id) return null;
  return 'Access denied';
};

// ─── Helper: assert caller is the assigned engineer ───────────
const assertIsEngineer = (authUser: any, task: any): string | null => {
  if (authUser.role === 'supervisor') return null;
  if (authUser.id === task.engineer_id) return null;
  return 'Access denied';
};

// GET /task-assignments
// supervisor: all tasks
// team_leader: tasks they created
// engineer: tasks assigned to them
// administrator: all (read-only)
export const getTaskAssignments = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { project_id, phase_id, engineer_id, status } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (authReq.user.role === 'team_leader') {
      whereClause += ` AND t.team_leader_id = $${paramIdx++}`;
      params.push(authReq.user.id);
    } else if (authReq.user.role === 'engineer') {
      whereClause += ` AND t.engineer_id = $${paramIdx++}`;
      params.push(authReq.user.id);
    }

    if (project_id) {
      whereClause += ` AND t.project_id = $${paramIdx++}`;
      params.push(project_id);
    }
    if (phase_id) {
      whereClause += ` AND t.phase_id = $${paramIdx++}`;
      params.push(phase_id);
    }
    if (engineer_id && authReq.user.role !== 'engineer') {
      whereClause += ` AND t.engineer_id = $${paramIdx++}`;
      params.push(engineer_id);
    }
    if (status) {
      whereClause += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }

    const result = await query(
      `SELECT t.*,
              COALESCE(wl.logged_hours, 0)         AS logged_hours,
              COALESCE(ms.total_milestones, 0)     AS total_milestones,
              COALESCE(ms.completed_milestones, 0) AS completed_milestones,
              COALESCE(ms.overdue_milestones, 0)   AS overdue_milestones,
              mp.max_milestone_priority,
              eng.name   AS engineer_name,
              eng.email  AS engineer_email,
              tl.name    AS team_leader_name,
              pr.name    AS project_name,
              ph.phase_name
       FROM task_assignments t
       JOIN users         eng ON eng.id = t.engineer_id
       JOIN users         tl  ON tl.id  = t.team_leader_id
       JOIN projects      pr  ON pr.id  = t.project_id
       JOIN project_phases ph  ON ph.id  = t.phase_id
       LEFT JOIN (
         SELECT tm.assignment_id, COALESCE(SUM(wl.hours), 0) AS logged_hours
         FROM work_logs wl
         JOIN task_milestones tm ON tm.id = wl.task_milestone_id
         WHERE wl.deleted_at IS NULL
         GROUP BY tm.assignment_id
       ) wl ON wl.assignment_id = t.id
       LEFT JOIN (
         SELECT assignment_id,
                COUNT(*)                                                            AS total_milestones,
                COUNT(*) FILTER (WHERE status = 'completed')                       AS completed_milestones,
                COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW())    AS overdue_milestones
         FROM task_milestones GROUP BY assignment_id
       ) ms ON ms.assignment_id = t.id
       LEFT JOIN (
         SELECT assignment_id,
                CASE MIN(CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END)
                  WHEN 1 THEN 'high' WHEN 2 THEN 'medium' WHEN 3 THEN 'low' ELSE 'medium' END AS max_milestone_priority
         FROM task_milestones
         WHERE completed_at IS NULL
         GROUP BY assignment_id
       ) mp ON mp.assignment_id = t.id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    res.status(200).json({
      success: true,
      data: { tasks: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getTaskAssignments error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /task-assignments/:id
export const getTaskAssignmentById = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*,
              COALESCE(wl.logged_hours, 0)         AS logged_hours,
              mp.max_milestone_priority,
              eng.name   AS engineer_name,
              eng.email  AS engineer_email,
              tl.name    AS team_leader_name,
              pr.name    AS project_name,
              ph.phase_name
       FROM task_assignments t
       JOIN users         eng ON eng.id = t.engineer_id
       JOIN users         tl  ON tl.id  = t.team_leader_id
       JOIN projects      pr  ON pr.id  = t.project_id
       JOIN project_phases ph  ON ph.id  = t.phase_id
       LEFT JOIN (
         SELECT tm.assignment_id, COALESCE(SUM(wl.hours), 0) AS logged_hours
         FROM work_logs wl
         JOIN task_milestones tm ON tm.id = wl.task_milestone_id
         WHERE wl.deleted_at IS NULL
         GROUP BY tm.assignment_id
       ) wl ON wl.assignment_id = t.id
       LEFT JOIN (
         SELECT assignment_id,
                CASE MIN(CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END)
                  WHEN 1 THEN 'high' WHEN 2 THEN 'medium' WHEN 3 THEN 'low' ELSE 'medium' END AS max_milestone_priority
         FROM task_milestones
         WHERE completed_at IS NULL
         GROUP BY assignment_id
       ) mp ON mp.assignment_id = t.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = result.rows[0];

    // Access check
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

    res.status(200).json({ success: true, data: { task } } as ApiResponse);
  } catch (error) {
    console.error('getTaskAssignmentById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-assignments
// team_leader or supervisor creates a task, optionally with milestones
export const createTaskAssignment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const {
      engineer_id,
      project_id,
      phase_id,
      title,
      description,
      allocated_hours,
      deadline,
      priority,
      milestones = []
    }: TaskAssignmentCreateInput & { priority?: string } = req.body;

    if (!engineer_id || !project_id || !phase_id || !title || !allocated_hours) {
      res.status(400).json({
        success: false,
        error: 'engineer_id, project_id, phase_id, title, and allocated_hours are required'
      });
      return;
    }

    // team_leader can only assign to engineers on their team for this project
    if (authReq.user.role === 'team_leader') {
      const membershipCheck = await query(
        `SELECT id FROM team_memberships
         WHERE team_leader_id = $1 AND engineer_id = $2 AND project_id = $3 AND is_active = true`,
        [authReq.user.id, engineer_id, project_id]
      );
      if (membershipCheck.rows.length === 0) {
        res.status(403).json({
          success: false,
          error: 'Engineer is not on your team for this project'
        });
        return;
      }
    }

    const result = await transaction(async (client) => {
      const taskResult = await client.query(
        `INSERT INTO task_assignments
           (team_leader_id, engineer_id, project_id, phase_id,
            title, description, allocated_hours, deadline, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          authReq.user.id,
          engineer_id,
          project_id,
          phase_id,
          title,
          description || null,
          allocated_hours,
          deadline || null,
          ['low','medium','high'].includes(priority || '') ? priority : 'medium'
        ]
      );

      const task = taskResult.rows[0];

      // Insert milestones if provided
      if (milestones.length > 0) {
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i]!;
          await client.query(
            `INSERT INTO task_milestones
               (assignment_id, title, description, due_date, display_order, allocated_hours, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [task.id, m.title, m.description || null, m.due_date, m.display_order ?? i, (m as any).allocated_hours || null, ['low','medium','high'].includes((m as any).priority) ? (m as any).priority : 'medium']
          );
        }
      }

      return task;
    });

    // Log history
    await logHistory(result.id, 'assigned', null, 'assigned', null, authReq.user.id, authReq.user.name);

    // Notify the engineer
    await createNotification({
      user_id: engineer_id,
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `"${title}" has been assigned to you. Deadline: ${deadline || 'Not set'}.`,
      reference_type: 'task_assignment',
      reference_id: result.id
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: result }
    } as ApiResponse);
  } catch (error) {
    console.error('createTaskAssignment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id
// TL or supervisor can edit title, description, hours, deadline
export const updateTaskAssignment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const updates: TaskAssignmentUpdateInput = req.body;

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const err = assertCanManageTask(authReq.user, existing.rows[0]);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    const allowedFields = ['title', 'description', 'allocated_hours', 'deadline', 'priority'];
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        values.push((updates as any)[field]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE task_assignments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Task updated',
      data: { task: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('updateTaskAssignment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id/start
// Engineer starts the task: assigned → in_progress
export const startTask = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = existing.rows[0];
    const err = assertIsEngineer(authReq.user, task);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    if (task.status !== 'assigned') {
      res.status(400).json({ success: false, error: `Cannot start a task with status "${task.status}"` });
      return;
    }

    const result = await query(
      `UPDATE task_assignments SET status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await logHistory(task.id, 'started', 'assigned', 'in_progress', null, authReq.user.id, authReq.user.name);

    res.status(200).json({
      success: true,
      message: 'Task started',
      data: { task: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('startTask error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id/submit
// Engineer submits with a final deliverable text: in_progress/blocked → submitted
export const submitTask = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { final_deliverable }: TaskSubmitInput = req.body;

    if (!final_deliverable || !final_deliverable.trim()) {
      res.status(400).json({ success: false, error: 'final_deliverable is required' });
      return;
    }

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = existing.rows[0];
    const err = assertIsEngineer(authReq.user, task);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    const submittableStatuses = ['in_progress', 'blocked', 'rejected'];
    if (!submittableStatuses.includes(task.status)) {
      res.status(400).json({ success: false, error: `Cannot submit a task with status "${task.status}"` });
      return;
    }

    const result = await query(
      `UPDATE task_assignments
       SET status = 'submitted',
           final_deliverable = $1,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [final_deliverable.trim(), id]
    );

    await logHistory(task.id, 'submitted', task.status, 'submitted', final_deliverable.trim().slice(0, 200), authReq.user.id, authReq.user.name);

    // Notify the team leader
    await createNotification({
      user_id: task.team_leader_id,
      type: 'task_submitted',
      title: 'Task submitted for review',
      message: `Engineer submitted "${task.title}". Review is required.`,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    // Check hours budget warning
    const hoursResult = await query(
      `SELECT COALESCE(SUM(hours), 0) AS logged FROM work_logs WHERE task_assignment_id = $1`,
      [id]
    );
    const logged = parseFloat(hoursResult.rows[0].logged);
    if (logged > task.allocated_hours) {
      await createNotification({
        user_id: task.team_leader_id,
        type: 'hours_budget_exceeded',
        title: 'Hours budget exceeded',
        message: `"${task.title}": ${logged}h logged vs ${task.allocated_hours}h allocated.`,
        reference_type: 'task_assignment',
        reference_id: task.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task submitted for review',
      data: { task: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('submitTask error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id/review
// TL or supervisor approves or rejects a submitted task
export const reviewTask = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { action, review_note }: TaskReviewInput = req.body;

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
      return;
    }

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = existing.rows[0];
    const err = assertCanManageTask(authReq.user, task);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    if (task.status !== 'submitted') {
      res.status(400).json({ success: false, error: 'Only submitted tasks can be reviewed' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await query(
      `UPDATE task_assignments
       SET status = $1, review_note = $2, reviewed_at = NOW(), reviewed_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newStatus, review_note || null, authReq.user.id, id]
    );

    await logHistory(task.id, action === 'approve' ? 'approved' : 'rejected', 'submitted', newStatus, review_note || null, authReq.user.id, authReq.user.name);

    // Notify the engineer
    const notifType = action === 'approve' ? 'task_approved' : 'task_rejected';
    const notifTitle = action === 'approve' ? 'Task approved ✅' : 'Task needs revision';
    const notifMsg = action === 'approve'
      ? `"${task.title}" was approved. ${review_note || ''}`
      : `"${task.title}" was rejected. ${review_note || 'Please revise and resubmit.'}`;

    await createNotification({
      user_id: task.engineer_id,
      type: notifType,
      title: notifTitle,
      message: notifMsg,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Task approved' : 'Task sent back for revision',
      data: { task: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('reviewTask error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id/cancel
// TL or supervisor cancels a task
export const cancelTask = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = existing.rows[0];
    const err = assertCanManageTask(authReq.user, task);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    if (['approved', 'cancelled'].includes(task.status)) {
      res.status(400).json({ success: false, error: `Cannot cancel a task with status "${task.status}"` });
      return;
    }

    await query(
      `UPDATE task_assignments
       SET status = 'cancelled', review_note = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason || null, id]
    );

    await logHistory(task.id, 'cancelled', task.status, 'cancelled', reason || null, authReq.user.id, authReq.user.name);

    await createNotification({
      user_id: task.engineer_id,
      type: 'task_cancelled',
      title: 'Task cancelled',
      message: `"${task.title}" has been cancelled. ${reason || ''}`,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    res.status(200).json({ success: true, message: 'Task cancelled' } as ApiResponse);
  } catch (error) {
    console.error('cancelTask error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /task-assignments/:id/reopen
// TL or supervisor reopens a rejected task, resetting it to 'assigned'
export const reopenTask = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { reopen_note } = req.body;

    const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = existing.rows[0];
    const err = assertCanManageTask(authReq.user, task);
    if (err) { res.status(403).json({ success: false, error: err }); return; }

    if (task.status !== 'rejected') {
      res.status(400).json({ success: false, error: 'Only rejected tasks can be reopened' });
      return;
    }

    const result = await query(
      `UPDATE task_assignments
       SET status = 'assigned',
           reopen_note = $1,
           reopened_at = NOW(),
           reopened_by = $2,
           review_note = NULL,
           final_deliverable = NULL,
           submitted_at = NULL,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [reopen_note?.trim() || null, authReq.user.id, id]
    );

    await logHistory(task.id, 'reopened', 'rejected', 'assigned', reopen_note?.trim() || null, authReq.user.id, authReq.user.name);

    await createNotification({
      user_id: task.engineer_id,
      type: 'task_approved',
      title: 'Task reopened — action required',
      message: `"${task.title}" has been reopened. ${reopen_note?.trim() || 'Review the feedback and start again.'}`,
      reference_type: 'task_assignment',
      reference_id: task.id
    });

    res.status(200).json({
      success: true,
      message: 'Task reopened and reassigned to engineer',
      data: { task: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('reopenTask error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-assignments/bulk-review
// TL or supervisor approves or rejects multiple submitted tasks at once
export const bulkReviewTasks = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { ids, action, review_note } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids must be a non-empty array' });
      return;
    }
    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedIds: number[] = [];

    for (const id of ids) {
      const existing = await query(`SELECT * FROM task_assignments WHERE id = $1`, [id]);
      if (existing.rows.length === 0) continue;

      const task = existing.rows[0];
      const err = assertCanManageTask(authReq.user, task);
      if (err) continue;
      if (task.status !== 'submitted') continue;

      await query(
        `UPDATE task_assignments
         SET status = $1, review_note = $2, reviewed_at = NOW(), reviewed_by = $3, updated_at = NOW()
         WHERE id = $4`,
        [newStatus, review_note || null, authReq.user.id, id]
      );

      await logHistory(task.id, action === 'approve' ? 'approved' : 'rejected', 'submitted', newStatus, review_note || null, authReq.user.id, authReq.user.name);

      await createNotification({
        user_id: task.engineer_id,
        type: action === 'approve' ? 'task_approved' : 'task_rejected',
        title: action === 'approve' ? 'Task approved ✅' : 'Task needs revision',
        message: `"${task.title}" was ${action === 'approve' ? 'approved' : 'rejected'}. ${review_note || ''}`,
        reference_type: 'task_assignment',
        reference_id: task.id
      });

      updatedIds.push(Number(id));
    }

    res.status(200).json({
      success: true,
      message: `${updatedIds.length} task(s) ${action === 'approve' ? 'approved' : 'rejected'}`,
      data: { updated_count: updatedIds.length, updated_ids: updatedIds }
    } as ApiResponse);
  } catch (error) {
    console.error('bulkReviewTasks error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /task-assignments/my-assigned-phases
// Engineer: returns distinct projects + phases where they have active task assignments
export const getMyAssignedPhases = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(
      `SELECT DISTINCT
         ta.project_id,
         ta.phase_id,
         p.name  AS project_name,
         p.status AS project_status,
         pp.phase_name,
         pp.status AS phase_status,
         pp.phase_order
       FROM task_assignments ta
       JOIN projects       p  ON p.id  = ta.project_id
       JOIN project_phases pp ON pp.id = ta.phase_id
       WHERE ta.engineer_id = $1
         AND ta.status NOT IN ('cancelled')
         AND p.archived_at IS NULL
       ORDER BY p.name, pp.phase_order`,
      [authReq.user.id]
    );

    res.status(200).json({
      success: true,
      data: {
        phases: result.rows,
        projects: [
          ...new Map(
            result.rows.map((r: any) => [
              r.project_id,
              { id: r.project_id, name: r.project_name, status: r.project_status }
            ])
          ).values()
        ]
      }
    } as ApiResponse);
  } catch (error) {
    console.error('getMyAssignedPhases error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
