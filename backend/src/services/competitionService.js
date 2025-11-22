import { Competition } from '../models/competition.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Get competitions with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of competitions
 */
export async function getCompetitions(filters = {}) {
  try {
    const query = {};

    // Handle date range filters
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.sport) {
      query.sport = { $regex: filters.sport, $options: 'i' };
    }

    if (filters.rank) {
      query.rank = { $regex: filters.rank, $options: 'i' };
    }

    logger.debug('Query:', JSON.stringify(query));
    
    // Check if Competition model is available
    if (!Competition) {
      throw new Error('Competition model is not available');
    }
    
    const competitions = await Competition.find(query)
      .sort({ date: 1 })
      .lean();

    logger.info(`Found ${competitions.length} competitions`);
    return competitions;
  } catch (error) {
    logger.error('Error getting competitions:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Competition model:', Competition ? 'available' : 'NOT available');
    throw error;
  }
}

/**
 * Get a single competition by ID
 * @param {string} id - Competition ID
 * @returns {Promise<Object>} Competition object
 */
export async function getCompetitionById(id) {
  try {
    const competition = await Competition.findById(id).lean();

    if (!competition) {
      throw new Error('Competition not found');
    }

    return competition;
  } catch (error) {
    logger.error(`Error getting competition ${id}:`, error);
    throw error;
  }
}

/**
 * Import competitions from scraped data
 * @param {Array} competitions - Array of competition objects to import
 * @returns {Promise<Object>} Import result with created count
 */
export async function importCompetitions(competitions) {
  try {
    if (!Array.isArray(competitions) || competitions.length === 0) {
      throw new Error('Competitions array is required and must not be empty');
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const compData of competitions) {
      try {
        // Check if competition already exists (by title and location - same competition)
        const existing = await Competition.findOne({
          title: compData.title,
          location: compData.location,
        });

        if (existing) {
          // Check if date is different (changed)
          const existingDate = new Date(existing.date);
          const newDate = new Date(compData.date);
          const dateDiff = Math.abs(existingDate.getTime() - newDate.getTime());
          const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff < 1) {
            // Same date - exact duplicate, skip
            logger.debug(`Competition already exists: ${compData.title} on ${compData.date}`);
            skippedCount++;
            continue;
          } else {
            // Different date or other changes - update existing
            existing.date = compData.date;
            existing.sport = compData.sport;
            existing.groups = compData.groups || '';
            existing.rank = compData.rank;
            existing.sourceUrl = compData.sourceUrl || existing.sourceUrl || 'https://bfka.org/calendar.php';
            existing.importedAt = new Date();
            existing.updatedAt = new Date();
            
            await existing.save();
            logger.debug(`Updated competition: ${compData.title} - date changed from ${existingDate.toISOString()} to ${newDate.toISOString()}`);
            updatedCount++;
            continue;
          }
        }

        // Create new competition
        const competition = new Competition({
          date: compData.date,
          title: compData.title,
          location: compData.location,
          sport: compData.sport,
          groups: compData.groups || '',
          rank: compData.rank,
          sourceUrl: compData.sourceUrl || 'https://bfka.org/calendar.php',
          importedAt: new Date(),
        });

        await competition.save();
        createdCount++;
      } catch (error) {
        logger.error(`Error importing competition ${compData.title}:`, error);
        // Continue with next competition
      }
    }

    logger.info(`Imported ${createdCount} competitions, updated ${updatedCount} competitions, skipped ${skippedCount} duplicates`);

    return {
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: competitions.length,
    };
  } catch (error) {
    logger.error('Error importing competitions:', error);
    throw error;
  }
}

/**
 * Update a competition
 * @param {string} id - Competition ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated competition
 */
export async function updateCompetition(id, data) {
  try {
    const competition = await Competition.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!competition) {
      throw new Error('Competition not found');
    }

    return competition;
  } catch (error) {
    logger.error(`Error updating competition ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a competition
 * @param {string} id - Competition ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCompetition(id) {
  try {
    const result = await Competition.findByIdAndDelete(id);

    if (!result) {
      throw new Error('Competition not found');
    }

    return true;
  } catch (error) {
    logger.error(`Error deleting competition ${id}:`, error);
    throw error;
  }
}

/**
 * Get competitions for calendar view (merged with sessions)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of competitions formatted for calendar
 */
export async function getCompetitionsForCalendar(startDate, endDate) {
  try {
    const competitions = await Competition.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ date: 1 })
      .lean();

    // Format competitions for calendar display
    return competitions.map(comp => ({
      _id: comp._id,
      type: 'competition',
      date: comp.date,
      title: comp.title,
      location: comp.location,
      sport: comp.sport,
      groups: comp.groups,
      rank: comp.rank,
      sourceUrl: comp.sourceUrl,
    }));
  } catch (error) {
    logger.error('Error getting competitions for calendar:', error);
    throw error;
  }
}

