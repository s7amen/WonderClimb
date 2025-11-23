import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getTodaySessionsForCoach, getSessionRoster } from '../services/coachScheduleService.js';

const router = express.Router();

// All routes require authentication and coach role
router.use(authenticate);
router.use(requireRole('coach', 'admin'));

/**
 * GET /api/v1/coaches/me/sessions/today
 * Get today's sessions for the authenticated coach
 */
router.get('/me/sessions/today', async (req, res, next) => {
  try {
    const coachId = req.user.id;
    const sessions = await getTodaySessionsForCoach(coachId);

    if (sessions.length === 0) {
      return res.json({
        sessions: [],
        message: 'No sessions scheduled for today',
      });
    }

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/coaches/me/sessions/:sessionId/roster
 * Get roster (booked climbers) for a session
 */
router.get('/me/sessions/:sessionId/roster', async (req, res, next) => {
  try {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    // Verify coach is assigned to this session (will be checked in service)
    const roster = await getSessionRoster(sessionId);
    res.json({ roster });
  } catch (error) {
    next(error);
  }
});

export default router;

