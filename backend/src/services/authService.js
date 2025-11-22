import { User } from '../models/user.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../middleware/logging.js';

/**
 * Register a new user
 * If roles are provided, uses them; otherwise automatically assigns "climber" role
 */
export const registerUser = async (email, password, firstName, middleName, lastName, roles = null) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Determine roles - use provided roles or default to climber
  const userRoles = Array.isArray(roles) && roles.length > 0 ? roles : ['climber'];

  // Create user
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    firstName: firstName.trim(),
    middleName: middleName ? middleName.trim() : null,
    lastName: lastName.trim(),
    roles: userRoles,
    accountStatus: 'active',
  });

  logger.info({ userId: user._id, email: user.email, roles: user.roles }, 'User registered');

  // Return user without password hash
  const userObj = user.toObject();
  delete userObj.passwordHash;
  
  return userObj;
};

/**
 * Authenticate user and return JWT token
 */
export const loginUser = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check account status
  if (user.accountStatus !== 'active') {
    throw new Error('Account is inactive. Please contact administrator.');
  }

  // Check if password hash exists
  if (!user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    logger.warn({ userId: user._id, email: user.email }, 'Failed login attempt');
    throw new Error('Invalid email or password');
  }

  // Ensure roles is an array
  const userRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
  
  // Generate JWT token
  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    roles: userRoles,
  });

  logger.info({ 
    userId: user._id, 
    email: user.email, 
    roles: userRoles,
    rolesFromDB: user.roles,
    rolesType: typeof user.roles,
  }, 'User logged in');

  // Build full name
  const fullName = `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim();

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      name: fullName,
      roles: userRoles, // Use normalized roles array
    },
  };
};

