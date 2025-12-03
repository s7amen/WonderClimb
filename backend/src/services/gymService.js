import { GymPass } from '../models/gymPass.js';
import { GymVisit } from '../models/gymVisit.js';
import { Pricing } from '../models/pricing.js';
import { User } from '../models/user.js';
import logger from '../middleware/logging.js';

/**
 * Validate if a gym pass is valid for check-in
 */
export const validatePassForCheckIn = async (gymPassId) => {
    const pass = await GymPass.findById(gymPassId);

    if (!pass) {
        throw new Error('Gym pass not found');
    }

    if (!pass.isActive) {
        throw new Error('Gym pass is not active');
    }

    if (pass.remainingEntries <= 0) {
        throw new Error('No remaining entries on this pass');
    }

    // Check if pass is within valid dates
    const now = new Date();
    if (pass.validFrom && now < pass.validFrom) {
        throw new Error('Gym pass is not yet valid');
    }

    if (pass.validUntil && now > pass.validUntil) {
        throw new Error('Gym pass has expired');
    }

    return pass;
};

/**
 * Record a gym check-in
 */
export const recordCheckIn = async (userId, type, options = {}, checkedInById) => {
    try {
        const { gymPassId, pricingId, amount } = options;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let visitData = {
            userId,
            type,
            date: new Date(),
            checkedInById,
        };

        if (type === 'pass') {
            if (!gymPassId) {
                throw new Error('Gym pass ID is required for pass check-in');
            }

            // Validate and get pass
            const pass = await validatePassForCheckIn(gymPassId);

            visitData.gymPassId = gymPassId;
            visitData.pricingId = pass.pricingId;
            visitData.pricingCode = pass.pricingCode;
            visitData.amount = 0; // Already paid via pass

            // Create visit
            const visit = await GymVisit.create(visitData);

            // Decrement remaining entries on the pass
            pass.remainingEntries -= 1;
            await pass.save();

            logger.info({
                visitId: visit._id,
                userId,
                gymPassId,
                remainingEntries: pass.remainingEntries,
            }, 'Gym check-in recorded (pass)');

            return visit;

        } else if (type === 'single') {
            if (!pricingId || !amount) {
                throw new Error('Pricing ID and amount are required for single visit');
            }

            // Verify pricing exists
            const pricing = await Pricing.findById(pricingId);
            if (!pricing) {
                throw new Error('Pricing not found');
            }

            visitData.pricingId = pricingId;
            visitData.pricingCode = pricing.pricingCode;
            visitData.amount = amount;

            const visit = await GymVisit.create(visitData);

            logger.info({
                visitId: visit._id,
                userId,
                amount,
            }, 'Gym check-in recorded (single)');

            return visit;

        } else {
            throw new Error('Invalid check-in type. Must be "pass" or "single"');
        }

    } catch (error) {
        logger.error({ error: error.message, userId, type }, 'Error recording check-in');
        throw error;
    }
};

/**
 * Get today's gym visits
 */
export const getTodaysVisits = async () => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const visits = await GymVisit.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        })
            .populate('userId', 'firstName lastName email')
            .populate('gymPassId')
            .populate('checkedInById', 'firstName lastName')
            .sort({ date: -1 })
            .lean();

        return visits;
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching today\'s visits');
        throw error;
    }
};

/**
 * Get gym visits with filters and pagination
 */
