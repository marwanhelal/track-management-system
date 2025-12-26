import { Request, Response } from 'express';
import { query, transaction } from '@/database/connection';
import { ApiResponse } from '@/types';

// Get all payments for a specific phase
export const getPhasePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phaseId } = req.params;

    // Get phase payment info and all payment transactions
    const phaseResult = await query(`
      SELECT
        pp.id,
        pp.phase_name,
        pp.total_amount,
        pp.paid_amount,
        pp.payment_status,
        pp.payment_deadline,
        pp.payment_request_date,
        pp.payment_notes,
        p.name as project_name,
        p.id as project_id
      FROM project_phases pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1
    `, [phaseId]);

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Get all payment transactions for this phase
    const paymentsResult = await query(`
      SELECT
        phpm.*,
        u.name as recorded_by_name,
        u.role as recorded_by_role
      FROM phase_payments phpm
      LEFT JOIN users u ON phpm.recorded_by = u.id
      WHERE phpm.phase_id = $1
      ORDER BY phpm.payment_date DESC, phpm.created_at DESC
    `, [phaseId]);

    // Calculate remaining amount
    const remainingAmount = phase.total_amount
      ? parseFloat(phase.total_amount) - parseFloat(phase.paid_amount || 0)
      : null;

    const response: ApiResponse<{
      phase: any;
      payments: any[];
      summary: {
        totalAmount: number | null;
        paidAmount: number;
        remainingAmount: number | null;
        paymentStatus: string;
        paymentCount: number;
      };
    }> = {
      success: true,
      data: {
        phase,
        payments: paymentsResult.rows,
        summary: {
          totalAmount: phase.total_amount ? parseFloat(phase.total_amount) : null,
          paidAmount: parseFloat(phase.paid_amount || 0),
          remainingAmount,
          paymentStatus: phase.payment_status,
          paymentCount: paymentsResult.rows.length
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get phase payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update phase payment information (total amount, deadline, request date)
export const updatePhasePaymentInfo = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const { total_amount, payment_deadline, payment_request_date, payment_notes } = req.body;

    // Check if phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    // Validate total_amount if provided
    if (total_amount !== undefined && total_amount !== null && total_amount < 0) {
      res.status(400).json({
        success: false,
        error: 'Total amount must be a positive number'
      });
      return;
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramIndex}`);
      updateValues.push(total_amount);
      paramIndex++;
    }

    if (payment_deadline !== undefined) {
      updateFields.push(`payment_deadline = $${paramIndex}`);
      updateValues.push(payment_deadline);
      paramIndex++;
    }

    if (payment_request_date !== undefined) {
      updateFields.push(`payment_request_date = $${paramIndex}`);
      updateValues.push(payment_request_date);
      paramIndex++;
    }

    if (payment_notes !== undefined) {
      updateFields.push(`payment_notes = $${paramIndex}`);
      updateValues.push(payment_notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(phaseId);

    const updateQuery = `
      UPDATE project_phases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    // Recalculate payment status
    await query(`
      UPDATE project_phases
      SET payment_status = CASE
        WHEN paid_amount = 0 THEN 'unpaid'
        WHEN total_amount IS NOT NULL AND paid_amount >= total_amount THEN 'fully_paid'
        WHEN paid_amount > 0 THEN 'partially_paid'
        ELSE 'unpaid'
      END
      WHERE id = $1
    `, [phaseId]);

    // Log audit event
    await query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, note) VALUES ($1, $2, $3, $4, $5)',
      ['project_phases', phaseId, 'UPDATE', authReq.user.id, 'Payment information updated']
    );

    const response: ApiResponse<{ phase: any }> = {
      success: true,
      message: 'Payment information updated successfully',
      data: { phase: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update phase payment info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Add a new payment transaction
export const addPhasePayment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { phaseId } = req.params;
    const {
      payment_amount,
      payment_date,
      payment_type,
      payment_method,
      notes
    } = req.body;

    // Validate required fields
    if (!payment_amount || !payment_date) {
      res.status(400).json({
        success: false,
        error: 'Payment amount and date are required'
      });
      return;
    }

    // Validate payment amount
    if (payment_amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0'
      });
      return;
    }

    // Check if phase exists
    const phaseResult = await query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    );

    if (phaseResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
      return;
    }

    const phase = phaseResult.rows[0];

    // Check if payment exceeds total amount (warning, not error)
    if (phase.total_amount) {
      const newPaidTotal = parseFloat(phase.paid_amount || 0) + parseFloat(payment_amount);
      if (newPaidTotal > parseFloat(phase.total_amount)) {
        console.warn(`Payment exceeds total amount for phase ${phaseId}: ${newPaidTotal} > ${phase.total_amount}`);
      }
    }

    // Insert payment transaction
    const result = await query(`
      INSERT INTO phase_payments (
        phase_id,
        project_id,
        payment_amount,
        payment_date,
        payment_type,
        payment_method,
        notes,
        recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      phaseId,
      phase.project_id,
      payment_amount,
      payment_date,
      payment_type || 'partial',
      payment_method,
      notes,
      authReq.user.id
    ]);

    // Triggers will automatically update paid_amount and payment_status

    const response: ApiResponse<{ payment: any }> = {
      success: true,
      message: 'Payment recorded successfully',
      data: { payment: result.rows[0] }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add phase payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update a payment transaction
export const updatePhasePayment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { paymentId } = req.params;
    const {
      payment_amount,
      payment_date,
      payment_type,
      payment_method,
      notes
    } = req.body;

    // Check if payment exists
    const existingResult = await query(
      'SELECT * FROM phase_payments WHERE id = $1',
      [paymentId]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
      return;
    }

    // Validate payment amount if provided
    if (payment_amount !== undefined && payment_amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0'
      });
      return;
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (payment_amount !== undefined) {
      updateFields.push(`payment_amount = $${paramIndex}`);
      updateValues.push(payment_amount);
      paramIndex++;
    }

    if (payment_date !== undefined) {
      updateFields.push(`payment_date = $${paramIndex}`);
      updateValues.push(payment_date);
      paramIndex++;
    }

    if (payment_type !== undefined) {
      updateFields.push(`payment_type = $${paramIndex}`);
      updateValues.push(payment_type);
      paramIndex++;
    }

    if (payment_method !== undefined) {
      updateFields.push(`payment_method = $${paramIndex}`);
      updateValues.push(payment_method);
      paramIndex++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }

    updateFields.push(`recorded_by = $${paramIndex}`);
    updateValues.push(authReq.user.id);
    paramIndex++;

    updateFields.push('updated_at = NOW()');
    updateValues.push(paymentId);

    const updateQuery = `
      UPDATE phase_payments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    // Trigger will automatically recalculate paid_amount and payment_status

    const response: ApiResponse<{ payment: any }> = {
      success: true,
      message: 'Payment updated successfully',
      data: { payment: result.rows[0] }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update phase payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete a payment transaction
export const deletePhasePayment = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  try {
    const { paymentId } = req.params;

    // Check if payment exists
    const existingResult = await query(
      'SELECT * FROM phase_payments WHERE id = $1',
      [paymentId]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
      return;
    }

    // Delete payment (trigger will handle audit logging)
    await query('DELETE FROM phase_payments WHERE id = $1', [paymentId]);

    // Trigger will automatically recalculate paid_amount and payment_status

    const response: ApiResponse = {
      success: true,
      message: 'Payment deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete phase payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
