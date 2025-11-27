import mongoose from 'mongoose';
import { Booking } from '../models/booking.js';
import { Session } from '../models/session.js';
import { User } from '../models/user.js';
import { isWithinBookingHorizon, isCancellationAllowed } from './configService.js';
import { isClimberLinkedToParent } from './parentClimberLinkService.js';
import { getMessage } from './settingsService.js';
import logger from '../middleware/logging.js';

/**
 * Get current booking count for a session
 */
const getSessionBookingCount = async (sessionId) => {
  return Booking.countDocuments({
    sessionId,
    status: 'booked',
  });
};

/**
 * Check if session has capacity
 */
const hasCapacity = async (sessionId) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    return false;
  }

  const bookingCount = await getSessionBookingCount(sessionId);
  return bookingCount < session.capacity;
};

/**
 * Create multiple bookings for a single session
 * Returns array of results with success/failure for each climber
 */
export const createMultipleBookings = async (sessionId, climberIds, bookedById, userRoles = []) => {
  const results = [];
  
  // Verify session exists once
  const session = await Session.findById(sessionId);
  if (!session) {
    // If session doesn't exist, fail all
    const sessionNotFoundMsg = await getMessage('sessionNotFound');
    return climberIds.map(climberId => ({
      success: false,
      climberId,
      error: sessionNotFoundMsg,
    }));
  }

  // Create bookings for each climber
  for (const climberId of climberIds) {
    try {
      const booking = await createBooking(sessionId, climberId, bookedById, userRoles);
      results.push({
        success: true,
        climberId,
        booking,
      });
    } catch (error) {
      results.push({
        success: false,
        climberId,
        error: error.message || 'Unknown error',
        statusCode: error.statusCode || 500,
      });
    }
  }

  logger.info({
    sessionId,
    totalRequested: climberIds.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  }, 'Multiple bookings created');

  return results;
};

/**
 * Create a single booking
 */
