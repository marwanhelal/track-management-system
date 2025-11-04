import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import {
  ChecklistTemplate,
  ChecklistTemplateSubsection,
  ChecklistTemplateItem,
  ApiResponse
} from '@/types';

// Get all checklist templates
export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templatesResult = await query(`
      SELECT * FROM checklist_templates
      WHERE is_active = true
      ORDER BY display_order ASC
    `);

    const response: ApiResponse<{ templates: ChecklistTemplate[] }> = {
      success: true,
      data: { templates: templatesResult.rows }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get template by phase type with all sub-sections and items
export const getTemplateByPhaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phaseType } = req.params;

    // Get template
    const templateResult = await query(
      'SELECT * FROM checklist_templates WHERE phase_type = $1 AND is_active = true',
      [phaseType]
    );

    if (templateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }

    const template = templateResult.rows[0];

    // Get sub-sections
    const subsectionsResult = await query(`
      SELECT * FROM checklist_template_subsections
      WHERE template_id = $1 AND is_active = true
      ORDER BY display_order ASC
    `, [template.id]);

    // Get items for each sub-section
    const subsectionsWithItems = await Promise.all(
      subsectionsResult.rows.map(async (subsection: any) => {
        const itemsResult = await query(`
          SELECT * FROM checklist_template_items
          WHERE subsection_id = $1 AND is_active = true
          ORDER BY display_order ASC
        `, [subsection.id]);

        return {
          ...subsection,
          items: itemsResult.rows
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: {
        template,
        subsections: subsectionsWithItems
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get template by phase type error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all templates with structure (for admin)
export const getAllTemplatesWithStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const templatesResult = await query(`
      SELECT * FROM checklist_templates
      WHERE is_active = true
      ORDER BY display_order ASC
    `);

    const templates = await Promise.all(
      templatesResult.rows.map(async (template: any) => {
        // Get sub-sections
        const subsectionsResult = await query(`
          SELECT * FROM checklist_template_subsections
          WHERE template_id = $1 AND is_active = true
          ORDER BY display_order ASC
        `, [template.id]);

        // Get items for each sub-section
        const subsectionsWithItems = await Promise.all(
          subsectionsResult.rows.map(async (subsection: any) => {
            const itemsResult = await query(`
              SELECT * FROM checklist_template_items
              WHERE subsection_id = $1 AND is_active = true
              ORDER BY display_order ASC
            `, [subsection.id]);

            return {
              ...subsection,
              items: itemsResult.rows
            };
          })
        );

        return {
          ...template,
          subsections: subsectionsWithItems
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: { templates }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get all templates with structure error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add item to template (Admin/Supervisor only)
export const addTemplateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subsection_id, name_ar, name_en, is_required } = req.body;

    if (!subsection_id || !name_ar) {
      res.status(400).json({
        success: false,
        error: 'Subsection ID and Arabic name are required'
      });
      return;
    }

    // Get max display_order for this subsection
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM checklist_template_items WHERE subsection_id = $1',
      [subsection_id]
    );

    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await query(`
      INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [subsection_id, name_ar, name_en || null, nextOrder, is_required || false]);

    const response: ApiResponse = {
      success: true,
      data: { item: result.rows[0] },
      message: 'Template item added successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add template item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add subsection to template (Admin/Supervisor only)
export const addTemplateSubsection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { template_id, name_ar, name_en } = req.body;

    if (!template_id || !name_ar) {
      res.status(400).json({
        success: false,
        error: 'Template ID and Arabic name are required'
      });
      return;
    }

    // Get max display_order for this template
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM checklist_template_subsections WHERE template_id = $1',
      [template_id]
    );

    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await query(`
      INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [template_id, name_ar, name_en || null, nextOrder]);

    const response: ApiResponse = {
      success: true,
      data: { subsection: result.rows[0] },
      message: 'Template subsection added successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add template subsection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete template item (Admin/Supervisor only)
export const deleteTemplateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    await query('DELETE FROM checklist_template_items WHERE id = $1', [itemId]);

    const response: ApiResponse = {
      success: true,
      message: 'Template item deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete template item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update template item (Admin/Supervisor only)
export const updateTemplateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { name_ar, name_en, is_required } = req.body;

    const result = await query(`
      UPDATE checklist_template_items
      SET name_ar = COALESCE($1, name_ar),
          name_en = COALESCE($2, name_en),
          is_required = COALESCE($3, is_required)
      WHERE id = $4
      RETURNING *
    `, [name_ar, name_en, is_required, itemId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Template item not found'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { item: result.rows[0] },
      message: 'Template item updated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update template item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
