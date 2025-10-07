import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// User validation rules
export const validateUserRegistration: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('role')
    .isIn(['supervisor', 'engineer'])
    .withMessage('Role must be either supervisor or engineer')
];

export const validateEngineerCreation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
];

export const validateUserLogin: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateUserUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

// Project validation rules
export const validateProjectCreation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Project name must be between 3 and 200 characters'),

  body('planned_total_weeks')
    .isInt({ min: 1, max: 520 }) // max 10 years
    .withMessage('Planned total weeks must be between 1 and 520'),

  body('predicted_hours')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Predicted hours must be between 1 and 100,000'),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('selectedPhases')
    .isArray({ min: 1 })
    .withMessage('At least one phase must be selected'),

  body('selectedPhases.*.phase_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Phase name is required and must be less than 100 characters'),

  body('selectedPhases.*.planned_weeks')
    .isInt({ min: 1, max: 52 })
    .withMessage('Phase planned weeks must be between 1 and 52'),

  body('selectedPhases.*.is_custom')
    .isBoolean()
    .withMessage('is_custom must be a boolean value'),

  body('selectedPhases.*.predicted_hours')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Phase predicted hours must be between 0 and 10,000')
];

export const validateProjectUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Project name must be between 3 and 200 characters'),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('planned_total_weeks')
    .optional()
    .isInt({ min: 1, max: 520 })
    .withMessage('Planned total weeks must be between 1 and 520'),

  body('predicted_hours')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Predicted hours must be between 1 and 100,000'),

  body('status')
    .optional()
    .isIn(['active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, on_hold, completed, cancelled')
];

// Phase validation rules
export const validatePhaseUpdate: ValidationChain[] = [
  body('status')
    .optional()
    .isIn(['not_started', 'ready', 'in_progress', 'submitted', 'approved', 'completed'])
    .withMessage('Status must be one of: not_started, ready, in_progress, submitted, approved, completed'),

  body('delay_reason')
    .optional()
    .isIn(['none', 'client', 'company'])
    .withMessage('Delay reason must be one of: none, client, company'),

  body('warning_flag')
    .optional()
    .isBoolean()
    .withMessage('Warning flag must be a boolean value'),

  body('actual_start_date')
    .optional()
    .isISO8601()
    .withMessage('Actual start date must be a valid date'),

  body('actual_end_date')
    .optional()
    .isISO8601()
    .withMessage('Actual end date must be a valid date'),

  body('predicted_hours')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Predicted hours must be between 0 and 10,000')
];

export const validatePhaseDelay: ValidationChain[] = [
  body('delay_reason')
    .isIn(['client', 'company'])
    .withMessage('Delay reason must be either client or company'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Note must be less than 1000 characters'),

  body('new_end_date')
    .optional()
    .isISO8601()
    .withMessage('New end date must be a valid date'),

  body('additional_weeks')
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage('Additional weeks must be between 1 and 52')
];

// Work log validation rules
export const validateWorkLogCreation: ValidationChain[] = [
  body('phase_id')
    .isInt({ min: 1 })
    .withMessage('Valid phase ID is required'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date')
    .custom((value) => {
      if (!value) return true; // Optional field

      const date = new Date(value);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

      if (date > today) {
        throw new Error('Date cannot be in the future');
      }

      if (date < thirtyDaysAgo) {
        throw new Error('Date cannot be more than 30 days in the past');
      }

      return true;
    }),

  body('hours')
    .isFloat({ min: 0.25, max: 24 })
    .withMessage('Hours must be between 0.25 and 24'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
];

export const validateWorkLogUpdate: ValidationChain[] = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date')
    .custom((value) => {
      if (!value) return true;

      const date = new Date(value);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

      if (date > today) {
        throw new Error('Date cannot be in the future');
      }

      if (date < thirtyDaysAgo) {
        throw new Error('Date cannot be more than 30 days in the past');
      }

      return true;
    }),

  body('hours')
    .optional()
    .isFloat({ min: 0.25, max: 24 })
    .withMessage('Hours must be between 0.25 and 24'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('supervisor_approved')
    .optional()
    .isBoolean()
    .withMessage('Supervisor approved must be a boolean value')
];

// Parameter validation rules
export const validateIdParam: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

export const validateProjectIdParam: ValidationChain[] = [
  param('projectId')
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer')
];

export const validatePhaseIdParam: ValidationChain[] = [
  param('phaseId')
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer')
];

export const validateUserIdParam: ValidationChain[] = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

// Query parameter validation rules
export const validatePaginationQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isAlpha()
    .withMessage('Sort by must contain only letters'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc')
];

export const validateProjectFilters: ValidationChain[] = [
  ...validatePaginationQuery,

  query('status')
    .optional()
    .isIn(['active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, on_hold, completed, cancelled'),

  query('created_by')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Created by must be a positive integer'),

  query('delay_status')
    .optional()
    .isIn(['on_schedule', 'warning', 'client_delayed', 'company_delayed'])
    .withMessage('Delay status must be one of: on_schedule, warning, client_delayed, company_delayed'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

export const validateWorkLogFilters: ValidationChain[] = [
  ...validatePaginationQuery,

  query('project_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),

  query('phase_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer'),

  query('engineer_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Engineer ID must be a positive integer'),

  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),

  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date'),

  query('supervisor_approved')
    .optional()
    .isBoolean()
    .withMessage('Supervisor approved must be a boolean value')
];

// Custom validation for business rules
export const validatePhaseOrder = body('selectedPhases').custom((phases) => {
  const orders = phases.map((phase: any) => phase.order || 0);
  const uniqueOrders = new Set(orders);

  if (orders.length !== uniqueOrders.size) {
    throw new Error('Phase orders must be unique');
  }

  return true;
});

export const validateTimelineConsistency = body().custom((body) => {
  if (!body.selectedPhases || !body.planned_total_weeks) {
    return true; // Let other validators handle required fields
  }

  const totalPhaseWeeks = body.selectedPhases.reduce((sum: number, phase: any) => {
    return sum + (phase.planned_weeks || 0);
  }, 0);

  // Allow some flexibility (±1 week) for timeline consistency
  const difference = Math.abs(totalPhaseWeeks - body.planned_total_weeks);

  if (difference > 1) {
    throw new Error(`Timeline mismatch: Total phase weeks (${totalPhaseWeeks}) does not match planned total weeks (${body.planned_total_weeks})`);
  }

  return true;
});

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};