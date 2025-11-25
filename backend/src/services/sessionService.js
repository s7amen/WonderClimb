import { Session } from '../models/session.js';
import { Booking } from '../models/booking.js';
import { AttendanceRecord } from '../models/attendanceRecord.js';
import { isWithinBookingHorizon } from './configService.js';
import logger from '../middleware/logging.js';

/**
 * Get available sessions for parents/climbers (public view)
 */
export const getAvailableSessions = async (filters = {}) => {
  try {
    const now = new Date();
    const query = {
      // Filter out only cancelled sessions
      status: { $ne: 'cancelled' }
    };

    // Build date query properly
    const dateQuery = {};
    
    // Use startDate if provided
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      dateQuery.$gte = startDate;
    } else {
      // Only show future sessions if no startDate provided
      dateQuery.$gt = now;
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      dateQuery.$lte = endDate;
    }
    
    // Always add date query
    query.date = dateQuery;

    if (filters.coachId) {
      query.coachIds = filters.coachId;
    }

    const sessions = await Session.find(query)
      .populate('coachIds', 'firstName middleName lastName email')
      .sort({ date: 1 })
      .lean();

    // Filter by booking horizon - but only if we don't have explicit date filters
    // If user provided startDate/endDate, respect those instead of booking horizon
    let filteredSessions;
    if (filters.startDate || filters.endDate) {
      // User provided explicit date range, use it directly
      filteredSessions = sessions;
    } else {
      // No explicit date range, apply booking horizon filter
      filteredSessions = sessions.filter(session =>
        isWithinBookingHorizon(session.date)
      );
    }

    // Add booking counts for each session
    const sessionsWithCounts = await Promise.all(
      filteredSessions.map(async (session) => {
        const bookingCount = await Booking.countDocuments({
          sessionId: session._id,
          status: 'booked',
        });

        return {
          ...session,
          bookedCount: bookingCount,
          availableSpots: session.capacity - bookingCount,
        };
      })
    );

    return sessionsWithCounts;
  } catch (error) {
    logger.error({ error: error.message }, 'Error fetching available sessions');
    throw error;
  }
};

/**
 * Get session by ID
 */
export const getSessionById = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId)
      .populate('coachIds', 'firstName middleName lastName email')
      .lean();

    return session;
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Error fetching session');
    throw error;
  }
};

/**
 * Create a new session (admin only)
 */
export const createSession = async (sessionData) => {
  try {
    const session = new Session({
      title: sessionData.title,
      description: sessionData.description || '',
      date: new Date(sessionData.date),
      durationMinutes: sessionData.durationMinutes,
      capacity: sessionData.capacity,
      status: sessionData.status || 'active',
      coachIds: sessionData.coachIds || [],
      targetGroups: sessionData.targetGroups || [],
    });

    await session.save();

    logger.info({
      sessionId: session._id,
      title: session.title,
      date: session.date,
    }, 'Session created');

    return session;
  } catch (error) {
    logger.error({ error: error.message, sessionData }, 'Error creating session');
    throw error;
  }
};

/**
 * Update a session (admin only)
 */
export const updateSession = async (sessionId, updateData) => {
  try {
    // Check if session has existing bookings before allowing certain changes
    const existingBookings = await Booking.countDocuments({
      sessionId,
      status: 'booked',
    });

    // Prevent reducing capacity below current bookings
    if (updateData.capacity !== undefined && updateData.capacity < existingBookings) {
      const error = new Error(`Cannot reduce capacity below ${existingBookings} (current bookings)`);
      error.statusCode = 400;
      throw error;
    }

    const updateFields = {
      title: updateData.title,
      description: updateData.description,
      date: updateData.date ? new Date(updateData.date) : undefined,
      durationMinutes: updateData.durationMinutes,
      capacity: updateData.capacity,
      status: updateData.status,
      coachIds: updateData.coachIds !== undefined ? updateData.coachIds : undefined,
    };

    // Добавяме targetGroups само ако е предоставено
    if (updateData.targetGroups !== undefined) {
      updateFields.targetGroups = updateData.targetGroups;
    }

    const session = await Session.findByIdAndUpdate(
      sessionId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info({
      sessionId: session._id,
      updates: updateData,
    }, 'Session updated');

    return session;
  } catch (error) {
    logger.error({ error: error.message, sessionId, updateData }, 'Error updating session');
    throw error;
  }
};

/**
 * Get calendar view (month/week/day) for admin
 */
export const getCalendarSessions = async (view, startDate, endDate, filters = {}) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const query = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Filter out cancelled sessions unless explicitly requested
    if (filters.status) {
      query.status = filters.status;
    } else {
      // By default, exclude cancelled sessions
      query.status = { $ne: 'cancelled' };
    }

    if (filters.coachId) {
      query.coachIds = filters.coachId;
    }

    const sessions = await Session.find(query)
      .populate('coachIds', 'firstName middleName lastName email')
      .sort({ date: 1 })
      .lean();

    // Add booking counts
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const bookingCount = await Booking.countDocuments({
          sessionId: session._id,
          status: 'booked',
        });

        return {
          ...session,
          bookedCount: bookingCount,
          availableSpots: session.capacity - bookingCount,
        };
      })
    );

    logger.info({
      view,
      startDate,
      endDate,
      count: sessionsWithCounts.length,
    }, 'Calendar sessions fetched');

    return sessionsWithCounts;
  } catch (error) {
    logger.error({ error: error.message, view, startDate, endDate }, 'Error fetching calendar sessions');
    throw error;
  }
};

