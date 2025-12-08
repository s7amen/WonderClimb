import { Session } from '../models/session.js';
import { Booking } from '../models/booking.js';
import { AttendanceRecord } from '../models/attendanceRecord.js';
import { TrainingPass } from '../models/trainingPass.js';
import { Pricing } from '../models/pricing.js';
import { User } from '../models/user.js';
import { FinanceEntry } from '../models/financeEntry.js';
import { FinanceTransaction } from '../models/financeTransaction.js';
import logger from '../middleware/logging.js';

/**
 * Create a new training session
 */
export const createSession = async (sessionData, createdById) => {
    try {
        const {
            title,
            description,
            date,
            durationMinutes,
            capacity,
            coachIds,
            targetGroups,
            ageGroups,
            location,
            status = 'active',
        } = sessionData;

        const session = await Session.create({
            title,
            description,
            date,
            durationMinutes,
            capacity,
            coachIds,
            targetGroups,
            ageGroups,
            location,
            status,
        });

        logger.info({
            sessionId: session._id,
            createdById,
            date,
        }, 'Training session created');

        return session;
    } catch (error) {
        logger.error({ error: error.message, sessionData }, 'Error creating session');
        throw error;
    }
};

/**
 * Update a training session
 */
export const updateSession = async (sessionId, updates, userId, userRoles = []) => {
    try {
        const session = await Session.findById(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        // Check permissions: admins can edit any, coaches can edit their own
        const isAdmin = userRoles.includes('admin');
        const isSessionCoach = session.coachIds.some(coachId => coachId.toString() === userId);

        if (!isAdmin && !isSessionCoach) {
            throw new Error('Not authorized to update this session');
        }

        // Update allowed fields
        const allowedUpdates = [
            'title',
            'description',
            'date',
            'durationMinutes',
            'capacity',
            'coachIds',
            'targetGroups',
            'ageGroups',
            'location',
            'status',
        ];

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                session[key] = updates[key];
            }
        });

        await session.save();

        logger.info({ sessionId, updates: Object.keys(updates) }, 'Session updated');

        return session;
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Error updating session');
        throw error;
    }
};

/**
 * Cancel a training session
 */
