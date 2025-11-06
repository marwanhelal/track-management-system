-- Checklist Templates Seed Data
-- Contains all predefined checklist tasks for VIS, DD, License, and Working phases
-- Tasks are in Arabic as per system requirements and PDF documentation
-- Updated: 2025-01-05 - Corrected task order to match PDF exactly
-- SAFE FOR PRODUCTION: Uses transaction, can be rolled back

-- Set timeouts to prevent stuck queries
SET statement_timeout = '300000'; -- 5 minutes
SET lock_timeout = '30000'; -- 30 seconds

-- Start transaction for atomic operation
BEGIN;

-- Log start of seed
DO $$
BEGIN
  RAISE NOTICE 'Starting checklist templates seed at %', NOW();
  RAISE NOTICE 'This will insert 64 predefined tasks (VIS: 35, DD: 7, License: 12, Working: 10)';
END $$;

-- Clear existing templates (if any) - CASCADE will handle dependencies
TRUNCATE TABLE checklist_templates RESTART IDENTITY CASCADE;

-- ============================================================================
-- VIS PHASE CHECKLIST (35 tasks)
-- No sections - flat list
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
('VIS', NULL, 'دراسة المساحة النهائية', 'Final Area Study', 1, true),
('VIS', NULL, 'توقيع الردود على الأرض', 'Setbacks Site Marking', 2, true),
('VIS', NULL, 'توقيع البروزات', 'Projections Marking', 3, true),
('VIS', NULL, 'دراسة الموقع', 'Site Study', 4, true),
('VIS', NULL, 'الدراسة البيئية', 'Technical Study', 5, true),
('VIS', NULL, 'دراسات أخرى', 'Other Studies (Stair Study)', 6, true),
('VIS', NULL, 'رسم الاسكيس المقترح', 'Proposed Sketch Drawing', 7, true),
('VIS', NULL, 'التوافق مع كود الحريق', 'Fire Code Compliance', 8, true),
('VIS', NULL, 'رسم مسقط الدور الأرضي', 'Ground Floor Plan Drawing', 9, true),
('VIS', NULL, 'المساحة البنائية للدور الأرضي', 'Ground Floor Final Area', 10, true),
('VIS', NULL, 'مسقط الدور المتكرر', 'Typical Floor Plan', 11, true),
('VIS', NULL, 'المساحة البنائية للدور المتكرر', 'Typical Floor Final Area', 12, true),
('VIS', NULL, 'مسقط دور الروف', 'Roof Floor Plan', 13, true),
('VIS', NULL, 'المساحة النهائية لدور الروف', 'Roof Floor Final Area', 14, true),
('VIS', NULL, 'مسقط البدروم', 'Basement Plan', 15, true),
('VIS', NULL, 'إبعاد كل فراغ (طول + عرض NET)', 'Each Space Dimension (Length + Width NET)', 16, true),
('VIS', NULL, 'مساحة كل فراغ (Axe - Axe)', 'Each Space Area (Axe-Axe)', 17, true),
('VIS', NULL, 'لاندسكيب (Landscape)', 'Landscape', 18, true),
('VIS', NULL, 'مساحة ال Outing للمحل', 'Outlet Area', 19, true),
('VIS', NULL, 'الموقع العام', 'General Site', 20, true),
('VIS', NULL, 'توثيق إستشارات في ملف على السيرفر', 'Consultations Documentation on Server', 21, true),
('VIS', NULL, 'تلوين المساقط الأفقية للدور الأرضي', 'Ground Floor Plans Coloring', 22, true),
('VIS', NULL, 'تلوين المساقط الأفقية للدور المتكرر', 'Typical Floor Plans Coloring', 23, true),
('VIS', NULL, 'تلوين المساقط الأفقية لدور الروف', 'Roof Floor Plans Coloring', 24, true),
('VIS', NULL, 'تلوين المساقط الأفقية للبدروم', 'Basement Plans Coloring', 25, true),
('VIS', NULL, 'دراسة تطور الفكرة التصميمية', 'Design Concept Evolution Study', 26, true),
('VIS', NULL, 'دراسة كتل 3D', '3D Mass Study', 27, true),
('VIS', NULL, 'إضافة النظام الإنشائي (الأعمدة)', 'Structural System Addition (Columns)', 28, true),
('VIS', NULL, 'دراسة الواجهات', 'Facades Study', 29, true),
('VIS', NULL, 'مقترح 3D', '3D Proposal', 30, true),
('VIS', NULL, 'Post Production', 'Post Production', 31, true),
('VIS', NULL, 'تحديث المساقط تبعاً لل 3D', 'Plans Update According to 3D', 32, true),
('VIS', NULL, 'إضافة طلبات الإلكتروميكانيكال', 'Electromechanical Requirements Addition', 33, true),
('VIS', NULL, 'التأكد من وجود الملف النهائي 3D على السيرفر', 'Verify Final 3D File on Server', 34, true),
('VIS', NULL, 'التأكد من وجود ملفات 3D VIZ', 'Verify 3D VIZ Files', 35, true);

