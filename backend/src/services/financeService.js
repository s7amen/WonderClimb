import { FinanceEntry } from '../models/financeEntry.js';
import { GymPass } from '../models/gymPass.js';
import { TrainingPass } from '../models/trainingPass.js';
import { GymVisit } from '../models/gymVisit.js';
import { Booking } from '../models/booking.js';
import { Session } from '../models/session.js';
import logger from '../middleware/logging.js';

/**
 * Create a finance entry
 */
export const createFinanceEntry = async (entryData, createdById) => {
    try {
        const {
            type,
            area,
            personId,
            personRole,
            source,
            sourceId,
            sessionIds,
            amount,
            date,
            description,
        } = entryData;

        const entry = await FinanceEntry.create({
            type,
            area,
            personId,
            personRole,
            source,
            sourceId,
            sessionIds,
            amount,
            date: date || new Date(),
            description,
        });

        logger.info({
            entryId: entry._id,
            type,
            area,
            amount,
            createdById,
        }, 'Finance entry created');

        return entry;
    } catch (error) {
        logger.error({ error: error.message, entryData }, 'Error creating finance entry');
        throw error;
    }
};

/**
 * Get finance entries with filters
 */
export const getFinanceEntries = async (filters = {}, pagination = {}) => {
    try {
        const { type, area, startDate, endDate, personId } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (type) {
            query.type = type;
        }

        if (area) {
            query.area = area;
        }

        if (personId) {
            query.personId = personId;
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

        const [entries, total] = await Promise.all([
            FinanceEntry.find(query)
                .populate('personId', 'firstName lastName email')
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FinanceEntry.countDocuments(query),
        ]);

        return {
            entries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching finance entries');
        throw error;
    }
};

/**
 * Get entry by ID
 */
export const getEntryById = async (entryId) => {
    try {
        const entry = await FinanceEntry.findById(entryId)
            .populate('personId', 'firstName lastName email')
            .populate('sessionIds')
            .lean();

        if (!entry) {
            throw new Error('Finance entry not found');
        }

        return entry;
    } catch (error) {
        logger.error({ error: error.message, entryId }, 'Error fetching entry');
        throw error;
    }
};

/**
 * Update finance entry
 */
export const updateFinanceEntry = async (entryId, updates) => {
    try {
        const allowedUpdates = ['description', 'date'];
        const filteredUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const entry = await FinanceEntry.findByIdAndUpdate(
            entryId,
            filteredUpdates,
            { new: true, runValidators: true }
        );

        if (!entry) {
            throw new Error('Finance entry not found');
        }

        logger.info({ entryId, updates: Object.keys(filteredUpdates) }, 'Finance entry updated');

        return entry;
    } catch (error) {
        logger.error({ error: error.message, entryId }, 'Error updating entry');
        throw error;
    }
};

/**
 * Delete finance entry
 */
export const deleteFinanceEntry = async (entryId) => {
    try {
        const entry = await FinanceEntry.findByIdAndDelete(entryId);

        if (!entry) {
            throw new Error('Finance entry not found');
        }

        logger.info({ entryId }, 'Finance entry deleted');

        return entry;
    } catch (error) {
        logger.error({ error: error.message, entryId }, 'Error deleting entry');
        throw error;
    }
};

/**
 * Generate summary report
 */
export const generateSummaryReport = async (startDate, endDate, area = null) => {
    try {
        const query = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        };

        if (area) {
            query.area = area;
        }

        const entries = await FinanceEntry.find(query).lean();

        const summary = {
            period: {
                startDate,
                endDate,
                area: area || 'all',
            },
            income: {
                total: 0,
                byArea: {},
                bySource: {},
            },
            expense: {
                total: 0,
                byArea: {},
                bySource: {},
            },
            netRevenue: 0,
        };

        entries.forEach(entry => {
            const amount = entry.amount || 0;

            if (entry.type === 'income') {
                summary.income.total += amount;
                summary.income.byArea[entry.area] = (summary.income.byArea[entry.area] || 0) + amount;
                summary.income.bySource[entry.source] = (summary.income.bySource[entry.source] || 0) + amount;
            } else if (entry.type === 'expense') {
                summary.expense.total += amount;
                summary.expense.byArea[entry.area] = (summary.expense.byArea[entry.area] || 0) + amount;
                summary.expense.bySource[entry.source] = (summary.expense.bySource[entry.source] || 0) + amount;
            }
        });

        summary.netRevenue = summary.income.total - summary.expense.total;

        return summary;
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating summary report');
        throw error;
    }
};

/**
 * Generate gym revenue report
 */
export const generateGymReport = async (startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get gym passes sold in period
        const gymPasses = await GymPass.find({
            createdAt: { $gte: start, $lte: end },
        }).lean();

        // Get single gym visits in period
        const gymVisits = await GymVisit.find({
            date: { $gte: start, $lte: end },
            type: 'single',
        }).lean();

        const report = {
            period: { startDate, endDate },
            passesSold: {
                count: gymPasses.length,
                revenue: gymPasses.reduce((sum, pass) => sum + (pass.amount || 0), 0),
            },
            singleVisits: {
                count: gymVisits.length,
                revenue: gymVisits.reduce((sum, visit) => sum + (visit.amount || 0), 0),
            },
            totalRevenue: 0,
        };

        report.totalRevenue = report.passesSold.revenue + report.singleVisits.revenue;

        return report;
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating gym report');
        throw error;
    }
};

