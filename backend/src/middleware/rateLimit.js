import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

/**
 * Helper function to create rate limit handler with Retry-After header
 */
const createRateLimitHandler = (defaultMessage, windowMs = 15 * 60 * 1000) => {
  return (req, res) => {
    // Try to get resetTime from rateLimit object, or calculate from windowMs
    let resetTime;
    if (req.rateLimit?.resetTime) {
      resetTime = req.rateLimit.resetTime;
    } else if (req.rateLimit?.resetTimeMs) {
      resetTime = req.rateLimit.resetTimeMs;
    } else {
      // Fallback: calculate reset time as current time + window duration
      resetTime = Date.now() + windowMs;
    }

    const remainingTime = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)); // seconds until reset (min 1)
    const remainingMinutes = Math.ceil(remainingTime / 60);

    // Set Retry-After header (in seconds)
    res.set('Retry-After', remainingTime);

    res.status(429).json({
      error: {
        message: defaultMessage,
        details: {
          retryAfter: remainingTime,
          retryAfterMinutes: remainingMinutes,
          resetTime: new Date(resetTime).toISOString(),
        },
      },
    });
  };
};

/**
 * Rate limiter for authentication endpoints
 * More lenient in development to allow testing
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 50 : 10, // 50 in dev, 10 in production per windowMs
  message: {
    error: {
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts, please try again later', 15 * 60 * 1000),
  // Use email as key if available, otherwise fall back to IP
  keyGenerator: (req) => {
    // Try to use email from body to rate limit per user instead of per IP
    // This prevents one user from blocking others on the same network
    if (req.body?.email) {
      return req.body.email.toLowerCase().trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for localhost in development and test environment
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');
    }
    return false;
  },
});

/**
 * Rate limiter for booking endpoints
 * Increased limit to handle React Strict Mode double renders
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Increased from 20 to 30 to handle React Strict Mode double renders
  message: {
    error: {
      message: 'Too many booking requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many booking requests, please try again later', 15 * 60 * 1000),
});

/**
 * General API rate limiter
 * More lenient in development mode to handle React Strict Mode double renders
 * Increased production limit from 100 to 150 to accommodate React Strict Mode
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 1000 : 150, // Increased from 100 to 150 in production for React Strict Mode
  message: {
    error: {
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests, please try again later', 15 * 60 * 1000),
  skip: (req) => {
    // Skip rate limiting for localhost in development and test environment
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');
    }
    return false;
  },
});

