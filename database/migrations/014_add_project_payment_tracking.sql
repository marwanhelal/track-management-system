-- Migration: Add project-level payment tracking
-- Description: Add total contract amount and down payment tracking to projects table
-- Date: 2025-01-02

-- Add project payment columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_contract_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_payment_date DATE,
ADD COLUMN IF NOT EXISTS down_payment_notes TEXT,
ADD COLUMN IF NOT EXISTS down_payment_received BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN projects.total_contract_amount IS 'Total contract value with client (should equal down_payment_amount + sum of all phase amounts)';
COMMENT ON COLUMN projects.down_payment_amount IS 'Initial down payment received from client (separate from phase payments)';
COMMENT ON COLUMN projects.down_payment_date IS 'Date when down payment was received';
COMMENT ON COLUMN projects.down_payment_notes IS 'Additional notes about down payment';
COMMENT ON COLUMN projects.down_payment_received IS 'Whether down payment has been received';

-- Create a function to calculate total project payment summary
CREATE OR REPLACE FUNCTION get_project_payment_summary(project_id_param INTEGER)
RETURNS TABLE (
    total_contract DECIMAL(12,2),
    down_payment DECIMAL(12,2),
    sum_of_phases DECIMAL(12,2),
    total_phases_paid DECIMAL(12,2),
    total_paid DECIMAL(12,2),
    total_remaining DECIMAL(12,2),
    is_balanced BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.total_contract_amount,
        p.down_payment_amount,
        COALESCE(SUM(ph.total_amount), 0) as sum_of_phases,
        COALESCE(SUM(ph.paid_amount), 0) as total_phases_paid,
        p.down_payment_amount + COALESCE(SUM(ph.paid_amount), 0) as total_paid,
        p.total_contract_amount - (p.down_payment_amount + COALESCE(SUM(ph.paid_amount), 0)) as total_remaining,
        (p.total_contract_amount = p.down_payment_amount + COALESCE(SUM(ph.total_amount), 0)) as is_balanced
    FROM projects p
    LEFT JOIN project_phases ph ON ph.project_id = p.id
    WHERE p.id = project_id_param
    GROUP BY p.id, p.total_contract_amount, p.down_payment_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_payment_summary IS 'Calculate complete payment summary for a project including validation';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_payment_tracking
ON projects(total_contract_amount, down_payment_amount)
WHERE total_contract_amount > 0;

-- Migration complete
-- Note: Existing projects will have default values (0 for amounts)
-- Supervisors should update project payment information through the UI
