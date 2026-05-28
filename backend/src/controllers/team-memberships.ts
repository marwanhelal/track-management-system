import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, TeamMembership, TeamMembershipCreateInput } from '@/types';
import { createNotification } from './notifications';

// GET /team-memberships/my-team
// Team leader sees all engineers on their team (across all projects)
export const getMyTeam = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(
      `SELECT
         tm.id,
         tm.engineer_id,
         tm.project_id,
         tm.is_active,
         tm.note,
         tm.created_at,
         u.name  AS engineer_name,
         u.email AS engineer_email,
         p.name  AS project_name,
         -- active task count for this engineer on this project
         COUNT(ta.id) FILTER (
           WHERE ta.status NOT IN ('approved','cancelled')
         ) AS active_tasks,
         -- total hours logged by engineer on this project
         COALESCE(SUM(wl.hours), 0) AS total_hours_logged
       FROM team_memberships tm
       JOIN users    u  ON u.id = tm.engineer_id
       JOIN projects p  ON p.id = tm.project_id
       LEFT JOIN task_assignments ta
              ON ta.engineer_id  = tm.engineer_id
             AND ta.project_id   = tm.project_id
             AND ta.team_leader_id = $1
       LEFT JOIN work_logs wl
              ON wl.engineer_id = tm.engineer_id
             AND wl.project_id  = tm.project_id
       WHERE tm.team_leader_id = $1
         AND tm.is_active = true
       GROUP BY tm.id, u.name, u.email, p.name
       ORDER BY u.name, p.name`,
      [authReq.user.id]
    );

    res.status(200).json({
      success: true,
      data: { memberships: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getMyTeam error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /team-memberships/engineer/:engineerId
// Supervisor or the engineer themselves: see all team memberships for an engineer
export const getEngineerMemberships = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { engineerId } = req.params;

    if (
      authReq.user.role !== 'supervisor' &&
      authReq.user.id !== parseInt(engineerId || '0')
    ) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await query(
      `SELECT
         tm.*,
         u_tl.name  AS team_leader_name,
         u_tl.email AS team_leader_email,
         p.name     AS project_name
       FROM team_memberships tm
       JOIN users    u_tl ON u_tl.id = tm.team_leader_id
       JOIN projects p    ON p.id    = tm.project_id
       WHERE tm.engineer_id = $1
       ORDER BY tm.is_active DESC, p.name`,
      [engineerId]
    );

    res.status(200).json({
      success: true,
      data: { memberships: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getEngineerMemberships error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /team-memberships
// Supervisor OR team_leader can add an engineer to their team on a project
export const createMembership = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { engineer_id, project_id, note }: TeamMembershipCreateInput = req.body;

    if (!engineer_id || !project_id) {
      res.status(400).json({ success: false, error: 'engineer_id and project_id are required' });
      return;
    }

    // Determine team_leader_id: supervisor assigns on behalf of a TL, TL assigns themselves
    let teamLeaderId: number;
    if (authReq.user.role === 'supervisor') {
      const { team_leader_id } = req.body;
      if (!team_leader_id) {
        res.status(400).json({ success: false, error: 'team_leader_id is required when supervisor creates a membership' });
        return;
      }
      // Verify target is actually a team_leader
      const tlCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND role = 'team_leader' AND is_active = true`,
        [team_leader_id]
      );
      if (tlCheck.rows.length === 0) {
        res.status(400).json({ success: false, error: 'Specified team leader not found or not active' });
        return;
      }
      teamLeaderId = team_leader_id;
    } else {
      // team_leader adds to their own team
      teamLeaderId = authReq.user.id;
    }

    // Verify engineer exists and has engineer role
    const engCheck = await query(
      `SELECT id FROM users WHERE id = $1 AND role = 'engineer' AND is_active = true`,
      [engineer_id]
    );
    if (engCheck.rows.length === 0) {
      res.status(400).json({ success: false, error: 'Engineer not found or not active' });
      return;
    }

    // Verify project exists
    const projCheck = await query(
      `SELECT id FROM projects WHERE id = $1 AND archived_at IS NULL`,
      [project_id]
    );
    if (projCheck.rows.length === 0) {
      res.status(400).json({ success: false, error: 'Project not found' });
      return;
    }

    // Upsert — if deactivated membership exists, reactivate it
    const result = await query(
      `INSERT INTO team_memberships
         (team_leader_id, engineer_id, project_id, assigned_by, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (team_leader_id, engineer_id, project_id)
       DO UPDATE SET is_active = true, note = EXCLUDED.note, updated_at = NOW()
       RETURNING *`,
      [teamLeaderId, engineer_id, project_id, authReq.user.id, note || null]
    );

    // Notify the engineer
    await createNotification({
      user_id: engineer_id,
      type: 'task_assigned',
      title: 'Added to a project team',
      message: `You have been added to a project team. Check your Projects page.`,
      reference_type: 'team_membership',
      reference_id: result.rows[0].id
    });

    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ('team_memberships', $1, 'CREATE', $2, $3)`,
      [result.rows[0].id, authReq.user.id, `Engineer ${engineer_id} added to TL ${teamLeaderId} on project ${project_id}`]
    );

    res.status(201).json({
      success: true,
      message: 'Engineer added to team successfully',
      data: { membership: result.rows[0] }
    } as ApiResponse);
  } catch (error) {
    console.error('createMembership error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /team-memberships/:id/deactivate
// Supervisor or the TL who owns the membership can remove an engineer from their team
export const deactivateMembership = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT * FROM team_memberships WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Membership not found' });
      return;
    }

    const membership: TeamMembership = existing.rows[0];

    // Only supervisor or the owning TL can deactivate
    if (
      authReq.user.role !== 'supervisor' &&
      authReq.user.id !== membership.team_leader_id
    ) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await query(
      `UPDATE team_memberships SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Engineer removed from team'
    } as ApiResponse);
  } catch (error) {
    console.error('deactivateMembership error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /team-memberships/my-projects
// Team leader: get all distinct projects where they are team_leader_id (any is_active status)
export const getMyProjects = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(
      `SELECT DISTINCT p.id, p.name, p.status
       FROM team_memberships tm
       JOIN projects p ON p.id = tm.project_id
       WHERE tm.team_leader_id = $1
         AND p.archived_at IS NULL
       ORDER BY p.name`,
      [authReq.user.id]
    );

    res.status(200).json({
      success: true,
      data: { projects: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getMyProjects error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /team-memberships/available-engineers
// TL or supervisor: list all active engineers not yet on this TL+project combo
export const getAvailableEngineers = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { project_id, team_leader_id } = req.query;

    const tlId = authReq.user.role === 'supervisor' ? team_leader_id : authReq.user.id;

    if (!project_id) {
      res.status(400).json({ success: false, error: 'project_id is required' });
      return;
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.job_description
       FROM users u
       WHERE u.role = 'engineer'
         AND u.is_active = true
         AND u.id NOT IN (
           SELECT engineer_id FROM team_memberships
           WHERE team_leader_id = $1
             AND project_id = $2
             AND is_active = true
         )
       ORDER BY u.name`,
      [tlId, project_id]
    );

    res.status(200).json({
      success: true,
      data: { engineers: result.rows }
    } as ApiResponse);
  } catch (error) {
    console.error('getAvailableEngineers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
