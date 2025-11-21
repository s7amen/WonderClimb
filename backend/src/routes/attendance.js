import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  recordAttendance,
  getAttendanceForSession,
} from '../services/attendanceService.js';

const router = express.Router();

// All routes require authentication and coach role
router.use(authenticate);
router.use(requireRole('coach', 'admin'));

/**
 * POST /api/v1/attendance
 * Record attendance for a climber in a session
 */
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, climberId, status } = req.body;
    const markedById = req.user.id;

    if (!sessionId || !climberId || !status) {
      return res.status(400).json({
        error: {
          message: 'sessionId, climberId, and status are required',
        },
      });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({
        error: {
          message: 'status must be either "present" or "absent"',
        },
      });
    }

    const attendance = await recordAttendance(sessionId, climberId, status, markedById);
    res.status(201).json({ attendance });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/attendance/session/:sessionId
 * Get all attendance records for a session
 */
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const records = await getAttendanceForSession(sessionId);
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

export default router;

