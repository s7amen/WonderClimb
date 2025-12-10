import * as gymService from '../services/gymService.js';
import * as trainingService from '../services/trainingService.js';
import * as parentClimberService from '../services/parentClimberService.js';
import * as physicalCardService from '../services/physicalCardService.js';
import { Pricing } from '../models/pricing.js';
import logger from '../middleware/logging.js';

/**
 * POST /api/v1/gym/check-in
 * Record a gym check-in
 */
export const checkIn = async (req, res) => {
    try {
        const { userId, familyId, type, gymPassId, pricingId, amount } = req.body;
        const checkedInById = req.user.id;

        if ((!userId && !familyId) || !type) {
            return res.status(400).json({
                error: { message: 'userId or familyId, and type are required' },
            });
        }

        const visit = await gymService.recordCheckIn(
            userId,
            type,
            { gymPassId, pricingId, amount, familyId },
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
        const { userId, familyId, isActive, paymentStatus, page, limit } = req.query;

        // Security check for non-staff users (climbers)
        const userRoles = req.user.roles || [];
        const isStaff = userRoles.some(r => ['admin', 'coach', 'instructor'].includes(r));

        if (!isStaff) {
            const requestingUserId = req.user.id;

            // If specific user requested
            if (userId) {
                // If requesting for someone else
                if (userId !== requestingUserId) {
                    // Check if it's a linked child
                    const children = await parentClimberService.getClimbersForParent(requestingUserId);
                    const isChild = children.some(c => c._id.toString() === userId);

                    if (!isChild) {
                        return res.status(403).json({
                            error: { message: 'Access denied. You can only view passes for yourself or your linked profiles.' }
                        });
                    }
                }
            } else {
                // If no user specified, default to self to prevent seeing everyone's passes
                // Note: If we want to allow seeing all family passes at once, we'd need to update this
                // but for now, safe default is strictly self
                req.query.userId = requestingUserId;
            }
        }

        const filters = {};
        if (userId) filters.userId = userId;
        if (familyId) filters.familyId = familyId;
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

/**
 * DELETE /api/v1/gym/passes/:id
 * Delete gym pass (soft delete by setting isActive to false)
 */
export const deletePass = async (req, res) => {
    try {
        const { id } = req.params;

        const pass = await gymService.deletePass(id);

        logger.info({ passId: pass._id }, 'Gym pass deleted (soft)');

        res.json({
            message: 'Gym pass deleted successfully',
            gymPass: pass,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting gym pass');
        res.status(400).json({
            error: { message: error.message || 'Failed to delete gym pass' },
        });
    }
};

/**
 * DELETE /api/v1/gym/passes/:id/cascade
 * Delete gym pass and all related visits (hard delete)
 */
export const deletePassCascade = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await gymService.deletePassCascade(id);

        logger.info({
            passId: id,
            deletedVisits: result.deletedVisits
        }, 'Gym pass deleted with cascade');

        res.json({
            message: 'Gym pass and all related visits deleted successfully',
            gymPass: result.pass,
            deletedVisits: result.deletedVisits,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting gym pass with cascade');
        res.status(400).json({
            error: { message: error.message || 'Failed to delete gym pass with cascade' },
        });
    }
};

/**
 * GET /api/v1/gym/pricing
 * Get all pricing
 */
export const getAllPricing = async (req, res) => {
    try {
        const { isActive, category } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        if (category) {
            // Support comma-separated categories
            const categories = category.split(',');
            if (categories.length > 1) {
                query.category = { $in: categories };
            } else {
                query.category = category;
            }
        }

        const pricing = await Pricing.find(query)
            .sort({ category: 1, validFrom: -1 })
            .lean();

        res.json({
            pricing,
            count: pricing.length,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching pricing');
        res.status(500).json({
            error: { message: 'Failed to fetch pricing' },
        });
    }
};

/**
 * POST /api/v1/gym/pricing
 * Create new pricing
 */
export const createPricing = async (req, res) => {
    try {
        const pricingData = req.body;

        // Validate required fields
        if (!pricingData.pricingCode || !pricingData.labelBg || !pricingData.category || pricingData.amount === undefined) {
            return res.status(400).json({
                error: { message: 'pricingCode, labelBg, category, and amount are required' },
            });
        }

        // Check if pricingCode already exists
        const existing = await Pricing.findOne({ pricingCode: pricingData.pricingCode });
        if (existing) {
            return res.status(400).json({
                error: { message: 'Pricing code already exists' },
            });
        }

        // Set defaults
        if (pricingData.validFrom) {
            pricingData.validFrom = new Date(pricingData.validFrom);
        } else {
            pricingData.validFrom = new Date();
        }

        if (pricingData.validUntil) {
            pricingData.validUntil = new Date(pricingData.validUntil);
        }

        if (pricingData.isActive === undefined) {
            pricingData.isActive = true;
        }

        const pricing = await Pricing.create(pricingData);

        logger.info({ pricingId: pricing._id, pricingCode: pricing.pricingCode }, 'Pricing created');

        res.status(201).json({
            message: 'Pricing created successfully',
            pricing,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating pricing');
        res.status(400).json({
            error: { message: error.message || 'Failed to create pricing' },
        });
    }
};

/**
 * PUT /api/v1/gym/pricing/:id
 * Update pricing
 */
export const updatePricing = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const pricing = await Pricing.findById(id);
        if (!pricing) {
            return res.status(404).json({
                error: { message: 'Pricing not found' },
            });
        }

        // Check if pricingCode is being changed and if new code exists
        if (updates.pricingCode && updates.pricingCode !== pricing.pricingCode) {
            const existing = await Pricing.findOne({ pricingCode: updates.pricingCode });
            if (existing) {
                return res.status(400).json({
                    error: { message: 'Pricing code already exists' },
                });
            }
        }

        // Convert date strings to Date objects
        if (updates.validFrom) {
            updates.validFrom = new Date(updates.validFrom);
        }
        if (updates.validUntil) {
            updates.validUntil = new Date(updates.validUntil);
        }

        // Update pricing
        Object.assign(pricing, updates);
        await pricing.save();

        logger.info({ pricingId: pricing._id }, 'Pricing updated');

        res.json({
            message: 'Pricing updated successfully',
            pricing,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating pricing');
        res.status(400).json({
            error: { message: error.message || 'Failed to update pricing' },
        });
    }
};

/**
 * DELETE /api/v1/gym/pricing/:id
 * Delete pricing (soft delete by setting isActive to false)
 */
export const deletePricing = async (req, res) => {
    try {
        const { id } = req.params;

        const pricing = await Pricing.findById(id);
        if (!pricing) {
            return res.status(404).json({
                error: { message: 'Pricing not found' },
            });
        }

        // Soft delete - set isActive to false
        pricing.isActive = false;
        await pricing.save();

        logger.info({ pricingId: pricing._id }, 'Pricing deleted (soft)');

        res.json({
            message: 'Pricing deleted successfully',
            pricing,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deleting pricing');
        res.status(400).json({
            error: { message: error.message || 'Failed to delete pricing' },
        });
    }
};

/**
 * POST /api/v1/gym/passes/extend-all
 * Extend validity of all active passes
 */
export const extendAllPasses = async (req, res) => {
    try {
        const { days, types } = req.body;
        const adminId = req.user.id;

        if (!days || isNaN(days) || days <= 0) {
            return res.status(400).json({
                error: { message: 'Valid number of days is required' },
            });
        }

        if (!types || !Array.isArray(types) || types.length === 0) {
            return res.status(400).json({
                error: { message: 'At least one pass type is required' },
            });
        }

        const results = {};

        if (types.includes('gym')) {
            results.gymPasses = await gymService.extendAllActivePasses(parseInt(days), adminId);
        }

        if (types.includes('training')) {
            results.trainingPasses = await trainingService.extendAllActivePasses(parseInt(days), adminId);
        }

        res.json({
            message: 'Passes extended successfully',
            results,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error extending passes');
        res.status(500).json({
            error: { message: error.message || 'Failed to extend passes' },
        });
    }
};

/**
 * GET /api/v1/gym/cards/find-by-card-code
 * Find climber by physical card code
 */
export const findClimberByCardCode = async (req, res) => {
    try {
        const { cardCode } = req.query;

        if (!cardCode) {
            return res.status(400).json({
                error: { message: 'cardCode is required' },
            });
        }

        // Validate format: exactly 6 digits
        const trimmedCode = cardCode.trim();
        if (!/^\d{6}$/.test(trimmedCode)) {
            return res.status(400).json({
                error: { message: 'Card code must be exactly 6 digits' },
            });
        }

        // Get active pass by card code
        const { physicalCard, gymPass } = await physicalCardService.getActivePassByCardCode(trimmedCode);

        // Extract client info
        let userId = null;
        let familyId = null;
        let clientInfo = null;

        if (gymPass.userId) {
            userId = gymPass.userId._id || gymPass.userId;
            clientInfo = {
                id: userId,
                name: `${gymPass.userId.firstName} ${gymPass.userId.lastName}`,
                email: gymPass.userId.email,
                phone: gymPass.userId.phone,
                type: 'user',
            };
        } else if (gymPass.familyId) {
            familyId = gymPass.familyId._id || gymPass.familyId;
            clientInfo = {
                id: familyId,
                name: gymPass.familyId.name,
                type: 'family',
            };
        }

        res.json({
            userId,
            familyId,
            gymPass,
            clientInfo,
            physicalCard: {
                id: physicalCard._id,
                physicalCardCode: physicalCard.physicalCardCode,
                status: physicalCard.status,
            },
        });
    } catch (error) {
        logger.error({ error: error.message, cardCode: req.query.cardCode }, 'Error finding climber by card code');
        res.status(404).json({
            error: { message: error.message || 'Card not found or not active' },
        });
    }
};
