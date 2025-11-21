import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import logger from './logging.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Authentication required. Please provide a valid token.',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      // Ensure roles is always an array
      if (decoded.roles && !Array.isArray(decoded.roles)) {
        decoded.roles = [decoded.roles];
      }
      // Ensure roles exists even if empty
      if (!decoded.roles) {
        decoded.roles = [];
      }
      
      logger.info({
        userId: decoded.id,
        email: decoded.email,
        roles: decoded.roles,
        rolesType: typeof decoded.roles,
        rolesIsArray: Array.isArray(decoded.roles),
        path: req.path,
      }, 'Token decoded');
      
      req.user = decoded; // Attach user info to request
      next();
    } catch (tokenError) {
      logger.warn({ tokenError: tokenError.message }, 'Invalid token');
      return res.status(401).json({
        error: {
          message: 'Invalid or expired token.',
        },
      });
    }
  } catch (error) {
    logger.error({ error }, 'Authentication middleware error');
    return res.status(500).json({
      error: {
        message: 'Authentication error',
      },
    });
  }
};

export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

