import { User } from '../models/user.js';
import { ParentClimberLink } from '../models/parentClimberLink.js';
import { Booking } from '../models/booking.js';
import { AttendanceRecord } from '../models/attendanceRecord.js';
import { ParentInfo } from '../models/parentInfo.js';
import { Session } from '../models/session.js';
import { createLink, removeLink } from './parentClimberLinkService.js';
import logger from '../middleware/logging.js';

/**
 * Check for duplicate child profile
 * Returns existing User if duplicate found, null otherwise
 */
export const checkDuplicateChild = async (firstName, lastName, dateOfBirth) => {
  try {
    if (!firstName || !lastName) {
      return null;
    }

    const query = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roles: { $in: ['climber'] },
    };

    // Add dateOfBirth to query if provided
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        // Normalize date to start of day for comparison
        const normalizedDob = new Date(dob);
        normalizedDob.setHours(0, 0, 0, 0);
        const nextDay = new Date(normalizedDob);
        nextDay.setDate(nextDay.getDate() + 1);
        query.dateOfBirth = { $gte: normalizedDob, $lt: nextDay };
      }
    } else {
      // If no dateOfBirth provided, check for null dateOfBirth
      query.dateOfBirth = null;
    }

    const existingUser = await User.findOne(query);
    return existingUser;
  } catch (error) {
    logger.error({ error, firstName, lastName, dateOfBirth }, 'Error checking duplicate child');
    throw error;
  }
};

/**
 * Create a new child User and link it to a parent
 * Includes duplicate checking
 */
export const createClimberForParent = async (parentId, climberData) => {
  try {
    // Check for duplicate
    const duplicate = await checkDuplicateChild(
      climberData.firstName,
      climberData.lastName,
      climberData.dateOfBirth
    );

    if (duplicate) {
      // Check if already linked to this parent
      const existingLink = await ParentClimberLink.findOne({ parentId, climberId: duplicate._id });
      if (existingLink) {
        const error = new Error('Child profile already linked to this parent');
        error.statusCode = 409;
        throw error;
      }

      // Check if linked to another parent
      const otherLink = await ParentClimberLink.findOne({ climberId: duplicate._id });
      if (otherLink) {
        const error = new Error('Child profile already linked to another parent');
        error.statusCode = 409;
        error.existingProfile = duplicate;
        throw error;
      }

      // Return duplicate for frontend to show and ask for confirmation
      return {
        duplicate: true,
        existingProfile: duplicate,
        message: 'Profile already exists. Link existing profile or create new?',
      };
    }

    // Create new User (child)
    const child = new User({
      firstName: climberData.firstName.trim(),
      middleName: climberData.middleName ? climberData.middleName.trim() : null,
      lastName: climberData.lastName.trim(),
      dateOfBirth: climberData.dateOfBirth || null,
      phone: climberData.phone || '',
      notes: climberData.notes || '',
      roles: ['climber'],
      accountStatus: 'active', // Active by default so parent can book sessions for them
      isTrainee: true, // Linked profiles are trainees by default
      email: null, // Explicitly set to null for children without email
      // NO passwordHash
    });

    await child.save();

    // Create parent-climber link
    await createLink(parentId, child._id);

    logger.info({
      parentId,
      childId: child._id,
    }, 'Child User created and linked to parent');

    return {
      duplicate: false,
      child,
    };
  } catch (error) {
    logger.error({ error, parentId, climberData }, 'Error creating child for parent');
    throw error;
  }
};

/**
 * Link existing child profile to parent
 */
export const linkExistingChildToParent = async (parentId, childId) => {
  try {
    // Verify child exists and has climber role
    const child = await User.findById(childId);
    if (!child) {
      const error = new Error('Child profile not found');
      error.statusCode = 404;
      throw error;
    }

    if (!child.roles.includes('climber')) {
      const error = new Error('User is not a climber');
      error.statusCode = 400;
      throw error;
    }

    // Check if already linked to this parent
    const existingLink = await ParentClimberLink.findOne({ parentId, climberId: childId });
    if (existingLink) {
      const error = new Error('Child profile already linked to this parent');
      error.statusCode = 409;
      throw error;
    }

    // Check if linked to another parent
    const otherLink = await ParentClimberLink.findOne({ climberId: childId });
    if (otherLink && otherLink.parentId.toString() !== parentId) {
      const error = new Error('Child profile already linked to another parent');
      error.statusCode = 409;
      throw error;
    }

    // Create link
    await createLink(parentId, childId);

    logger.info({ parentId, childId }, 'Existing child profile linked to parent');
    return child;
  } catch (error) {
    logger.error({ error, parentId, childId }, 'Error linking existing child to parent');
    throw error;
  }
};

