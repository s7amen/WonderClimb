import * as pricingService from '../services/pricingService.js';
import logger from '../middleware/logging.js';

/**
 * Get all active pricings
 * GET /pricing/active
 * Query params: category (optional)
 */
export const getActivePricings = async (req, res) => {
    try {
        const { category } = req.query;
        const pricings = await pricingService.getActivePricings(category);

        res.json({
            success: true,
            data: pricings,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error in getActivePricings controller');
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get active pricing by pricingCode
 * GET /pricing/active/:pricingCode
 */
export const getActivePricing = async (req, res) => {
    try {
        const { pricingCode } = req.params;
        const pricing = await pricingService.getActivePricing(pricingCode);

        res.json({
            success: true,
            data: pricing,
        });
    } catch (error) {
        logger.error({ error: error.message, pricingCode: req.params.pricingCode }, 'Error in getActivePricing controller');
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get all pricings (active and inactive) with pagination
 * GET /pricing
 * Query params: category, isActive, page, limit
 */
export const getAllPricings = async (req, res) => {
    try {
        const { category, isActive, page, limit } = req.query;

        const filters = {};
        if (category) filters.category = category;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await pricingService.getAllPricings(filters, pagination);

        res.json({
            success: true,
            data: result.pricings,
            pagination: result.pagination,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error in getAllPricings controller');
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get pricing history by pricingCode
 * GET /pricing/history/:pricingCode
 */
export const getPricingHistory = async (req, res) => {
    try {
        const { pricingCode } = req.params;
        const history = await pricingService.getPricingHistory(pricingCode);

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        logger.error({ error: error.message, pricingCode: req.params.pricingCode }, 'Error in getPricingHistory controller');
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Create new pricing
 * POST /pricing
 * Body: { pricingCode, labelBg, category, amount, validityDays?, maxEntries?, notes? }
 */
export const createPricing = async (req, res) => {
    try {
        const pricingData = req.body;
        const createdById = req.user._id;

        const pricing = await pricingService.createPricing(pricingData, createdById);

        res.status(201).json({
            success: true,
            data: pricing,
        });
    } catch (error) {
        logger.error({ error: error.message, body: req.body }, 'Error in createPricing controller');
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update pricing (creates new version)
 * PUT /pricing/:pricingCode
 * Body: { labelBg?, category?, amount?, validityDays?, maxEntries?, notes? }
 */
export const updatePricing = async (req, res) => {
    try {
        const { pricingCode } = req.params;
        const updates = req.body;
        const updatedById = req.user._id;

        const pricing = await pricingService.updatePricing(pricingCode, updates, updatedById);

        res.json({
            success: true,
            data: pricing,
        });
    } catch (error) {
        logger.error({ error: error.message, pricingCode: req.params.pricingCode }, 'Error in updatePricing controller');
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Deactivate pricing
 * DELETE /pricing/:pricingCode
 */
export const deactivatePricing = async (req, res) => {
    try {
        const { pricingCode } = req.params;
        const pricing = await pricingService.deactivatePricing(pricingCode);

        res.json({
            success: true,
            data: pricing,
        });
    } catch (error) {
        logger.error({ error: error.message, pricingCode: req.params.pricingCode }, 'Error in deactivatePricing controller');
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
