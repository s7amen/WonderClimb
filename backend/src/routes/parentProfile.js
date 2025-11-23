import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { User } from '../models/user.js';
import { getBookingsForUser } from '../services/bookingService.js';
import { getClimbersForParent } from '../services/parentClimberService.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// All routes require authentication and climber role
// Climbers can access these routes to manage their own profile and bookings
router.use(authenticate);
router.use(requireRole('admin', 'climber'));

// Log all requests to this router for debugging
router.use((req, res, next) => {
  logger.info({ 
    path: req.path, 
    method: req.method,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  }, 'ParentProfile router - request received');
  next();
});

/**
 * GET /api/v1/parents/me/profile
 * Get parent profile information
 */
router.get('/me/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('firstName middleName lastName email phone roles accountStatus createdAt updatedAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/parents/me/profile
 * Update parent profile information
 */
router.put('/me/profile', async (req, res, next) => {
  try {
    logger.info({ 
      path: req.path, 
      method: req.method,
      userId: req.user?.id,
      body: req.body 
    }, 'PUT /me/profile called');
    
    const userId = req.user.id;
    const { firstName, middleName, lastName, phone } = req.body;

    // Only allow updating name fields and phone, not email or roles
    const updateData = {};
    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
    }
    if (middleName !== undefined) {
      updateData.middleName = middleName ? middleName.trim() : null;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('firstName middleName lastName email phone roles accountStatus createdAt updatedAt');

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    logger.info({ userId }, 'Parent profile updated');
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/parents/me/bookings
 * Get bookings for the authenticated parent
 */
router.get('/me/bookings', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const filters = {
      status: req.query.status,
      climberId: req.query.climberId,
    };

    // If climber, get their linked children and include bookings for all of them
    if (userRoles.includes('climber')) {
      const climbers = await getClimbersForParent(userId);
      const climberIds = climbers.map(c => c._id.toString());

      // Fetch bookings for all linked children
      const allBookings = [];
      for (const climberId of climberIds) {
        const bookings = await getBookingsForUser(userId, userRoles, {
          ...filters,
          climberId,
        });
        allBookings.push(...bookings);
      }

      // Also include bookings where user is the booker
      const userBookings = await getBookingsForUser(userId, userRoles, filters);
      allBookings.push(...userBookings);

      // Remove duplicates
      const uniqueBookings = Array.from(
        new Map(allBookings.map(b => [b._id.toString(), b])).values()
      );

      return res.json({ bookings: uniqueBookings });
    }

    // Admin users without climber role get empty bookings (they can use admin endpoints)
    if (userRoles.includes('admin') && !userRoles.includes('climber')) {
      return res.json({ bookings: [] });
    }

    const bookings = await getBookingsForUser(userId, userRoles, filters);
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

export default router;

