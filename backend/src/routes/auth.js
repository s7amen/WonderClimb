import express from 'express';
import { register, login, refreshToken, logout, me, updatePWAStatus, activate, resendActivation, resendActivationByEmail, googleAuth, googleCallback } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation/authValidation.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * Verify reCAPTCHA token with Google
 */
const verifyRecaptcha = async (token) => {
  if (!token) {
    return false;
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return true;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
};

// Middleware to verify reCAPTCHA
const checkCaptcha = async (req, res, next) => {
  const { recaptchaToken } = req.body;
  if (recaptchaToken) {
    const isValid = await verifyRecaptcha(recaptchaToken);
    if (!isValid) {
      return res.status(400).json({
        error: { message: 'Invalid reCAPTCHA verification.' }
      });
    }
  }
  next();
};

router.post('/register', authRateLimiter, validateRegister, checkCaptcha, register);
router.post('/login', authRateLimiter, validateLogin, login);
router.post('/activate', activate);
router.post('/resend-activation', authenticate, resendActivation);
router.post('/resend-activation-by-email', authRateLimiter, resendActivationByEmail);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/pwa-status', authenticate, updatePWAStatus);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;

