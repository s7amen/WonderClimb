import { config } from '../config/env.js';
import logger from './logging.js';

export const ROLE_LEVEL = {
    climber: 1,
    instructor: 2,
    coach: 3,
    admin: 4,
};

/**
 * Middleware to require a specific exact role.
 * @param {string|string[]} roles - Single role or array of allowed roles
 */
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: { message: 'Authentication required.' }
            });
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        const userRoles = req.user.roles || [];

        const hasRole = userRoles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            logger.warn({ userId: req.user.id, required: allowedRoles, actual: userRoles }, 'Access denied: insufficient role');
            return res.status(403).json({
                error: { message: 'Access denied. You do not have the required role.' }
            });
        }

        next();
    };
};

/**
 * Middleware to require a minimum role level.
 * Hierarchy: climber (1) < instructor (2) < coach (3) < admin (4)
 * @param {string} minRole - The minimum role required
 */
export const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: { message: 'Authentication required.' }
            });
        }

        const minLevel = ROLE_LEVEL[minRole];
        if (!minLevel) {
            logger.error({ minRole }, 'Invalid minimum role specified in middleware');
            return res.status(500).json({ error: { message: 'Server configuration error' } });
        }

        const userRoles = req.user.roles || [];

        // Check if user has ANY role that meets or exceeds the requirement
        const hasSufficientRole = userRoles.some(role => {
            const level = ROLE_LEVEL[role];
            return level && level >= minLevel;
        });

        if (!hasSufficientRole) {
            logger.warn({ userId: req.user.id, requiredMin: minRole, actual: userRoles }, 'Access denied: insufficient role level');
            return res.status(403).json({
                error: { message: `Access denied. Minimum role required: ${minRole}` }
            });
        }

        next();
    };
};