export const createBooking = async (sessionId, climberId, bookedById, userRoles = []) => {
  try {
    // Verify session exists and is active
    const session = await Session.findById(sessionId);
    if (!session) {
      const error = new Error(await getMessage('sessionNotFound'));
      error.statusCode = 404;
      throw error;
    }

    if (session.status !== 'active') {
      const error = new Error(await getMessage('sessionNotActive'));
      error.statusCode = 400;
      throw error;
    }

    // Check booking horizon
    if (!isWithinBookingHorizon(session.date)) {
      const error = new Error(await getMessage('sessionOutsideBookingHorizon'));
      error.statusCode = 400;
      throw error;
    }

    // Check if session is in the past
    if (session.date <= new Date()) {
      const error = new Error(await getMessage('cannotBookPastSessions'));
      error.statusCode = 400;
      throw error;
    }

    // Verify climber exists and has climber role
    const climber = await User.findOne({ 
      _id: climberId, 
      roles: { $in: ['climber'] } 
    });
    if (!climber) {
      const error = new Error(await getMessage('climberNotFound'));
      error.statusCode = 404;
      throw error;
    }

    // Check ownership: parent can only book for their children, climber can book for themselves
    // Admin and coach can book any climber (bypass ownership checks)
    // Normalize userRoles to ensure it's an array
    const normalizedRoles = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
    
    logger.info({
      bookedById,
      climberId,
      userRoles: normalizedRoles,
      climberIdStr: climber._id.toString(),
      isAdmin: normalizedRoles.includes('admin'),
      isCoach: normalizedRoles.includes('coach'),
      isClimber: normalizedRoles.includes('climber'),
    }, 'Checking booking ownership');
    
    if (!normalizedRoles.includes('admin') && !normalizedRoles.includes('coach')) {
      if (normalizedRoles.includes('climber')) {
        // Climbers can book for themselves or their linked children
        const normalizedClimberId = mongoose.Types.ObjectId.isValid(climberId) 
          ? new mongoose.Types.ObjectId(climberId).toString() 
          : climberId;
        const normalizedBookedById = mongoose.Types.ObjectId.isValid(bookedById) 
          ? new mongoose.Types.ObjectId(bookedById).toString() 
          : bookedById;
        
        // Check if booking for linked child
        const isLinked = await isClimberLinkedToParent(normalizedBookedById, normalizedClimberId);
        logger.info({
          bookedById,
          climberId,
          normalizedBookedById,
          normalizedClimberId,
          isLinked,
          climberIdStr: climber._id.toString(),
        }, 'Climber booking ownership check');
        
        if (!isLinked && climber._id.toString() !== normalizedBookedById) {
          const error = new Error(await getMessage('climberCanOnlyBookForSelf'));
          error.statusCode = 403;
          throw error;
        }
      } else {
        // User doesn't have climber role
        const error = new Error(await getMessage('userMustHaveClimberRole'));
        error.statusCode = 403;
        throw error;
      }
    }

    // Check for duplicate booking
    const existingBooking = await Booking.findOne({
      sessionId,
      climberId,
      status: 'booked',
    });

    if (existingBooking) {
      const error = new Error(await getMessage('alreadyRegistered'));
      error.statusCode = 409;
      throw error;
    }

    // Check capacity (atomic check)
    const currentCount = await getSessionBookingCount(sessionId);
    if (currentCount >= session.capacity) {
      const error = new Error(await getMessage('sessionFull'));
      error.statusCode = 409;
      throw error;
    }

    // Create booking
    const booking = new Booking({
      sessionId,
      climberId,
      bookedById,
      status: 'booked',
    });

    await booking.save();

    logger.info({
      bookingId: booking._id,
      sessionId,
      climberId,
      bookedById,
    }, 'Booking created successfully');

    return booking;
  } catch (error) {
    logger.error({
      error: error.message,
      sessionId,
      climberId,
      bookedById,
    }, 'Error creating booking');
    throw error;
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId, userId, userRoles = []) => {
  try {
    const booking = await Booking.findById(bookingId).populate('sessionId');
    if (!booking) {
      const error = new Error(await getMessage('bookingNotFound'));
      error.statusCode = 404;
      throw error;
    }

    if (booking.status === 'cancelled') {
      const error = new Error(await getMessage('bookingAlreadyCancelled'));
      error.statusCode = 400;
      throw error;
    }

    // Check ownership - normalize both IDs to strings for reliable comparison
    const normalizedUserId = String(userId);
    const normalizedBookedById = String(booking.bookedById);
    const normalizedRoles = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
    
    // Admins and coaches can cancel any booking, others can only cancel their own
    if (!normalizedRoles.includes('admin') && !normalizedRoles.includes('coach') && normalizedBookedById !== normalizedUserId) {
      const error = new Error(await getMessage('cannotCancelOwnBookings'));
      error.statusCode = 403;
      throw error;
    }

    const session = booking.sessionId;
    if (!session || typeof session.date === 'string') {
      // If populate didn't work, fetch session separately
      const sessionDoc = await Session.findById(booking.sessionId);
      if (!sessionDoc) {
        const error = new Error(await getMessage('sessionNotFound'));
        error.statusCode = 404;
        throw error;
      }

      // Check cancellation window
      if (!isCancellationAllowed(sessionDoc.date)) {
        const error = new Error(await getMessage('cancellationPeriodExpired'));
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Check cancellation window
      if (!isCancellationAllowed(session.date)) {
        const error = new Error(await getMessage('cancellationPeriodExpired'));
        error.statusCode = 400;
        throw error;
      }
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    logger.info({
      bookingId: booking._id,
      sessionId: booking.sessionId,
      climberId: booking.climberId,
      userId,
    }, 'Booking cancelled successfully');

    return booking;
  } catch (error) {
    logger.error({
      error: error.message,
      bookingId,
      userId,
    }, 'Error cancelling booking');
    throw error;
  }
};

/**
 * Create recurring bookings (days of week + date range)
 */
export const createRecurringBookings = async (climberId, bookedById, userRoles, options) => {
  const { daysOfWeek, startDate, endDate, time, durationMinutes } = options;

  try {
    // Find all matching sessions within date range and booking horizon
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Get sessions that match the criteria
    const matchingSessions = await Session.find({
      status: 'active',
      date: {
        $gte: start,
        $lte: end,
      },
      durationMinutes,
    });

    // Filter by day of week and time
    const dayOfWeekMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    const filteredSessions = matchingSessions.filter(session => {
      const sessionDate = new Date(session.date);
      const sessionDayOfWeek = dayOfWeekMap[sessionDate.getDay()];
      const sessionTime = sessionDate.toTimeString().substring(0, 5); // HH:MM

      return daysOfWeek.includes(sessionDayOfWeek.toLowerCase()) &&
             (!time || sessionTime === time) &&
             isWithinBookingHorizon(session.date) &&
             session.date > now;
    });

    const results = {
      successful: [],
      failed: [],
    };

    // Attempt to book each matching session
    for (const session of filteredSessions) {
      try {
        // Check capacity before attempting
        if (await hasCapacity(session._id)) {
          const booking = await createBooking(session._id, climberId, bookedById, userRoles);
          results.successful.push({
            sessionId: session._id,
            bookingId: booking._id,
            date: session.date,
          });
        } else {
          const sessionFullMsg = await getMessage('sessionFull');
          results.failed.push({
            sessionId: session._id,
            date: session.date,
            reason: sessionFullMsg,
          });
        }
      } catch (error) {
        results.failed.push({
          sessionId: session._id,
          date: session.date,
          reason: error.message,
        });
      }
    }

    logger.info({
      climberId,
      bookedById,
      successfulCount: results.successful.length,
      failedCount: results.failed.length,
    }, 'Recurring bookings created');

    return results;
  } catch (error) {
    logger.error({
      error: error.message,
      climberId,
      bookedById,
    }, 'Error creating recurring bookings');
    throw error;
  }
};

/**
 * Get bookings for a parent/user
 */
export const getBookingsForUser = async (userId, userRoles = [], filters = {}) => {
  try {
    let query = { bookedById: userId };

    // If climber, bookings for linked children are handled at the route level
    // This function only returns bookings where user is the booker

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.climberId) {
      query.climberId = filters.climberId;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'sessionId',
        populate: {
          path: 'coachIds',
          select: 'firstName middleName lastName email'
        }
      })
      .populate('climberId')
      .sort({ createdAt: -1 })
      .lean();

    // Transform to use 'session' and 'climber' instead of 'sessionId' and 'climberId'
    // Keep original IDs for backward compatibility
    return bookings.map(booking => {
      const transformed = {
        ...booking,
        session: booking.sessionId,
        climber: booking.climberId,
      };
      // Preserve original IDs (use _id if populated object, otherwise use the ID itself)
      if (booking.sessionId && typeof booking.sessionId === 'object' && booking.sessionId._id) {
        transformed.sessionId = booking.sessionId._id;
      }
      if (booking.climberId && typeof booking.climberId === 'object' && booking.climberId._id) {
        transformed.climberId = booking.climberId._id;
      }
      return transformed;
    });
  } catch (error) {
    logger.error({ error: error.message, userId }, 'Error fetching bookings for user');
    throw error;
  }
};

