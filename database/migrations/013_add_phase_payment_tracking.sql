-- Migration 013: Add Phase Payment Tracking System
-- This migration adds payment tracking functionality to phases

-- Add payment fields to project_phases table
ALTER TABLE project_phases
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
ADD COLUMN IF NOT EXISTS payment_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_request_date DATE,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create phase_payments table for payment transaction history
CREATE TABLE IF NOT EXISTS phase_payments (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
  payment_date DATE NOT NULL,
  payment_type VARCHAR(20) DEFAULT 'partial' CHECK (payment_type IN ('upfront', 'milestone', 'final', 'partial')),
  payment_method VARCHAR(50),
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_payment_amount CHECK (payment_amount > 0)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_phase_payments_phase_id ON phase_payments(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_payments_project_id ON phase_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_payments_payment_date ON phase_payments(payment_date);

-- Create function to automatically update paid_amount when payment is added
CREATE OR REPLACE FUNCTION update_phase_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the phase's paid_amount by summing all payments
  UPDATE project_phases
  SET
    paid_amount = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM phase_payments
      WHERE phase_id = NEW.phase_id
    ),
    updated_at = NOW()
  WHERE id = NEW.phase_id;

  -- Update payment status based on paid vs total amount
  UPDATE project_phases
  SET payment_status = CASE
    WHEN paid_amount = 0 THEN 'unpaid'
    WHEN total_amount IS NOT NULL AND paid_amount >= total_amount THEN 'fully_paid'
    WHEN paid_amount > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END
  WHERE id = NEW.phase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update paid_amount on payment insert
DROP TRIGGER IF EXISTS trigger_update_paid_amount_on_insert ON phase_payments;
CREATE TRIGGER trigger_update_paid_amount_on_insert
AFTER INSERT ON phase_payments
FOR EACH ROW
EXECUTE FUNCTION update_phase_paid_amount();

-- Create function to recalculate paid_amount when payment is updated or deleted
CREATE OR REPLACE FUNCTION recalculate_phase_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  target_phase_id INTEGER;
BEGIN
  -- Determine which phase_id to update
  IF TG_OP = 'DELETE' THEN
    target_phase_id := OLD.phase_id;
  ELSE
    target_phase_id := NEW.phase_id;
  END IF;

  -- Update the phase's paid_amount by summing all payments
  UPDATE project_phases
  SET
    paid_amount = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM phase_payments
      WHERE phase_id = target_phase_id
    ),
    updated_at = NOW()
  WHERE id = target_phase_id;

  -- Update payment status based on paid vs total amount
  UPDATE project_phases
  SET payment_status = CASE
    WHEN paid_amount = 0 THEN 'unpaid'
    WHEN total_amount IS NOT NULL AND paid_amount >= total_amount THEN 'fully_paid'
    WHEN paid_amount > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END
  WHERE id = target_phase_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for update and delete
DROP TRIGGER IF EXISTS trigger_update_paid_amount_on_update ON phase_payments;
CREATE TRIGGER trigger_update_paid_amount_on_update
AFTER UPDATE ON phase_payments
FOR EACH ROW
EXECUTE FUNCTION recalculate_phase_paid_amount();

DROP TRIGGER IF EXISTS trigger_update_paid_amount_on_delete ON phase_payments;
CREATE TRIGGER trigger_update_paid_amount_on_delete
AFTER DELETE ON phase_payments
FOR EACH ROW
EXECUTE FUNCTION recalculate_phase_paid_amount();

-- Add audit logging for payment changes
CREATE OR REPLACE FUNCTION audit_phase_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, new_values, note)
    VALUES (
      'phase_payments',
      NEW.id,
      'INSERT',
      NEW.recorded_by,
      row_to_json(NEW),
      'Payment recorded: ' || NEW.payment_amount || ' on ' || NEW.payment_date
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_values, new_values, note)
    VALUES (
      'phase_payments',
      NEW.id,
      'UPDATE',
      NEW.recorded_by,
      row_to_json(OLD),
      row_to_json(NEW),
      'Payment updated'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_values, note)
    VALUES (
      'phase_payments',
      OLD.id,
      'DELETE',
      OLD.recorded_by,
      row_to_json(OLD),
      'Payment deleted: ' || OLD.payment_amount
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS trigger_audit_phase_payments ON phase_payments;
CREATE TRIGGER trigger_audit_phase_payments
AFTER INSERT OR UPDATE OR DELETE ON phase_payments
FOR EACH ROW
EXECUTE FUNCTION audit_phase_payment_changes();

-- Add updated_at trigger to phase_payments
DROP TRIGGER IF EXISTS update_phase_payments_updated_at ON phase_payments;
CREATE TRIGGER update_phase_payments_updated_at
BEFORE UPDATE ON phase_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE phase_payments IS 'Tracks payment transactions for project phases';
COMMENT ON COLUMN project_phases.total_amount IS 'Total contracted amount for this phase';
COMMENT ON COLUMN project_phases.paid_amount IS 'Total amount paid so far (auto-calculated from phase_payments)';
COMMENT ON COLUMN project_phases.payment_status IS 'Current payment status: unpaid, partially_paid, or fully_paid';
COMMENT ON COLUMN project_phases.payment_deadline IS 'Expected date to receive payment';
COMMENT ON COLUMN project_phases.payment_request_date IS 'Date to send payment request to client';
COMMENT ON COLUMN phase_payments.payment_type IS 'Type of payment: upfront (before start), milestone (during), final (after completion), or partial';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON phase_payments TO postgres;
GRANT USAGE, SELECT ON SEQUENCE phase_payments_id_seq TO postgres;
