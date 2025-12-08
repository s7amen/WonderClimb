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
      try {
        const climbers = await getClimbersForParent(userId);
        // Safely extract climber IDs, filtering out any null/undefined values
        const climberIds = climbers
          .filter(c => c && c._id)
          .map(c => c._id.toString());

        // Fetch bookings for all linked children
        const allBookings = [];
        for (const climberId of climberIds) {
          try {
            const bookings = await getBookingsForUser(userId, userRoles, {
              ...filters,
              climberId,
            });
            allBookings.push(...bookings);
          } catch (error) {
            logger.error({ error, userId, climberId }, 'Error fetching bookings for specific climber');
            // Continue with other climbers even if one fails
          }
        }

        // Also include bookings where user is the booker
        const userBookings = await getBookingsForUser(userId, userRoles, filters);
        allBookings.push(...userBookings);

        // Remove duplicates by _id first
        const uniqueById = Array.from(
          new Map(allBookings.map(b => [b._id.toString(), b])).values()
        );

        // Remove duplicates by sessionId+climberId+status='booked' (keep most recent)
        // This prevents showing duplicate active bookings for the same session and climber
        const bookingKeyMap = new Map();
        uniqueById.forEach(booking => {
          const sessionId = booking.sessionId?._id?.toString() || booking.sessionId?.toString() || booking.session?._id?.toString();
          const climberId = booking.climberId?._id?.toString() || booking.climberId?.toString() || booking.climber?._id?.toString();
          const status = booking.status;

          // Only deduplicate active bookings (status='booked')
          if (status === 'booked' && sessionId && climberId) {
            const key = `${sessionId}_${climberId}_${status}`;
            const existing = bookingKeyMap.get(key);

            // Keep the most recent booking (by createdAt)
            const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date(0);
            const existingDate = existing?.createdAt ? new Date(existing.createdAt) : new Date(0);
            if (!existing || bookingDate > existingDate) {
              bookingKeyMap.set(key, booking);
            }
          } else {
            // For cancelled bookings or missing data, keep all
            bookingKeyMap.set(`${booking._id}_${Date.now()}`, booking);
          }
        });

        // Convert map values back to array
        const finalBookings = Array.from(bookingKeyMap.values());

        logger.info({
          userId,
          totalBookings: allBookings.length,
          uniqueById: uniqueById.length,
          finalBookings: finalBookings.length,
        }, 'Bookings deduplication completed');

        return res.json({ bookings: finalBookings });
      } catch (climberError) {
        logger.error({
          error: climberError.message,
          stack: climberError.stack,
          name: climberError.name,
          userId
        }, 'Error fetching climber bookings - returning empty array');
        return res.json({ bookings: [] });
      }
    }

    // Admin users without climber role get empty bookings (they can use admin endpoints)
    if (userRoles.includes('admin') && !userRoles.includes('climber')) {
      return res.json({ bookings: [] });
    }

    const bookings = await getBookingsForUser(userId, userRoles, filters);

    // Remove duplicates by sessionId+climberId+status='booked' (keep most recent)
    const bookingKeyMap = new Map();
    bookings.forEach(booking => {
      const sessionId = booking.sessionId?._id?.toString() || booking.sessionId?.toString() || booking.session?._id?.toString();
      const climberId = booking.climberId?._id?.toString() || booking.climberId?.toString() || booking.climber?._id?.toString();
      const status = booking.status;

      // Only deduplicate active bookings (status='booked')
      if (status === 'booked' && sessionId && climberId) {
        const key = `${sessionId}_${climberId}_${status}`;
        const existing = bookingKeyMap.get(key);

        // Keep the most recent booking (by createdAt)
        const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date(0);
        const existingDate = existing.createdAt ? new Date(existing.createdAt) : new Date(0);
        if (!existing || bookingDate > existingDate) {
          bookingKeyMap.set(key, booking);
        }
      } else {
        // For cancelled bookings or missing data, keep all
        bookingKeyMap.set(`${booking._id}_${Date.now()}`, booking);
      }
    });

    const finalBookings = Array.from(bookingKeyMap.values());

    logger.info({
      userId,
      totalBookings: bookings.length,
      finalBookings: finalBookings.length,
    }, 'Bookings deduplication completed');

    res.json({ bookings: finalBookings });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Critical error in /me/bookings endpoint - returning empty array');
    res.json({ bookings: [] });
  }
});

export default router;

