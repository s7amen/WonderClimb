import * as gymService from '../services/gymService.js';
import logger from '../middleware/logging.js';

/**
 * POST /api/v1/gym/check-in
 * Record a gym check-in
 */
export const checkIn = async (req, res) => {
    try {
        const { userId, type, gymPassId, pricingId, amount } = req.body;
        const checkedInById = req.user.id;

        if (!userId || !type) {
            return res.status(400).json({
                error: { message: 'userId and type are required' },
            });
        }

        const visit = await gymService.recordCheckIn(
            userId,
            type,
            { gymPassId, pricingId, amount },
            checkedInById
        );

        res.status(201).json({
            message: 'Check-in recorded successfully',
            visit,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Check-in error');
        res.status(400).json({
            error: { message: error.message || 'Check-in failed' },
        });
    }
};

/**
 * GET /api/v1/gym/visits/today
 * Get today's check-ins
 */
export const getTodaysVisits = async (req, res) => {
    try {
        const visits = await gymService.getTodaysVisits();

        res.json({
            visits,
            count: visits.length,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching today\'s visits');
        res.status(500).json({
            error: { message: 'Failed to fetch visits' },
        });
    }
};

/**
 * GET /api/v1/gym/visits
 * Get gym visits with filters
 */
export const getVisits = async (req, res) => {
    try {
        const { userId, startDate, endDate, page, limit } = req.query;

        const filters = {};
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await gymService.getVisits(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching visits');
        res.status(500).json({
            error: { message: 'Failed to fetch visits' },
        });
    }
};

/**
 * POST /api/v1/gym/passes
 * Create/sell a gym pass
 */
export const createGymPass = async (req, res) => {
    try {
        const passData = req.body;
        const createdById = req.user.id;

        const gymPass = await gymService.createGymPass(passData, createdById);

        res.status(201).json({
            message: 'Gym pass created successfully',
            gymPass,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating gym pass');
        res.status(400).json({
            error: { message: error.message || 'Failed to create gym pass' },
        });
    }
};

/**
 * GET /api/v1/gym/passes
 * List gym passes
 */
export const getAllPasses = async (req, res) => {
    try {
        const { userId, isActive, paymentStatus, page, limit } = req.query;

        const filters = {};
        if (userId) filters.userId = userId;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (paymentStatus) filters.paymentStatus = paymentStatus;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await gymService.getAllPasses(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching passes');
        res.status(500).json({
            error: { message: 'Failed to fetch passes' },
        });
    }
};

/**
 * GET /api/v1/gym/passes/:id
 * Get pass details with usage history
 */
export const getPassById = async (req, res) => {
    try {
        const { id } = req.params;
        const pass = await gymService.getPassById(id);

        // Check if user has permission to view this pass
        const userRoles = req.user.roles || [];
        const isOwner = pass.userId._id.toString() === req.user.id;
        const isStaff = userRoles.includes('admin') || userRoles.includes('coach');

        if (!isOwner && !isStaff) {
            return res.status(403).json({
                error: { message: 'Not authorized to view this pass' },
            });
        }

        res.json({ gymPass: pass });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching pass');
        res.status(404).json({
            error: { message: error.message || 'Pass not found' },
        });
    }
};

/**
 * PATCH /api/v1/gym/passes/:id
 * Update gym pass
 */
export const updatePass = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedById = req.user.id;

        const pass = await gymService.updatePass(id, updates, updatedById);

        res.json({
            message: 'Gym pass updated successfully',
            gymPass: pass,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating pass');
        res.status(400).json({
            error: { message: error.message || 'Failed to update pass' },
        });
    }
};

/**
 * GET /api/v1/gym/my-passes
 * Get current user's gym passes
 */
export const getMyPasses = async (req, res) => {
    try {
        const userId = req.user.id;
        const activeOnly = req.query.activeOnly === 'true';

        const passes = await gymService.getUserPasses(userId, activeOnly);

        res.json({
            passes,
            count: passes.length,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching user passes');
        res.status(500).json({
            error: { message: 'Failed to fetch passes' },
        });
    }
};
