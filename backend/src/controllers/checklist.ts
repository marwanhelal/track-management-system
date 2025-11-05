import { Request, Response } from 'express';
import pool from '../database/connection';
import {
  ChecklistTemplate,
  ChecklistTemplateCreateInput,
  ChecklistTemplateUpdateInput,
  ProjectChecklistItemCreateInput,
  ProjectChecklistItemUpdateInput,
  ChecklistEngineerApprovalInput,
  ChecklistSupervisorApprovalInput,
  ChecklistPhaseName,
  ChecklistProgressOverview
} from '../types';

// Extended authenticated request type
interface AuthReq extends Request {
  user?: {
    id: number;
    email: string;
    role: 'supervisor' | 'engineer' | 'administrator';
  };
}

// ============================================================================
// CHECKLIST TEMPLATES CRUD
// ============================================================================

/**
 * Get all checklist templates (optionally filtered by phase)
 * GET /api/v1/checklist/templates?phase=VIS
 */
export const getChecklistTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phase, active_only } = req.query;

    let query = 'SELECT * FROM checklist_templates';
    const conditions: string[] = [];
    const values: any[] = [];

    if (phase) {
      conditions.push(`phase_name = $${values.length + 1}`);
      values.push(phase);
    }

    if (active_only === 'true') {
      conditions.push(`is_active = true`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY phase_name, display_order';

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching checklist templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist templates',
      error: error.message
    });
  }
};

/**
 * Get checklist templates grouped by phase
 * GET /api/v1/checklist/templates/grouped
 */
export const getChecklistTemplatesGrouped = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        phase_name,
        section_name,
        json_agg(
          json_build_object(
            'id', id,
            'task_title_ar', task_title_ar,
            'task_title_en', task_title_en,
            'display_order', display_order,
            'is_active', is_active
          ) ORDER BY display_order
        ) as tasks
      FROM checklist_templates
      WHERE is_active = true
      GROUP BY phase_name, section_name
      ORDER BY
        CASE phase_name
          WHEN 'VIS' THEN 1
          WHEN 'DD' THEN 2
          WHEN 'License' THEN 3
          WHEN 'Working' THEN 4
          WHEN 'BOQ' THEN 5
        END,
        section_name
    `);

    // Group by phase
    const grouped: any = {};
    result.rows.forEach(row => {
      if (!grouped[row.phase_name]) {
        grouped[row.phase_name] = [];
      }
      grouped[row.phase_name].push({
        section_name: row.section_name,
        tasks: row.tasks
      });
    });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error: any) {
    console.error('Error fetching grouped checklist templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grouped checklist templates',
      error: error.message
    });
  }
};

/**
 * Create a new checklist template
 * POST /api/v1/checklist/templates
 * Body: ChecklistTemplateCreateInput
 */
export const createChecklistTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      phase_name,
      section_name,
      task_title_ar,
      task_title_en,
      display_order
    }: ChecklistTemplateCreateInput = req.body;

    // Validation
    if (!phase_name || !task_title_ar || display_order === undefined) {
      res.status(400).json({
        success: false,
        message: 'phase_name, task_title_ar, and display_order are required'
      });
      return;
    }

    const result = await pool.query(`
      INSERT INTO checklist_templates (
        phase_name, section_name, task_title_ar, task_title_en, display_order
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [phase_name, section_name, task_title_ar, task_title_en, display_order]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Checklist template created successfully'
    });
  } catch (error: any) {
    console.error('Error creating checklist template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checklist template',
      error: error.message
    });
  }
};

/**
 * Update a checklist template
 * PUT /api/v1/checklist/templates/:id
 * Body: ChecklistTemplateUpdateInput
 */
export const updateChecklistTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: ChecklistTemplateUpdateInput = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.section_name !== undefined) {
      fields.push(`section_name = $${paramIndex++}`);
      values.push(updates.section_name);
    }
    if (updates.task_title_ar) {
      fields.push(`task_title_ar = $${paramIndex++}`);
      values.push(updates.task_title_ar);
    }
    if (updates.task_title_en !== undefined) {
      fields.push(`task_title_en = $${paramIndex++}`);
      values.push(updates.task_title_en);
    }
    if (updates.display_order !== undefined) {
      fields.push(`display_order = $${paramIndex++}`);
      values.push(updates.display_order);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE checklist_templates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist template not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Checklist template updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating checklist template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist template',
      error: error.message
    });
  }
};

