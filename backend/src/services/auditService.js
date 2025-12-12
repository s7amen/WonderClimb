import { AuditLog } from '../models/AuditLog.js';
import logger from '../middleware/logging.js';

/**
 * Create a new audit log entry
 * @param {Object|string} user - User ID or User Object performing the action
 * @param {string} action - Action name (e.g. 'USER_LOGIN', 'Create Product')
 * @param {string} resource - Resource name (e.g. 'Auth', 'Product')
 * @param {string|Object} resourceId - ID of the resource
 * @param {Object} details - Additional details (optional)
 * @param {Object} req - Express request object (optional, for IP/UserAgent)
 */
export const log = async (user, action, resource, resourceId = null, details = {}, req = null) => {
    try {
        let userId = user;
        if (user && user._id) {
            userId = user._id;
        }

        const logData = {
            user: userId,
            action,
            resource,
            resourceId,
            details
        };

        if (req) {
            logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            logData.userAgent = req.get('User-Agent');
        }

        await AuditLog.create(logData);
    } catch (error) {
        // We do NOT want to throw error here and break the main application flow
        // just because logging failed. accessing 'logger' might be safe enough.
        logger.error({ err: error, action, resource }, 'Failed to create Audit Log');
    }
};
export const getLogs = async ({ page = 1, limit = 50, action, resource, userId }) => {
    const query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (userId) query.user = userId;

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email') // Populate user details
        .lean();

    const total = await AuditLog.countDocuments(query);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};


