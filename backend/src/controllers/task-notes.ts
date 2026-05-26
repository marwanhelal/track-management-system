import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse } from '@/types';
import { createNotification } from './notifications';

// GET /task-assignments/:assignmentId/notes
export const getNotes = async (req: Request, res: Response): Promise<void> => {
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
      `SELECT n.*, u.name AS author_name, u.role AS author_role
       FROM task_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.assignment_id = $1
       ORDER BY n.created_at ASC`,
      [assignmentId]
    );

    res.status(200).json({
      success: true,
      data: { notes: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getNotes error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-assignments/:assignmentId/notes
export const addNote = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, error: 'content is required' });
      return;
    }

    const taskResult = await query(
      `SELECT team_leader_id, engineer_id, title FROM task_assignments WHERE id = $1`,
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
      authReq.user.id !== task.engineer_id &&
      authReq.user.id !== task.team_leader_id
    ) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await query(
      `INSERT INTO task_notes (assignment_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [assignmentId, authReq.user.id, content.trim()]
    );

    // Notify the other party
    const isEngineer = authReq.user.id === task.engineer_id;
    const notifyUserId: number | undefined = isEngineer ? task.team_leader_id : task.engineer_id;
    const notifType = isEngineer ? 'engineer_note_added' : 'tl_note_added';

    if (notifyUserId) await createNotification({
      user_id: notifyUserId,
      type: notifType,
      title: isEngineer ? 'New note from engineer' : 'New note from team leader',
      message: `New note on "${task.title}": ${content.trim().slice(0, 80)}${content.length > 80 ? '…' : ''}`,
      reference_type: 'task_assignment',
      reference_id: parseInt(assignmentId || '0')
    });

    // Return with author info
    const enriched = await query(
      `SELECT n.*, u.name AS author_name, u.role AS author_role
       FROM task_notes n JOIN users u ON u.id = n.author_id
       WHERE n.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Note added',
      data: { note: enriched.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('addNote error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /task-assignments/:assignmentId/notes/:noteId
// Only the author can delete their own note
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { noteId } = req.params;

    const existing = await query(`SELECT * FROM task_notes WHERE id = $1`, [noteId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Note not found' });
      return;
    }

    const note = existing.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== note.author_id) {
      res.status(403).json({ success: false, error: 'You can only delete your own notes' });
      return;
    }

    await query(`DELETE FROM task_notes WHERE id = $1`, [noteId]);

    res.status(200).json({ success: true, message: 'Note deleted' } as ApiResponse);
  } catch (error) {
    console.error('deleteNote error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