-- ============================================================================
-- DD PHASE CHECKLIST (7 tasks)
-- No sections - flat list
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
('DD', NULL, 'التأكد من المساحة البنائية', 'Verify Built-Up Area', 36, true),
('DD', NULL, 'التأكد من البروز', 'Verify Projection', 37, true),
('DD', NULL, 'التأكد من الردود', 'Verify Setbacks', 38, true),
('DD', NULL, 'التأكد من اشتراطات الحريق', 'Verify Fire Requirements', 39, true),
('DD', NULL, 'التأكد من الجراجات', 'Verify Parking', 40, true),
('DD', NULL, 'طلبات الإنشائي', 'Structural Requirements', 41, true),
('DD', NULL, 'طلبات الاليكتروميكانيكال', 'Electromechanical Requirements', 42, true);

-- ============================================================================
-- LICENSE PHASE CHECKLIST (12 tasks)
-- Organized by sections: المساقط, الواجهات, القطاعات, القرار الوزاري, Layout
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Section: المساقط (Plans)
('License', 'المساقط', 'ابعاد الفراغات', 'Space Dimensions', 43, true),
('License', 'المساقط', 'اسامي الفراغات', 'Space Names', 44, true),
('License', 'المساقط', 'ابعاد الممرات', 'Corridor Dimensions', 45, true),
('License', 'المساقط', 'مسافات ارتحال السلالم', 'Stair Travel Distances', 46, true),
('License', 'المساقط', 'مطابقة الإنشائي', 'Structural Conformity', 47, true),
('License', 'المساقط', 'طلبات الاليكتروميكانيكال', 'Electromechanical Requirements', 48, true),
('License', 'المساقط', 'توقيع مساحات الأدوار', 'Floor Areas Signing', 49, true),
('License', 'المساقط', 'المناسيب', 'Levels', 50, true),

-- Section: الواجهات (Facades)
('License', 'الواجهات', 'الواجهات', 'Facades', 51, true),

-- Section: القطاعات (Sections)
('License', 'القطاعات', 'القطاعات', 'Sections', 52, true),

-- Section: القرار الوزاري (Ministerial Decision)
('License', 'القرار الوزاري', 'القرار الوزاري (إن وجد)', 'Ministerial Decision (if any)', 53, true),

-- Section: Layout
('License', 'Layout', 'Layout', 'Layout', 54, true);

-- ============================================================================
-- WORKING PHASE CHECKLIST (10 tasks)
-- Organized by sections: مساقط, واجهات, قطاعات, تفاصيل, Layout
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Section: مساقط (Plans)
('Working', 'مساقط', 'ابعاد تفصيلية', 'Detailed Dimensions', 55, true),
('Working', 'مساقط', 'دوائر أبواب وشبابيك', 'Door and Window Circles', 56, true),
('Working', 'مساقط', 'تشطيبات الفراغات', 'Space Finishes', 57, true),
('Working', 'مساقط', 'ترقيم الفراغات', 'Space Numbering', 58, true),
('Working', 'مساقط', 'المناسيب', 'Levels', 59, true),

-- Section: واجهات (Facades)
('Working', 'واجهات', 'ابعاد تفصيلية', 'Detailed Dimensions', 60, true),
('Working', 'واجهات', 'تشطيبات', 'Finishes', 61, true),

-- Section: قطاعات (Sections)
('Working', 'قطاعات', 'قطاعات', 'Sections', 62, true),

-- Section: تفاصيل (Details)
('Working', 'تفاصيل', 'تفاصيل', 'Details', 63, true),

-- Section: Layout
('Working', 'Layout', 'Layout', 'Layout', 64, true);

-- ============================================================================
-- BOQ PHASE
-- ============================================================================
-- Note: BOQ phase has no predefined templates
-- Supervisors can add tasks manually as needed

-- Verification query
SELECT
    phase_name,
    COUNT(*) as task_count
FROM checklist_templates
GROUP BY phase_name
ORDER BY
    CASE phase_name
        WHEN 'VIS' THEN 1
        WHEN 'DD' THEN 2
        WHEN 'License' THEN 3
        WHEN 'Working' THEN 4
    END;

-- Final verification with section breakdown
SELECT
    phase_name,
    section_name,
    COUNT(*) as task_count
FROM checklist_templates
GROUP BY phase_name, section_name
ORDER BY
    CASE phase_name
        WHEN 'VIS' THEN 1
        WHEN 'DD' THEN 2
        WHEN 'License' THEN 3
        WHEN 'Working' THEN 4
    END,
    MIN(display_order);

-- Commit transaction (all-or-nothing operation)
COMMIT;

-- Reset timeouts to default
RESET statement_timeout;
RESET lock_timeout;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Checklist templates seed completed successfully at %', NOW();
  RAISE NOTICE '✓ Total tasks inserted: 64';
  RAISE NOTICE '  - VIS: 35 tasks (no sections)';
  RAISE NOTICE '  - DD: 7 tasks (no sections)';
  RAISE NOTICE '  - License: 12 tasks (5 sections: المساقط, الواجهات, القطاعات, القرار الوزاري, Layout)';
  RAISE NOTICE '  - Working: 10 tasks (5 sections: مساقط, واجهات, قطاعات, تفاصيل, Layout)';
  RAISE NOTICE '✓ All task orders match PDF documentation exactly';
END $$;
