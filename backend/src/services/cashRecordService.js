import { Session } from '../models/session.js';
import logger from '../middleware/logging.js';

/**
 * Get monthly coach payouts summary
 */
export const getMonthlyCoachPayoutsSummary = async (year, month) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const sessions = await Session.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
      coachPayoutAmount: { $ne: null },
    })
      .populate('coachIds', 'firstName middleName lastName email')
      .lean();

    // Group by coach and payout status
    const summary = {};

    for (const session of sessions) {
      for (const coachId of session.coachIds) {
        const coachIdStr = coachId._id.toString();
        if (!summary[coachIdStr]) {
          summary[coachIdStr] = {
            coach: {
              id: coachId._id,
              name: coachId.name,
              email: coachId.email,
            },
            totalUnpaid: 0,
            totalPaid: 0,
            sessions: [],
          };
        }

        const payoutAmount = session.coachPayoutAmount || 0;
        if (session.coachPayoutStatus === 'paid') {
          summary[coachIdStr].totalPaid += payoutAmount;
        } else {
          summary[coachIdStr].totalUnpaid += payoutAmount;
        }

        summary[coachIdStr].sessions.push({
          sessionId: session._id,
          title: session.title,
          date: session.date,
          payoutAmount,
          payoutStatus: session.coachPayoutStatus,
        });
      }
    }

    const result = Object.values(summary).map(coachSummary => ({
      ...coachSummary,
      totalOwed: coachSummary.totalUnpaid + coachSummary.totalPaid,
    }));

    logger.info({
      year,
      month,
      coachCount: result.length,
    }, 'Monthly coach payouts summary generated');

    return result;
  } catch (error) {
    logger.error({ error: error.message, year, month }, 'Error generating monthly payouts summary');
    throw error;
  }
};

