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
            climberId, // Renamed from personId
            personId, // Backwards compat in input
            transactionId,
            itemType,
            source,
            sourceId,
            sessionIds,
            amount,
            totalAmount,
            date,
            description,
        } = entryData;

        // If no transactionId, we technically should fail or create a dummy one,
        // but for now let's assume the caller provides it OR we allow legacy loose creation
        // BUT schema says transactionId is required.
        // We might need to wrap single entry creation in a transaction creation for legacy support
        // OR warn.

        // Mapping legacy "amount" to "totalAmount"
        const finalAmount = totalAmount || amount;

        const entry = await FinanceEntry.create({
            type,
            area,
            transactionId, // Must be provided now
            climberId: climberId || personId,
            // personRole removed from schema
            itemType: itemType || 'other', // Default if missing
            source: source || 'other', // Legacy support
            // sourceId removed/mapped to specific IDs in schema? 
            // The new schema has specific ID fields, but maybe we shouldn't break this completely yet.
            // Let's stick to core fields for now.
            quantity: 1,
            unitAmount: finalAmount,
            totalAmount: finalAmount,

            sessionIds,
            date: date || new Date(),
            description,
            createdById
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
        const { type, area, startDate, endDate, personId, source, itemType } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (type) {
            query.type = type;
        }

        if (area) {
            query.area = area;
        }

        if (source) {
            query.source = source;
        }

        if (itemType) {
            query.itemType = itemType;
        }

        if (personId) {
            query.climberId = personId;
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
                .populate('climberId', 'firstName lastName email')
                .populate('productId', 'name category imageUrl') // Add product population
                .populate('transactionId') // Helpful context
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
        // Ensure end date covers the full day if it's just a date string or set to 00:00:00
        if (endDate.includes('T')) {
            // If it's ISO, trust it? Or maybe just ensure end of day.
            // Usually reports go from Start 00:00 to End 23:59
        } else {
            // If manual date strings, set times
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        }

        // 1. Get Gym Passes (Income)
        const gymPasses = await GymPass.find({
            createdAt: { $gte: start, $lte: end },
            paymentStatus: { $ne: 'failed' } // Exclude failed payments if any
        }).populate('userId', 'firstName lastName').populate('pricingId', 'labelBg category').lean();

        // 2. Get Finance Entries (Income & Expense) for Gym
        const financeEntries = await FinanceEntry.find({
            date: { $gte: start, $lte: end },
            area: 'gym'
        })
            .populate('climberId', 'firstName lastName') // Populate climber info
            .lean();

        // Initialize Stats
        const report = {
            period: { startDate, endDate },
            income: {
                total: 0,
                cards: 0,      // From GymPass
                visits: 0,     // From FinanceEntry (visit_single, visit_multisport, GYM_SINGLE_VISIT)
                visitCount: 0, // Count of visit transactions
                other: 0       // From FinanceEntry (other income)
            },
            expenses: {
                total: 0,
                items: 0
            },
            netRevenue: 0,
            transactions: [] // Unified list
        };

        // --- Process Gym Passes (Cards) ---
        gymPasses.forEach(pass => {
            const amount = pass.amount || 0;
            report.income.total += amount;
            report.income.cards += amount;

            report.transactions.push({
                _id: pass._id,
                date: pass.createdAt,
                type: 'income',
                category: 'subscription', // or 'card'
                description: `Продажба на карта: ${pass.pricingId?.labelBg || 'N/A'}`, // Pass name
                details: pass.userId ? `${pass.userId.firstName} ${pass.userId.lastName}` : 'Guest',
                amount: amount,
                sourceModel: 'GymPass'
            });
        });

        // --- Process Finance Entries ---
        financeEntries.forEach(entry => {
            const amount = entry.amount || 0;

            if (entry.type === 'income' || entry.type === 'revenue') {
                report.income.total += amount;

                // Check if this is a visit entry
                const isVisit = ['visit_single', 'visit_multisport'].includes(entry.source) ||
                    entry.pricingCode === 'GYM_SINGLE_VISIT' ||
                    entry.itemType === 'gym_visit_single' ||
                    entry.itemType === 'gym_visit_multisport';

                if (isVisit) {
                    report.income.visits += amount;
                    report.income.visitCount += 1;
                } else {
                    report.income.other += amount;
                }

                // Format details name
                let details = 'Guest';
                if (entry.climberId) {
                    details = `${entry.climberId.firstName} ${entry.climberId.lastName}`;
                } else if (entry.personId) {
                    // Fallback for old records if any
                    details = 'Member (Legacy)';
                }

                // Determine category for display
                let category = 'other';
                if (entry.source === 'visit_single' || entry.pricingCode === 'GYM_SINGLE_VISIT' || entry.itemType === 'gym_visit_single') {
                    category = 'visit';
                } else if (entry.source === 'visit_multisport' || entry.itemType === 'gym_visit_multisport') {
                    category = 'multisport';
                }

                report.transactions.push({
                    _id: entry._id,
                    date: entry.date,
                    type: 'income',
                    category: category,
                    description: entry.description || 'Приход',
                    details: details,
                    amount: amount,
                    sourceModel: 'FinanceEntry'
                });

            } else if (entry.type === 'expense') {
                report.expenses.total += amount;
                report.expenses.items += 1; // Count of expense items

                report.transactions.push({
                    _id: entry._id,
                    date: entry.date,
                    type: 'expense',
                    category: 'expense',
                    description: entry.description || 'Разход',
                    details: '',
                    amount: amount,
                    sourceModel: 'FinanceEntry'
                });
            }
        });

        // Calculate Net
        report.netRevenue = report.income.total - report.expenses.total;

        // Sort transactions by date descending
        report.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

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

        // Get training passes sold in period (for stats)
        const trainingPasses = await TrainingPass.find({
            createdAt: { $gte: start, $lte: end },
        }).lean();

        // Get session bookings in period (sessions that occurred)
        const sessions = await Session.find({
            date: { $gte: start, $lte: end },
            status: { $in: ['active', 'completed'] },
        }).lean();

        const sessionIds = sessions.map(s => s._id);

        // Get bookings for these sessions (for stats)
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

        // --- Fetch Finance Entries for Training Area ---
        // This handles both date and createdAt fields (some entries might have null date)
        const financeEntries = await FinanceEntry.find({
            $or: [
                { date: { $gte: start, $lte: end }, area: 'training' },
                { date: null, createdAt: { $gte: start, $lte: end }, area: 'training' }
            ]
        })
            .populate('climberId', 'firstName lastName')
            .lean();

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
            transactions: [] // Initialize transactions array
        };

        report.totalRevenue = report.passesSold.revenue + report.sessionBookings.revenue;
        report.netRevenue = report.totalRevenue - report.coachFees.total;

        // Populate transactions from FinanceEntry records
        financeEntries.forEach(entry => {
            // Use totalAmount primarily, fallback to amount field
            const amount = entry.totalAmount || entry.amount || 0;

            // Format details name
            let details = 'Guest';
            if (entry.climberId) {
                details = `${entry.climberId.firstName} ${entry.climberId.lastName}`;
            }

            // Determine category label based on itemType primarily
            let categoryLabel = 'other';
            if (entry.itemType === 'training_pass') {
                categoryLabel = 'subscription';
            } else if (entry.itemType === 'training_single') {
                categoryLabel = 'visit';
            } else if (entry.source === 'subscription' || entry.itemType === 'pass') {
                categoryLabel = 'subscription';
            } else if (entry.source === 'visit_single' || entry.itemType === 'visit') {
                categoryLabel = 'visit';
            }

            report.transactions.push({
                _id: entry._id,
                date: entry.date || entry.createdAt, // Fallback to createdAt if date is null
                type: entry.type, // 'revenue' or 'expense'
                category: categoryLabel,
                description: entry.description || (entry.type === 'revenue' ? 'Приход' : 'Разход'),
                details: details,
                amount: amount,
                sourceModel: 'FinanceEntry'
            });
        });

        // Sort transactions by date descending
        report.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

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
