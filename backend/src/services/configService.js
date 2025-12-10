import { config } from '../config/env.js';
import { getSettings } from './settingsService.js';
import logger from '../middleware/logging.js';

let cachedSettings = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear the settings cache (call this when settings are updated)
 */
export const clearSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = null;
};

/**
 * Get cached settings or fetch fresh ones
 */
const getCachedSettings = async () => {
  const now = Date.now();
  if (cachedSettings && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }
  
  try {
    cachedSettings = await getSettings();
    cacheTimestamp = now;
    return cachedSettings;
  } catch (error) {
    // If database fetch fails, return null to use env fallback
    logger.warn({ error: error.message }, 'Failed to fetch settings from database, using env fallback');
    return null;
  }
};

/**
 * Get booking horizon in hours
 * Reads from database settings, falls back to env variable
 */
export const getBookingHorizonHours = async () => {
  const settings = await getCachedSettings();
  if (settings && settings.bookingHorizonHours !== undefined) {
    return settings.bookingHorizonHours;
  }
  return config.bookingHorizonHours;
};

/**
 * Get cancellation window in hours
 * Reads from database settings, falls back to env variable
 */
export const getCancellationWindowHours = async () => {
  const settings = await getCachedSettings();
  if (settings && settings.cancellationWindowHours !== undefined) {
    return settings.cancellationWindowHours;
  }
  return config.cancellationWindowHours;
};

/**
 * Check if a date is within booking horizon
 * Returns true if session is at least bookingHorizonHours away from now
 * (i.e., we cannot book sessions that are too close)
 */
export const isWithinBookingHorizon = async (sessionDate) => {
  const now = new Date();
  const horizonHours = await getBookingHorizonHours();
  
  // Calculate time difference in hours
  const timeDiffMs = sessionDate.getTime() - now.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
  
  // Session must be in the future AND at least horizonHours away
  return timeDiffHours >= horizonHours;
};

/**
 * Check if cancellation is allowed (within cancellation window)
 */
export const isCancellationAllowed = async (sessionDate) => {
  const now = new Date();
  const cancellationDeadline = new Date(sessionDate);
  const windowHours = await getCancellationWindowHours();
  cancellationDeadline.setHours(cancellationDeadline.getHours() - windowHours);

  return now < cancellationDeadline;
};

