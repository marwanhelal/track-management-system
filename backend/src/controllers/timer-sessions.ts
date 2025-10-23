import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ApiResponse, TimerSession, TimerSessionCreateInput } from '@/types';
import app from '@/app';

// Start a new timer session
export const startTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phase_id, description }: TimerSessionCreateInput = req.body;

    if (!phase_id || !description) {
      res.status(400).json({
        success: false,
        error: 'Phase ID and description are required'
      });
      return;
    }

    // Check if engineer already has an active or paused session
    const existingSessionResult = await query(
      `SELECT * FROM timer_sessions
       WHERE engineer_id = $1 AND status IN ('active', 'paused')
       LIMIT 1`,
      [authReq.user.id]
    );

    if (existingSessionResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'You already have an active timer session. Please stop or cancel it first.',
        data: { existingSession: existingSessionResult.rows[0] }
      });
      return;
    }

    // Validate phase exists and engineer can work on it
    const phaseResult = await query(`
      SELECT pp.*, p.name as project_name, p.id as project_id
      FROM project_phases pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1
    `, [phase_id]);

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Check if phase is in a state where work can be logged
    const allowedStatuses = ['ready', 'in_progress', 'submitted'];
    if (!allowedStatuses.includes(phase.status)) {
      res.status(403).json({
        success: false,
        error: `Cannot start timer on this phase. Phase status: ${phase.status}. Phase must be ready, in progress, or submitted.`
      });
      return;
    }

    // Create new timer session
    const result = await query(`
      INSERT INTO timer_sessions (
        engineer_id, phase_id, project_id, description,
        start_time, status, elapsed_time_ms, total_paused_ms
      )
      VALUES ($1, $2, $3, $4, NOW(), 'active', 0, 0)
      RETURNING *
    `, [authReq.user.id, phase_id, phase.project_id, description]);

    const session = result.rows[0];

    // Update phase status to in_progress if it was ready
    if (phase.status === 'ready') {
      await query(
        `UPDATE project_phases
         SET status = $1, actual_start_date = COALESCE(actual_start_date, NOW()), updated_at = NOW()
         WHERE id = $2`,
        ['in_progress', phase_id]
      );

      // Log audit event for phase status change
      await query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
         VALUES ($1, $2, $3, $4, $5)`,
        ['project_phases', phase_id, 'START', authReq.user.id, 'Phase started automatically when timer was started']
      );
    }

    // Log audit event for timer session
    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['timer_sessions', session.id, 'START', authReq.user.id, `Started timer for ${phase.phase_name}`]
    );

    // Emit Socket.IO event for real-time updates
    try {
      app.emitToAll('timer_started', {
        sessionId: session.id,
        engineerId: authReq.user.id,
        engineerName: authReq.user.name,
        projectId: phase.project_id,
        projectName: phase.project_name,
        phaseId: phase_id,
        phaseName: phase.phase_name,
        description,
        startTime: session.start_time
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
      // Continue even if socket fails
    }

    const response: ApiResponse<{ session: TimerSession; project_name: string; phase_name: string }> = {
      success: true,
      message: 'Timer session started successfully',
      data: {
        session,
        project_name: phase.project_name,
        phase_name: phase.phase_name
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Start timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Pause an active timer session
export const pauseTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { elapsed_time_ms } = req.body;

    // Check if session exists and belongs to the engineer
    const sessionResult = await query(
      `SELECT ts.*, pp.phase_name, p.name as project_name
       FROM timer_sessions ts
       JOIN project_phases pp ON ts.phase_id = pp.id
       JOIN projects p ON ts.project_id = p.id
       WHERE ts.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Timer session not found'
      });
      return;
    }

    const session = sessionResult.rows[0];

    // Verify ownership
    if (session.engineer_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only pause your own timer sessions'
      });
      return;
    }

    // Check if session is active
    if (session.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Cannot pause timer session with status: ${session.status}`
      });
      return;
    }

    // Update session to paused status
    const updateResult = await query(`
      UPDATE timer_sessions
      SET status = 'paused',
          paused_at = NOW(),
          elapsed_time_ms = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [elapsed_time_ms || session.elapsed_time_ms, id]);

    const updatedSession = updateResult.rows[0];

    // Log audit event
    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['timer_sessions', id, 'PAUSE', authReq.user.id, `Paused timer at ${Math.floor(elapsed_time_ms / 1000 / 60)} minutes`]
    );

    // Emit Socket.IO event
    try {
      app.emitToAll('timer_paused', {
        sessionId: id,
        engineerId: authReq.user.id,
        engineerName: authReq.user.name,
        projectId: session.project_id,
        projectName: session.project_name,
        phaseId: session.phase_id,
        phaseName: session.phase_name,
        pausedAt: updatedSession.paused_at,
        elapsedTimeMs: elapsed_time_ms
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
    }

    const response: ApiResponse<{ session: TimerSession }> = {
      success: true,
      message: 'Timer session paused successfully',
      data: { session: updatedSession }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Pause timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Resume a paused timer session
export const resumeTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { total_paused_ms } = req.body;

    // Check if session exists and belongs to the engineer
    const sessionResult = await query(
      `SELECT ts.*, pp.phase_name, p.name as project_name
       FROM timer_sessions ts
       JOIN project_phases pp ON ts.phase_id = pp.id
       JOIN projects p ON ts.project_id = p.id
       WHERE ts.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Timer session not found'
      });
      return;
    }

    const session = sessionResult.rows[0];

    // Verify ownership
    if (session.engineer_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only resume your own timer sessions'
      });
      return;
    }

    // Check if session is paused
    if (session.status !== 'paused') {
      res.status(400).json({
        success: false,
        error: `Cannot resume timer session with status: ${session.status}`
      });
      return;
    }

    // Update session to active status
    const updateResult = await query(`
      UPDATE timer_sessions
      SET status = 'active',
          paused_at = NULL,
          total_paused_ms = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [total_paused_ms || session.total_paused_ms, id]);

    const updatedSession = updateResult.rows[0];

    // Log audit event
    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['timer_sessions', id, 'RESUME', authReq.user.id, `Resumed timer after ${Math.floor(total_paused_ms / 1000 / 60)} minutes total pause`]
    );

    // Emit Socket.IO event
    try {
      app.emitToAll('timer_resumed', {
        sessionId: id,
        engineerId: authReq.user.id,
        engineerName: authReq.user.name,
        projectId: session.project_id,
        projectName: session.project_name,
        phaseId: session.phase_id,
        phaseName: session.phase_name,
        totalPausedMs: total_paused_ms
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
    }

    const response: ApiResponse<{ session: TimerSession }> = {
      success: true,
      message: 'Timer session resumed successfully',
      data: { session: updatedSession }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Resume timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Stop timer and create work log
export const stopTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;
    const { elapsed_time_ms, total_paused_ms } = req.body;

    // Check if session exists and belongs to the engineer
    const sessionResult = await query(
      `SELECT ts.*, pp.phase_name, p.name as project_name
       FROM timer_sessions ts
       JOIN project_phases pp ON ts.phase_id = pp.id
       JOIN projects p ON ts.project_id = p.id
       WHERE ts.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Timer session not found'
      });
      return;
    }

    const session = sessionResult.rows[0];

    // Verify ownership
    if (session.engineer_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only stop your own timer sessions'
      });
      return;
    }

    // Check if session is active or paused
    if (!['active', 'paused'].includes(session.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot stop timer session with status: ${session.status}`
      });
      return;
    }

    // Calculate active work time (elapsed - paused)
    const activeWorkTimeMs = elapsed_time_ms - total_paused_ms;
    const activeWorkHours = activeWorkTimeMs / (1000 * 60 * 60);

    if (activeWorkHours <= 0) {
      res.status(400).json({
        success: false,
        error: 'Active work time must be greater than 0'
      });
      return;
    }

    // Create work log with active work time only
    const workLogResult = await query(`
      INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, description, date)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
      RETURNING *
    `, [
      session.project_id,
      authReq.user.id,
      session.phase_id,
      activeWorkHours,
      session.description
    ]);

    const workLog = workLogResult.rows[0];

    // Update timer session to completed
    await query(`
      UPDATE timer_sessions
      SET status = 'completed',
          elapsed_time_ms = $1,
          total_paused_ms = $2,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [elapsed_time_ms, total_paused_ms, id]);

    // Log audit events
    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['timer_sessions', id, 'STOP', authReq.user.id, `Stopped timer and created work log with ${activeWorkHours.toFixed(2)} hours`]
    );

    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['work_logs', workLog.id, 'CREATE', authReq.user.id, `Created from timer session (Active: ${activeWorkHours.toFixed(2)}h, Paused: ${(total_paused_ms / (1000 * 60 * 60)).toFixed(2)}h)`]
    );

    // Emit Socket.IO events
    try {
      app.emitToAll('timer_stopped', {
        sessionId: id,
        engineerId: authReq.user.id,
        engineerName: authReq.user.name,
        projectId: session.project_id,
        projectName: session.project_name,
        phaseId: session.phase_id,
        phaseName: session.phase_name,
        workLogId: workLog.id,
        activeWorkHours: activeWorkHours.toFixed(2),
        totalPausedHours: (total_paused_ms / (1000 * 60 * 60)).toFixed(2)
      });

      app.emitToAll('engineer_activity_updated', {
        engineerId: authReq.user.id,
        engineerName: authReq.user.name,
        projectId: session.project_id,
        projectName: session.project_name,
        phaseId: session.phase_id,
        phaseName: session.phase_name,
        hours: activeWorkHours,
        date: new Date().toISOString().split('T')[0],
        action: 'work_logged'
      });
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
    }

    const response: ApiResponse<{ workLog: any; activeWorkHours: number; totalPausedHours: number }> = {
      success: true,
      message: 'Timer stopped and work log created successfully',
      data: {
        workLog,
        activeWorkHours: parseFloat(activeWorkHours.toFixed(2)),
        totalPausedHours: parseFloat((total_paused_ms / (1000 * 60 * 60)).toFixed(2))
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Stop timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get engineer's active or paused timer session
export const getActiveTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const result = await query(`
      SELECT ts.*, pp.phase_name, p.name as project_name, u.name as engineer_name
      FROM timer_sessions ts
      JOIN project_phases pp ON ts.phase_id = pp.id
      JOIN projects p ON ts.project_id = p.id
      JOIN users u ON ts.engineer_id = u.id
      WHERE ts.engineer_id = $1 AND ts.status IN ('active', 'paused')
      ORDER BY ts.created_at DESC
      LIMIT 1
    `, [authReq.user.id]);

    if (result.rows.length === 0) {
      res.status(200).json({
        success: true,
        data: { session: null }
      });
      return;
    }

    const response: ApiResponse<{ session: TimerSession }> = {
      success: true,
      data: { session: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get active timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Cancel/delete a timer session
export const cancelTimerSession = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { id } = req.params;

    // Check if session exists and belongs to the engineer
    const sessionResult = await query(
      `SELECT * FROM timer_sessions WHERE id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Timer session not found'
      });
      return;
    }

    const session = sessionResult.rows[0];

    // Verify ownership
    if (session.engineer_id !== authReq.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only cancel your own timer sessions'
      });
      return;
    }

    // Check if session can be cancelled
    if (session.status === 'completed') {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel a completed timer session'
      });
      return;
    }

    // Update session to cancelled
    await query(`
      UPDATE timer_sessions
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Log audit event
    await query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      ['timer_sessions', id, 'CANCEL', authReq.user.id, 'Timer session cancelled by engineer']
    );

    const response: ApiResponse = {
      success: true,
      message: 'Timer session cancelled successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Cancel timer session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get timer session history for engineer
export const getTimerSessionHistory = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(`
      SELECT ts.*, pp.phase_name, p.name as project_name
      FROM timer_sessions ts
      JOIN project_phases pp ON ts.phase_id = pp.id
      JOIN projects p ON ts.project_id = p.id
      WHERE ts.engineer_id = $1
      ORDER BY ts.created_at DESC
      LIMIT $2 OFFSET $3
    `, [authReq.user.id, limit, offset]);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM timer_sessions WHERE engineer_id = $1`,
      [authReq.user.id]
    );

    const response: ApiResponse<{ sessions: TimerSession[]; pagination: any }> = {
      success: true,
      data: {
        sessions: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / Number(limit)),
          totalItems: Number(countResult.rows[0].count),
          itemsPerPage: Number(limit)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get timer session history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
