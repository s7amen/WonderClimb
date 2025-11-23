import logger from './logging.js';

/**
 * Middleware to check if user has required role(s)
 * @param {...string} allowedRoles - One or more roles that are allowed
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
        },
      });
    }

    // Normalize user roles - ensure it's always an array of strings
    let userRoles = [];
    if (Array.isArray(req.user.roles)) {
      userRoles = req.user.roles.map(role => String(role).toLowerCase().trim()).filter(Boolean);
    } else if (req.user.roles) {
      // Handle case where roles might be a string representation of an array
      try {
        const parsed = typeof req.user.roles === 'string' && req.user.roles.startsWith('[') 
          ? JSON.parse(req.user.roles) 
          : req.user.roles;
        if (Array.isArray(parsed)) {
          userRoles = parsed.map(role => String(role).toLowerCase().trim()).filter(Boolean);
        } else {
          userRoles = [String(parsed).toLowerCase().trim()].filter(Boolean);
        }
      } catch (e) {
        // If parsing fails, treat as single role string
        userRoles = [String(req.user.roles).toLowerCase().trim()].filter(Boolean);
      }
    }
    
    // Normalize allowed roles - ensure they're lowercase strings
    const normalizedAllowedRoles = allowedRoles.map(role => String(role).toLowerCase().trim());
    
    const hasRequiredRole = normalizedAllowedRoles.some(role => userRoles.includes(role));

    logger.info({
      userId: req.user.id,
      email: req.user.email,
      userRoles,
      userRolesRaw: req.user.roles,
      userRolesType: typeof req.user.roles,
      userRolesIsArray: Array.isArray(req.user.roles),
      requiredRoles: normalizedAllowedRoles,
      hasRequiredRole,
      path: req.path,
      method: req.method,
    }, 'Role check');

    if (!hasRequiredRole) {
      logger.warn({
        userId: req.user.id,
        userRoles,
        userRolesRaw: req.user.roles,
        userRolesType: typeof req.user.roles,
        userRolesIsArray: Array.isArray(req.user.roles),
        requiredRoles: normalizedAllowedRoles,
        path: req.path,
        method: req.method,
        fullUser: req.user,
      }, 'Access denied: insufficient role');

      return res.status(403).json({
        error: {
          message: 'Access denied. Insufficient permissions.',
          details: {
            userRoles,
            requiredRoles: normalizedAllowedRoles,
          },
        },
      });
    }

    next();
  };
};

/**
 * Helper to check if user has a specific role
 */
export const hasRole = (user, role) => {
  return user && user.roles && user.roles.includes(role);
};

/**
 * Helper to check if user has any of the specified roles
 */
export const hasAnyRole = (user, ...roles) => {
  return user && user.roles && roles.some(role => user.roles.includes(role));
};

/**
 * Middleware to ensure user can only access their own data or their children's data
 * For climbers - ensures they can only access their own linked children
 */
export const requireOwnershipOrRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
        },
      });
    }

    // Admins and other allowed roles bypass ownership checks
    if (hasAnyRole(req.user, 'admin', ...allowedRoles)) {
      return next();
    }

    // For climbers, ownership is checked at the service/route level
    // This middleware just ensures they're authenticated
    next();
  };
};

