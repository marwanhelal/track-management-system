import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, TaskResourceCreateInput } from '@/types';

// GET /task-assignments/:assignmentId/resources
export const getResources = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;
    const { milestone_id } = req.query;

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

    let whereExtra = '';
    const params: any[] = [assignmentId];

    if (milestone_id) {
      whereExtra = ` AND r.milestone_id = $2`;
      params.push(milestone_id);
    }

    const result = await query(
      `SELECT r.*,
              u.name  AS author_name,
              m.title AS milestone_title
       FROM task_resources r
       JOIN users u ON u.id = r.author_id
       LEFT JOIN task_milestones m ON m.id = r.milestone_id
       WHERE r.assignment_id = $1 ${whereExtra}
       ORDER BY r.created_at DESC`,
      params
    );

    res.status(200).json({
      success: true,
      data: { resources: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getResources error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-assignments/:assignmentId/resources
// Engineer uploads a resource (text doc, link, or technical data)
export const addResource = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { assignmentId } = req.params;
    const {
      resource_type,
      title,
      content,
      description,
      milestone_id
    }: TaskResourceCreateInput = req.body;

    if (!resource_type || !title || !content) {
      res.status(400).json({ success: false, error: 'resource_type, title, and content are required' });
      return;
    }

    const validTypes = ['text_document', 'external_link', 'technical_data'];
    if (!validTypes.includes(resource_type)) {
      res.status(400).json({ success: false, error: `resource_type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const taskResult = await query(
      `SELECT team_leader_id, engineer_id, status FROM task_assignments WHERE id = $1`,
      [assignmentId]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];
    // Only the assigned engineer (or supervisor) can add resources
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== task.engineer_id) {
      res.status(403).json({ success: false, error: 'Only the assigned engineer can add resources' });
      return;
    }

    if (task.status === 'approved' || task.status === 'cancelled') {
      res.status(400).json({ success: false, error: 'Cannot add resources to a completed or cancelled task' });
      return;
    }

    // Validate external_link has a URL-like content
    if (resource_type === 'external_link') {
      try {
        new URL(content);
      } catch {
        res.status(400).json({ success: false, error: 'content must be a valid URL for external_link resources' });
        return;
      }
    }

    // Validate technical_data is JSON array of {key, value}
    if (resource_type === 'technical_data') {
      try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) throw new Error();
      } catch {
        res.status(400).json({ success: false, error: 'content must be a JSON array of {key, value} objects for technical_data resources' });
        return;
      }
    }

    // Validate milestone belongs to this task if provided
    if (milestone_id) {
      const msCheck = await query(
        `SELECT id FROM task_milestones WHERE id = $1 AND assignment_id = $2`,
        [milestone_id, assignmentId]
      );
      if (msCheck.rows.length === 0) {
        res.status(400).json({ success: false, error: 'Milestone not found on this task' });
        return;
      }
    }

    const result = await query(
      `INSERT INTO task_resources
         (assignment_id, milestone_id, author_id, resource_type, title, content, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        assignmentId,
        milestone_id || null,
        authReq.user.id,
        resource_type,
        title,
        content,
        description || null
      ]
    );

    const enriched = await query(
      `SELECT r.*, u.name AS author_name, m.title AS milestone_title
       FROM task_resources r
       JOIN users u ON u.id = r.author_id
       LEFT JOIN task_milestones m ON m.id = r.milestone_id
       WHERE r.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Resource added',
      data: { resource: enriched.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('addResource error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /task-assignments/:assignmentId/resources/:resourceId
// Only the author can delete their resource
export const deleteResource = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { resourceId } = req.params;

    const existing = await query(`SELECT * FROM task_resources WHERE id = $1`, [resourceId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }

    const resource = existing.rows[0];
    if (authReq.user.role !== 'supervisor' && authReq.user.id !== resource.author_id) {
      res.status(403).json({ success: false, error: 'You can only delete your own resources' });
      return;
    }

    await query(`DELETE FROM task_resources WHERE id = $1`, [resourceId]);

    res.status(200).json({ success: true, message: 'Resource deleted' } as ApiResponse);
  } catch (error) {
    console.error('deleteResource error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
