import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import {
  ChecklistInstance,
  ChecklistInstanceWithItems,
  ChecklistProgressSummary,
  ApiResponse
} from '@/types';

// Get all projects with checklist summary
export const getAllProjectsWithChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        p.id,
        p.name,
        p.status,
        p.start_date,
        p.land_area,
        p.building_type,
        p.floors_count,
        p.location,
        p.client_name,
        COUNT(DISTINCT ci.id) as total_checklists,
        COUNT(DISTINCT pp.id) as total_phases
      FROM projects p
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN checklist_instances ci ON pp.id = ci.phase_id
      WHERE p.archived_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const response: ApiResponse = {
      success: true,
      data: { projects: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get all projects with checklists error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all checklists for a project
export const getProjectChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const result = await query(`
      SELECT
        ci.*,
        pp.phase_name,
        pp.status as phase_status,
        ct.phase_type
      FROM checklist_instances ci
      JOIN project_phases pp ON ci.phase_id = pp.id
      JOIN checklist_templates ct ON ci.template_id = ct.id
      WHERE ci.project_id = $1
      ORDER BY pp.phase_order ASC
    `, [projectId]);

    const response: ApiResponse = {
      success: true,
      data: { checklists: result.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get project checklists error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get checklist for specific phase with all items
export const getPhaseChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phaseId } = req.params;

    // Get checklist instance
    const instanceResult = await query(
      'SELECT * FROM checklist_instances WHERE phase_id = $1',
      [phaseId]
    );

    if (instanceResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Checklist not found for this phase'
      });
      return;
    }

    const instance = instanceResult.rows[0];

    // Get subsections
    const subsectionsResult = await query(`
      SELECT * FROM checklist_instance_subsections
      WHERE instance_id = $1
      ORDER BY display_order ASC
    `, [instance.id]);

    // Get items for each subsection with user names
    const subsectionsWithItems = await Promise.all(
      subsectionsResult.rows.map(async (subsection: any) => {
        const itemsResult = await query(`
          SELECT
            cii.*,
            u1.name as approval_level_1_user,
            u2.name as approval_level_2_user,
            u3.name as approval_level_3_user,
            u4.name as approval_level_4_user
          FROM checklist_instance_items cii
          LEFT JOIN users u1 ON cii.approval_level_1_by = u1.id
          LEFT JOIN users u2 ON cii.approval_level_2_by = u2.id
          LEFT JOIN users u3 ON cii.approval_level_3_by = u3.id
          LEFT JOIN users u4 ON cii.approval_level_4_by = u4.id
          WHERE cii.instance_subsection_id = $1
          ORDER BY cii.display_order ASC
        `, [subsection.id]);

        return {
          ...subsection,
          items: itemsResult.rows
        };
      })
    );

    const response: ApiResponse<ChecklistInstanceWithItems> = {
      success: true,
      data: {
        ...instance,
        subsections: subsectionsWithItems
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get phase checklist error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get checklist progress summary
export const getChecklistProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { instanceId } = req.params;

    const result = await query(`
      SELECT
        $1 as instance_id,
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE is_required = true) as required_items,
        COUNT(*) FILTER (WHERE approval_level_1 = true) as level_1_completed,
        COUNT(*) FILTER (WHERE approval_level_2 = true) as level_2_completed,
        COUNT(*) FILTER (WHERE approval_level_3 = true) as level_3_completed,
        COUNT(*) FILTER (WHERE approval_level_4 = true) as level_4_completed,
        ROUND(100.0 * COUNT(*) FILTER (WHERE approval_level_1 = true) / NULLIF(COUNT(*), 0), 2) as level_1_percentage,
        ROUND(100.0 * COUNT(*) FILTER (WHERE approval_level_2 = true) / NULLIF(COUNT(*), 0), 2) as level_2_percentage,
        ROUND(100.0 * COUNT(*) FILTER (WHERE approval_level_3 = true) / NULLIF(COUNT(*), 0), 2) as level_3_percentage,
        ROUND(100.0 * COUNT(*) FILTER (WHERE approval_level_4 = true) / NULLIF(COUNT(*), 0), 2) as level_4_percentage
      FROM checklist_instance_items cii
      JOIN checklist_instance_subsections cis ON cii.instance_subsection_id = cis.id
      WHERE cis.instance_id = $1
    `, [instanceId]);

    const response: ApiResponse<ChecklistProgressSummary> = {
      success: true,
      data: result.rows[0]
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get checklist progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update client notes
export const updateClientNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { instanceId } = req.params;
    const { client_notes } = req.body;

    // Only supervisors/admins can update client notes
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can update client notes'
      });
      return;
    }

    const result = await query(`
      UPDATE checklist_instances
      SET client_notes = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [client_notes, instanceId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Checklist instance not found'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { instance: result.rows[0] },
      message: 'Client notes updated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update client notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add custom item to checklist
export const addCustomItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { instance_subsection_id, name_ar, name_en, is_required } = req.body;

    // Only supervisors/admins can add custom items
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can add custom items'
      });
      return;
    }

    if (!instance_subsection_id || !name_ar) {
      res.status(400).json({
        success: false,
        error: 'Subsection ID and Arabic name are required'
      });
      return;
    }

    // Get max display_order
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM checklist_instance_items WHERE instance_subsection_id = $1',
      [instance_subsection_id]
    );

    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await query(`
      INSERT INTO checklist_instance_items (
        instance_subsection_id, name_ar, name_en, display_order, is_required, is_custom
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [instance_subsection_id, name_ar, name_en || null, nextOrder, is_required || false]);

    const response: ApiResponse = {
      success: true,
      data: { item: result.rows[0] },
      message: 'Custom item added successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add custom item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add custom subsection to checklist
export const addCustomSubsection = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { instance_id, name_ar, name_en } = req.body;

    // Only supervisors/admins can add custom subsections
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can add custom subsections'
      });
      return;
    }

    if (!instance_id || !name_ar) {
      res.status(400).json({
        success: false,
        error: 'Instance ID and Arabic name are required'
      });
      return;
    }

    // Get max display_order
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM checklist_instance_subsections WHERE instance_id = $1',
      [instance_id]
    );

    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await query(`
      INSERT INTO checklist_instance_subsections (
        instance_id, name_ar, name_en, display_order, is_custom
      )
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [instance_id, name_ar, name_en || null, nextOrder]);

    const response: ApiResponse = {
      success: true,
      data: { subsection: result.rows[0] },
      message: 'Custom subsection added successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add custom subsection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete checklist item
export const deleteChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const { itemId } = req.params;

    // Only supervisors/admins can delete items
    if (authReq.user.role === 'engineer') {
      res.status(403).json({
        success: false,
        error: 'Only supervisors can delete items'
      });
      return;
    }

    await query('DELETE FROM checklist_instance_items WHERE id = $1', [itemId]);

    const response: ApiResponse = {
      success: true,
      message: 'Checklist item deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create checklist instance for a phase (called during project creation)
export const createChecklistForPhase = async (
  client: any,
  projectId: number,
  phaseId: number,
  phaseType: string
): Promise<void> => {
  try {
    // Get template for this phase type
    const templateResult = await client.query(
      'SELECT * FROM checklist_templates WHERE phase_type = $1 AND is_active = true',
      [phaseType]
    );

    if (templateResult.rows.length === 0) {
      console.log(`No template found for phase type: ${phaseType}`);
      return;
    }

    const template = templateResult.rows[0];

    // Create checklist instance
    const instanceResult = await client.query(`
      INSERT INTO checklist_instances (project_id, phase_id, template_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [projectId, phaseId, template.id]);

    const instance = instanceResult.rows[0];

    // Get template subsections
    const subsectionsResult = await client.query(`
      SELECT * FROM checklist_template_subsections
      WHERE template_id = $1 AND is_active = true
      ORDER BY display_order ASC
    `, [template.id]);

    // Create instance subsections and items
    for (const templateSubsection of subsectionsResult.rows) {
      // Create instance subsection
      const instanceSubsectionResult = await client.query(`
        INSERT INTO checklist_instance_subsections (
          instance_id, template_subsection_id, name_ar, name_en, display_order, is_custom
        )
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING *
      `, [
        instance.id,
        templateSubsection.id,
        templateSubsection.name_ar,
        templateSubsection.name_en,
        templateSubsection.display_order
      ]);

      const instanceSubsection = instanceSubsectionResult.rows[0];

      // Get template items for this subsection
      const itemsResult = await client.query(`
        SELECT * FROM checklist_template_items
        WHERE subsection_id = $1 AND is_active = true
        ORDER BY display_order ASC
      `, [templateSubsection.id]);

      // Create instance items
      for (const templateItem of itemsResult.rows) {
        await client.query(`
          INSERT INTO checklist_instance_items (
            instance_subsection_id, template_item_id, name_ar, name_en,
            display_order, is_required, is_custom
          )
          VALUES ($1, $2, $3, $4, $5, $6, false)
        `, [
          instanceSubsection.id,
          templateItem.id,
          templateItem.name_ar,
          templateItem.name_en,
          templateItem.display_order,
          templateItem.is_required
        ]);
      }
    }

    console.log(`Checklist created for phase ${phaseId} (${phaseType})`);
  } catch (error) {
    console.error('Create checklist for phase error:', error);
    throw error;
  }
};
