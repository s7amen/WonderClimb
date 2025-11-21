import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createSession,
  updateSession,
  getSessionById,
  updateCoachPayoutStatus,
  createBulkSessions,
} from '../services/sessionService.js';
import { getSessionRoster } from '../services/coachScheduleService.js';
import { createBooking } from '../services/bookingService.js';
import { User } from '../models/user.js';

const router = express.Router();

// All routes require authentication and admin or coach role
router.use(authenticate);
router.use(requireRole('admin', 'coach'));

/**
 * POST /api/v1/admin/sessions
 * Create a new session (single)
 */
router.post('/sessions', async (req, res, next) => {
  try {
    const session = await createSession(req.body);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/sessions/bulk
 * Create multiple sessions based on days of week and date range
 */
router.post('/sessions/bulk', async (req, res, next) => {
  try {
    const result = await createBulkSessions(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/admin/sessions/:sessionId
 * Update a session
 */
router.put('/sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await updateSession(req.params.sessionId, req.body);
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/sessions/:sessionId
 * Get a specific session
 */
router.get('/sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
        },
      });
    }
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/admin/sessions/:sessionId/payout-status
 * Update coach payout status
 */
router.patch('/sessions/:sessionId/payout-status', async (req, res, next) => {
  try {
    const { payoutStatus } = req.body;
    const session = await updateCoachPayoutStatus(req.params.sessionId, payoutStatus);
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/sessions/:sessionId/roster
 * Get roster (booked climbers) for any session (admin only)
 */
router.get('/sessions/:sessionId/roster', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const roster = await getSessionRoster(sessionId);
    res.json({ roster });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/sessions/:sessionId/bookings
 * Manually create a booking for a climber (admin/coach only)
 */
router.post('/sessions/:sessionId/bookings', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { climberId } = req.body;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    if (!climberId) {
      return res.status(400).json({
        error: {
          message: 'climberId is required',
        },
      });
    }

    // Admin and coach can book any climber
    const booking = await createBooking(sessionId, climberId, userId, userRoles);
    res.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/climbers
 * Get all climbers (for admin/coach to select when manually booking)
 */
router.get('/climbers', async (req, res, next) => {
  try {
    const climbers = await User.find({ roles: { $in: ['climber'] } })
      .select('_id firstName middleName lastName dateOfBirth accountStatus isTrainee')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.json({ 
      climbers: climbers.map(climber => ({
        _id: climber._id,
        id: climber._id.toString(),
        firstName: climber.firstName,
        middleName: climber.middleName,
        lastName: climber.lastName,
        name: `${climber.firstName} ${climber.middleName || ''} ${climber.lastName}`.trim(),
        dateOfBirth: climber.dateOfBirth,
        accountStatus: climber.accountStatus,
        isTrainee: climber.isTrainee !== undefined ? climber.isTrainee : false,
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

