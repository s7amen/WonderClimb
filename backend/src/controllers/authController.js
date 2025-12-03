import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/user.js';
import { RefreshToken } from '../models/refreshToken.js';
import { config } from '../config/env.js';
import logger from '../middleware/logging.js';
import { generateToken } from '../middleware/auth.js';

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
        const { email, password, firstName, lastName, phone, roles } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: { message: 'Email already registered' } });
        }

        // Create user
        const passwordHash = await User.hashPassword(password);
        const user = new User({
            email,
            passwordHash,
            firstName,
            lastName,
            phone,
            roles: roles || ['climber'],
        });

        await user.save();

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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdIp: req.ip,
        });
        await refreshToken.save();

        setRefreshTokenCookie(res, refreshTokenString);

        res.status(201).json({
            message: 'User registered successfully',
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
        logger.error({ error }, 'Registration error');
        res.status(500).json({ error: { message: 'Registration failed' } });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: { message: 'Invalid credentials' } });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: { message: 'Invalid credentials' } });
        }

        if (user.accountStatus !== 'active') {
            return res.status(403).json({ error: { message: 'Account is inactive' } });
        }

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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdIp: req.ip,
        });
        await refreshToken.save();

        setRefreshTokenCookie(res, refreshTokenString);

        res.json({
            message: 'Login successful',
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
        logger.error({ error }, 'Login error');
        res.status(500).json({ error: { message: 'Login failed' } });
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
