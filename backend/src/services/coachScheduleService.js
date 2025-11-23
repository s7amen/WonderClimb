import { Session } from '../models/session.js';
import { Booking } from '../models/booking.js';
import logger from '../middleware/logging.js';

/**
 * Get today's sessions for a coach
 */
export const getTodaySessionsForCoach = async (coachId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await Session.find({
      coachIds: coachId,
      status: 'active',
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate('coachIds', 'firstName middleName lastName email')
      .sort({ date: 1 })
      .lean();

    // Get booking counts for each session
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

    return sessionsWithCounts;
  } catch (error) {
    logger.error({ error: error.message, coachId }, 'Error fetching today\'s sessions for coach');
    throw error;
  }
};

/**
 * Get session roster (all booked climbers)
 */
export const getSessionRoster = async (sessionId) => {
  try {
    const bookings = await Booking.find({
      sessionId,
      status: 'booked',
    })
      .populate('climberId', 'firstName middleName lastName dateOfBirth')
      .populate('bookedById', 'firstName middleName lastName email')
      .lean();

    return bookings.map(booking => ({
      bookingId: booking._id,
      climber: booking.climberId,
      bookedBy: booking.bookedById,
      createdAt: booking.createdAt,
    }));
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Error fetching session roster');
    throw error;
  }
};

