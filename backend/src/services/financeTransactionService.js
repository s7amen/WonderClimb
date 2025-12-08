import { FinanceTransaction } from '../models/financeTransaction.js';
import { FinanceEntry } from '../models/financeEntry.js'; // Ensure model is registered
import logger from '../middleware/logging.js';

/**
 * Get finance transactions with filters and pagination
 */
export const getFinanceTransactions = async (filters = {}, pagination = {}) => {
    try {
        const { startDate, endDate, handledById, payerClimberId } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (startDate || endDate) {
            query.paidAt = {};
            if (startDate) {
                query.paidAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.paidAt.$lte = new Date(endDate);
            }
        }

        if (handledById) {
            query.handledById = handledById;
        }

        if (payerClimberId) {
            query.payerClimberId = payerClimberId;
        }

        const skip = (page - 1) * limit;

        // Perform query
        const [transactions, total] = await Promise.all([
            FinanceTransaction.find(query)
                .populate('handledById', 'firstName lastName email') // Staff
                .populate('payerClimberId', 'firstName lastName email') // Client
                .populate({
                    path: 'entries',
                    select: 'itemType quantity unitAmount totalAmount description type area climberId pricingCode',
                    populate: {
                        path: 'climberId', // Populate beneficiary if needed
                        select: 'firstName lastName'
                    }
                })
                .sort({ paidAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }), // Important: virtuals: true to include 'entries' in lean
            FinanceTransaction.countDocuments(query),
        ]);

        return {
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching finance transactions');
        throw error;
    }
};
