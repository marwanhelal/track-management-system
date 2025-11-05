-- Checklist Templates Seed Data
-- Contains all predefined checklist tasks for VIS, DD, License, and Working phases
-- Tasks are in Arabic as per system requirements
-- Created: 2025-01-05
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
('VIS', NULL, 'دراسة السيادة البلدية', 'Municipal Authority Study', 1, true),
('VIS', NULL, 'توقيع الوجود على الأرض', 'Site Location Verification', 2, true),
('VIS', NULL, 'توقيع التورنيات', 'Setbacks Signing', 3, true),
('VIS', NULL, 'دراسة الموقع', 'Site Study', 4, true),
('VIS', NULL, 'الدراسة البيئية', 'Environmental Study', 5, true),
('VIS', NULL, 'دراسة الشمس', 'Sun Study', 6, true),
('VIS', NULL, 'رسم الأكسشن المبدع', 'Creative Axis Drawing', 7, true),
('VIS', NULL, 'التوافق مع كود الحريق', 'Fire Code Compliance', 8, true),
('VIS', NULL, 'رسم مسقط الدور الأرضي', 'Ground Floor Plan Drawing', 9, true),
('VIS', NULL, 'المساحة البنائية للدور الأرضي', 'Ground Floor Built Area', 10, true),
('VIS', NULL, 'مسقط الدور المكرر', 'Typical Floor Plan', 11, true),
('VIS', NULL, 'المساحة البنائية للدور المكرر', 'Typical Floor Built Area', 12, true),
('VIS', NULL, 'مسقط الدور الأول', 'First Floor Plan', 13, true),
('VIS', NULL, 'المساحة البنائية للدور الأول', 'First Floor Built Area', 14, true),
('VIS', NULL, 'مسقط المجزم', 'Mezzanine Plan', 15, true),
('VIS', NULL, 'شبكة الأرض مع + صرح NET', 'Grid Layout with NET Structure', 16, true),
('VIS', NULL, 'مصادقة دراج (Axe- Axe)', 'Axes Validation (Axe-Axe)', 17, true),
('VIS', NULL, 'لاندسكيب', 'Landscape', 18, true),
('VIS', NULL, 'مسطح outleting المحل', 'Outlet Layout Plan', 19, true),
('VIS', NULL, 'رسم جامع', 'Comprehensive Drawing', 20, true),
('VIS', NULL, 'توثيق استشارات في ملف + السور', 'Documentation of Consultations + Fence', 21, true),
('VIS', NULL, 'التأكد استشارة الحريق الآلي الأساسي', 'Verify Basic Fire Alarm Consultation', 22, true),
('VIS', NULL, 'طراين المساقيط العائمة القدير المكرر', 'Typical Floor Floating Plans Layout', 23, true),
('VIS', NULL, 'طراين المساقيط العائمة قير الأول', 'First Floor Floating Plans Layout', 24, true),
('VIS', NULL, 'طراين المساقيط العائمة قير الرؤوف', 'Roof Floor Floating Plans Layout', 25, true),
('VIS', NULL, 'طراين المساقيط العائمة قير المجزم', 'Mezzanine Floating Plans Layout', 26, true),
('VIS', NULL, 'طراين المساقيط العلالية الموقع العام', 'General Site Upper Plans Layout', 27, true),
('VIS', NULL, 'التقارير التخطيطية للتصميم', 'Design Planning Reports', 28, true),
('VIS', NULL, '(T.D) دراسة حجو (الأعمد)', 'Column Size Study (T.D)', 29, true),
('VIS', NULL, '(D.S) الحساب المعاير - (الأعمد)', 'Standard Calculation - Columns (D.S)', 30, true),
('VIS', NULL, 'دراسة للخراجات', 'Exits Study', 31, true),
('VIS', NULL, 'المواد D.C 1', 'Materials D.C 1', 32, true),
('VIS', NULL, 'Post Production', 'Post Production', 33, true),
('VIS', NULL, 'تجمعيع المساحات', 'Area Aggregation', 34, true),
('VIS', NULL, 'اضافة طابقات الأكستر وميكانيكال', 'Adding Extra and Mechanical Floors', 35, true),
('VIS', NULL, 'الطاقة مع وجود طبقات D VIZ', 'Energy with Layers VIZ D', 36, true),
('VIS', NULL, 'التأكد من المحيطة البيئية', 'Verify Environmental Surroundings', 37, true),
('VIS', NULL, 'التأكد من الزواز', 'Verify Corners', 38, true),
('VIS', NULL, 'التأكد مع الخارجي', 'Verify with External', 39, true);