/**
 * Delete a checklist template
 * DELETE /api/v1/checklist/templates/:id
 */
export const deleteChecklistTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM checklist_templates WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist template not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Checklist template deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting checklist template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete checklist template',
      error: error.message
    });
  }
};

// ============================================================================
// PROJECT CHECKLIST ITEMS
// ============================================================================

/**
 * Get checklist items for a project (optionally filtered by phase)
 * GET /api/v1/checklist/projects/:project_id?phase=VIS
 */
export const getProjectChecklistItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id } = req.params;
    const { phase } = req.query;

    let query = `
      SELECT
        pci.*,
        e.name as engineer_approved_name,
        s1.name as supervisor_1_approved_name,
        s2.name as supervisor_2_approved_name,
        s3.name as supervisor_3_approved_name
      FROM project_checklist_items pci
      LEFT JOIN users e ON pci.engineer_approved_by = e.id
      LEFT JOIN users s1 ON pci.supervisor_1_approved_by = s1.id
      LEFT JOIN users s2 ON pci.supervisor_2_approved_by = s2.id
      LEFT JOIN users s3 ON pci.supervisor_3_approved_by = s3.id
      WHERE pci.project_id = $1
    `;

    const values: any[] = [project_id];

    if (phase) {
      query += ` AND pci.phase_name = $2`;
      values.push(phase);
    }

    query += ` ORDER BY pci.phase_name, pci.display_order`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching project checklist items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project checklist items',
      error: error.message
    });
  }
};

/**
 * Get checklist items grouped by phase for a project
 * GET /api/v1/checklist/projects/:project_id/grouped
 */
