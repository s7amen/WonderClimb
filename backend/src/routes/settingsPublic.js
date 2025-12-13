import express from 'express';
import { getSettings } from '../services/settingsService.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// Public routes - no authentication required

/**
 * GET /api/v1/settings
 * Get training labels (public, no authentication required)
 * Returns only trainingLabels to avoid exposing sensitive settings
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    
    // Return only trainingLabels - safe to expose publicly
    const response = {
      trainingLabels: settings.trainingLabels || {
        targetGroups: [],
        ageGroups: [],
        visibility: {
          targetGroups: true,
          ageGroups: true,
          days: true,
          times: true,
          titles: true,
          reservations: true,
        }
      }
    };

    logger.info('Public settings endpoint called - returning training labels');
    res.json(response);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in public settings endpoint');
    next(error);
  }
});

export default router;


