-- Migration 010: Add Checklist System
-- Description: Adds complete checklist system with templates, instances, and 4-level approval tracking
--              Supports project details fields and client notes per phase
-- Date: 2025-11-04

-- =============================================
-- PART 1: Add Project Details Fields
-- =============================================

-- Add project details fields to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS land_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS building_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS floors_count INTEGER,
ADD COLUMN IF NOT EXISTS location VARCHAR(200),
ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);

COMMENT ON COLUMN projects.land_area IS 'مساحة الأرض - Land area (e.g., "500 متر مربع")';
COMMENT ON COLUMN projects.building_type IS 'نوع البناء - Building type (e.g., "فيلا سكنية", "عمارة تجارية")';
COMMENT ON COLUMN projects.floors_count IS 'عدد الأدوار - Number of floors';
COMMENT ON COLUMN projects.location IS 'الموقع - Location (e.g., "الرياض - حي النرجس")';
COMMENT ON COLUMN projects.client_name IS 'اسم العميل - Client name';

-- =============================================
-- PART 2: Checklist Templates (Fixed Structure)
-- =============================================

-- Checklist templates per phase type
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    phase_type VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE checklist_templates IS 'Fixed checklist structure per phase type (VIS, DD, License, Working, BOQ)';
COMMENT ON COLUMN checklist_templates.phase_type IS 'Phase type identifier (VIS, DD, License, Working, BOQ)';

-- Template sub-sections (e.g., "المساقط", "واجهات")
CREATE TABLE IF NOT EXISTS checklist_template_subsections (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, display_order)
);

COMMENT ON TABLE checklist_template_subsections IS 'Sub-sections within checklist templates (e.g., المساقط, واجهات)';
COMMENT ON COLUMN checklist_template_subsections.name_ar IS 'Arabic name of sub-section';
COMMENT ON COLUMN checklist_template_subsections.name_en IS 'Optional English translation';

-- Template items (individual checklist tasks)
CREATE TABLE IF NOT EXISTS checklist_template_items (
    id SERIAL PRIMARY KEY,
    subsection_id INTEGER NOT NULL REFERENCES checklist_template_subsections(id) ON DELETE CASCADE,
    name_ar VARCHAR(500) NOT NULL,
    name_en VARCHAR(500),
    display_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(subsection_id, display_order)
);

COMMENT ON TABLE checklist_template_items IS 'Individual checklist tasks within sub-sections';
COMMENT ON COLUMN checklist_template_items.name_ar IS 'Arabic task name';
COMMENT ON COLUMN checklist_template_items.is_required IS 'Whether this item is required for completion';

-- =============================================
-- PART 3: Checklist Instances (Per Project)
-- =============================================

-- Checklist instances (created per project phase)
CREATE TABLE IF NOT EXISTS checklist_instances (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES checklist_templates(id),
    client_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(phase_id)
);

COMMENT ON TABLE checklist_instances IS 'Project-specific checklist instances with client notes per phase';
COMMENT ON COLUMN checklist_instances.client_notes IS 'ملحوظات العميل - Client-specific requirements and notes for this phase';

-- Instance sub-sections (can be customized per project)
CREATE TABLE IF NOT EXISTS checklist_instance_subsections (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL REFERENCES checklist_instances(id) ON DELETE CASCADE,
    template_subsection_id INTEGER REFERENCES checklist_template_subsections(id),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    display_order INTEGER NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE checklist_instance_subsections IS 'Instance-level sub-sections (can be customized per project)';
COMMENT ON COLUMN checklist_instance_subsections.is_custom IS 'True if this sub-section was added specifically for this project';

-- Instance items with 4-level approval tracking
CREATE TABLE IF NOT EXISTS checklist_instance_items (
    id SERIAL PRIMARY KEY,
    instance_subsection_id INTEGER NOT NULL REFERENCES checklist_instance_subsections(id) ON DELETE CASCADE,
    template_item_id INTEGER REFERENCES checklist_template_items(id),
    name_ar VARCHAR(500) NOT NULL,
    name_en VARCHAR(500),
    display_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,

    -- Level 1: Engineer Completion
    approval_level_1 BOOLEAN DEFAULT false,
    approval_level_1_by INTEGER REFERENCES users(id),
    approval_level_1_at TIMESTAMP,
    approval_level_1_note TEXT,

    -- Level 2: Supervisor 1 Approval
    approval_level_2 BOOLEAN DEFAULT false,
    approval_level_2_by INTEGER REFERENCES users(id),
    approval_level_2_at TIMESTAMP,
    approval_level_2_note TEXT,

    -- Level 3: Supervisor 2 Approval
    approval_level_3 BOOLEAN DEFAULT false,
    approval_level_3_by INTEGER REFERENCES users(id),
    approval_level_3_at TIMESTAMP,
    approval_level_3_note TEXT,

    -- Level 4: Supervisor 3 Approval (Final)
    approval_level_4 BOOLEAN DEFAULT false,
    approval_level_4_by INTEGER REFERENCES users(id),
    approval_level_4_at TIMESTAMP,
    approval_level_4_note TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE checklist_instance_items IS 'Checklist items with 4-level approval tracking';
COMMENT ON COLUMN checklist_instance_items.is_custom IS 'True if this item was added specifically for this project';
COMMENT ON COLUMN checklist_instance_items.approval_level_1 IS 'اعتماد المهندس 1 - Engineer marks item as complete';
COMMENT ON COLUMN checklist_instance_items.approval_level_2 IS 'اعتماد المهندس 2 - First supervisor approval';
COMMENT ON COLUMN checklist_instance_items.approval_level_3 IS 'اعتماد المهندس 3 - Second supervisor approval';
COMMENT ON COLUMN checklist_instance_items.approval_level_4 IS 'اعتماد المهندس 4 - Final supervisor approval';

-- =============================================
-- PART 4: Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_checklist_instances_project ON checklist_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_phase ON checklist_instances(phase_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_template ON checklist_instances(template_id);

CREATE INDEX IF NOT EXISTS idx_checklist_instance_subsections_instance ON checklist_instance_subsections(instance_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instance_items_subsection ON checklist_instance_items(instance_subsection_id);

CREATE INDEX IF NOT EXISTS idx_checklist_instance_items_approvals ON checklist_instance_items(
    approval_level_1, approval_level_2, approval_level_3, approval_level_4
);

-- =============================================
-- PART 5: Triggers for Auto-updating Timestamps
-- =============================================

CREATE TRIGGER update_checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_instances_updated_at
    BEFORE UPDATE ON checklist_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_instance_items_updated_at
    BEFORE UPDATE ON checklist_instance_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
