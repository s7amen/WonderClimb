import { User } from '../models/user.js';
import { generateToken } from '../middleware/auth.js';
import { getSettings } from './settingsService.js';
import { sendActivationEmail } from './emailService.js';
import logger from '../middleware/logging.js';
import crypto from 'crypto';
import { ActivationToken } from '../models/activationToken.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Generate OAuth state token for CSRF protection
 */
export const generateStateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get Google OAuth authorization URL
 */
export const getAuthUrl = (redirectUri, state) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
const exchangeCodeForToken = async (code, redirectUri) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to exchange code for token: ${error.error_description || error.error}`);
  }

  return await response.json();
};

/**
 * Get user info from Google using access token
 */
const getUserInfo = async (accessToken) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }

  return await response.json();
};

/**
 * Generate activation token helper
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
 * Register or login user with Google account
 */
export const registerOrLoginWithGoogle = async (googleUserInfo) => {
  const { email, given_name, family_name, picture } = googleUserInfo;
  
  if (!email) {
    throw new Error('Google account does not have an email address');
  }

  // Find existing user by email
  let user = await User.findOne({ email: email.toLowerCase() });

  const settings = await getSettings();
  const shouldSendActivationEmail = settings.sendActivationEmail || false;

  if (user) {
    // Existing user - login
    logger.info({ userId: user._id, email: user.email }, 'User logged in with Google OAuth');
    
    // If activation email is enabled but user is not verified, activate them (Google email is verified)
    if (shouldSendActivationEmail && !user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      if (user.accountStatus === 'inactive') {
        user.accountStatus = 'active';
      }
      await user.save();
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      throw new Error('Профилът е неактивен. Моля, свържете се с администратор.');
    }
  } else {
    // New user - register
    const accountStatus = shouldSendActivationEmail ? 'inactive' : 'active';
    const emailVerified = true; // Google emails are already verified

    user = await User.create({
      email: email.toLowerCase().trim(),
      firstName: given_name || 'User',
      lastName: family_name || '',
      roles: ['climber'],
      accountStatus,
      emailVerified,
      emailVerifiedAt: new Date(),
    });

    logger.info({ userId: user._id, email: user.email }, 'User registered with Google OAuth');

    // Send activation email if enabled (even though email is verified, we still send welcome email)
    if (shouldSendActivationEmail) {
      try {
        const expiryHours = settings.activationTokenExpiryHours || 48;
        const activationToken = await generateActivationToken(user._id, expiryHours);
        await sendActivationEmail(user, activationToken);
        logger.info({ userId: user._id }, 'Activation email sent to Google OAuth user');
      } catch (error) {
        logger.error({ error: error.message, userId: user._id }, 'Failed to send activation email');
        // Don't throw - user is created
      }
    }
  }

  // Generate JWT token
  const userRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    roles: userRoles,
  });

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
      roles: userRoles,
    },
  };
};

/**
 * Handle OAuth callback
 */
export const handleCallback = async (code, redirectUri) => {
  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const { access_token } = tokenData;

    // Get user info
    const userInfo = await getUserInfo(access_token);

    // Register or login
    return await registerOrLoginWithGoogle(userInfo);
  } catch (error) {
    logger.error({ error: error.message }, 'Google OAuth callback error');
    throw error;
  }
};

