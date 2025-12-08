import { Pricing } from '../models/pricing.js';
import logger from '../middleware/logging.js';

/**
 * Get active pricing by pricingCode
 */
export const getActivePricing = async (pricingCode) => {
    try {
        const pricing = await Pricing.findOne({
            pricingCode,
            isActive: true,
        }).lean();

        if (!pricing) {
            throw new Error(`No active pricing found for code: ${pricingCode}`);
        }

        return pricing;
    } catch (error) {
        logger.error({ error: error.message, pricingCode }, 'Error fetching active pricing');
        throw error;
    }
};

/**
 * Get all active pricings, optionally filtered by category
 */
export const getActivePricings = async (category = null) => {
    try {
        const query = { isActive: true };

        if (category) {
            query.category = category;
        }

        const pricings = await Pricing.find(query)
            .sort({ category: 1, labelBg: 1 })
            .lean();

        return pricings;
    } catch (error) {
        logger.error({ error: error.message, category }, 'Error fetching active pricings');
        throw error;
    }
};

/**
 * Create a new pricing (with versioning logic)
 * If a pricing with the same pricingCode exists and is active, it will be deprecated
 */
export const createPricing = async (pricingData, createdById) => {
    try {
        const { pricingCode, labelBg, category, amount, validityDays, maxEntries, notes } = pricingData;

        // Check if there's an active pricing with the same code
        const existingPricing = await Pricing.findOne({
            pricingCode,
            isActive: true,
        });

        // If exists, deprecate it
        if (existingPricing) {
            existingPricing.validUntil = new Date();
            existingPricing.isActive = false;
            await existingPricing.save();

            logger.info({
                pricingId: existingPricing._id,
                pricingCode,
            }, 'Previous pricing version deprecated');
        }

        // Create new pricing
        const newPricing = await Pricing.create({
            pricingCode,
            labelBg,
            category,
            amount,
            validityDays: validityDays || null,
            validityType: pricingData.validityType || 'days',
            maxEntries: maxEntries || null,
            notes: notes || '',
            validFrom: new Date(),
            isActive: true,
        });

        logger.info({
            pricingId: newPricing._id,
            pricingCode,
            amount,
        }, 'New pricing created');

        return newPricing;
    } catch (error) {
        logger.error({ error: error.message, pricingData }, 'Error creating pricing');
        throw error;
    }
};

/**
 * Update pricing (creates a new version)
 */
export const updatePricing = async (pricingCode, updates, updatedById) => {
    try {
        // Get current active pricing
        const currentPricing = await getActivePricing(pricingCode);

        // Create new version with updates
        const newPricingData = {
            pricingCode,
            labelBg: updates.labelBg || currentPricing.labelBg,
            category: updates.category || currentPricing.category,
            amount: updates.amount !== undefined ? updates.amount : currentPricing.amount,
            validityDays: updates.validityDays !== undefined ? updates.validityDays : currentPricing.validityDays,
            validityType: updates.validityType || currentPricing.validityType || 'days',
            maxEntries: updates.maxEntries !== undefined ? updates.maxEntries : currentPricing.maxEntries,
            notes: updates.notes !== undefined ? updates.notes : currentPricing.notes,
        };

        return await createPricing(newPricingData, updatedById);
    } catch (error) {
        logger.error({ error: error.message, pricingCode, updates }, 'Error updating pricing');
        throw error;
    }
};

/**
 * Deactivate pricing (without creating a new version)
 */
export const deactivatePricing = async (pricingCode) => {
    try {
        const pricing = await Pricing.findOneAndUpdate(
            { pricingCode, isActive: true },
            {
                isActive: false,
                validUntil: new Date(),
            },
            { new: true }
        );

        if (!pricing) {
            throw new Error(`No active pricing found for code: ${pricingCode}`);
        }

        logger.info({ pricingId: pricing._id, pricingCode }, 'Pricing deactivated');

        return pricing;
    } catch (error) {
        logger.error({ error: error.message, pricingCode }, 'Error deactivating pricing');
        throw error;
    }
};

/**
 * Get pricing history by pricingCode
 */
export const getPricingHistory = async (pricingCode) => {
    try {
        const history = await Pricing.find({ pricingCode })
            .sort({ validFrom: -1 })
            .lean();

        return history;
    } catch (error) {
        logger.error({ error: error.message, pricingCode }, 'Error fetching pricing history');
        throw error;
    }
};

/**
 * Get all pricings (active and inactive) with pagination
 */
export const getAllPricings = async (filters = {}, pagination = {}) => {
    try {
        const { category, isActive } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (category) {
            query.category = category;
        }

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        const skip = (page - 1) * limit;

        const [pricings, total] = await Promise.all([
            Pricing.find(query)
                .sort({ isActive: -1, validFrom: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Pricing.countDocuments(query),
        ]);

        return {
            pricings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching all pricings');
        throw error;
    }
};
