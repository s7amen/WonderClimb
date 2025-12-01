import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

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
    // Skip rate limiting for localhost in development
    if (config.nodeEnv === 'development') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');
    }
    return false;
  },
});

/**
 * Rate limiter for booking endpoints
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 booking requests per windowMs
  message: {
    error: {
      message: 'Too many booking requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * More lenient in development mode to handle React Strict Mode double renders
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 1000 : 100, // Much higher limit in development
  message: {
    error: {
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (config.nodeEnv === 'development') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');
    }
    return false;
  },
});

