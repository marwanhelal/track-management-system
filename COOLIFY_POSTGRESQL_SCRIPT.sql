-- ========================================
-- COOLIFY POSTGRESQL - CHECKLIST SYSTEM
-- Run this script in your Coolify PostgreSQL terminal
-- Date: 2025-11-04
-- ========================================

-- NOTE: Copy and paste this entire script into the Coolify PostgreSQL terminal

BEGIN;

-- =============================================
-- PART 1: Add Project Details Fields
-- =============================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS land_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS building_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS floors_count INTEGER,
ADD COLUMN IF NOT EXISTS location VARCHAR(200),
ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);

-- =============================================
-- PART 2: Create Checklist Tables
-- =============================================

CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    phase_type VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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

-- =============================================
-- PART 3: Create Indexes
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
-- PART 4: Create Triggers
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

-- =============================================
-- PART 5: Insert Template Data
-- =============================================

-- Insert Phase Templates
INSERT INTO checklist_templates (phase_type, display_order) VALUES
('VIS', 1),
('DD', 2),
('License', 3),
('Working', 4),
('BOQ', 5)
ON CONFLICT (phase_type) DO NOTHING;

-- VIS Phase Template
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'VIS'),
    'خطوات المشروع',
    'Project Steps',
    1
) ON CONFLICT DO NOTHING;

-- VIS Phase Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة المساحة البنائية', 'Study built-up area', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'توقيع الردود علي الأرض', 'Mark setbacks on land', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'توقيع البروزات', 'Mark protrusions', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة الموقع', 'Site study', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'الدراسة البيئية', 'Environmental study', 5, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من المساحة البنائية', 'Verify built-up area', 6, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من البروز', 'Verify protrusion', 7, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من الردود', 'Verify setbacks', 8, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من اشتراطات الحريق', 'Verify fire code requirements', 9, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'مساحة كل فراغ (Axe-Axe)', 'Area of each space (Axe-Axe)', 10, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'طول + عرض NET لكل فراغ', 'Length + width NET for each space', 11, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'المساحة البنائية مسقط الدور الأرضي', 'Built-up area ground floor plan', 12, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'المساحة البنائية الدور المتكرر', 'Built-up area typical floor', 13, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'المساحة البنائية دور الروف', 'Built-up area roof floor', 14, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'ابعاد مسقط البدروم', 'Basement plan dimensions', 15, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'رسم مسقط الدور الأرضي', 'Draw ground floor plan', 16, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'رسم الاسكتش المقترح', 'Draw proposed sketch', 17, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التوافق مع كود الحريق', 'Compliance with fire code', 18, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسات اخرى', 'Other studies', 19, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة توزيع الفراغات', 'Space distribution study', 20, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة التوجيه', 'Orientation study', 21, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة الموقع العام', 'General site study', 22, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة مساحات الفراغات', 'Space areas study', 23, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'Routing للمحل', 'Shop routing', 24, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'الندسكيب', 'Landscaping', 25, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة الجراجات', 'Garage study', 26, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'إضافة النظام الإنشائي (مدعم)', 'Add structural system (supported)', 27, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'مقترح D3', '3D Proposal', 28, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة كتل D3', '3D Mass study', 29, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'دراسة تطور الفكرة التصميمية', 'Design concept evolution study', 30, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'إضافة طلبات الإليكتروميكانيكال', 'Add electromechanical requests', 31, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'تلوين المساقط الأفقية للموقع العام', 'Color general site plans', 32, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'تلوين المساقط الأفقية للبدروم', 'Color basement plans', 33, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'تلوين المساقط الأفقية لدور الروف', 'Color roof floor plans', 34, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'تحديث المساقط تبعا D3', 'Update plans according to 3D', 35, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من وجود ملفات VIZ D2 المساكد', 'Verify VIZ D2 files exist', 36, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من وجود الملف النهائي D3 في السيرفر', 'Verify final D3 file on server', 37, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'التأكد من الجراجات', 'Verify garages', 38, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'Post Production', 'Post Production', 39, false)
ON CONFLICT DO NOTHING;

-- DD Phase Template
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'DD'),
    'خطوات المشروع',
    'Project Steps',
    1
) ON CONFLICT DO NOTHING;

-- DD Phase Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'طلبات الإنشائي', 'Structural requests', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'طلبات الإليكتروميكانيكال', 'Electromechanical requests', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'الواجهات', 'Facades', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'القطاعات', 'Sections', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'توثيق اسكتشات', 'Document sketches', 5, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'فتح ملف السيرفر', 'Open server file', 6, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'توثيق المساقط الافقية لكل الأدوار', 'Document all floor plans', 7, true)
ON CONFLICT DO NOTHING;

-- License Phase Template (with sub-sections)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order) VALUES
((SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'مساقط', 'Plans', 1),
((SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'Layout', 'Layout', 2),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'تفاصيل', 'Details', 3),
((SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'قطاعات', 'Sections', 4),
((SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'واجهات', 'Facades', 5),
((SELECT id FROM checklist_templates WHERE phase_type = 'License'), 'قرار الوزاري (إنجود)', 'Ministerial Decision (Injoud)', 6)
ON CONFLICT DO NOTHING;

-- License Phase - مساقط Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'ابعاد الفراغات', 'Space dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'اسامي الفراغات', 'Space names', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'ابعاد الممرات', 'Corridor dimensions', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'مسافات ارتحال السلالم', 'Stair travel distances', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'مطابقة الانشائي', 'Structural compliance', 5, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'طلبات الإليكتروميكانيكال', 'Electromechanical requests', 6, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'توقيع مساحات الأدوار', 'Floor area signatures', 7, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND name_ar = 'مساقط'), 'المناسيب', 'Levels', 8, true)
ON CONFLICT DO NOTHING;

-- Working Phase Template (with sub-sections)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order) VALUES
((SELECT id FROM checklist_templates WHERE phase_type = 'Working'), 'مساقط', 'Plans', 1),
((SELECT id FROM checklist_templates WHERE phase_type = 'Working'), 'واجهات', 'Facades', 2),
((SELECT id FROM checklist_templates WHERE phase_type = 'Working'), 'Layout', 'Layout', 3)
ON CONFLICT DO NOTHING;

-- Working Phase - مساقط Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'مساقط'), 'ابعاد تفصيلية', 'Detailed dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'مساقط'), 'خوامر ابواب وشبابيك', 'Door and window frames', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'مساقط'), 'تشطيبات الفراغات', 'Space finishes', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'مساقط'), 'ترقيم الفراغات', 'Space numbering', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'مساقط'), 'المناسيب', 'Levels', 5, true)
ON CONFLICT DO NOTHING;

-- Working Phase - واجهات Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'واجهات'), 'ابعاد تفصيلية', 'Detailed dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND name_ar = 'واجهات'), 'تشطيبات', 'Finishes', 2, true)
ON CONFLICT DO NOTHING;

COMMIT;

-- ========================================
-- SCRIPT COMPLETE!
-- ========================================
-- If you see "COMMIT" above, the script executed successfully.
-- All tables, indexes, triggers, and seed data have been created.
-- ========================================
