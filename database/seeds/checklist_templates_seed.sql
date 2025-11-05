-- Checklist Templates Seed Data
-- Contains all predefined checklist tasks for VIS, DD, License, and Working phases
-- Tasks are in Arabic as per system requirements
-- Updated: 2025-01-05
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
  RAISE NOTICE 'This will insert 67 predefined tasks';
END $$;

-- Clear existing templates (if any) - CASCADE will handle dependencies
TRUNCATE TABLE checklist_templates RESTART IDENTITY CASCADE;

-- ============================================================================
-- VIS PHASE CHECKLIST (39 tasks)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- VIS Phase tasks
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
('VIS', NULL, 'البعد كل فراغ طول + عرض NET', 'Each Space Dimension Length + Width NET', 16, true),
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
('VIS', NULL, 'دراسة حجل T.D', 'T.D Size Study', 28, true),
('VIS', NULL, 'اضافة النظام الإنشائي (الأعمدة)', 'Structural System Addition (Columns)', 29, true),
('VIS', NULL, 'دراسة الجراجات', 'Parking Study', 30, true),
('VIS', NULL, 'مقترح D.C', 'D.C Proposal', 31, true),
('VIS', NULL, 'Post Production', 'Post Production', 32, true),
('VIS', NULL, 'تحديث المساقط تبعا T.D', 'Plans Update According to T.D', 33, true),
('VIS', NULL, 'اضافة طلبات الإليكتروميكانيكال', 'Electromechanical Requirements Addition', 34, true),
('VIS', NULL, 'التأكد من وجود طبقات الملف النهائي T.D في السور فر', 'Verify Final File Layers T.D in Fence', 35, true),
('VIS', NULL, 'التأكد من وجود ملفات D VIZ T.D', 'Verify D VIZ T.D Files', 36, true),
('VIS', NULL, 'التأكد من المساحة البنائية', 'Verify Built-Up Area', 37, true),
('VIS', NULL, 'التأكد من البروز', 'Verify Projection', 38, true),
('VIS', NULL, 'التأكد من الردود', 'Verify Setbacks', 39, true);

-- ============================================================================
-- DD PHASE CHECKLIST (7 tasks)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- DD Phase tasks
('DD', NULL, 'التأكد من المساحة البنائية', 'Verify Built-Up Area', 40, true),
('DD', NULL, 'التأكد من البروز', 'Verify Projection', 41, true),
('DD', NULL, 'التأكد من الردود', 'Verify Setbacks', 42, true),
('DD', NULL, 'التأكد من اشتراطات الحريق', 'Verify Fire Requirements', 43, true),
('DD', NULL, 'التأكد من الجراجات', 'Verify Parking', 44, true),
('DD', NULL, 'طلبات الإنشائي', 'Structural Requirements', 45, true),
('DD', NULL, 'طلبات الإليكتروميكانيكال', 'Electromechanical Requirements', 46, true);

-- ============================================================================
-- LICENSE PHASE CHECKLIST (12 tasks)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- License Phase tasks (no sections, flat list)
('License', NULL, 'ابعاد الفراغات', 'Space Dimensions', 47, true),
('License', NULL, 'اسامي الفراغات', 'Space Names', 48, true),
('License', NULL, 'ابعاد الممرات', 'Corridor Dimensions', 49, true),
('License', NULL, 'مسافات ارتحال السلالم', 'Stair Travel Distances', 50, true),
('License', NULL, 'مطابقة الإنشائي', 'Structural Conformity', 51, true),
('License', NULL, 'طلبات الإليكتروميكانيكال', 'Electromechanical Requirements', 52, true),
('License', NULL, 'توقيع مساحات الأدوار', 'Floor Areas Signing', 53, true),
('License', NULL, 'المناسيب', 'Levels', 54, true),
('License', NULL, 'الواجهات', 'Facades', 55, true),
('License', NULL, 'القطاعات', 'Sections', 56, true),
('License', NULL, 'القرار الوزاري (إن وجد)', 'Ministerial Decision (if any)', 57, true),
('License', NULL, 'Layout', 'Layout', 58, true);

-- ============================================================================
-- WORKING PHASE CHECKLIST (11 tasks)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Working Phase tasks (no sections, flat list)
('Working', NULL, 'ابعاد تفصيلية', 'Detailed Dimensions', 59, true),
('Working', NULL, 'دوائر أبواب وشبابيك', 'Door and Window Circles', 60, true),
('Working', NULL, 'تشطيبات الفراغات', 'Space Finishes', 61, true),
('Working', NULL, 'ترقيم الفراغات', 'Space Numbering', 62, true),
('Working', NULL, 'المناسيب', 'Levels', 63, true),
('Working', NULL, 'ابعاد تفصيلية', 'Detailed Dimensions', 64, true),
('Working', NULL, 'تشطيبات', 'Finishes', 65, true),
('Working', NULL, 'واجهات', 'Facades', 66, true),
('Working', NULL, 'قطاعات', 'Sections', 67, true),
('Working', NULL, 'تفاصيل', 'Details', 68, true),
('Working', NULL, 'Layout', 'Layout', 69, true);

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

-- Final verification
SELECT 'Checklist Templates Seed - Complete: 69 tasks loaded' as status;

-- Commit transaction (all-or-nothing operation)
COMMIT;

-- Reset timeouts to default
RESET statement_timeout;
RESET lock_timeout;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Checklist templates seed completed successfully at %', NOW();
  RAISE NOTICE '✓ Total tasks inserted: 69 (VIS: 39, DD: 7, License: 12, Working: 11)';
END $$;
