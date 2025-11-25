import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createBooking,
  createMultipleBookings,
  cancelBooking,
  createRecurringBookings,
  getBookingsForUser,
} from '../services/bookingService.js';
import { User } from '../models/user.js';
import { Session } from '../models/session.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/bookings
 * Create booking(s) - supports both single and multiple bookings
 * Supports both parent booking for children and climber booking for themselves
 * Accepts either climberId (single, backward compatible) or climberIds (array, new multi-booking)
 */
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, climberId, climberIds } = req.body;
    const userId = req.user.id;
    // Normalize roles to ensure it's always an array
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.roles ? [req.user.roles] : []);
    
    logger.info({
      userId,
      userRoles,
      sessionId,
      climberId,
      climberIds,
      path: req.path,
    }, 'POST /bookings - Creating booking(s)');

    if (!sessionId) {
      return res.status(400).json({
        error: {
          message: 'sessionId is required',
        },
      });
    }

    // Handle multiple bookings (climberIds array)
    if (climberIds && Array.isArray(climberIds) && climberIds.length > 0) {
      const results = await createMultipleBookings(sessionId, climberIds, userId, userRoles);
      
      // Fetch session details for response
      const session = await Session.findById(sessionId);
      
      // Build summary with climber names and session time
      const successful = [];
      const failed = [];
      
      for (const result of results) {
        if (result.success) {
          const climber = await User.findById(result.climberId);
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown';
          const sessionTime = session ? new Date(session.date).toTimeString().substring(0, 5) : '';
          
          successful.push({
            climberId: result.climberId,
            climberName,
            sessionTime,
            bookingId: result.booking?._id,
          });
        } else {
          const climber = await User.findById(result.climberId);
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown';
          
          failed.push({
            climberId: result.climberId,
            climberName,
            reason: result.error || 'Unknown error',
          });
        }
      }
      
      return res.status(201).json({
        bookings: results.filter(r => r.success).map(r => r.booking),
        summary: {
          successful,
          failed,
        },
      });
    }

    // Handle single booking (backward compatibility with climberId)
    // If climberId not provided and user is a climber, use their own user ID
    let targetClimberId = climberId;
    if (!targetClimberId && userRoles.includes('climber')) {
      // Verify user has climber role
      const user = await User.findById(userId);
      if (!user || !user.roles.includes('climber')) {
        return res.status(400).json({
          error: {
            message: 'User does not have climber role',
          },
        });
      }
      targetClimberId = userId;
    }

    if (!targetClimberId) {
      return res.status(400).json({
        error: {
          message: 'climberId or climberIds is required',
        },
      });
    }

    const booking = await createBooking(sessionId, targetClimberId, userId, userRoles);
    
    // Fetch climber and session details for response
    const climber = await User.findById(targetClimberId);
    const session = await Session.findById(sessionId);
    const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown';
    const sessionTime = session ? new Date(session.date).toTimeString().substring(0, 5) : '';
    
    res.status(201).json({
      booking,
      summary: {
        successful: [{
          climberId: targetClimberId,
          climberName,
          sessionTime,
          bookingId: booking._id,
        }],
        failed: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/bookings/recurring
 * Create recurring bookings
 * Accepts either climberId (single, backward compatible) or climberIds (array, new multi-booking)
 */
router.post('/recurring', async (req, res, next) => {
  try {
    const { climberId, climberIds, daysOfWeek, startDate, endDate, time, durationMinutes } = req.body;
    const userId = req.user.id;
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.roles ? [req.user.roles] : []);

    if ((!climberId && (!climberIds || !Array.isArray(climberIds) || climberIds.length === 0)) || 
        !daysOfWeek || !startDate || !endDate || !durationMinutes) {
      return res.status(400).json({
        error: {
          message: 'climberId or climberIds, daysOfWeek, startDate, endDate, and durationMinutes are required',
        },
      });
    }

    // Handle multiple climbers
    const targetClimberIds = climberIds && Array.isArray(climberIds) && climberIds.length > 0 
      ? climberIds 
      : [climberId];

    // Convert day numbers (0-6) to day names if needed
    const dayOfWeekMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };
    
    let normalizedDaysOfWeek = daysOfWeek;
    // Check if daysOfWeek contains numbers (0-6) instead of day names
    if (daysOfWeek && daysOfWeek.length > 0 && typeof daysOfWeek[0] === 'number') {
      normalizedDaysOfWeek = daysOfWeek.map(day => dayOfWeekMap[day] || day);
    }

    const allResults = {
      successful: [],
      failed: [],
    };

    // Create recurring bookings for each climber
    for (const targetClimberId of targetClimberIds) {
      try {
        const results = await createRecurringBookings(targetClimberId, userId, userRoles, {
          daysOfWeek: normalizedDaysOfWeek,
          startDate,
          endDate,
          time,
          durationMinutes,
        });

        const climber = await User.findById(targetClimberId);
        const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown';
        
        if (results.successful && results.successful.length > 0) {
          allResults.successful.push({
            climberId: targetClimberId,
            climberName,
            count: results.successful.length,
            bookings: results.successful,
          });
        }
        
        if (results.failed && results.failed.length > 0) {
          allResults.failed.push({
            climberId: targetClimberId,
            climberName,
            failures: results.failed,
            reason: results.failed.map(f => f.reason).join('; '),
          });
        }
      } catch (error) {
        const climber = await User.findById(targetClimberId);
        const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown';
        allResults.failed.push({
          climberId: targetClimberId,
          climberName,
          reason: error.message || 'Unknown error',
        });
      }
    }

    res.status(201).json({
      summary: allResults,
      created: allResults.successful.reduce((sum, item) => sum + (item.count || 0), 0),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/bookings/:bookingId
 * Cancel a booking
 */
router.delete('/:bookingId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Normalize roles to ensure it's always an array
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.roles ? [req.user.roles] : []);
    const booking = await cancelBooking(req.params.bookingId, userId, userRoles);
    res.json({ booking, message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

