import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { scrapeBFKACalendar } from '../services/bfkaScraperService.js';
import {
  getCompetitions,
  getCompetitionById,
  importCompetitions,
  updateCompetition,
  deleteCompetition,
} from '../services/competitionService.js';
// Import model to ensure it's registered
import { Competition } from '../models/competition.js';
import { config } from '../config/env.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Log model registration
logger.info('Competitions routes loaded, Competition model:', Competition ? 'registered' : 'NOT registered');

const router = express.Router();

// All routes require authentication and admin/coach role
router.use(authenticate);
router.use(requireRole('admin', 'coach'));

/**
 * POST /api/v1/admin/competitions/import/preview
 * Scrape BFKA calendar and return all found competitions for preview
 * CRITICAL: Must be defined BEFORE /:id route to avoid route conflicts
 */
router.post('/import/preview', async (req, res, next) => {
  try {
    logger.info('Starting BFKA calendar scraping from API endpoint...');
    const scrapedCompetitions = await scrapeBFKACalendar();
    logger.info(`Scraped ${scrapedCompetitions.length} competitions`);
    
    if (!Array.isArray(scrapedCompetitions)) {
      logger.error('Scraped competitions is not an array:', typeof scrapedCompetitions);
      return res.status(500).json({
        error: {
          message: 'Грешка при обработка на данните от БФКА',
        },
      });
    }
    
    res.json({
      competitions: scrapedCompetitions,
      count: scrapedCompetitions.length,
    });
  } catch (error) {
    logger.error('Error in import/preview endpoint:', error);
    logger.error('Error stack:', error.stack);
    
    // Return user-friendly error message
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Грешка при импортиране от БФКА';
    
    res.status(statusCode).json({
      error: {
        message,
        ...(config.nodeEnv === 'development' && { details: error.stack }),
      },
    });
  }
});

/**
 * POST /api/v1/admin/competitions/import
 * Import selected competitions
 * Body: { competitions: Array of competition objects with tempId }
 * CRITICAL: Must be defined BEFORE /:id route to avoid route conflicts
 */
router.post('/import', async (req, res, next) => {
  try {
    const { competitions } = req.body;

    if (!Array.isArray(competitions) || competitions.length === 0) {
      return res.status(400).json({
        error: {
          message: 'competitions array is required and must not be empty',
        },
      });
    }

    const result = await importCompetitions(competitions);
    res.json({
      message: 'Competitions imported successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/competitions
 * Get list of competitions with optional filters
 * Query params: startDate, endDate, location, sport, rank
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

    logger.info('Fetching competitions with filters:', filters);
    const competitions = await getCompetitions(filters);
    logger.info(`Found ${competitions.length} competitions`);
    res.json({ competitions });
  } catch (error) {
    logger.error('Error in GET /admin/competitions:', error);
    next(error);
  }
});

/**
 * GET /api/v1/admin/competitions/:id
 * Get a single competition by ID
 * CRITICAL: Must be defined AFTER all specific routes (/import/preview, /import)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent matching "import" as an ID
    if (id === 'import') {
      return res.status(404).json({
        error: {
          message: 'Not found',
        },
      });
    }
    
    const competition = await getCompetitionById(id);
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

/**
 * PUT /api/v1/admin/competitions/:id
 * Update a competition
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const competition = await updateCompetition(id, updateData);
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

/**
 * DELETE /api/v1/admin/competitions/:id
 * Delete a competition
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteCompetition(id);
    res.json({
      message: 'Competition deleted successfully',
    });
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

