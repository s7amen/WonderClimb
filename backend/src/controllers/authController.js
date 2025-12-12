import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/user.js';
import { RefreshToken } from '../models/refreshToken.js';
import { config } from '../config/env.js';
import logger from '../middleware/logging.js';
import { generateToken } from '../middleware/auth.js';
import * as auditService from '../services/auditService.js';
import * as authService from '../services/authService.js';
import { getAuthUrl, handleCallback, generateStateToken } from '../services/gmailOAuthService.js';

// Helper to generate a random refresh token string
const randomTokenString = () => {
    return crypto.randomBytes(40).toString('hex');
};

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
    const cookieOptions = {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'Strict' : 'Lax',
        path: '/api/v1/auth', // Restrict to auth routes
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    res.cookie('refreshToken', token, cookieOptions);
};

export const register = async (req, res) => {
    try {
        const { email, password, firstName, middleName, lastName, phone, roles } = req.body;

        // Use authService for registration
        const user = await authService.registerUser(
            email,
            password,
            firstName,
            middleName,
            lastName,
            roles,
            phone
        );

        // Check if account is active (activation email might be disabled)
        if (user.accountStatus === 'active' && user.emailVerified) {
            // Generate tokens only for active accounts
            const accessToken = generateToken({
                id: user._id,
                email: user.email,
                roles: user.roles
            });

            const refreshTokenString = randomTokenString();
            const refreshToken = new RefreshToken({
                userId: user._id,
                token: refreshTokenString,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdIp: req.ip,
            });
            await refreshToken.save();

            setRefreshTokenCookie(res, refreshTokenString);

            // Audit Log
            await auditService.log(
                user._id,
                'USER_REGISTERED',
                'Auth',
                user._id,
                { email: user.email, roles: user.roles },
                req
            );

            res.status(201).json({
                message: 'User registered successfully',
                token: accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    middleName: user.middleName,
                    lastName: user.lastName,
                    roles: user.roles,
                },
            });
        } else {
            // Account is inactive - activation email was sent
            res.status(201).json({
                message: 'User registered successfully. Please check your email to activate your account.',
                requiresActivation: true,
            });

            // Audit Log (even if inactive)
            await auditService.log(
                user._id,
                'USER_REGISTERED',
                'Auth',
                user._id,
                { email: user.email, roles: user.roles, status: 'inactive' },
                req
            );
        }
    } catch (error) {
        logger.error({ error: error.message }, 'Registration error');
        const statusCode = error.message.includes('вече съществува') ? 400 : 500;
        res.status(statusCode).json({ error: { message: error.message || 'Registration failed' } });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Use authService for login
        const result = await authService.loginUser(email, password);
        const user = await User.findById(result.user.id);

        // Generate refresh token
        const refreshTokenString = randomTokenString();
        const refreshToken = new RefreshToken({
            userId: user._id,
            token: refreshTokenString,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdIp: req.ip,
        });
        await refreshToken.save();

        setRefreshTokenCookie(res, refreshTokenString);

        // Audit Log
        await auditService.log(
            user._id,
            'USER_LOGIN',
            'Auth',
            user._id,
            { email: user.email, role: user.roles[0] },
            req
        );

        res.json({
            message: 'Login successful',
            token: result.token,
            user: result.user,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Login error');
        const statusCode = error.message.includes('неактивен') || error.message.includes('верифициран') ? 403 : 401;
        res.status(statusCode).json({ error: { message: error.message || 'Login failed' } });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({ error: { message: 'Token required' } });
        }

        const storedToken = await RefreshToken.findOne({ token });

        if (!storedToken) {
            // Reuse detection could happen here if we tracked families of tokens, 
            // but for now we just deny.
            return res.status(401).json({ error: { message: 'Invalid token' } });
        }

        // Check for reuse/revocation
        if (storedToken.revoked) {
            // Security alert: Attempt to use revoked token!
            // Invalidate all tokens for this user family if we had that logic.
            logger.warn({ userId: storedToken.userId, token }, 'Attempt to use revoked refresh token');
            return res.status(401).json({ error: { message: 'Token revoked' } });
        }

        if (storedToken.isExpired) {
            return res.status(401).json({ error: { message: 'Token expired' } });
        }

        // Rolling Refresh: Revoke old, issue new
        const newRefreshTokenString = randomTokenString();

        // Revoke old
        storedToken.revoked = true;
        storedToken.revokedAt = new Date();
        storedToken.replacedByToken = newRefreshTokenString;
        await storedToken.save();

        // Create new
        const newRefreshToken = new RefreshToken({
            userId: storedToken.userId,
            token: newRefreshTokenString,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdIp: req.ip,
        });
        await newRefreshToken.save();

        // Generate new access token
        const user = await User.findById(storedToken.userId);
        if (!user) {
            return res.status(401).json({ error: { message: 'User not found' } });
        }

        const accessToken = generateToken({
            id: user._id,
            email: user.email,
            roles: user.roles
        });

        setRefreshTokenCookie(res, newRefreshTokenString);

        res.json({
            message: 'Token refreshed',
            accessToken,
        });

    } catch (error) {
        logger.error({ error }, 'Refresh token error');
        res.status(500).json({ error: { message: 'Refresh failed' } });
    }
};

