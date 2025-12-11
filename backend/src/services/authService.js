import { User } from '../models/user.js';
import { ActivationToken } from '../models/activationToken.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../middleware/logging.js';
import { getSettings } from './settingsService.js';
import { sendActivationEmail } from './emailService.js';
import crypto from 'crypto';

/**
 * Generate activation token
 */
const generateActivationToken = async (userId, expiryHours = 48) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  const activationToken = await ActivationToken.create({
    userId,
    token,
    expiresAt,
  });
  
  return activationToken;
};

/**
 * Register a new user
 * If roles are provided, uses them; otherwise automatically assigns "climber" role
 */
export const registerUser = async (email, password, firstName, middleName, lastName, roles = null, phone = null) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('Потребител с този имейл вече съществува');
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Determine roles - use provided roles or default to climber
  const userRoles = Array.isArray(roles) && roles.length > 0 ? roles : ['climber'];

  // Get settings to check if activation email is enabled
  const settings = await getSettings();
  const shouldSendActivationEmail = settings.sendActivationEmail || false;
  
  // Set account status based on activation email setting
  const accountStatus = shouldSendActivationEmail ? 'inactive' : 'active';
  const emailVerified = !shouldSendActivationEmail; // Auto-verify if activation email is disabled
  const emailActivationStatus = shouldSendActivationEmail ? 'not_activated' : 'activated';

  // Create user
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    firstName: firstName.trim(),
    middleName: middleName ? middleName.trim() : null,
    lastName: lastName.trim(),
    phone: phone ? phone.trim() : '',
    roles: userRoles,
    accountStatus,
    emailVerified,
    emailVerifiedAt: emailVerified ? new Date() : null,
    emailActivationStatus,
  });

  logger.info({ userId: user._id, email: user.email, roles: user.roles, accountStatus }, 'User registered');

  // Generate and send activation email if enabled
  if (shouldSendActivationEmail) {
    try {
      const expiryHours = settings.activationTokenExpiryHours || 48;
      const activationToken = await generateActivationToken(user._id, expiryHours);
      await sendActivationEmail(user, activationToken);
      // Update status to 'email_sent' after successful email send
      user.emailActivationStatus = 'email_sent';
      await user.save();
      logger.info({ userId: user._id }, 'Activation email sent');
    } catch (error) {
      logger.error({ error: error.message, userId: user._id }, 'Failed to send activation email during registration');
      // Don't throw - user is created, they can request resend later
      // Status remains 'not_activated'
    }
  }

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
    throw new Error('Невалиден имейл или парола');
  }

  // Check if password hash exists
  if (!user.passwordHash) {
    throw new Error('Невалиден имейл или парола');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    logger.warn({ userId: user._id, email: user.email }, 'Failed login attempt');
    throw new Error('Невалиден имейл или парола');
  }

  // Backward compatibility: If emailActivationStatus is null, treat as activated
  if (user.emailActivationStatus === null) {
    user.emailActivationStatus = 'activated';
    user.emailVerified = true;
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
    }
    if (user.accountStatus === 'inactive') {
      user.accountStatus = 'active';
    }
    await user.save();
  }

  // Check account status - allow login even if inactive, but mark it
  const settings = await getSettings();
  const isAccountInactive = user.accountStatus !== 'active';
  const isEmailNotVerified = settings.sendActivationEmail && !user.emailVerified;
  
  // Allow login even with inactive/unverified account (for backward compatibility and UX)
  // The frontend will show a banner if needed

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

  // Determine effective email activation status (null -> 'activated' for backward compatibility)
  const effectiveEmailActivationStatus = user.emailActivationStatus || 'activated';

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
      emailActivationStatus: effectiveEmailActivationStatus,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
    },
  };
};

/**
 * Activate user account using activation token
 */
export const activateAccount = async (token) => {
  // Find token
  const activationToken = await ActivationToken.findOne({ token });
  
  if (!activationToken) {
    throw new Error('Невалиден или изтекъл линк за активиране');
  }

  // Check if token is expired
  if (activationToken.expiresAt < new Date()) {
    throw new Error('Линкът за активиране е изтекъл. Моля, поискайте нов линк.');
  }

  // Check if token is already used
  if (activationToken.usedAt) {
    throw new Error('Този линк за активиране вече е използван');
  }

  // Find user
  const user = await User.findById(activationToken.userId);
  if (!user) {
    throw new Error('Потребителят не е намерен');
  }

  // Activate user
  user.accountStatus = 'active';
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailActivationStatus = 'activated';
  await user.save();

  // Mark token as used
  activationToken.usedAt = new Date();
  await activationToken.save();

  logger.info({ userId: user._id, email: user.email }, 'Account activated');

  return user;
};

/**
 * Resend activation email by userId
 */
export const resendActivationEmail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Потребителят не е намерен');
  }

  if (!user.email) {
    throw new Error('Потребителят няма имейл адрес');
  }

  if (user.emailVerified) {
    throw new Error('Имейлът вече е верифициран');
  }

  const settings = await getSettings();
  if (!settings.sendActivationEmail) {
    throw new Error('Изпращането на activation emails е изключено');
  }

  // Invalidate old tokens for this user
  await ActivationToken.updateMany(
    { userId: user._id, usedAt: null },
    { usedAt: new Date() }
  );

  // Generate new token
  const expiryHours = settings.activationTokenExpiryHours || 48;
  const activationToken = await generateActivationToken(user._id, expiryHours);

  // Send email
  await sendActivationEmail(user, activationToken);

  // Update status to 'email_sent'
  user.emailActivationStatus = 'email_sent';
  await user.save();

  logger.info({ userId: user._id, email: user.email }, 'Activation email resent');

  return { message: 'Activation email sent successfully' };
};

/**
 * Resend activation email by email address (public endpoint)
 */
export const resendActivationEmailByEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Don't reveal if user exists or not for security
    throw new Error('Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.');
  }

  if (!user.email) {
    throw new Error('Потребителят няма имейл адрес');
  }

  if (user.emailVerified) {
    // Don't reveal if user exists or not for security
    throw new Error('Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.');
  }

  const settings = await getSettings();
  if (!settings.sendActivationEmail) {
    throw new Error('Изпращането на activation emails е изключено');
  }

  // Invalidate old tokens for this user
  await ActivationToken.updateMany(
    { userId: user._id, usedAt: null },
    { usedAt: new Date() }
  );

  // Generate new token
  const expiryHours = settings.activationTokenExpiryHours || 48;
  const activationToken = await generateActivationToken(user._id, expiryHours);

  // Send email
  await sendActivationEmail(user, activationToken);

  // Update status to 'email_sent'
  user.emailActivationStatus = 'email_sent';
  await user.save();

  logger.info({ userId: user._id, email: user.email }, 'Activation email resent by email');

  return { message: 'Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.' };
};

