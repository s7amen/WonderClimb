import { Session } from '../models/session.js';
import { CoachProfile } from '../models/coachProfile.js';
import logger from '../middleware/logging.js';

/**
 * Check for related data before deleting a coach
 * Returns counts of sessions assigned to the coach and coach profile
 */
export const checkCoachRelatedData = async (coachId) => {
  try {
    // Count sessions where this coach is assigned
    const sessionCount = await Session.countDocuments({ coachIds: coachId });
    
    // Count future sessions
    const now = new Date();
    const futureSessionCount = await Session.countDocuments({
      coachIds: coachId,
      date: { $gt: now },
      status: 'active',
    });

    // Check if coach has a CoachProfile
    const coachProfile = await CoachProfile.findOne({ userId: coachId });
    const hasCoachProfile = !!coachProfile;

    return {
      sessions: {
        total: sessionCount,
        future: futureSessionCount,
      },
      hasCoachProfile,
      hasRelatedData: sessionCount > 0 || hasCoachProfile,
    };
  } catch (error) {
    logger.error({ error: error.message, coachId }, 'Error checking coach related data');
    throw error;
  }
};

/**
 * Delete coach-related data (coach profile)
 * Note: Sessions are not deleted, but coach should be removed from coachIds array
 */
export const deleteCoachRelatedData = async (coachId) => {
  try {
    const deletionResults = {
      coachProfileDeleted: false,
      sessionsUpdated: 0,
    };

    // Delete coach profile
    const coachProfileResult = await CoachProfile.deleteOne({ userId: coachId });
    deletionResults.coachProfileDeleted = coachProfileResult.deletedCount > 0;
    if (deletionResults.coachProfileDeleted) {
      logger.info({ coachId }, 'CoachProfile deleted');
    }

    // Remove coach from all sessions' coachIds array
    const sessionsResult = await Session.updateMany(
      { coachIds: coachId },
      { $pull: { coachIds: coachId } }
    );
    deletionResults.sessionsUpdated = sessionsResult.modifiedCount;
    if (sessionsResult.modifiedCount > 0) {
      logger.info({ coachId, updatedCount: sessionsResult.modifiedCount }, 'Coach removed from sessions');
    }

    return deletionResults;
  } catch (error) {
    logger.error({ error: error.message, coachId }, 'Error deleting coach related data');
    throw error;
  }
};