/**
 * Generate training revenue report
 */
export const generateTrainingReport = async (startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get training passes sold in period
        const trainingPasses = await TrainingPass.find({
            createdAt: { $gte: start, $lte: end },
        }).lean();

        // Get session bookings in period (sessions that occurred)
        const sessions = await Session.find({
            date: { $gte: start, $lte: end },
            status: { $in: ['active', 'completed'] },
        }).lean();

        const sessionIds = sessions.map(s => s._id);

        // Get bookings for these sessions
        const bookings = await Booking.find({
            sessionId: { $in: sessionIds },
            status: 'booked',
        }).lean();

        // Calculate coach fees (from completed sessions)
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const totalCoachFees = completedSessions.reduce((sum, session) => {
            const coachFees = session.coachFees || [];
            return sum + coachFees.reduce((feeSum, fee) => feeSum + (fee.amount || 0), 0);
        }, 0);

        const report = {
            period: { startDate, endDate },
            passesSold: {
                count: trainingPasses.length,
                revenue: trainingPasses.reduce((sum, pass) => sum + (pass.amount || 0), 0),
            },
            sessionBookings: {
                count: bookings.length,
                revenue: bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0),
            },
            coachFees: {
                total: totalCoachFees,
            },
            totalRevenue: 0,
            netRevenue: 0,
        };

        report.totalRevenue = report.passesSold.revenue + report.sessionBookings.revenue;
        report.netRevenue = report.totalRevenue - report.coachFees.total;

        return report;
    } catch (error) {
        logger.error({ error: error.message }, 'Error generating training report');
        throw error;
    }
};

/**
 * Calculate coach fees
 */
export const calculateCoachFees = async (coachId = null, startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const query = {
            date: { $gte: start, $lte: end },
            status: 'completed',
        };

        if (coachId) {
            query.coachIds = coachId;
        }

        const sessions = await Session.find(query)
            .populate('coachIds', 'firstName lastName email')
            .lean();

        const coachFeesMap = {};

        sessions.forEach(session => {
            const coachFees = session.coachFees || [];
            coachFees.forEach(fee => {
                const coachIdStr = fee.coachId.toString();
                if (!coachFeesMap[coachIdStr]) {
                    coachFeesMap[coachIdStr] = {
                        coachId: fee.coachId,
                        totalAmount: 0,
                        sessions: [],
                    };
                }
                coachFeesMap[coachIdStr].totalAmount += fee.amount || 0;
                coachFeesMap[coachIdStr].sessions.push({
                    sessionId: session._id,
                    date: session.date,
                    amount: fee.amount,
                    status: fee.status,
                });
            });
        });

        const result = {
            period: { startDate, endDate },
            coaches: Object.values(coachFeesMap),
            totalFees: Object.values(coachFeesMap).reduce((sum, coach) => sum + coach.totalAmount, 0),
        };

        return result;
    } catch (error) {
        logger.error({ error: error.message }, 'Error calculating coach fees');
        throw error;
    }
};
