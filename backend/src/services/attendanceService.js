import { AttendanceRecord } from '../models/attendanceRecord.js';
import { Session } from '../models/session.js';
import { Booking } from '../models/booking.js';
import logger from '../middleware/logging.js';

/**
 * Record or update attendance for a climber in a session
 */
export const recordAttendance = async (sessionId, climberId, status, markedById) => {
  try {
    // Verify session exists and coach is assigned
    const session = await Session.findById(sessionId);
    if (!session) {
      const error = new Error('Session not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify coach is assigned to session
    const coachIds = session.coachIds.map(id => id.toString());
    if (!coachIds.includes(markedById)) {
      const error = new Error('Coach is not assigned to this session');
      error.statusCode = 403;
      throw error;
    }

    // Verify climber is booked for this session
    const booking = await Booking.findOne({
      sessionId,
      climberId,
      status: 'booked',
    });

    if (!booking) {
      const error = new Error('Climber is not booked for this session');
      error.statusCode = 400;
      throw error;
    }

    // Upsert attendance record
    const attendance = await AttendanceRecord.findOneAndUpdate(
      { sessionId, climberId },
      {
        sessionId,
        climberId,
        status,
        markedById,
        markedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    logger.info({
      attendanceId: attendance._id,
      sessionId,
      climberId,
      status,
      markedById,
    }, 'Attendance recorded');

    return attendance;
  } catch (error) {
    logger.error({
      error: error.message,
      sessionId,
      climberId,
      status,
      markedById,
    }, 'Error recording attendance');
    throw error;
  }
};

/**
 * Get attendance records for a session
 */
export const getAttendanceForSession = async (sessionId) => {
  try {
    const records = await AttendanceRecord.find({ sessionId })
      .populate('climberId', 'firstName middleName lastName')
      .populate('markedById', 'firstName middleName lastName')
      .sort({ markedAt: -1 })
      .lean();

    return records;
  } catch (error) {
    logger.error({ error: error.message, sessionId }, 'Error fetching attendance for session');
    throw error;
  }
};

