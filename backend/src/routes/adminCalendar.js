import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getCalendarSessions } from '../services/sessionService.js';
import { getCompetitionsForCalendar } from '../services/competitionService.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/v1/admin/calendar
 * Get calendar view (month/week/day) for admin
 * Query params: view (month/week/day), startDate, endDate, status, coachId
 * Returns both sessions and competitions merged together
 */
router.get('/calendar', async (req, res, next) => {
  try {
    const { view, startDate, endDate, status, coachId } = req.query;

    if (!view || !startDate || !endDate) {
      return res.status(400).json({
        error: {
          message: 'view, startDate, and endDate are required',
        },
      });
    }

    if (!['month', 'week', 'day'].includes(view)) {
      return res.status(400).json({
        error: {
          message: 'view must be one of: month, week, day',
        },
      });
    }

    const filters = {};
    if (status) filters.status = status;
    if (coachId) filters.coachId = coachId;

    // Get sessions and competitions in parallel
    const [sessions, competitions] = await Promise.all([
      getCalendarSessions(view, startDate, endDate, filters),
      getCompetitionsForCalendar(new Date(startDate), new Date(endDate)),
    ]);

    // Format sessions with type field
    const formattedSessions = sessions.map(session => ({
      ...session,
      type: 'session',
    }));

    // Merge and sort by date
    const allEvents = [...formattedSessions, ...competitions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json({
      sessions: allEvents,
      view,
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

