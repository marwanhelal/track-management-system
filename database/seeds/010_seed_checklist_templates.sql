-- Seed Data: Checklist Templates
-- Description: Populates checklist templates with default items for VIS, DD, License, Working phases
--              BOQ phase left empty for manual entry by administrators
-- Date: 2025-11-04

-- =============================================
-- STEP 1: Create Phase Templates
-- =============================================

INSERT INTO checklist_templates (phase_type, display_order) VALUES
('VIS', 1),
('DD', 2),
('License', 3),
('Working', 4),
('BOQ', 5)
ON CONFLICT (phase_type) DO NOTHING;

-- =============================================
-- STEP 2: VIS Phase (Visualization)
-- =============================================

-- VIS Phase - Main Sub-section
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'VIS'),
    'خطوات المشروع',
    'Project Steps',
    1
);

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
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'VIS') AND display_order = 1), 'Post Production', 'Post Production', 39, false);

-- =============================================
-- STEP 3: DD Phase (Design Development)
-- =============================================

-- DD Phase - Main Sub-section
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'DD'),
    'خطوات المشروع',
    'Project Steps',
    1
);

-- DD Phase Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'طلبات الإنشائي', 'Structural requests', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'طلبات الإليكتروميكانيكال', 'Electromechanical requests', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'الواجهات', 'Facades', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'القطاعات', 'Sections', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'توثيق اسكتشات', 'Document sketches', 5, false),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'فتح ملف السيرفر', 'Open server file', 6, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'DD') AND display_order = 1), 'توثيق المساقط الافقية لكل الأدوار', 'Document all floor plans', 7, true);

-- =============================================
-- STEP 4: License Phase
-- =============================================

-- License Phase - Sub-section: المساقط (Plans)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'مساقط',
    'Plans',
    1
);

-- License Phase - المساقط Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'ابعاد الفراغات', 'Space dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'اسامي الفراغات', 'Space names', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'ابعاد الممرات', 'Corridor dimensions', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'مسافات ارتحال السلالم', 'Stair travel distances', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'مطابقة الانشائي', 'Structural compliance', 5, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'طلبات الإليكتروميكانيكال', 'Electromechanical requests', 6, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'توقيع مساحات الأدوار', 'Floor area signatures', 7, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 1), 'المناسيب', 'Levels', 8, true);

-- License Phase - Sub-section: Layout
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'Layout',
    'Layout',
    2
);

-- License Phase - Layout Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 2), 'Layout', 'Layout', 1, false);

-- License Phase - Sub-section: تفاصيل (Details)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'تفاصيل',
    'Details',
    3
);

-- License Phase - تفاصيل Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 3), 'تفاصيل', 'Details', 1, false);

-- License Phase - Sub-section: قطاعات (Sections)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'قطاعات',
    'Sections',
    4
);

-- License Phase - قطاعات Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 4), 'قطاعات', 'Sections', 1, false);

-- License Phase - Sub-section: واجهات (Facades)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'واجهات',
    'Facades',
    5
);

-- License Phase - واجهات Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 5), 'الواجهات', 'Facades', 1, true);

-- License Phase - Sub-section: قرار الوزاري (Ministerial Decision)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'License'),
    'قرار الوزاري (إنجود)',
    'Ministerial Decision (Injoud)',
    6
);

-- License Phase - قرار الوزاري Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'License') AND display_order = 6), 'قرار الوزاري (إنجود)', 'Ministerial Decision (Injoud)', 1, false);

-- =============================================
-- STEP 5: Working Phase (Working Drawings)
-- =============================================

-- Working Phase - Sub-section: مساقط (Plans)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'Working'),
    'مساقط',
    'Plans',
    1
);

-- Working Phase - مساقط Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 1), 'ابعاد تفصيلية', 'Detailed dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 1), 'خوامر ابواب وشبابيك', 'Door and window frames', 2, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 1), 'تشطيبات الفراغات', 'Space finishes', 3, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 1), 'ترقيم الفراغات', 'Space numbering', 4, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 1), 'المناسيب', 'Levels', 5, true);

-- Working Phase - Sub-section: واجهات (Facades)
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'Working'),
    'واجهات',
    'Facades',
    2
);

-- Working Phase - واجهات Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 2), 'ابعاد تفصيلية', 'Detailed dimensions', 1, true),
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 2), 'تشطيبات', 'Finishes', 2, true);

-- Working Phase - Sub-section: Layout
INSERT INTO checklist_template_subsections (template_id, name_ar, name_en, display_order)
VALUES (
    (SELECT id FROM checklist_templates WHERE phase_type = 'Working'),
    'Layout',
    'Layout',
    3
);

-- Working Phase - Layout Items
INSERT INTO checklist_template_items (subsection_id, name_ar, name_en, display_order, is_required) VALUES
((SELECT id FROM checklist_template_subsections WHERE template_id = (SELECT id FROM checklist_templates WHERE phase_type = 'Working') AND display_order = 3), 'Layout', 'Layout', 1, false);

-- =============================================
-- STEP 6: BOQ Phase (Bill of Quantities)
-- =============================================
-- BOQ phase template created but left empty for manual entry by administrators
-- Administrators will add items through the admin interface as needed

-- =============================================
-- END OF SEED DATA
-- =============================================
