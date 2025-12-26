-- Add 30 hours work log for Rostom on "Principle project" phase in "mall badr (mirror)" project
-- This bypasses the phase status check since it's already completed

-- Insert the work log
INSERT INTO work_logs (
  project_id,
  phase_id,
  engineer_id,
  date,
  hours,
  description,
  supervisor_approved,
  created_at,
  updated_at
) VALUES (
  20,                                    -- mall badr (mirror)
  190,                                   -- Principle project phase
  37,                                    -- Rostom
  '2025-03-21',                          -- Date (adjust as needed)
  30.00,                                 -- 30 hours
  'Historical work log entry - Added by supervisor for completed phase',
  true,                                  -- Auto-approved
  NOW(),
  NOW()
);

-- Verify the insertion
SELECT
  wl.id,
  wl.date,
  wl.hours,
  wl.description,
  u.name as engineer_name,
  pp.phase_name,
  p.name as project_name
FROM work_logs wl
JOIN users u ON wl.engineer_id = u.id
JOIN project_phases pp ON wl.phase_id = pp.id
JOIN projects p ON wl.project_id = p.id
WHERE wl.engineer_id = 37
  AND wl.phase_id = 190
ORDER BY wl.created_at DESC
LIMIT 5;