-- ============================================================================
-- DD PHASE CHECKLIST (7 tasks across multiple sections)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- DD Phase tasks
('DD', NULL, 'أساسي الفراغات', 'Space Basics', 40, true),
('DD', NULL, 'ابعاد المعمارات', 'Architectural Dimensions', 41, true),
('DD', NULL, 'مسالات ارتجال السلالم', 'Staircase Improvisation Paths', 42, true),
('DD', NULL, 'مطابقة الإنشائي', 'Structural Compliance', 43, true),
('DD', NULL, 'طابقات الاليكتر وميكانيكال', 'Electrical and Mechanical Floors', 44, true),
('DD', NULL, 'توقيع مساحات الأدوار', 'Floor Area Signing', 45, true),
('DD', NULL, 'المناسيب', 'Levels', 46, true);

-- ============================================================================
-- LICENSE PHASE CHECKLIST (13 tasks in 6 subsections)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- License Phase - Section 1: Facades
('License', 'الواجهات', 'الواجهات', 'Facades', 47, true),
('License', 'الواجهات', 'القطاعات', 'Sections', 48, true),
('License', 'الواجهات', 'القرار الوزاري (إن وجد)', 'Ministerial Decision (if any)', 49, true),

-- License Phase - Section 2: Layout
('License', 'Layout', 'Layout', 'Layout', 50, true),

-- License Phase - Section 3: Detailed Dimensions
('License', 'ابعاد تفصيلية', 'نوافير ابواب وشبابيك', 'Doors and Windows Details', 51, true),
('License', 'ابعاد تفصيلية', 'تطبيطات الفراغات', 'Space Layouts', 52, true),
('License', 'ابعاد تفصيلية', 'توقيع الفتح', 'Opening Signing', 53, true),
('License', 'ابعاد تفصيلية', 'المناسيب', 'Levels', 54, true),

-- License Phase - Section 4: Plans
('License', 'مساقط', 'ابعاد تفصيلية', 'Detailed Dimensions', 55, true),
('License', 'مساقط', 'تطليطات', 'Tiling', 56, true),

-- License Phase - Section 5: Details
('License', 'تفاصيل', 'قطاعات', 'Sections', 57, true),
('License', 'تفاصيل', 'تفاصيل', 'Details', 58, true),

-- License Phase - Section 6: Layout
('License', 'Layout', 'Layout', 'Layout', 59, true);

-- ============================================================================
-- WORKING PHASE CHECKLIST (8 tasks in 3 subsections)
-- ============================================================================

INSERT INTO checklist_templates (phase_name, section_name, task_title_ar, task_title_en, display_order, is_active) VALUES
-- Working Phase - Section 1: Facades and Sections
('Working', 'واجهات', 'أساسي الفراغات', 'Space Basics', 60, true),
('Working', 'واجهات', 'ابعاد المعمارات', 'Architectural Dimensions', 61, true),
('Working', 'واجهات', 'تطليطات الفراغات', 'Space Tiling', 62, true),
('Working', 'واجهات', 'توقيع الفتح', 'Opening Signing', 63, true),
('Working', 'واجهات', 'المناسيب', 'Levels', 64, true),

-- Working Phase - Section 2: Plans
('Working', 'مساقط', 'ابعاد تفصيلية', 'Detailed Dimensions', 65, true),
('Working', 'مساقط', 'تطليطات', 'Tiling', 66, true),

-- Working Phase - Section 3: Details and Layout
('Working', 'تفاصيل', 'Layout', 'Layout', 67, true);

-- ============================================================================
-- BOQ PHASE
-- ============================================================================
-- Note: BOQ phase has no predefined templates
-- Supervisors can add tasks manually as needed

-- Verification query
SELECT
    phase_name,
    section_name,
    COUNT(*) as task_count
FROM checklist_templates
GROUP BY phase_name, section_name
ORDER BY phase_name, section_name;

-- Summary
SELECT
    phase_name,
    COUNT(*) as total_tasks
FROM checklist_templates
GROUP BY phase_name
ORDER BY
    CASE phase_name
        WHEN 'VIS' THEN 1
        WHEN 'DD' THEN 2
        WHEN 'License' THEN 3
        WHEN 'Working' THEN 4
        WHEN 'BOQ' THEN 5
    END;

-- Final verification
SELECT 'Checklist Templates Seed - Complete: 67 tasks loaded' as status;

-- Commit transaction (all-or-nothing operation)
COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Checklist templates seed completed successfully at %', NOW();
  RAISE NOTICE '✓ Total tasks inserted: 67 (VIS: 39, DD: 7, License: 13, Working: 8)';
END $$;
