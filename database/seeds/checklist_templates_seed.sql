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
  RAISE NOTICE 'This will insert 68 predefined tasks (VIS: 39, DD: 7, License: 12, Working: 10)';
END $$;

-- Clear existing templates (if any) - CASCADE will handle dependencies
TRUNCATE TABLE checklist_templates RESTART IDENTITY CASCADE;

-- ============================================================================
-- VIS PHASE CHECKLIST (39 tasks)
-- No sections - flat list
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
('VIS', NULL, 'دراسة المساحة البنائية', 'Building Area Study', 1, true),
('VIS', NULL, 'توقيع الردود على الأرض', 'Setbacks Site Marking', 2, true),
('VIS', NULL, 'توقيع البروزات', 'Projections Marking', 3, true),
('VIS', NULL, 'دراسة الموقع', 'Site Study', 4, true),
('VIS', NULL, 'الدراسة البيئية', 'Environmental Study', 5, true),
('VIS', NULL, 'دراسات أخرى', 'Other Studies', 6, true),
('VIS', NULL, 'رسم الأكسشن المقترح', 'Proposed Axis Drawing', 7, true),
('VIS', NULL, 'التوافق مع كود الحريق', 'Fire Code Compliance', 8, true),
('VIS', NULL, 'رسم مسقط الدور الأرضي', 'Ground Floor Plan Drawing', 9, true),
('VIS', NULL, 'المساحة البنائية للدور الأرضي', 'Ground Floor Built-Up Area', 10, true),
('VIS', NULL, 'مسقط الدور المكرر', 'Typical Floor Plan', 11, true),
('VIS', NULL, 'المساحة البنائية للدور المكرر', 'Typical Floor Built-Up Area', 12, true),
('VIS', NULL, 'مسقط دور الروف', 'Roof Floor Plan', 13, true),
('VIS', NULL, 'المساحة البنائية لدور الروف', 'Roof Floor Built-Up Area', 14, true),
('VIS', NULL, 'مسقط المجزم', 'Mezzanine Plan', 15, true),
('VIS', NULL, 'ابعاد كل فراغ طول + عرض NET', 'Each Space Dimension Length + Width NET', 16, true),
('VIS', NULL, 'مساحة كل فراغ (Axe- Axe)', 'Each Space Area (Axe-Axe)', 17, true),
('VIS', NULL, 'لاندسكيب', 'Landscape', 18, true),
('VIS', NULL, 'مسقط outleting المحل', 'Outlet Plan', 19, true),
('VIS', NULL, 'الموقع العام', 'General Site', 20, true),
('VIS', NULL, 'توثيق استشارات في ملف + السور فر', 'Consultations Documentation + Fence', 21, true),
('VIS', NULL, 'تلوين المساقط الأفقية للدور الأرضي', 'Ground Floor Plans Coloring', 22, true),
('VIS', NULL, 'تلوين المساقط الأفقية للدور المكرر', 'Typical Floor Plans Coloring', 23, true),
('VIS', NULL, 'تلوين المساقط الأفقية لدور الروف', 'Roof Floor Plans Coloring', 24, true),
('VIS', NULL, 'تلوين المساقط الأفقية للمجزم', 'Mezzanine Plans Coloring', 25, true),
('VIS', NULL, 'تلوين المساقط الأفقية للموقع العام', 'General Site Plans Coloring', 26, true),
('VIS', NULL, 'دراسة تطور الفكرة التصميمية', 'Design Concept Evolution Study', 27, true),
('VIS', NULL, 'دراسة حجل TD', 'TD Size Study', 28, true),
('VIS', NULL, 'اضافة النظام الإنشائي (الأعمدة)', 'Structural System Addition (Columns)', 29, true),
('VIS', NULL, 'دراسة الجراجات', 'Parking Study', 30, true),
('VIS', NULL, 'مقترح DC', 'DC Proposal', 31, true),
('VIS', NULL, 'Post Production', 'Post Production', 32, true),
('VIS', NULL, 'تحديث المساقط تبعا TD', 'Plans Update According to TD', 33, true),
('VIS', NULL, 'اضافة طلبات الإليكتروميكانيكال', 'Electromechanical Requirements Addition', 34, true),
('VIS', NULL, 'التأكد من وجود طبقات الملف النهائي TD في السور فر', 'Verify Final File Layers TD in Fence', 35, true),
('VIS', NULL, 'التأكد من وجود ملفات D VIZ TD', 'Verify D VIZ TD Files', 36, true),
('VIS', NULL, 'التأكد من المساحة البنائية', 'Verify Built-Up Area', 37, true),
('VIS', NULL, 'التأكد من البروز', 'Verify Projection', 38, true),
('VIS', NULL, 'التأكد من الردود', 'Verify Setbacks', 39, true);

