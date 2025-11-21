import { User } from '../models/user.js';
import logger from '../middleware/logging.js';

/**
 * Activate a climber profile by adding email and password
 * Also allows updating profile data during activation
 */
export const activateClimberProfile = async (userId, email, password, activatedBy, updateData = {}) => {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate user has climber role
    if (!user.roles.includes('climber')) {
      const error = new Error('User is not a climber');
      error.statusCode = 400;
      throw error;
    }

    // Validate accountStatus is inactive
    if (user.accountStatus !== 'inactive') {
      const error = new Error('User account is already active');
      error.statusCode = 400;
      throw error;
    }

    // Validate email doesn't exist
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser && existingUser._id.toString() !== userId) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Build update fields
    const updateFields = {
      email: email.toLowerCase().trim(),
      passwordHash,
      accountStatus: 'active',
    };

    // Update profile data if provided
    if (updateData.middleName !== undefined) {
      updateFields.middleName = updateData.middleName ? updateData.middleName.trim() : null;
    }
    if (updateData.phone !== undefined) {
      updateFields.phone = updateData.phone || '';
    }
    if (updateData.dateOfBirth !== undefined) {
      updateFields.dateOfBirth = updateData.dateOfBirth || null;
    }
    if (updateData.notes !== undefined) {
      updateFields.notes = updateData.notes || '';
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    logger.info({
      userId: updatedUser._id,
      email: updatedUser.email,
      activatedBy,
    }, 'Climber profile activated');

    // Return user without password hash
    const userObj = updatedUser.toObject();
    delete userObj.passwordHash;

    return userObj;
  } catch (error) {
    logger.error({ error, userId, email, activatedBy }, 'Error activating climber profile');
    throw error;
  }
};

