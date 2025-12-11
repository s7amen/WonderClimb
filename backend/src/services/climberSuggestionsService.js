import { User } from '../models/user.js';
import { GymVisit } from '../models/gymVisit.js';
import { GymPass } from '../models/gymPass.js';
import logger from '../middleware/logging.js';

/**
 * Get recent climbers (newly registered)
 * @param {number} limit - Maximum number of climbers to return
 * @returns {Promise<Array>} Array of recent climbers
 */
export const getRecentClimbers = async (limit = 5) => {
  try {
    const climbers = await User.find({ roles: { $in: ['climber'] } })
      .select('_id firstName middleName lastName phone createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return climbers.map(climber => ({
      id: climber._id.toString(),
      firstName: climber.firstName,
      middleName: climber.middleName || null,
      lastName: climber.lastName,
      phone: climber.phone || '',
      createdAt: climber.createdAt,
    }));
  } catch (error) {
    logger.error({ error: error.message }, 'Error fetching recent climbers');
    throw error;
  }
};

/**
 * Get frequent climbers (most visits in last N days)
 * @param {number} days - Number of days to look back
 * @param {number} limit - Maximum number of climbers to return
 * @returns {Promise<Array>} Array of frequent climbers with visit counts
 */
export const getFrequentClimbers = async (days = 20, limit = 10) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate visits by userId
    const visitStats = await GymVisit.aggregate([
      {
        $match: {
          userId: { $ne: null },
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$userId',
          visitCount: { $sum: 1 },
          lastVisit: { $max: '$date' },
        },
      },
      {
        $sort: { visitCount: -1, lastVisit: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    if (visitStats.length === 0) {
      return [];
    }

    // Get user details for these IDs
    const userIds = visitStats.map(stat => stat._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id firstName middleName lastName phone')
      .lean();

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Combine visit stats with user data
    return visitStats
      .map(stat => {
        const user = userMap.get(stat._id.toString());
        if (!user) return null;

        return {
          id: user._id.toString(),
          firstName: user.firstName,
          middleName: user.middleName || null,
          lastName: user.lastName,
          phone: user.phone || '',
          visitCount: stat.visitCount,
          lastVisit: stat.lastVisit,
        };
      })
      .filter(Boolean);
  } catch (error) {
    logger.error({ error: error.message, days, limit }, 'Error fetching frequent climbers');
    throw error;
  }
};

/**
 * Get climbers with expired passes (recently expired)
 * @param {number} limit - Maximum number of climbers to return
 * @returns {Promise<Array>} Array of climbers with expired passes
 */
export const getExpiredPassClimbers = async (limit = 10) => {
  try {
    const now = new Date();

    // Find expired passes (get more to dedupe users)
    const expiredPasses = await GymPass.find({
      userId: { $ne: null },
      isActive: true,
      validUntil: { $lt: now },
    })
      .select('userId validUntil')
      .sort({ validUntil: -1 })
      .limit(50) // Get more to dedupe
      .lean();

    if (expiredPasses.length === 0) {
      return [];
    }

    // Deduplicate by userId, keeping the most recent expiry date
    const userExpiryMap = new Map();
    expiredPasses.forEach(pass => {
      const userId = pass.userId.toString();
      if (!userExpiryMap.has(userId) || 
          new Date(pass.validUntil) > new Date(userExpiryMap.get(userId).validUntil)) {
        userExpiryMap.set(userId, {
          userId: pass.userId,
          validUntil: pass.validUntil,
        });
      }
    });

    // Sort by expiry date (most recent first) and limit
    const sortedExpiries = Array.from(userExpiryMap.values())
      .sort((a, b) => new Date(b.validUntil) - new Date(a.validUntil))
      .slice(0, limit);

    // Get user details
    const userIds = sortedExpiries.map(e => e.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id firstName middleName lastName phone')
      .lean();

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const expiryMap = new Map(sortedExpiries.map(e => [e.userId.toString(), e]));

    // Combine user data with expiry info
    return sortedExpiries
      .map(expiry => {
        const user = userMap.get(expiry.userId.toString());
        if (!user) return null;

        const daysSinceExpiry = Math.floor(
          (now - new Date(expiry.validUntil)) / (1000 * 60 * 60 * 24)
        );

        return {
          id: user._id.toString(),
          firstName: user.firstName,
          middleName: user.middleName || null,
          lastName: user.lastName,
          phone: user.phone || '',
          lastExpiredAt: expiry.validUntil,
          daysSinceExpiry,
        };
      })
      .filter(Boolean);
  } catch (error) {
    logger.error({ error: error.message, limit }, 'Error fetching expired pass climbers');
    throw error;
  }
};

/**
 * Get suggestions based on context
 * @param {string} context - 'check-in' or 'pass'
 * @returns {Promise<Object>} Object with suggestion groups
 */
export const getSuggestions = async (context = 'check-in') => {
  try {
    const result = {
      recentClimbers: [],
      frequentClimbers: [],
      expiredPassClimbers: [],
    };

    // Always get recent climbers
    result.recentClimbers = await getRecentClimbers(5);

    // Context-specific suggestions
    if (context === 'check-in') {
      // For check-in: show frequent climbers
      result.frequentClimbers = await getFrequentClimbers(20, 10);
    } else if (context === 'pass') {
      // For pass creation: show climbers with expired passes
      result.expiredPassClimbers = await getExpiredPassClimbers(10);
    }

    return result;
  } catch (error) {
    logger.error({ error: error.message, context }, 'Error getting climber suggestions');
    throw error;
  }
};