/**
 * Create bulk sessions based on days of week and date range
 */
export const createBulkSessions = async (sessionData) => {
  try {
    const {
      title,
      description,
      daysOfWeek, // Array of day numbers: [1, 4] for Monday, Thursday
      startDate,
      endDate,
      time, // HH:MM format
      durationMinutes,
      capacity,
      coachIds,
      targetGroups,
      status = 'active',
    } = sessionData;

    if (!daysOfWeek || daysOfWeek.length === 0) {
      const error = new Error('At least one day of week must be selected');
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const sessionsToCreate = [];

    // Generate dates for each selected day of week within the date range
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (daysOfWeek.includes(dayOfWeek)) {
        // Create session date with time
        const sessionDate = new Date(currentDate);
        const [hours, minutes] = time.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        // Only create sessions in the future
        if (sessionDate > new Date()) {
          sessionsToCreate.push({
            title,
            description: description || '',
            date: sessionDate,
            durationMinutes,
            capacity,
            status,
            coachIds: coachIds || [],
            targetGroups: targetGroups || [],
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (sessionsToCreate.length === 0) {
      const error = new Error('No valid sessions to create in the specified date range');
      error.statusCode = 400;
      throw error;
    }

    // Create all sessions
    const createdSessions = await Session.insertMany(sessionsToCreate, { ordered: false });

    logger.info({
      count: createdSessions.length,
      title,
      daysOfWeek,
      startDate,
      endDate,
    }, 'Bulk sessions created');

    return {
      created: createdSessions.length,
      sessions: createdSessions,
    };
  } catch (error) {
    logger.error({ error: error.message, sessionData }, 'Error creating bulk sessions');
    throw error;
  }
};

/**
 * Check for related data before deleting a session
 * Returns counts of bookings and attendance records
 */
export const checkSessionRelatedData = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    // Count bookings for this session
    const bookingCount = await Booking.countDocuments({ sessionId });
    const activeBookingCount = await Booking.countDocuments({ 
      sessionId, 
      status: 'booked' 
    });

    // Count attendance records for this session
    const attendanceCount = await AttendanceRecord.countDocuments({ sessionId });

    return {
      bookings: {
        total: bookingCount,
        active: activeBookingCount,
      },
      attendanceRecords: attendanceCount,
      hasRelatedData: bookingCount > 0 || attendanceCount > 0,
    };
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Error checking session related data');
    throw error;
  }
};

/**
 * Delete a session and its related data (bookings, attendance records)
 */
export const deleteSession = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    const deletionResults = {
      bookingsDeleted: 0,
      attendanceRecordsDeleted: 0,
    };

    // Delete all bookings for this session
    const bookingResult = await Booking.deleteMany({ sessionId });
    deletionResults.bookingsDeleted = bookingResult.deletedCount;
    if (bookingResult.deletedCount > 0) {
      logger.info({ sessionId, deletedCount: bookingResult.deletedCount }, 'Session bookings deleted');
    }

    // Delete all attendance records for this session
    const attendanceResult = await AttendanceRecord.deleteMany({ sessionId });
    deletionResults.attendanceRecordsDeleted = attendanceResult.deletedCount;
    if (attendanceResult.deletedCount > 0) {
      logger.info({ sessionId, deletedCount: attendanceResult.deletedCount }, 'Session attendance records deleted');
    }

    // Delete the session
    await Session.findByIdAndDelete(sessionId);

    logger.info({ sessionId, deletionResults }, 'Session deleted with related data cleanup');

    return {
      message: 'Session deleted successfully',
      deletionResults,
    };
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Error deleting session');
    throw error;
  }
};

/**
 * Update coach payout status
 */
export const updateCoachPayoutStatus = async (sessionId, payoutStatus) => {
  try {
    if (!['unpaid', 'paid'].includes(payoutStatus)) {
      const error = new Error('payoutStatus must be either "unpaid" or "paid"');
      error.statusCode = 400;
      throw error;
    }

    const session = await Session.findByIdAndUpdate(
      sessionId,
      { coachPayoutStatus: payoutStatus },
      { new: true }
    );

    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info({
      sessionId: session._id,
      payoutStatus,
      payoutAmount: session.coachPayoutAmount,
    }, 'Coach payout status updated');

    return session;
  } catch (error) {
    logger.error({ error: error.message, sessionId, payoutStatus }, 'Error updating payout status');
    throw error;
  }
};

