import { adminUsersAPI } from '../services/api';

let climbersCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get all climbers, using cache if available
 * @returns {Promise<Array>} Array of climber objects
 */
export const getClimbers = async () => {
  if (climbersCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return climbersCache;
  }

  try {
    // Fetch all climbers (limit: 0 means no limit)
    const response = await adminUsersAPI.getAll({ role: 'climber', limit: 0 });
    climbersCache = response.data.users || [];
    cacheTimestamp = Date.now();
    return climbersCache;
  } catch (error) {
    console.error('Error fetching climbers:', error);
    // Return cached data if available, even if expired
    if (climbersCache) {
      return climbersCache;
    }
    throw error;
  }
};

/**
 * Clear the climbers cache
 */
export const clearCache = () => {
  climbersCache = null;
  cacheTimestamp = null;
};

/**
 * Get cache status
 * @returns {Object} Cache status info
 */
export const getCacheStatus = () => {
  if (!climbersCache) {
    return { cached: false, age: null, count: 0 };
  }

  const age = Date.now() - cacheTimestamp;
  return {
    cached: true,
    age,
    ageMinutes: Math.floor(age / 60000),
    count: climbersCache.length,
    expired: age > CACHE_DURATION,
  };
};




