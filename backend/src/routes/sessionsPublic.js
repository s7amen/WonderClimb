import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAvailableSessions, getSessionById } from '../services/sessionService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/sessions
 * Get available sessions (filtered by booking horizon)
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      coachId: req.query.coachId,
    };

    const sessions = await getAvailableSessions(filters);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:sessionId
 * Get a specific session
 */
router.get('/:sessionId', async (req, res, next) => {
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

export default router;