export const getVisits = async (filters = {}, pagination = {}) => {
    try {
        const { userId, startDate, endDate } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        const skip = (page - 1) * limit;

        const [visits, total] = await Promise.all([
            GymVisit.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('gymPassId')
                .populate('checkedInById', 'firstName lastName')
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GymVisit.countDocuments(query),
        ]);

        return {
            visits,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching visits');
        throw error;
    }
};

/**
 * Create a gym pass
 */
export const createGymPass = async (passData, createdById) => {
    try {
        const { userId, pricingId, isFamilyPass, familyId, discountPercent, discountReason, paymentStatus } = passData;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get pricing template
        const pricing = await Pricing.findById(pricingId);
        if (!pricing || !pricing.isActive) {
            throw new Error('Pricing not found or inactive');
        }

        if (pricing.category !== 'gym') {
            throw new Error('Pricing is not for gym passes');
        }

        // Calculate dates
        const now = new Date();
        const validFrom = pricing.validFrom || now;
        const validUntil = new Date(validFrom);
        validUntil.setDate(validUntil.getDate() + (pricing.validityDays || 30));

        // Calculate amount with discount
        let finalAmount = pricing.amount;
        if (discountPercent && discountPercent > 0) {
            finalAmount = pricing.amount * (1 - discountPercent / 100);
        }

        // Create pass
        const gymPass = await GymPass.create({
            userId,
            passId: `GYM-${Date.now()}`, // Simple ID generation
            type: pricing.type || 'pass',
            name: pricing.labelBg,
            totalEntries: pricing.maxEntries || 10,
            remainingEntries: pricing.maxEntries || 10,
            validFrom,
            validUntil,
            isFamilyPass: isFamilyPass || false,
            familyId: isFamilyPass ? familyId : null,
            isActive: true,
            paymentStatus: paymentStatus || 'pending',
            pricingId,
            pricingCode: pricing.pricingCode,
            amount: finalAmount,
            discountPercent: discountPercent || 0,
            discountReason: discountReason || '',
            createdById,
            updatedById: createdById,
        });

        logger.info({
            gymPassId: gymPass._id,
            userId,
            pricingId,
            amount: finalAmount,
        }, 'Gym pass created');

        return gymPass;

    } catch (error) {
        logger.error({ error: error.message, passData }, 'Error creating gym pass');
        throw error;
    }
};

/**
 * Get user's gym passes
 */
export const getUserPasses = async (userId, activeOnly = false) => {
    try {
        const query = { userId };

        if (activeOnly) {
            query.isActive = true;
            // Optionally filter by valid dates
            const now = new Date();
            query.validUntil = { $gte: now };
            query.remainingEntries = { $gt: 0 };
        }

        const passes = await GymPass.find(query)
            .populate('pricingId')
            .sort({ createdAt: -1 })
            .lean();

        return passes;
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Error fetching user passes');
        throw error;
    }
};

/**
 * Get all gym passes with filters
 */
export const getAllPasses = async (filters = {}, pagination = {}) => {
    try {
        const { userId, isActive, paymentStatus } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        if (paymentStatus) {
            query.paymentStatus = paymentStatus;
        }

        const skip = (page - 1) * limit;

        const [passes, total] = await Promise.all([
            GymPass.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('pricingId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GymPass.countDocuments(query),
        ]);

        return {
            passes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching passes');
        throw error;
    }
};

/**
 * Get pass by ID
 */
export const getPassById = async (passId) => {
    try {
        const pass = await GymPass.findById(passId)
            .populate('userId', 'firstName lastName email phone')
            .populate('pricingId')
            .lean();

        if (!pass) {
            throw new Error('Gym pass not found');
        }

        // Get usage history
        const visits = await GymVisit.find({ gymPassId: passId })
            .populate('checkedInById', 'firstName lastName')
            .sort({ date: -1 })
            .lean();

        return {
            ...pass,
            usageHistory: visits,
        };
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error fetching pass');
        throw error;
    }
};

/**
 * Update gym pass
 */
export const updatePass = async (passId, updates, updatedById) => {
    try {
        const allowedUpdates = ['paymentStatus', 'notes', 'isActive'];
        const filteredUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        filteredUpdates.updatedById = updatedById;

        const pass = await GymPass.findByIdAndUpdate(
            passId,
            filteredUpdates,
            { new: true, runValidators: true }
        );

        if (!pass) {
            throw new Error('Gym pass not found');
        }

        logger.info({ passId, updates: Object.keys(filteredUpdates) }, 'Gym pass updated');

        return pass;
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error updating pass');
        throw error;
    }
};
