import express from 'express';
import { getCompetitions, getCompetitionById } from '../services/competitionService.js';

const router = express.Router();

/**
 * GET /api/v1/competitions
 * Get available competitions (public, no authentication required)
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      location: req.query.location,
      sport: req.query.sport,
      rank: req.query.rank,
    };

    const competitions = await getCompetitions(filters);
    res.json({ competitions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/competitions/:id
 * Get a specific competition (public, no authentication required)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const competition = await getCompetitionById(req.params.id);
    if (!competition) {
      return res.status(404).json({
        error: {
          message: 'Competition not found',
        },
      });
    }
    res.json({ competition });
  } catch (error) {
    if (error.message === 'Competition not found') {
      return res.status(404).json({
        error: {
          message: 'Competition not found',
        },
      });
    }
    next(error);
  }
});

export default router;