/**
 * Update a child User (only if linked to parent)
 */
export const updateClimberForParent = async (parentId, climberId, updateData) => {
  try {
    // Verify ownership
    const link = await ParentClimberLink.findOne({ parentId, climberId });
    if (!link) {
      const error = new Error('Child not found or not linked to this parent');
      error.statusCode = 404;
      throw error;
    }

    // Build update fields
    const updateFields = {};

    if (updateData.firstName !== undefined) {
      updateFields.firstName = updateData.firstName.trim();
    }
    if (updateData.middleName !== undefined) {
      updateFields.middleName = updateData.middleName ? updateData.middleName.trim() : null;
    }
    if (updateData.lastName !== undefined) {
      updateFields.lastName = updateData.lastName.trim();
    }
    if (updateData.dateOfBirth !== undefined) {
      updateFields.dateOfBirth = updateData.dateOfBirth || null;
    }
    if (updateData.phone !== undefined) {
      updateFields.phone = updateData.phone || '';
    }
    if (updateData.notes !== undefined) {
      updateFields.notes = updateData.notes || '';
    }
    if (updateData.accountStatus !== undefined) {
      updateFields.accountStatus = updateData.accountStatus;
    }
    if (updateData.isTrainee !== undefined) {
      updateFields.isTrainee = updateData.isTrainee;
    }

    const child = await User.findByIdAndUpdate(
      climberId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!child) {
      const error = new Error('Child not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info({ parentId, climberId }, 'Child updated');
    return child;
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error updating child');
    throw error;
  }
};

/**
 * Deactivate a child (set accountStatus to inactive)
 */
export const deactivateClimberForParent = async (parentId, climberId) => {
  try {
    // Verify ownership
    const link = await ParentClimberLink.findOne({ parentId, climberId });
    if (!link) {
      const error = new Error('Child not found or not linked to this parent');
      error.statusCode = 404;
      throw error;
    }

    const child = await User.findByIdAndUpdate(
      climberId,
      { accountStatus: 'inactive' },
      { new: true }
    );

    if (!child) {
      const error = new Error('Child not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info({ parentId, climberId }, 'Child deactivated');
    return child;
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error deactivating child');
    throw error;
  }
};

/**
 * Check for related data before deleting a climber
 * Returns counts of bookings, attendance records, and parentInfo
 */
export const checkClimberRelatedData = async (climberId) => {
  try {
    const now = new Date();

    // Get all bookings for this climber
    const allBookings = await Booking.find({ climberId }).populate('sessionId', 'date').lean();

    // Separate future and past bookings
    const futureBookings = allBookings.filter(booking => {
      const sessionDate = booking.sessionId?.date;
      return sessionDate && new Date(sessionDate) > now;
    });

    const pastBookings = allBookings.filter(booking => {
      const sessionDate = booking.sessionId?.date;
      return !sessionDate || new Date(sessionDate) <= now;
    });

    // Count active bookings (status: 'booked')
    const activeBookings = allBookings.filter(b => b.status === 'booked');
    const activeFutureBookings = futureBookings.filter(b => b.status === 'booked');
    const activePastBookings = pastBookings.filter(b => b.status === 'booked');

    // Count attendance records
    const attendanceCount = await AttendanceRecord.countDocuments({ climberId });

    // Count parentInfo records
    const parentInfoCount = await ParentInfo.countDocuments({ climberId });

    return {
      bookings: {
        total: allBookings.length,
        active: activeBookings.length,
        future: {
          total: futureBookings.length,
          active: activeFutureBookings.length,
        },
        past: {
          total: pastBookings.length,
          active: activePastBookings.length,
        },
      },
      attendanceRecords: attendanceCount,
      parentInfoRecords: parentInfoCount,
      hasRelatedData: allBookings.length > 0 || attendanceCount > 0 || parentInfoCount > 0,
    };
  } catch (error) {
    logger.error({ error, climberId }, 'Error checking climber related data');
    throw error;
  }
};

/**
 * Delete related data for a climber (future bookings, attendance, parentInfo)
 * Keeps past bookings for historical records
 */
export const deleteClimberRelatedData = async (climberId) => {
  try {
    const now = new Date();
    const deletionResults = {
      futureBookingsDeleted: 0,
      attendanceRecordsDeleted: 0,
      parentInfoRecordsDeleted: 0,
    };

    // Get all bookings and find future ones
    const allBookings = await Booking.find({ climberId }).populate('sessionId', 'date').lean();

    const futureBookingIds = allBookings
      .filter(booking => {
        const sessionDate = booking.sessionId?.date;
        return sessionDate && new Date(sessionDate) > now;
      })
      .map(booking => booking._id);

    // Delete future bookings
    if (futureBookingIds.length > 0) {
      const result = await Booking.deleteMany({ _id: { $in: futureBookingIds } });
      deletionResults.futureBookingsDeleted = result.deletedCount;
      logger.info({ climberId, deletedCount: result.deletedCount }, 'Future bookings deleted');
    }

    // Delete all attendance records
    const attendanceResult = await AttendanceRecord.deleteMany({ climberId });
    deletionResults.attendanceRecordsDeleted = attendanceResult.deletedCount;
    if (attendanceResult.deletedCount > 0) {
      logger.info({ climberId, deletedCount: attendanceResult.deletedCount }, 'Attendance records deleted');
    }

    // Delete all parentInfo records
    const parentInfoResult = await ParentInfo.deleteMany({ climberId });
    deletionResults.parentInfoRecordsDeleted = parentInfoResult.deletedCount;
    if (parentInfoResult.deletedCount > 0) {
      logger.info({ climberId, deletedCount: parentInfoResult.deletedCount }, 'ParentInfo records deleted');
    }

    return deletionResults;
  } catch (error) {
    logger.error({ error, climberId }, 'Error deleting climber related data');
    throw error;
  }
};

/**
 * Delete a child User and remove parent-climber link
 * Only deletes if child is linked to parent and has no email (inactive child account)
 * Deletes future bookings and related records, keeps past bookings for history
 */
export const deleteClimberForParent = async (parentId, climberId) => {
  try {
    // Verify ownership
    const link = await ParentClimberLink.findOne({ parentId, climberId });
    if (!link) {
      const error = new Error('Child not found or not linked to this parent');
      error.statusCode = 404;
      throw error;
    }

    const child = await User.findById(climberId);
    if (!child) {
      const error = new Error('Child not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if child has email/password (activated account)
    // For safety, only allow deletion of inactive child accounts (without email)
    if (child.email) {
      const error = new Error('Cannot delete activated child account. Please deactivate instead.');
      error.statusCode = 400;
      throw error;
    }

    // Delete related data (future bookings, attendance, parentInfo)
    const deletionResults = await deleteClimberRelatedData(climberId);

    // Remove parent-climber link
    await removeLink(parentId, climberId);

    // Delete the child User
    await User.findByIdAndDelete(climberId);

    logger.info({
      parentId,
      climberId,
      deletionResults
    }, 'Child deleted with related data cleanup');

    return {
      message: 'Child deleted successfully',
      deletionResults,
    };
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error deleting child');
    throw error;
  }
};

/**
 * Get all children (climbers) for a parent
 */
/**
 * Get all children (climbers) for a parent
 */
export const getClimbersForParent = async (parentId) => {
  try {
    logger.info({ parentId }, 'Fetching climbers for parent');

    const links = await ParentClimberLink.find({ parentId })
      .populate('climberId')
      .lean();

    logger.info({
      parentId,
      linksCount: links.length,
      linkIds: links.map(l => l.climberId?._id?.toString() || l.climberId?.toString()),
      // DEBUG: Log which links have null climberId
      nullLinks: links.filter(l => !l.climberId).map(l => l._id.toString())
    }, 'Parent-climber links found');

    const climbers = links
      .map(link => link.climberId)
      .filter(child => {
        if (!child) {
          logger.warn({ parentId }, 'Found link with null climberId - child may have been deleted');
          return false;
        }
        return true;
      });

    logger.info({
      parentId,
      climbersCount: climbers.length,
      climberIds: climbers.map(c => c._id?.toString()),
      filteredOut: links.length - climbers.length
    }, 'Climbers filtered and returned');

    return climbers;
  } catch (error) {
    logger.error({ error, parentId }, 'Error fetching children for parent');
    throw error;
  }
};