export const getProjectChecklistGrouped = async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id } = req.params;

    // Get project name
    const projectResult = await pool.query('SELECT name FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    // Get all checklist items with statistics and aggregated engineer approvals
    const result = await pool.query(`
      SELECT
        pci.phase_name,
        json_agg(
          json_build_object(
            'id', pci.id,
            'section_name', pci.section_name,
            'task_title_ar', pci.task_title_ar,
            'task_title_en', pci.task_title_en,
            'display_order', pci.display_order,
            'is_completed', pci.is_completed,
            'engineer_approvals', COALESCE(ea.engineer_approvals, '[]'::json),
            'supervisor_1_approved_by', pci.supervisor_1_approved_by,
            'supervisor_1_approved_at', pci.supervisor_1_approved_at,
            'supervisor_1_approved_name', s1.name,
            'supervisor_2_approved_by', pci.supervisor_2_approved_by,
            'supervisor_2_approved_at', pci.supervisor_2_approved_at,
            'supervisor_2_approved_name', s2.name,
            'supervisor_3_approved_by', pci.supervisor_3_approved_by,
            'supervisor_3_approved_at', pci.supervisor_3_approved_at,
            'supervisor_3_approved_name', s3.name,
            'client_notes', pci.client_notes
          ) ORDER BY pci.display_order
        ) as items,
        COUNT(*)::INTEGER as total_tasks,
        COUNT(*) FILTER (WHERE pci.is_completed = true)::INTEGER as completed_tasks,
        COUNT(DISTINCT CASE WHEN ea.engineer_count > 0 THEN pci.id END)::INTEGER as engineer_approved_tasks,
        COUNT(*) FILTER (WHERE pci.supervisor_1_approved_by IS NOT NULL)::INTEGER as supervisor_1_approved_tasks,
        COUNT(*) FILTER (WHERE pci.supervisor_2_approved_by IS NOT NULL)::INTEGER as supervisor_2_approved_tasks,
        COUNT(*) FILTER (WHERE pci.supervisor_3_approved_by IS NOT NULL)::INTEGER as supervisor_3_approved_tasks,
        ROUND((COUNT(*) FILTER (WHERE pci.is_completed = true)::DECIMAL / NULLIF(COUNT(*), 0)::DECIMAL) * 100, 2) as completion_percentage
      FROM project_checklist_items pci
      LEFT JOIN (
        SELECT
          ciea.checklist_item_id,
          json_agg(
            json_build_object(
              'engineer_id', ciea.engineer_id,
              'engineer_name', u.name,
              'approved_at', ciea.approved_at
            ) ORDER BY ciea.approved_at
          ) as engineer_approvals,
          COUNT(*)::INTEGER as engineer_count
        FROM checklist_item_engineer_approvals ciea
        LEFT JOIN users u ON ciea.engineer_id = u.id
        GROUP BY ciea.checklist_item_id
      ) ea ON pci.id = ea.checklist_item_id
      LEFT JOIN users s1 ON pci.supervisor_1_approved_by = s1.id
      LEFT JOIN users s2 ON pci.supervisor_2_approved_by = s2.id
      LEFT JOIN users s3 ON pci.supervisor_3_approved_by = s3.id
      WHERE pci.project_id = $1
      GROUP BY pci.phase_name
      ORDER BY
        CASE pci.phase_name
          WHEN 'VIS' THEN 1
          WHEN 'DD' THEN 2
          WHEN 'License' THEN 3
          WHEN 'Working' THEN 4
          WHEN 'BOQ' THEN 5
        END
    `, [project_id]);

    const phases = result.rows.map(row => {
      // Group items by section_name
      const itemsArray = row.items || [];
      const sectionMap = new Map<string, any[]>();

      itemsArray.forEach((item: any) => {
        const sectionName = item.section_name || null;
        const sectionKey = sectionName || '__null__';

        if (!sectionMap.has(sectionKey)) {
          sectionMap.set(sectionKey, []);
        }
        sectionMap.get(sectionKey)!.push(item);
      });

      // Convert map to sections array
      const sections = Array.from(sectionMap.entries()).map(([key, items]) => ({
        section_name: key === '__null__' ? null : key,
        items: items
      }));

      return {
        phase_name: row.phase_name,
        sections: sections,
        statistics: {
          project_id: parseInt(project_id as string),
          phase_name: row.phase_name,
          total_tasks: row.total_tasks,
          completed_tasks: row.completed_tasks,
          engineer_approved_tasks: row.engineer_approved_tasks,
          supervisor_1_approved_tasks: row.supervisor_1_approved_tasks,
          supervisor_2_approved_tasks: row.supervisor_2_approved_tasks,
          supervisor_3_approved_tasks: row.supervisor_3_approved_tasks,
          completion_percentage: parseFloat(row.completion_percentage || '0')
        }
      };
    });

    // Calculate overall completion
    const totalTasks = phases.reduce((sum, p) => sum + p.statistics.total_tasks, 0);
    const totalCompleted = phases.reduce((sum, p) => sum + p.statistics.completed_tasks, 0);
    const overall_completion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100 * 100) / 100 : 0;

    const response: ChecklistProgressOverview = {
      project_id: parseInt(project_id as string),
      project_name: projectResult.rows[0].name,
      phases,
      overall_completion
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('Error fetching grouped project checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grouped project checklist',
      error: error.message
    });
  }
};

/**
 * Create a checklist item for a project (manual addition, mainly for BOQ phase)
 * POST /api/v1/checklist/projects/:project_id/items
 * Body: ProjectChecklistItemCreateInput
 */
