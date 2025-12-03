import * as financeService from '../services/financeService.js';
import logger from '../middleware/logging.js';

/**
 * POST /api/v1/finance/entries
 * Create a finance entry
 */
export const createEntry = async (req, res) => {
    try {
        const entryData = req.body;
        const createdById = req.user.id;

        const entry = await financeService.createFinanceEntry(entryData, createdById);

        res.status(201).json({
            message: 'Finance entry created successfully',
            entry,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating finance entry');
        res.status(400).json({
            error: { message: error.message || 'Failed to create finance entry' },
        });
    }
};

/**
 * GET /api/v1/finance/entries
 * List finance entries
 */
export const getEntries = async (req, res) => {
    try {
        const { type, area, startDate, endDate, personId, page, limit } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (area) filters.area = area;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (personId) filters.personId = personId;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await financeService.getFinanceEntries(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching finance entries');
        res.status(500).json({
            error: { message: 'Failed to fetch finance entries' },
        });
    }
};

/**
 * GET /api/v1/finance/entries/:id
 * Get entry details
 */
export const getEntryById = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await financeService.getEntryById(id);

        res.json({ entry });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching entry');
        res.status(404).json({
            error: { message: error.message || 'Entry not found' },
        });
    }
};

/**
 * PATCH /api/v1/finance/entries/:id
 * Update finance entry
 */
export const updateEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const entry = await financeService.updateFinanceEntry(id, updates);

        res.json({
            message: 'Finance entry updated successfully',
            entry,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating entry');
        res.status(400).json({
            error: { message: error.message || 'Failed to update entry' },
        });
    }
};

/**
 * DELETE /api/v1/finance/entries/:id
 * Delete finance entry
 */
export const deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await financeService.deleteFinanceEntry(id);

        res.json({
            message: 'Finance entry deleted successfully',
            entry,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting entry');
        res.status(400).json({
            error: { message: error.message || 'Failed to delete entry' },
        });
    }
};

/**
 * GET /api/v1/finance/reports/summary
 * Generate summary report
 */
export const getSummaryReport = async (req, res) => {
    try {
        const { startDate, endDate, area } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: { message: 'startDate and endDate are required' },
            });
        }

        const summary = await financeService.generateSummaryReport(startDate, endDate, area);

        res.json({ summary });
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating summary report');
        res.status(500).json({
            error: { message: 'Failed to generate summary report' },
        });
    }
};

/**
 * GET /api/v1/finance/reports/gym
 * Generate gym revenue report
 */
export const getGymReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: { message: 'startDate and endDate are required' },
            });
        }

        const report = await financeService.generateGymReport(startDate, endDate);

        res.json({ report });
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating gym report');
        res.status(500).json({
            error: { message: 'Failed to generate gym report' },
        });
    }
};

/**
 * GET /api/v1/finance/reports/training
 * Generate training revenue report
 */
export const getTrainingReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: { message: 'startDate and endDate are required' },
            });
        }

        const report = await financeService.generateTrainingReport(startDate, endDate);

        res.json({ report });
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating training report');
        res.status(500).json({
            error: { message: 'Failed to generate training report' },
        });
    }
};

/**
 * GET /api/v1/finance/reports/coach-fees
 * Calculate coach fees
 */
export const getCoachFeesReport = async (req, res) => {
    try {
        const { coachId, startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: { message: 'startDate and endDate are required' },
            });
        }

        const report = await financeService.calculateCoachFees(coachId, startDate, endDate);

        res.json({ report });
    } catch (error) {
        logger.error({ error: error.message }, 'Error calculating coach fees');
        res.status(500).json({
            error: { message: 'Failed to calculate coach fees' },
        });
    }
};
