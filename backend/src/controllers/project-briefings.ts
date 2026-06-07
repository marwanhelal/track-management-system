import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse } from '@/types';
import { createNotification } from './notifications';

const logHistory = async (
  briefingId: number,
  action: string,
  userId: number,
  userName: string,
  note: string | null,
  snapshot: object | null
) => {
  await query(
    `INSERT INTO project_briefing_history
       (briefing_id, action, changed_by, changed_by_name, note, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [briefingId, action, userId, userName, note, snapshot ? JSON.stringify(snapshot) : null]
  );
};

// GET /briefings
export const getBriefings = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { project_id, status } = req.query;
    const params: any[] = [];
    let where = 'WHERE 1=1';
    let idx = 1;

    if (authReq.user.role === 'team_leader') {
      where += ` AND pb.team_leader_id = $${idx++}`;
      params.push(authReq.user.id);
    }
    if (project_id) { where += ` AND pb.project_id = $${idx++}`; params.push(project_id); }
    if (status) { where += ` AND pb.status = $${idx++}`; params.push(status); }

    const result = await query(
      `SELECT
         pb.*,
         p.name       AS project_name,
         u_tl.name    AS team_leader_name,
         u_tl.email   AS team_leader_email,
         u_cr.name    AS created_by_name,
         (SELECT COUNT(*) FROM project_briefing_phases pbp WHERE pbp.briefing_id = pb.id)::INT AS phase_count
       FROM project_briefings pb
       JOIN projects p  ON p.id = pb.project_id
       JOIN users u_tl  ON u_tl.id = pb.team_leader_id
       LEFT JOIN users u_cr ON u_cr.id = pb.created_by
       ${where}
       ORDER BY pb.created_at DESC`,
      params
    );

    res.status(200).json({ success: true, data: { briefings: result.rows } } as ApiResponse);
  } catch (error) {
    console.error('getBriefings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /briefings/:id
export const getBriefingById = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT pb.*, p.name AS project_name,
              u_tl.name AS team_leader_name, u_tl.email AS team_leader_email,
              u_cr.name AS created_by_name
       FROM project_briefings pb
       JOIN projects p  ON p.id = pb.project_id
       JOIN users u_tl  ON u_tl.id = pb.team_leader_id
       LEFT JOIN users u_cr ON u_cr.id = pb.created_by
       WHERE pb.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Briefing not found' });
      return;
    }

    const briefing = result.rows[0];

    if (authReq.user.role === 'team_leader' && briefing.team_leader_id !== authReq.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const [phasesRes, historyRes] = await Promise.all([
      query(
        `SELECT pbp.id AS briefing_phase_id, pp.id AS phase_id,
                pp.phase_name, pp.phase_type, pp.status AS phase_status
         FROM project_briefing_phases pbp
         JOIN project_phases pp ON pp.id = pbp.phase_id
         WHERE pbp.briefing_id = $1
         ORDER BY pp.phase_name`,
        [id]
      ),
      query(
        `SELECT * FROM project_briefing_history
         WHERE briefing_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
    ]);

    res.status(200).json({
      success: true,
      data: { briefing, phases: phasesRes.rows, history: historyRes.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getBriefingById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /briefings
export const createBriefing = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { project_id, team_leader_id, phase_ids, title, body, duration_notes, due_date, resources, attachments } = req.body;

    if (!project_id || !team_leader_id || !title?.trim()) {
      res.status(400).json({ success: false, error: 'project_id, team_leader_id, and title are required' });
      return;
    }
    if (!Array.isArray(phase_ids) || phase_ids.length === 0) {
      res.status(400).json({ success: false, error: 'At least one phase must be selected' });
      return;
    }

    const [projCheck, tlCheck] = await Promise.all([
      query(`SELECT id, name FROM projects WHERE id = $1 AND archived_at IS NULL`, [project_id]),
      query(`SELECT id, name FROM users WHERE id = $1 AND role = 'team_leader' AND is_active = true`, [team_leader_id]),
    ]);

    if (projCheck.rows.length === 0) { res.status(400).json({ success: false, error: 'Project not found' }); return; }
    if (tlCheck.rows.length === 0) { res.status(400).json({ success: false, error: 'Team leader not found' }); return; }

    const briefingRes = await query(
      `INSERT INTO project_briefings
         (project_id, team_leader_id, created_by, title, body, duration_notes, due_date, resources, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        project_id, team_leader_id, authReq.user.id,
        title.trim(),
        body?.trim() || null,
        duration_notes?.trim() || null,
        due_date || null,
        resources?.trim() || null,
        JSON.stringify(attachments || []),
      ]
    );

    const briefing = briefingRes.rows[0];

    for (const phaseId of phase_ids) {
      await query(
        `INSERT INTO project_briefing_phases (briefing_id, phase_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [briefing.id, phaseId]
      );
    }

    await logHistory(briefing.id, 'created', authReq.user.id, authReq.user.name || '', null, {
      title: briefing.title, project_id, team_leader_id, phase_count: phase_ids.length,
    });

    await createNotification({
      user_id: team_leader_id,
      type: 'task_assigned',
      title: 'New Project Briefing',
      message: `New briefing assigned to you for "${projCheck.rows[0].name}": ${title.trim()}`,
      reference_type: 'project_briefing',
      reference_id: briefing.id,
    });

    res.status(201).json({
      success: true,
      message: 'Briefing created successfully',
      data: { briefing },
    } as ApiResponse);
  } catch (error) {
    console.error('createBriefing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PUT /briefings/:id
export const updateBriefing = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { title, body, duration_notes, due_date, resources, attachments, phase_ids } = req.body;

    const existing = await query(`SELECT * FROM project_briefings WHERE id = $1`, [id]);
    if (existing.rows.length === 0) { res.status(404).json({ success: false, error: 'Briefing not found' }); return; }
    if (existing.rows[0].status === 'archived') {
      res.status(400).json({ success: false, error: 'Cannot edit an archived briefing' }); return;
    }

    const updated = await query(
      `UPDATE project_briefings
       SET title          = COALESCE(NULLIF($1, ''), title),
           body           = $2,
           duration_notes = $3,
           due_date       = $4,
           resources      = $5,
           attachments    = COALESCE($6::JSONB, attachments),
           updated_at     = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        title?.trim() || null,
        body?.trim() ?? existing.rows[0].body,
        duration_notes?.trim() ?? existing.rows[0].duration_notes,
        due_date ?? existing.rows[0].due_date,
        resources?.trim() ?? existing.rows[0].resources,
        attachments != null ? JSON.stringify(attachments) : null,
        id,
      ]
    );

    if (Array.isArray(phase_ids)) {
      await query(`DELETE FROM project_briefing_phases WHERE briefing_id = $1`, [id]);
      for (const phaseId of phase_ids) {
        await query(
          `INSERT INTO project_briefing_phases (briefing_id, phase_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, phaseId]
        );
      }
    }

    await logHistory(parseInt(id), 'updated', authReq.user.id, authReq.user.name || '', null, {
      title: updated.rows[0].title, phase_count: phase_ids?.length ?? null,
    });

    res.status(200).json({
      success: true, message: 'Briefing updated',
      data: { briefing: updated.rows[0] },
    } as ApiResponse);
  } catch (error) {
    console.error('updateBriefing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /briefings/:id/archive
export const archiveBriefing = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const existing = await query(`SELECT * FROM project_briefings WHERE id = $1`, [id]);
    if (existing.rows.length === 0) { res.status(404).json({ success: false, error: 'Briefing not found' }); return; }

    await query(`UPDATE project_briefings SET status = 'archived', updated_at = NOW() WHERE id = $1`, [id]);
    await logHistory(parseInt(id), 'archived', authReq.user.id, authReq.user.name || '', null, null);

    res.status(200).json({ success: true, message: 'Briefing archived' } as ApiResponse);
  } catch (error) {
    console.error('archiveBriefing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
