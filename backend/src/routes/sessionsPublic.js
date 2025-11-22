import express from 'express';
import { getAvailableSessions, getSessionById } from '../services/sessionService.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// Public routes - no authentication required

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

    logger.info({ filters, query: req.query }, 'Public sessions endpoint called');

    const sessions = await getAvailableSessions(filters);
    
    logger.info({ sessionCount: sessions.length }, 'Returning sessions from public endpoint');
    
    res.json({ sessions });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in public sessions endpoint');
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