export const logout = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            const storedToken = await RefreshToken.findOne({ token });
            if (storedToken) {
                storedToken.revoked = true;
                storedToken.revokedAt = new Date();
                await storedToken.save();
            }
        }

        res.clearCookie('refreshToken', { path: '/api/v1/auth' });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error({ error }, 'Logout error');
        res.status(500).json({ error: { message: 'Logout failed' } });
    }
};

export const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        res.json({ user });
    } catch (error) {
        logger.error({ error }, 'Me endpoint error');
        res.status(500).json({ error: { message: 'Failed to fetch user' } });
    }
};

export const updatePWAStatus = async (req, res) => {
    try {
        const { installed } = req.body;

        await User.findByIdAndUpdate(req.user.id, {
            pwaInstalled: installed,
            pwaLastUsed: new Date()
        });

        // Audit Log
        if (installed) {
            await auditService.log(
                req.user.id,
                'PWA_INSTALLED',
                'PWA',
                req.user.id,
                { installed },
                req
            );
        }

        res.json({ message: 'PWA status updated' });
    } catch (error) {
        logger.error({ error }, 'Update PWA status error');
        res.status(500).json({ error: { message: 'Failed to update PWA status' } });
    }
};

/**
 * Activate account using activation token
 */
export const activate = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: { message: 'Activation token is required' } });
        }

        const user = await authService.activateAccount(token);

        // Generate tokens
        const accessToken = generateToken({
            id: user._id,
            email: user.email,
            roles: user.roles
        });

        const refreshTokenString = randomTokenString();
        const refreshToken = new RefreshToken({
            userId: user._id,
            token: refreshTokenString,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdIp: req.ip,
        });
        await refreshToken.save();

        setRefreshTokenCookie(res, refreshTokenString);

        res.json({
            message: 'Account activated successfully',
            token: accessToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
            },
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Activation error');
        res.status(400).json({ error: { message: error.message || 'Activation failed' } });
    }
};

/**
 * Resend activation email (authenticated)
 */
export const resendActivation = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;

        if (!userId) {
            return res.status(400).json({ error: { message: 'User ID is required' } });
        }

        await authService.resendActivationEmail(userId);

        res.json({ message: 'Activation email sent successfully' });
    } catch (error) {
        logger.error({ error: error.message }, 'Resend activation error');
        res.status(400).json({ error: { message: error.message || 'Failed to resend activation email' } });
    }
};

/**
 * Resend activation email by email (public)
 */
export const resendActivationByEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: { message: 'Email is required' } });
        }

        await authService.resendActivationEmailByEmail(email);

        // Always return success message for security (don't reveal if user exists)
        res.json({ message: 'Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.' });
    } catch (error) {
        logger.error({ error: error.message }, 'Resend activation by email error');
        // Always return success message for security
        res.json({ message: 'Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.' });
    }
};

/**
 * Initiate Google OAuth flow
 */
export const googleAuth = async (req, res) => {
    try {
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
        const state = generateStateToken();

        // Store state in session or cookie for CSRF protection
        // For simplicity, we'll use a cookie
        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000, // 10 minutes
        });

        const authUrl = getAuthUrl(redirectUri, state);
        res.redirect(authUrl);
    } catch (error) {
        logger.error({ error: error.message }, 'Google OAuth initiation error');
        res.status(500).json({ error: { message: 'Failed to initiate OAuth flow' } });
    }
};

/**
 * Handle Google OAuth callback
 */
export const googleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const storedState = req.cookies.oauth_state;

        // Verify state
        if (!state || state !== storedState) {
            return res.status(400).json({ error: { message: 'Invalid state parameter' } });
        }

        // Clear state cookie
        res.clearCookie('oauth_state');

        if (!code) {
            return res.status(400).json({ error: { message: 'Authorization code is missing' } });
        }

        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
        const result = await handleCallback(code, redirectUri);

        // Generate refresh token
        const refreshTokenString = randomTokenString();
        const refreshToken = new RefreshToken({
            userId: result.user.id,
            token: refreshTokenString,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdIp: req.ip,
        });
        await refreshToken.save();

        setRefreshTokenCookie(res, refreshTokenString);

        // Audit Log
        await auditService.log(
            result.user.id,
            'USER_LOGIN',
            'Auth',
            result.user.id,
            { email: result.user.email, method: 'google_oauth' },
            req
        );

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
    } catch (error) {
        logger.error({ error: error.message }, 'Google OAuth callback error');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
};