export const createProjectChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id } = req.params;
    const {
      phase_name,
      section_name,
      task_title_ar,
      task_title_en,
      display_order
    }: Omit<ProjectChecklistItemCreateInput, 'project_id'> = req.body;

    // Validation
    if (!phase_name || !task_title_ar || display_order === undefined) {
      res.status(400).json({
        success: false,
        message: 'phase_name, task_title_ar, and display_order are required'
      });
      return;
    }

    const result = await pool.query(`
      INSERT INTO project_checklist_items (
        project_id, phase_name, section_name, task_title_ar, task_title_en, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [project_id, phase_name, section_name, task_title_ar, task_title_en, display_order]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Checklist item created successfully'
    });
  } catch (error: any) {
    console.error('Error creating project checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checklist item',
      error: error.message
    });
  }
};

/**
 * Update a checklist item
 * PUT /api/v1/checklist/items/:id
 * Body: ProjectChecklistItemUpdateInput
 */
export const updateProjectChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: ProjectChecklistItemUpdateInput = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.task_title_ar) {
      fields.push(`task_title_ar = $${paramIndex++}`);
      values.push(updates.task_title_ar);
    }
    if (updates.task_title_en !== undefined) {
      fields.push(`task_title_en = $${paramIndex++}`);
      values.push(updates.task_title_en);
    }
    if (updates.section_name !== undefined) {
      fields.push(`section_name = $${paramIndex++}`);
      values.push(updates.section_name);
    }
    if (updates.display_order !== undefined) {
      fields.push(`display_order = $${paramIndex++}`);
      values.push(updates.display_order);
    }
    if (updates.is_completed !== undefined) {
      fields.push(`is_completed = $${paramIndex++}`);
      values.push(updates.is_completed);
    }
    if (updates.client_notes !== undefined) {
      fields.push(`client_notes = $${paramIndex++}`);
      values.push(updates.client_notes);
    }

    if (fields.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE project_checklist_items
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Checklist item updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating project checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist item',
      error: error.message
    });
  }
};

/**
 * Delete a checklist item
 * DELETE /api/v1/checklist/items/:id
 */
export const deleteProjectChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM project_checklist_items WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Checklist item deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting project checklist item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete checklist item',
      error: error.message
    });
  }
};

// ============================================================================
// CHECKLIST APPROVAL WORKFLOW
// ============================================================================

/**
 * Toggle task completion (engineer checking task)
 * POST /api/v1/checklist/items/:id/toggle-completion
 */
export const toggleItemCompletion = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE project_checklist_items
      SET is_completed = NOT is_completed
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Task marked as ${result.rows[0].is_completed ? 'completed' : 'incomplete'}`
    });
  } catch (error: any) {
    console.error('Error toggling item completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle item completion',
      error: error.message
    });
  }
};

/**
 * Engineer approval (Level 1) - sign off on completed tasks
 * Supports multiple engineers approving the same task
 * POST /api/v1/checklist/approve/engineer
 * Body: { items: [1, 2, 3] }
 */
export const engineerApproval = async (req: AuthReq, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { items }: ChecklistEngineerApprovalInput = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
      return;
    }

    await client.query('BEGIN');

    // Insert approvals into junction table (ON CONFLICT to prevent duplicate approvals)
    const insertResult = await client.query(`
      INSERT INTO checklist_item_engineer_approvals (checklist_item_id, engineer_id, approved_at)
      SELECT unnest($1::int[]), $2, NOW()
      ON CONFLICT (checklist_item_id, engineer_id) DO NOTHING
      RETURNING *
    `, [items, userId]);

    // Mark tasks as completed when first engineer approves
    await client.query(`
      UPDATE project_checklist_items
      SET is_completed = true
      WHERE id = ANY($1::int[]) AND is_completed = false
    `, [items]);

    // Get updated items with all engineer approvals
    const itemsResult = await client.query(`
      SELECT
        pci.*,
        json_agg(
          json_build_object(
            'engineer_id', ciea.engineer_id,
            'engineer_name', u.name,
            'approved_at', ciea.approved_at
          ) ORDER BY ciea.approved_at
        ) as engineer_approvals
      FROM project_checklist_items pci
      LEFT JOIN checklist_item_engineer_approvals ciea ON pci.id = ciea.checklist_item_id
      LEFT JOIN users u ON ciea.engineer_id = u.id
      WHERE pci.id = ANY($1::int[])
      GROUP BY pci.id
    `, [items]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: itemsResult.rows,
      message: `${insertResult.rowCount} item(s) approved by engineer`,
      count: insertResult.rowCount
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in engineer approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve items',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Remove engineer's own approval from a task
 * DELETE /api/v1/checklist/approve/engineer/:item_id
 * Allows engineers to uncheck their own work
 */
export const removeEngineerApproval = async (req: AuthReq, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { item_id } = req.params;

    await client.query('BEGIN');

    // Delete only THIS engineer's approval
    const deleteResult = await client.query(`
      DELETE FROM checklist_item_engineer_approvals
      WHERE checklist_item_id = $1 AND engineer_id = $2
      RETURNING *
    `, [item_id, userId]);

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        message: 'No approval found to remove'
      });
      return;
    }

    // Check if there are any remaining engineer approvals
    const remainingApprovals = await client.query(`
      SELECT COUNT(*) as count
      FROM checklist_item_engineer_approvals
      WHERE checklist_item_id = $1
    `, [item_id]);

    // If no engineer approvals left, mark task as not completed
    if (parseInt(remainingApprovals.rows[0].count) === 0) {
      await client.query(`
        UPDATE project_checklist_items
        SET is_completed = false
        WHERE id = $1
      `, [item_id]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Approval removed successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error removing engineer approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove approval',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Supervisor approval (Levels 1, 2, or 3)
 * POST /api/v1/checklist/approve/supervisor
 * Body: { items: [1, 2, 3], level: 1 }
 */
export const supervisorApproval = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { items, level }: ChecklistSupervisorApprovalInput = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
      return;
    }

    if (![1, 2, 3].includes(level)) {
      res.status(400).json({
        success: false,
        message: 'Level must be 1, 2, or 3'
      });
      return;
    }

    const approvedByField = `supervisor_${level}_approved_by`;
    const approvedAtField = `supervisor_${level}_approved_at`;

    const result = await pool.query(`
      UPDATE project_checklist_items
      SET
        ${approvedByField} = $1,
        ${approvedAtField} = NOW()
      WHERE id = ANY($2::int[])
      RETURNING *
    `, [userId, items]);

    res.json({
      success: true,
      data: result.rows,
      message: `${result.rowCount} item(s) approved by supervisor (Level ${level})`
    });
  } catch (error: any) {
    console.error('Error in supervisor approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve items',
      error: error.message
    });
  }
};

