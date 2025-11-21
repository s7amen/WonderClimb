import { User } from '../models/user.js';
import { ParentClimberLink } from '../models/parentClimberLink.js';
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
 * Delete a child User and remove parent-climber link
 * Only deletes if child is linked to parent and has no email (inactive child account)
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

    // Remove parent-climber link
    await removeLink(parentId, climberId);

    // Delete the child User
    await User.findByIdAndDelete(climberId);

    logger.info({ parentId, climberId }, 'Child deleted');
    return { message: 'Child deleted successfully' };
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error deleting child');
    throw error;
  }
};

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
      linkIds: links.map(l => l.climberId?._id?.toString() || l.climberId?.toString())
    }, 'Parent-climber links found');

    const climbers = links
      .map(link => link.climberId)
      .filter(child => child !== null && child !== undefined);

    logger.info({ 
      parentId, 
      climbersCount: climbers.length,
      climberIds: climbers.map(c => c._id?.toString())
    }, 'Climbers filtered and returned');

    return climbers;
  } catch (error) {
    logger.error({ error, parentId }, 'Error fetching children for parent');
    throw error;
  }
};

