import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getMonthlyCoachPayoutsSummary } from '../services/cashRecordService.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/v1/admin/finance/payouts/monthly
 * Get monthly coach payouts summary
 * Query params: year, month
 */
router.get('/finance/payouts/monthly', async (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        error: {
          message: 'year and month are required',
        },
      });
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        error: {
          message: 'year must be a number and month must be between 1 and 12',
        },
      });
    }

    const summary = await getMonthlyCoachPayoutsSummary(yearNum, monthNum);
    res.json({
      year: yearNum,
      month: monthNum,
      payouts: summary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

