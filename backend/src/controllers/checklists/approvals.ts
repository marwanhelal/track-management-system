import { Request, Response } from 'express';
import { query } from '@/database/connection';
import { ChecklistApprovalInput, ApiResponse } from '@/types';

// Approve checklist item at specific level
export const approveChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { itemId } = req.params;
    const { level, note }: ChecklistApprovalInput = req.body;

    if (!level || ![1, 2, 3, 4].includes(level)) {
      res.status(400).json({
        success: false,
        error: 'Valid approval level (1-4) is required'
      });
      return;
    }

    // Permission check
    // Engineers can only approve Level 1
    // Supervisors and Admins can approve any level
    if (authReq.user.role === 'engineer' && level !== 1) {
      res.status(403).json({
        success: false,
        error: 'Engineers can only complete Level 1 approvals'
      });
      return;
    }

    // Update approval
    const result = await query(`
      UPDATE checklist_instance_items
      SET
        approval_level_${level} = true,
        approval_level_${level}_by = $1,
        approval_level_${level}_at = NOW(),
        approval_level_${level}_note = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [authReq.user.id, note || null, itemId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Checklist item not found'
      });
      return;
    }

    const item = result.rows[0];

    // Get project_id for socket event
    const projectResult = await query(`
      SELECT ci.project_id
      FROM checklist_instance_items cii
      JOIN checklist_instance_subsections cis ON cii.instance_subsection_id = cis.id
      JOIN checklist_instances ci ON cis.instance_id = ci.id
      WHERE cii.id = $1
    `, [itemId]);

    const projectId = projectResult.rows[0]?.project_id;

    // Emit socket event for real-time updates
    const io = (req as any).app.get('io');
    if (io && projectId) {
      io.to(`project_${projectId}`).emit('checklist:item_approved', {
        item_id: parseInt(itemId!),
        level,
        approved_by: authReq.user.id,
        project_id: projectId
      });
    }

    // Log audit event
    await query(`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, new_values)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      'checklist_item',
      itemId,
      `approve_level_${level}`,
      authReq.user.id,
      JSON.stringify({ level, note, timestamp: new Date() })
    ]);

    const response: ApiResponse = {
      success: true,
      data: { item },
      message: `Level ${level} approval completed successfully`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Approve checklist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Revoke approval (Supervisors/Admins only)
export const revokeApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { itemId } = req.params;
    const { level } = req.body;

    // Only supervisors/admins can revoke approvals
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can revoke approvals'
      });
      return;
    }

    if (!level || ![1, 2, 3, 4].includes(level)) {
      res.status(400).json({
        success: false,
        error: 'Valid approval level (1-4) is required'
      });
      return;
    }

    const result = await query(`
      UPDATE checklist_instance_items
      SET
        approval_level_${level} = false,
        approval_level_${level}_by = NULL,
        approval_level_${level}_at = NULL,
        approval_level_${level}_note = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [itemId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Checklist item not found'
      });
      return;
    }

    // Get project_id for socket event
    const projectResult = await query(`
      SELECT ci.project_id
      FROM checklist_instance_items cii
      JOIN checklist_instance_subsections cis ON cii.instance_subsection_id = cis.id
      JOIN checklist_instances ci ON cis.instance_id = ci.id
      WHERE cii.id = $1
    `, [itemId]);

    const projectId = projectResult.rows[0]?.project_id;

    // Emit socket event
    const io = (req as any).app.get('io');
    if (io && projectId) {
      io.to(`project_${projectId}`).emit('checklist:approval_revoked', {
        item_id: parseInt(itemId!),
        level,
        revoked_by: authReq.user.id,
        project_id: projectId
      });
    }

    // Log audit event
    await query(`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, new_values)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      'checklist_item',
      itemId,
      `revoke_level_${level}`,
      authReq.user.id,
      JSON.stringify({ level, timestamp: new Date() })
    ]);

    const response: ApiResponse = {
      success: true,
      data: { item: result.rows[0] },
      message: `Level ${level} approval revoked successfully`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Revoke approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Bulk approve items (Supervisors only - for efficiency)
export const bulkApproveItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { item_ids, level, note } = req.body;

    // Only supervisors/admins can bulk approve
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can bulk approve items'
      });
      return;
    }

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Valid array of item IDs is required'
      });
      return;
    }

    if (!level || ![1, 2, 3, 4].includes(level)) {
      res.status(400).json({
        success: false,
        error: 'Valid approval level (1-4) is required'
      });
      return;
    }

    // Update all items
    const result = await query(`
      UPDATE checklist_instance_items
      SET
        approval_level_${level} = true,
        approval_level_${level}_by = $1,
        approval_level_${level}_at = NOW(),
        approval_level_${level}_note = $2,
        updated_at = NOW()
      WHERE id = ANY($3::int[])
      RETURNING *
    `, [authReq.user.id, note || null, item_ids]);

    // Get project_id for socket event
    const projectResult = await query(`
      SELECT DISTINCT ci.project_id
      FROM checklist_instance_items cii
      JOIN checklist_instance_subsections cis ON cii.instance_subsection_id = cis.id
      JOIN checklist_instances ci ON cis.instance_id = ci.id
      WHERE cii.id = ANY($1::int[])
    `, [item_ids]);

    const projectId = projectResult.rows[0]?.project_id;

    // Emit socket event
    const io = (req as any).app.get('io');
    if (io && projectId) {
      io.to(`project_${projectId}`).emit('checklist:bulk_approved', {
        item_ids,
        level,
        approved_by: authReq.user.id,
        project_id: projectId
      });
    }

    // Log audit event
    await query(`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, new_values)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      'checklist_items',
      projectId || 0,
      `bulk_approve_level_${level}`,
      authReq.user.id,
      JSON.stringify({ level, note, item_count: item_ids.length, timestamp: new Date() })
    ]);

    const response: ApiResponse = {
      success: true,
      data: { items: result.rows, count: result.rows.length },
      message: `${result.rows.length} items approved at Level ${level}`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Bulk approve items error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
