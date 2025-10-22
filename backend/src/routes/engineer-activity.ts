import { Router } from 'express';
import {
  getDailyActivity,
  getActivitySummary
} from '@/controllers/engineer-activity';
import {
  exportToPDF,
  exportToExcel
} from '@/controllers/engineer-activity-export';
import { authenticate, supervisorOnly } from '@/middleware/auth';

const router = Router();

// All routes require authentication and supervisor/administrator role
router.use(authenticate);
router.use(supervisorOnly);

// Get daily activity report (active and inactive engineers)
// Query params: ?date=2025-01-22 (defaults to today)
router.get('/daily', getDailyActivity);

// Get activity summary for date range (for charts/trends)
// Query params: ?startDate=2025-01-15&endDate=2025-01-22
router.get('/summary', getActivitySummary);

// Export daily activity to PDF
// Query params: ?date=2025-01-22
router.get('/export/pdf', exportToPDF);

// Export daily activity to Excel (CSV)
// Query params: ?date=2025-01-22
router.get('/export/excel', exportToExcel);

export default router;