/**
 * Revoke engineer approval
 * POST /api/v1/checklist/items/:id/revoke-engineer-approval
 */
export const revokeEngineerApproval = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE project_checklist_items
      SET
        engineer_approved_by = NULL,
        engineer_approved_at = NULL
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Engineer approval revoked'
    });
  } catch (error: any) {
    console.error('Error revoking engineer approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke engineer approval',
      error: error.message
    });
  }
};

/**
 * Revoke supervisor approval
 * POST /api/v1/checklist/items/:id/revoke-supervisor-approval
 * Body: { level: 1 }
 */
export const revokeSupervisorApproval = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { level } = req.body;

    if (![1, 2, 3].includes(level)) {
      res.status(400).json({
        success: false,
        message: 'Level must be 1, 2, or 3'
      });
      return;
    }

    const approvedByField = `supervisor_${level}_approved_by`;
    const approvedAtField = `supervisor_${level}_approved_at`;

    const result = await pool.query(`
      UPDATE project_checklist_items
      SET
        ${approvedByField} = NULL,
        ${approvedAtField} = NULL
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Supervisor Level ${level} approval revoked`
    });
  } catch (error: any) {
    console.error('Error revoking supervisor approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke supervisor approval',
      error: error.message
    });
  }
};

// ============================================================================
// CHECKLIST STATISTICS & PROGRESS
// ============================================================================

/**
 * Get checklist statistics for a project phase
 * GET /api/v1/checklist/projects/:project_id/phases/:phase_name/statistics
 */
export const getChecklistStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id, phase_name } = req.params;

    const result = await pool.query(`
      SELECT * FROM get_checklist_statistics($1, $2)
    `, [project_id, phase_name]);

    if (result.rows.length === 0) {
      res.json({
        success: true,
        data: {
          project_id: parseInt(project_id as string),
          phase_name: phase_name as ChecklistPhaseName,
          total_tasks: 0,
          completed_tasks: 0,
          engineer_approved_tasks: 0,
          supervisor_1_approved_tasks: 0,
          supervisor_2_approved_tasks: 0,
          supervisor_3_approved_tasks: 0,
          completion_percentage: 0
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        project_id: parseInt(project_id as string),
        phase_name: phase_name as ChecklistPhaseName,
        ...result.rows[0]
      }
    });
  } catch (error: any) {
    console.error('Error fetching checklist statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist statistics',
      error: error.message
    });
  }
};

/**
 * Update client notes for a checklist item (supervisors only)
 * PUT /api/v1/checklist/items/:id/client-notes
 * Body: { client_notes: "string" }
 */
export const updateClientNotes = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { client_notes } = req.body;

    const result = await pool.query(`
      UPDATE project_checklist_items
      SET client_notes = $1
      WHERE id = $2
      RETURNING *
    `, [client_notes, id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Client notes updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating client notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client notes',
      error: error.message
    });
  }
};