-- ============================================================================
-- DD PHASE CHECKLIST (7 tasks)
-- No sections - flat list
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
('DD', NULL, 'التأكد من المساحة البنائية', 'Verify Built-Up Area', 40, true),
('DD', NULL, 'التأكد من البروز', 'Verify Projection', 41, true),
('DD', NULL, 'التأكد من الردود', 'Verify Setbacks', 42, true),
('DD', NULL, 'التأكد من اشتراطات الحريق', 'Verify Fire Requirements', 43, true),
('DD', NULL, 'التأكد من الجراجات', 'Verify Parking', 44, true),
('DD', NULL, 'طلبات الإنشائي', 'Structural Requirements', 45, true),
('DD', NULL, 'طلبات الاليكتروميكانيكال', 'Electromechanical Requirements', 46, true);

-- ============================================================================
-- LICENSE PHASE CHECKLIST (12 tasks)
-- Organized by sections: المساقط, الواجهات, القطاعات, القرار الوزاري, Layout
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Section: المساقط (Plans)
('License', 'المساقط', 'ابعاد الفراغات', 'Space Dimensions', 47, true),
('License', 'المساقط', 'اسامي الفراغات', 'Space Names', 48, true),
('License', 'المساقط', 'ابعاد الممرات', 'Corridor Dimensions', 49, true),
('License', 'المساقط', 'مسافات ارتحال السلالم', 'Stair Travel Distances', 50, true),
('License', 'المساقط', 'مطابقة الإنشائي', 'Structural Conformity', 51, true),
('License', 'المساقط', 'طلبات الاليكتروميكانيكال', 'Electromechanical Requirements', 52, true),
('License', 'المساقط', 'توقيع مساحات الأدوار', 'Floor Areas Signing', 53, true),
('License', 'المساقط', 'المناسيب', 'Levels', 54, true),

-- Section: الواجهات (Facades)
('License', 'الواجهات', 'الواجهات', 'Facades', 55, true),

-- Section: القطاعات (Sections)
('License', 'القطاعات', 'القطاعات', 'Sections', 56, true),

-- Section: القرار الوزاري (Ministerial Decision)
('License', 'القرار الوزاري', 'القرار الوزاري (إن وجد)', 'Ministerial Decision (if any)', 57, true),

-- Section: Layout
('License', 'Layout', 'Layout', 'Layout', 58, true);

-- ============================================================================
-- WORKING PHASE CHECKLIST (10 tasks)
-- Organized by sections: مساقط, واجهات, قطاعات, تفاصيل, Layout
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Section: مساقط (Plans)
('Working', 'مساقط', 'ابعاد تفصيلية', 'Detailed Dimensions', 59, true),
('Working', 'مساقط', 'دوائر أبواب وشبابيك', 'Door and Window Circles', 60, true),
('Working', 'مساقط', 'تشطيبات الفراغات', 'Space Finishes', 61, true),
('Working', 'مساقط', 'ترقيم الفراغات', 'Space Numbering', 62, true),
('Working', 'مساقط', 'المناسيب', 'Levels', 63, true),

-- Section: واجهات (Facades)
('Working', 'واجهات', 'ابعاد تفصيلية', 'Detailed Dimensions', 64, true),
('Working', 'واجهات', 'تشطيبات', 'Finishes', 65, true),

-- Section: قطاعات (Sections)
('Working', 'قطاعات', 'قطاعات', 'Sections', 66, true),

-- Section: تفاصيل (Details)
('Working', 'تفاصيل', 'تفاصيل', 'Details', 67, true),

-- Section: Layout
('Working', 'Layout', 'Layout', 'Layout', 68, true);

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
  RAISE NOTICE '✓ Total tasks inserted: 68';
  RAISE NOTICE '  - VIS: 39 tasks (no sections)';
  RAISE NOTICE '  - DD: 7 tasks (no sections)';
  RAISE NOTICE '  - License: 12 tasks (5 sections: المساقط, الواجهات, القطاعات, القرار الوزاري, Layout)';
  RAISE NOTICE '  - Working: 10 tasks (5 sections: مساقط, واجهات, قطاعات, تفاصيل, Layout)';
  RAISE NOTICE '✓ All task orders match PDF documentation exactly';
END $$;
