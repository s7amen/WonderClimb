import { GymPass } from '../models/gymPass.js';
import { GymVisit } from '../models/gymVisit.js';
import { Pricing } from '../models/pricing.js';
import { FinanceEntry } from '../models/financeEntry.js';
import { FinanceTransaction } from '../models/financeTransaction.js';
import { User } from '../models/user.js';
import { Family } from '../models/family.js';
import * as physicalCardService from './physicalCardService.js';
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

    // Check entries ONLY if it's a prepaid card (i.e., has remainingEntries tracked)
    if (pass.remainingEntries !== null && pass.remainingEntries <= 0) {
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
        const { gymPassId, pricingId, amount, notes, climberId, familyId } = options;

        // Verify user OR family exists (if provided)
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
        } else if (familyId) {
            const family = await Family.findById(familyId);
            if (!family) {
                throw new Error('Family not found');
            }
        }

        let visitData = {
            userId: userId || null,
            familyId: familyId || null,
            type,
            date: new Date(),
            checkedInById,
            notes: notes || null,
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

            // Decrement remaining entries on the pass if applicable
            if (pass.remainingEntries !== null) {
                pass.remainingEntries -= 1;
                await pass.save();
            }

            logger.info({
                visitId: visit._id,
                userId,
                gymPassId,
                remainingEntries: pass.remainingEntries,
            }, 'Gym check-in recorded (pass)');

            return visit;

        } else if (type === 'single') {
            const visitQuantity = options.quantity ? parseInt(options.quantity) : 1;

            if (!pricingId) {
                throw new Error('Pricing ID is required for single visit');
            }

            // Verify pricing exists and is valid
            const pricing = await Pricing.findById(pricingId);
            if (!pricing) {
                throw new Error('Pricing not found');
            }
            if (pricing.category !== 'gym_single_visit') {
                throw new Error('Invalid pricing category for single visit');
            }

            const unitAmount = amount !== undefined ? amount : pricing.amount;
            const totalAmount = unitAmount * visitQuantity;

            // Create Finance Transaction wrapper
            const transaction = await FinanceTransaction.create({
                totalAmount: totalAmount,
                paymentMethod: 'cash', // Default, can be updated later
                paidAt: new Date(),
                handledById: checkedInById,
                payerClimberId: userId || null,
                source: 'gym',
            });

            // Create Finance Entry (One entry for the group)
            const financeEntryData = {
                transactionId: transaction._id,
                type: 'revenue',
                area: 'gym',
                itemType: 'gym_visit_single',
                climberId: userId || null,
                pricingCode: pricing.pricingCode,
                quantity: visitQuantity,
                unitAmount: unitAmount,
                totalAmount: totalAmount,
                date: new Date(),
                description: `Single gym visit - ${visitQuantity} ppl`,
                createdById: checkedInById,
            };

            const financeEntry = await FinanceEntry.create(financeEntryData);

            // Create Visits linked to Finance Entry
            // We create 'visitQuantity' number of visit records
            const visits = [];
            for (let i = 0; i < visitQuantity; i++) {
                const vData = {
                    userId: i === 0 ? (userId || null) : null, // Only link user to first visit if it's a profile check-in? Or maybe all? 
                    // Usually "Group check-in" implies one payer, others might be guests. 
                    // Use case: 1 member brings 2 friends. 
                    // If userId is passed, it's likely the payer. 
                    // Let's link userId to first one, others anonymous? 
                    // Or if userId is passed, is it for everyone? 
                    // If I select "User X" and say "quantity 3", do I mean "User X entered 3 times" or "User X + 2 others"?
                    // Assuming User X is the payer/primary.
                    // Ideally we should link all to User X if we want to track "User X brought people".
                    // But GymVisit usually means "A person entered".
                    // If User X enters 3 times, it messes up stats "User X visited 3 times today". 
                    // But if it's guests, they should be null.
                    // Logic: If userId provided, assign to first visit. Others are 'Guest' (null userId).

                    type,
                    date: new Date(),
                    checkedInById,
                    notes: notes || (i > 0 ? `Group visit with ${userId}` : null),
                    pricingId,
                    pricingCode: pricing.pricingCode,
                    amount: unitAmount,
                    financeEntryId: financeEntry._id,
                    climberId: i === 0 ? (userId || null) : null,
                };
                visits.push(vData);
            }

            const createdVisits = await GymVisit.insertMany(visits);

            // Update FinanceEntry with gymVisitId reference
            financeEntry.gymVisitId = createdVisits[0]._id;
            await financeEntry.save();

            logger.info({
                visitIds: createdVisits.map(v => v._id),
                financeEntryId: financeEntry._id,
                userId,
                amount: totalAmount,
                quantity: visitQuantity
            }, 'Gym check-in recorded (single - group)');

            return createdVisits[0];

        } else if (type === 'multisport') {
            const visitQuantity = options.quantity ? parseInt(options.quantity) : 1;

            let pricingCode = 'MULTISPORT';
            let visitAmount = amount !== undefined ? amount : 0;

            if (pricingId) {
                const pricing = await Pricing.findById(pricingId);
                if (pricing) {
                    pricingCode = pricing.pricingCode;
                    if (visitAmount === 0 && pricing.amount > 0) visitAmount = pricing.amount;
                }
            }

            const totalAmount = visitAmount * visitQuantity;

            // Create Finance Transaction wrapper
            const transaction = await FinanceTransaction.create({
                totalAmount: totalAmount,
                paymentMethod: 'cash', // Default
                paidAt: new Date(),
                handledById: checkedInById,
                payerClimberId: userId || null,
                source: 'gym',
            });

            // Create Finance Entry
            const financeEntryData = {
                transactionId: transaction._id,
                type: 'revenue',
                area: 'gym',
                itemType: 'gym_visit_multisport',
                climberId: userId || null,
                pricingCode: pricingCode,
                quantity: visitQuantity,
                unitAmount: visitAmount,
                totalAmount: totalAmount,
                date: new Date(),
                description: `Multisport visit - ${visitQuantity} ppl`,
                createdById: checkedInById,
            };

            const financeEntry = await FinanceEntry.create(financeEntryData);

            // Create Visits
            const visits = [];
            for (let i = 0; i < visitQuantity; i++) {
                const vData = {
                    userId: i === 0 ? (userId || null) : null,
                    type,
                    date: new Date(),
                    checkedInById,
                    notes: notes || (i > 0 ? `Group multisport` : null),
                    pricingId: pricingId || null,
                    pricingCode: pricingCode,
                    amount: visitAmount,
                    financeEntryId: financeEntry._id,
                    climberId: i === 0 ? (userId || null) : null,
                };
                visits.push(vData);
            }

            const createdVisits = await GymVisit.insertMany(visits);

            // Update FinanceEntry with gymVisitId reference
            financeEntry.gymVisitId = createdVisits[0]._id;
            await financeEntry.save();

            logger.info({
                visitIds: createdVisits.map(v => v._id),
                financeEntryId: financeEntry._id,
                userId,
                amount: totalAmount,
                quantity: visitQuantity
            }, 'Gym check-in recorded (multisport - group)');

            return createdVisits[0];
        } else {
            throw new Error('Invalid check-in type');
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
            .populate('familyId', 'name')
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
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const skip = (page - 1) * limit;

        const [visits, total] = await Promise.all([
            GymVisit.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('familyId', 'name')
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

        // Verify user OR family exists
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
        } else if (familyId) {
            const family = await Family.findById(familyId);
            if (!family) {
                throw new Error('Family not found');
            }
        } else {
            throw new Error('Must provide either userId or familyId');
        }

        // Get pricing template
        const pricing = await Pricing.findById(pricingId);
        if (!pricing || !pricing.isActive) {
            throw new Error('Pricing not found or inactive');
        }

        const validCategories = ['gym_pass', 'gym_single_visit'];
        if (!validCategories.includes(pricing.category)) {
            throw new Error('Pricing is not for gym passes');
        }

        // Calculate dates
        // Use provided validFrom or default to now
        const now = new Date();
        const validFrom = passData.validFrom ? new Date(passData.validFrom) : new Date();

        // Use provided validUntil or calculate from validityDays
        let validUntil;
        if (passData.validUntil) {
            validUntil = new Date(passData.validUntil);
        } else {
            // Import dynamically to avoid circular issues or top-level import
            const { addDuration } = await import('../utils/dateUtils.js');
            validUntil = addDuration(validFrom, pricing.validityDays || 30, pricing.validityType || 'days');
        }

        // Calculate amount
        // If amount is provided explicitly, use it (it's the final amount)
        // Otherwise calculate from pricing and discount
        let finalAmount;
        if (passData.amount !== undefined && passData.amount !== '') {
            finalAmount = parseFloat(passData.amount);
        } else {
            finalAmount = pricing.amount;
            if (discountPercent && discountPercent > 0) {
                finalAmount = pricing.amount * (1 - discountPercent / 100);
            }
        }

        // Determine entries
        const totalEntries = passData.totalEntries !== undefined && passData.totalEntries !== '' && passData.totalEntries !== null
            ? parseInt(passData.totalEntries)
            : (pricing.maxEntries || null);

        // Determine pass type
        let passType = 'time_based';
        if (pricing.category === 'gym_single_visit') {
            passType = 'single';
        } else if (totalEntries) {
            passType = 'prepaid_entries';
        }

        // Handle physical card if provided
        let physicalCardId = null;
        if (passData.physicalCardCode) {
            const trimmedCode = passData.physicalCardCode.trim();
            
            // Try to find existing card or create new one
            let physicalCard;
            try {
                physicalCard = await physicalCardService.findByCardCode(trimmedCode);
                if (!physicalCard) {
                    // Card doesn't exist, create it
                    physicalCard = await physicalCardService.createPhysicalCard(trimmedCode);
                } else if (physicalCard.status === 'linked') {
                    // Check if linked pass is still active
                    const linkedPass = await GymPass.findById(physicalCard.linkedToCardInternalCode);
                    if (linkedPass && linkedPass.isActive) {
                        throw new Error('Physical card is already linked to an active pass');
                    }
                }
            } catch (error) {
                if (error.message.includes('already linked')) {
                    throw error;
                }
                // If card doesn't exist, create it
                physicalCard = await physicalCardService.createPhysicalCard(trimmedCode);
            }
            
            physicalCardId = physicalCard._id;
        }

        // Create pass
        const gymPass = await GymPass.create({
            userId: userId || null, // Can be null for family pass
            passId: `GYM-${Date.now()}`, // Simple ID generation
            type: passType,
            name: pricing.labelBg,
            totalEntries: totalEntries,
            remainingEntries: totalEntries, // Start with full entries
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
            physicalCardId: physicalCardId || null,
        });

        // Link physical card to pass if provided
        if (physicalCardId && passData.physicalCardCode) {
            await physicalCardService.linkToPass(passData.physicalCardCode.trim(), gymPass._id);
        }

        logger.info({
            gymPassId: gymPass._id,
            userId,
            pricingId,
            amount: finalAmount,
            physicalCardId,
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
        const query = {
            $or: [
                { userId: userId },
                // We will add family IDs below
            ]
        };

        // Find families where user is a member
        const families = await Family.find({ memberIds: userId });
        if (families.length > 0) {
            const familyIds = families.map(f => f._id);
            query.$or.push({ familyId: { $in: familyIds } });
        }

        if (activeOnly) {
            query.isActive = true;

            const now = new Date();
            // Start of today for expiry (valid until end of today)
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);

            // End of today for validity start (valid if starts today or before)
            const endOfToday = new Date(now);
            endOfToday.setHours(23, 59, 59, 999);

            query.validUntil = { $gte: startOfToday };
            query.validFrom = { $lte: endOfToday };

            // Strict check: Must have entries if it's an entry-based card (checked by existing logic usually, 
            // but we add explicit $ne: 0 to hide depleted cards)
            query.remainingEntries = { $ne: 0 };
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
        const { userId, familyId, isActive, paymentStatus } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (familyId) {
            query.familyId = familyId;
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
                .populate('userId', 'firstName middleName lastName email')
                .populate('familyId', 'name')
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
        const allowedUpdates = ['paymentStatus', 'notes', 'isActive', 'remainingEntries', 'validFrom', 'validUntil'];
        const filteredUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        filteredUpdates.updatedById = updatedById;

        // Check if we're deactivating the pass
        const wasDeactivating = filteredUpdates.isActive === false;
        const passBeforeUpdate = wasDeactivating ? await GymPass.findById(passId) : null;

        const pass = await GymPass.findByIdAndUpdate(
            passId,
            filteredUpdates,
            { new: true, runValidators: true }
        );

        if (!pass) {
            throw new Error('Gym pass not found');
        }

        // If pass was deactivated and had a physical card, unlink it
        if (wasDeactivating && passBeforeUpdate && passBeforeUpdate.physicalCardId) {
            await physicalCardService.unlinkFromPass(passBeforeUpdate.physicalCardId);
        }

        logger.info({ passId, updates: Object.keys(filteredUpdates) }, 'Gym pass updated');

        return pass;
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error updating pass');
        throw error;
    }
};

/**
 * Delete gym pass (soft delete)
 */
export const deletePass = async (passId) => {
    try {
        const pass = await GymPass.findById(passId);
        if (!pass) {
            throw new Error('Gym pass not found');
        }

        // Unlink physical card if exists
        if (pass.physicalCardId) {
            await physicalCardService.unlinkFromPass(pass.physicalCardId);
        }

        // Soft delete - set isActive to false
        pass.isActive = false;
        await pass.save();

        logger.info({ passId: pass._id }, 'Gym pass deleted (soft)');

        return pass;
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error deleting pass');
        throw error;
    }
};

/**
 * Delete gym pass and all related visits (cascade hard delete)
 */
export const deletePassCascade = async (passId) => {
    try {
        const pass = await GymPass.findById(passId);
        if (!pass) {
            throw new Error('Gym pass not found');
        }

        // Unlink physical card if exists
        if (pass.physicalCardId) {
            await physicalCardService.unlinkFromPass(pass.physicalCardId);
        }

        // Delete all related gym visits
        const deleteResult = await GymVisit.deleteMany({ gymPassId: passId });

        logger.info({
            passId,
            deletedVisits: deleteResult.deletedCount
        }, 'Deleted gym visits for cascade delete');

        // Hard delete the pass
        await GymPass.findByIdAndDelete(passId);

        logger.info({ passId }, 'Gym pass deleted (cascade)');

        return {
            pass,
            deletedVisits: deleteResult.deletedCount,
        };
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error cascade deleting pass');
        throw error;
    }
};

/**
 * Extend validity of all active gym passes
 */
export const extendAllActivePasses = async (days, adminId) => {
    try {
        const now = new Date();
        const extensionMs = days * 24 * 60 * 60 * 1000;

        // Find active passes that have a validUntil date in the future
        // We only extend passes that are currently valid (or recently expired? No, requirements say active)
        // Usually "active" means isActive=true AND validUntil >= now

        const updateResult = await GymPass.updateMany(
            {
                isActive: true,
                validUntil: { $gt: now }
            },
            [
                {
                    $set: {
                        validUntil: {
                            $add: ["$validUntil", extensionMs]
                        },
                        updatedById: adminId,
                        updatedAt: new Date()
                    }
                }
            ]
        );

        logger.info({
            days,
            adminId,
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount
        }, 'Bulk extended active gym passes');

        return updateResult.modifiedCount;
    } catch (error) {
        logger.error({ error: error.message, days }, 'Error extending gym passes');
        throw error;
    }
};