// ============================================================================
// CHECKLIST GENERATION (Called when creating a project)
// ============================================================================

/**
 * Generate checklist items for a project from templates
 * POST /api/v1/checklist/projects/:project_id/generate
 */
export const generateProjectChecklist = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { project_id } = req.params;

    await client.query('BEGIN');

    // Check if checklist already exists
    const existingCheck = await client.query(`
      SELECT COUNT(*) as count FROM project_checklist_items WHERE project_id = $1
    `, [project_id]);

    if (parseInt(existingCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Checklist already exists for this project'
      });
      return;
    }

    // Get all active templates
    const templates = await client.query(`
      SELECT * FROM checklist_templates WHERE is_active = true ORDER BY phase_name, display_order
    `);

    if (templates.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        message: 'No checklist templates found'
      });
      return;
    }

    // Insert all checklist items
    const insertPromises = templates.rows.map((template: ChecklistTemplate) => {
      return client.query(`
        INSERT INTO project_checklist_items (
          project_id, phase_name, section_name, task_title_ar, task_title_en, display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        project_id,
        template.phase_name,
        template.section_name,
        template.task_title_ar,
        template.task_title_en,
        template.display_order
      ]);
    });

    await Promise.all(insertPromises);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Checklist generated successfully with ${templates.rows.length} items`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error generating project checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate project checklist',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Add a phase with all its tasks to an existing project
 * POST /api/v1/checklist/projects/:project_id/add-phase
 * Body: { phase_name: 'VIS' | 'DD' | 'License' | 'Working' | 'BOQ' }
 */
export const addPhaseToProject = async (req: AuthReq, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { project_id } = req.params;
    const { phase_name } = req.body;

    // Validate phase name
    const validPhases = ['VIS', 'DD', 'License', 'Working', 'BOQ'];
    if (!phase_name || !validPhases.includes(phase_name)) {
      res.status(400).json({
        success: false,
        message: 'Invalid phase name. Must be one of: VIS, DD, License, Working, BOQ'
      });
      return;
    }

    await client.query('BEGIN');

    // Check if phase already exists for this project
    const existingPhase = await client.query(`
      SELECT COUNT(*) as count
      FROM project_checklist_items
      WHERE project_id = $1 AND phase_name = $2
    `, [project_id, phase_name]);

    if (parseInt(existingPhase.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: `Phase ${phase_name} already exists for this project`
      });
      return;
    }

    // Get all active templates for this phase
    const templates = await client.query(`
      SELECT * FROM checklist_templates
      WHERE phase_name = $1 AND is_active = true
      ORDER BY display_order
    `, [phase_name]);

    // Handle phases with no templates (like BOQ)
    // Insert a placeholder task so the phase appears in the UI
    if (templates.rows.length === 0) {
      await client.query(`
        INSERT INTO project_checklist_items (
          project_id, phase_name, section_name, task_title_ar, task_title_en, display_order
        )
        VALUES ($1, $2, NULL, $3, $4, 1)
      `, [
        project_id,
        phase_name,
        `مهام ${phase_name}`,
        `${phase_name} Tasks - Add items using "Add New Item" button`
      ]);
    } else {
      // Insert all checklist items for this phase from templates
      const insertPromises = templates.rows.map((template: ChecklistTemplate) => {
        return client.query(`
          INSERT INTO project_checklist_items (
            project_id, phase_name, section_name, task_title_ar, task_title_en, display_order
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          project_id,
          template.phase_name,
          template.section_name,
          template.task_title_ar,
          template.task_title_en,
          template.display_order
        ]);
      });

      await Promise.all(insertPromises);
    }

    await client.query('COMMIT');

    const tasksCount = templates.rows.length === 0 ? 1 : templates.rows.length;
    const message = templates.rows.length === 0
      ? `Phase ${phase_name} added successfully. Use "Add New Item" to add tasks.`
      : `Phase ${phase_name} added successfully with ${templates.rows.length} tasks`;

    res.status(201).json({
      success: true,
      message,
      data: {
        phase_name,
        tasks_added: tasksCount,
        has_templates: templates.rows.length > 0
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding phase to project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add phase to project',
      error: error.message
    });
  } finally {
    client.release();
  }
};