export const cancelSession = async (sessionId, userId, userRoles = []) => {
    try {
        const session = await Session.findById(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        // Check permissions
        const isAdmin = userRoles.includes('admin');
        const isSessionCoach = session.coachIds.some(coachId => coachId.toString() === userId);

        if (!isAdmin && !isSessionCoach) {
            throw new Error('Not authorized to cancel this session');
        }

        session.status = 'cancelled';
        await session.save();

        logger.info({ sessionId, cancelledBy: userId }, 'Session cancelled');

        // TODO: Notify booked users (future enhancement)

        return session;
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Error cancelling session');
        throw error;
    }
};

/**
 * Get sessions with filters and pagination
 */
export const getSessions = async (filters = {}, pagination = {}) => {
    try {
        const { startDate, endDate, status, coachId } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        if (status) {
            query.status = status;
        }

        if (coachId) {
            query.coachIds = coachId;
        }

        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            Session.find(query)
                .populate('coachIds', 'firstName lastName email')
                .sort({ date: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Session.countDocuments(query),
        ]);

        return {
            sessions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching sessions');
        throw error;
    }
};

/**
 * Get session by ID with bookings count
 */
export const getSessionById = async (sessionId) => {
    try {
        const session = await Session.findById(sessionId)
            .populate('coachIds', 'firstName lastName email')
            .lean();

        if (!session) {
            throw new Error('Session not found');
        }

        // Get bookings count
        const bookingsCount = await Booking.countDocuments({
            sessionId,
            status: 'booked',
        });

        return {
            ...session,
            bookingsCount,
        };
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Error fetching session');
        throw error;
    }
};

/**
 * Mark attendance for a session
 */
export const markAttendance = async (sessionId, attendanceRecords, markedById) => {
    try {
        const session = await Session.findById(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        const results = {
            successful: [],
            failed: [],
        };

        for (const record of attendanceRecords) {
            try {
                const { climberId, status } = record;

                // Check if attendance already exists
                const existing = await AttendanceRecord.findOne({
                    sessionId,
                    climberId,
                });

                if (existing) {
                    // Update existing
                    existing.status = status;
                    existing.markedById = markedById;
                    existing.markedAt = new Date();
                    await existing.save();

                    results.successful.push({
                        climberId,
                        attendanceId: existing._id,
                        updated: true,
                    });
                } else {
                    // Create new
                    const attendance = await AttendanceRecord.create({
                        sessionId,
                        climberId,
                        status,
                        markedById,
                        markedAt: new Date(),
                    });

                    results.successful.push({
                        climberId,
                        attendanceId: attendance._id,
                        updated: false,
                    });
                }
            } catch (error) {
                results.failed.push({
                    climberId: record.climberId,
                    error: error.message,
                });
            }
        }

        logger.info({
            sessionId,
            successful: results.successful.length,
            failed: results.failed.length,
        }, 'Attendance marked');

        return results;
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Error marking attendance');
        throw error;
    }
};

/**
 * Get attendance for a session
 */
export const getAttendanceForSession = async (sessionId) => {
    try {
        const attendance = await AttendanceRecord.find({ sessionId })
            .populate('climberId', 'firstName lastName email')
            .populate('markedById', 'firstName lastName')
            .sort({ markedAt: -1 })
            .lean();

        return attendance;
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Error fetching attendance');
        throw error;
    }
};

/**
 * Create a training pass
 */
export const createTrainingPass = async (passData, createdById) => {
    try {
        const { userId, familyId, isFamilyPass, pricingId, discountPercent, discountReason, paymentStatus } = passData;

        // Verify user or family exists
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
        } else if (familyId) {
            // Import dynamically to avoid circular dependency if needed, or assume it's available
            const { Family } = await import('../models/family.js');
            const family = await Family.findById(familyId);
            if (!family) {
                throw new Error('Family not found');
            }
        } else {
            throw new Error('Either user or family must be selected');
        }

        // Get pricing template
        const pricing = await Pricing.findById(pricingId);
        if (!pricing || !pricing.isActive) {
            throw new Error('Pricing not found or inactive');
        }

        const validCategories = ['training_pass', 'training_single'];
        if (!validCategories.includes(pricing.category)) {
            throw new Error('Pricing is not for training passes');
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

        // Determine sessions
        const inputSessions = passData.totalSessions !== undefined ? passData.totalSessions : passData.totalEntries;
        const totalSessions = inputSessions !== undefined && inputSessions !== '' && inputSessions !== null
            ? parseInt(inputSessions)
            : (pricing.maxEntries || null);

        // Determine pass type
        let passType = 'time_based';
        if (pricing.category === 'training_single') {
            passType = 'single';
        } else if (totalSessions) {
            passType = 'prepaid_entries';
        }

        // Create pass
        const trainingPass = await TrainingPass.create({
            userId: userId || null,
            familyId: familyId || null,
            isFamilyPass: !!isFamilyPass,
            passId: `TRN-${Date.now()}`,
            type: passType,
            name: pricing.labelBg,
            totalSessions: totalSessions,
            remainingSessions: totalSessions, // Start with full sessions
            validFrom,
            validUntil,
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

        // Create Finance Entry if amount > 0
        if (finalAmount > 0) {
            try {
                // 1. Create Transaction
                const financeTransaction = await FinanceTransaction.create({
                    totalAmount: finalAmount,
                    paymentMethod: 'cash', // Defaulting to cash for manual creation
                    paidAt: new Date(),
                    handledById: createdById,
                    payerClimberId: userId || null,
                    source: 'training',
                    notes: `Training pass created: ${pricing.labelBg}`,
                });

                // 2. Create Entry
                await FinanceEntry.create({
                    transactionId: financeTransaction._id,
                    area: 'training',
                    type: 'revenue',
                    itemType: 'training_pass',
                    pricingCode: pricing.pricingCode,
                    quantity: 1,
                    unitAmount: finalAmount,
                    totalAmount: finalAmount,
                    climberId: userId || null,
                    trainingPassId: trainingPass._id,
                    date: new Date(),
                    description: `Training Pass: ${pricing.labelBg}`,
                    createdById: createdById,
                });
            } catch (financeError) {
                // Log but don't fail the pass creation
                logger.error({
                    err: financeError,
                    trainingPassId: trainingPass._id
                }, 'Failed to create finance entry for training pass');
            }
        }

        logger.info({
            trainingPassId: trainingPass._id,
            userId,
            pricingId,
            amount: finalAmount,
        }, 'Training pass created');

        return trainingPass;

    } catch (error) {
        logger.error({ error: error.message, passData }, 'Error creating training pass');
        throw error;
    }
};

/**
 * Get user's training passes
 */
export const getUserTrainingPasses = async (userId, activeOnly = false) => {
    try {
        const query = { userId };

        if (activeOnly) {
            query.isActive = true;
            const now = new Date();
            query.validUntil = { $gte: now };
            query.remainingSessions = { $gt: 0 };
        }

        // Find families where user is a member
        const { Family } = await import('../models/family.js');
        const families = await Family.find({ memberIds: userId });
        if (families.length > 0) {
            const familyIds = families.map(f => f._id);
            query.$or = [
                { userId: userId },
                { familyId: { $in: familyIds } }
            ];
            delete query.userId; // Remove simple userId query in favor of $or
        }

        const passes = await TrainingPass.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('familyId', 'name')
            .populate('pricingId')
            .sort({ createdAt: -1 })
            .lean();

        return passes;
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Error fetching user training passes');
        throw error;
    }
};

/**
 * Get all training passes with filters
 */
export const getAllTrainingPasses = async (filters = {}, pagination = {}) => {
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
            TrainingPass.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('familyId', 'name')
                .populate('pricingId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            TrainingPass.countDocuments(query),
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
        logger.error({ error: error.message, filters }, 'Error fetching training passes');
        throw error;
    }
};

/**
 * Get training pass by ID
 */
export const getTrainingPassById = async (passId) => {
    try {
        const pass = await TrainingPass.findById(passId)
            .populate('userId', 'firstName lastName email phone')
            .populate('familyId', 'name')
            .populate('pricingId')
            .lean();

        if (!pass) {
            throw new Error('Training pass not found');
        }

        // Get usage history (bookings)
        const bookings = await Booking.find({ trainingPassId: passId })
            .populate('sessionId')
            .populate('bookedById', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();

        return {
            ...pass,
            usageHistory: bookings,
        };
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error fetching training pass');
        throw error;
    }
};

/**
 * Update training pass
 */
export const updateTrainingPass = async (passId, updates, updatedById) => {
    try {
        const allowedUpdates = ['paymentStatus', 'notes', 'isActive', 'remainingSessions', 'validFrom', 'validUntil'];
        const filteredUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        filteredUpdates.updatedById = updatedById;

        const pass = await TrainingPass.findByIdAndUpdate(
            passId,
            filteredUpdates,
            { new: true, runValidators: true }
        );

        if (!pass) {
            throw new Error('Training pass not found');
        }

        logger.info({ passId, updates: Object.keys(filteredUpdates) }, 'Training pass updated');

        return pass;
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error updating training pass');
        throw error;
    }
};

/**
 * Delete training pass (soft delete)
 */
export const deleteTrainingPass = async (passId) => {
    try {
        const pass = await TrainingPass.findById(passId);
        if (!pass) {
            throw new Error('Training pass not found');
        }

        // Soft delete - set isActive to false
        pass.isActive = false;
        await pass.save();

        logger.info({ passId: pass._id }, 'Training pass deleted (soft)');

        return pass;
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error deleting training pass');
        throw error;
    }
};

/**
 * Delete training pass and all related records (cascade hard delete)
 */
export const deleteTrainingPassCascade = async (passId) => {
    try {
        const pass = await TrainingPass.findById(passId);
        if (!pass) {
            throw new Error('Training pass not found');
        }

        // Delete all related bookings
        const bookingsResult = await Booking.deleteMany({ trainingPassId: passId });

        logger.info({
            passId,
            deletedBookings: bookingsResult.deletedCount
        }, 'Deleted bookings for cascade delete');

        // Note: We don't delete attendance records as they are tied to sessions, not passes
        // Attendance is historical data that should be preserved

        // Hard delete the pass
        await TrainingPass.findByIdAndDelete(passId);

        logger.info({ passId }, 'Training pass deleted (cascade)');

        return {
            pass,
            deletedBookings: bookingsResult.deletedCount,
        };
    } catch (error) {
        logger.error({ error: error.message, passId }, 'Error cascade deleting training pass');
        throw error;
    }
};

/**
 * Get all bookings with filters (for admin/coach)
 */
export const getAllBookings = async (filters = {}, pagination = {}) => {
    try {
        const { sessionId, climberId, status } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (sessionId) {
            query.sessionId = sessionId;
        }

        if (climberId) {
            query.climberId = climberId;
        }

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [bookings, total] = await Promise.all([
            Booking.find(query)
                .populate('sessionId')
                .populate('climberId', 'firstName lastName email')
                .populate('bookedById', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Booking.countDocuments(query),
        ]);

        return {
            bookings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching bookings');
        throw error;
    }
};

/**
 * Extend validity of all active training passes
 */
export const extendAllActivePasses = async (days, adminId) => {
    try {
        const now = new Date();
        const extensionMs = days * 24 * 60 * 60 * 1000;

        const updateResult = await TrainingPass.updateMany(
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
        }, 'Bulk extended active training passes');

        return updateResult.modifiedCount;
    } catch (error) {
        logger.error({ error: error.message, days }, 'Error extending training passes');
        throw error;
    }
};
