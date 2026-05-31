import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse } from '@/types';

// GET /task-templates
export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(
      `SELECT t.*,
              COALESCE(
                (SELECT JSON_AGG(m ORDER BY m.display_order)
                 FROM task_template_milestones m
                 WHERE m.template_id = t.id),
                '[]'
              ) AS milestones
       FROM task_templates t
       WHERE t.team_leader_id = $1
       ORDER BY t.created_at DESC`,
      [authReq.user.id]
    );

    res.status(200).json({
      success: true,
      data: { templates: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getTemplates error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /task-templates
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { name, description, allocated_hours, milestones = [] } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    const result = await transaction(async (client) => {
      const templateResult = await client.query(
        `INSERT INTO task_templates (team_leader_id, name, description, allocated_hours)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [authReq.user.id, name.trim(), description || null, allocated_hours || null]
      );

      const template = templateResult.rows[0];

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (!m.title) continue;
        await client.query(
          `INSERT INTO task_template_milestones
             (template_id, title, description, allocated_hours, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [template.id, m.title, m.description || null, m.allocated_hours || null, i]
        );
      }

      return template;
    });

    res.status(201).json({
      success: true,
      message: 'Template saved',
      data: { template: result }
    } as ApiResponse);
  } catch (error) {
    console.error('createTemplate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /task-templates/:id
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT id, team_leader_id FROM task_templates WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    if (authReq.user.role !== 'supervisor' && authReq.user.id !== existing.rows[0].team_leader_id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await query(`DELETE FROM task_templates WHERE id = $1`, [id]);

    res.status(200).json({ success: true, message: 'Template deleted' } as ApiResponse);
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
