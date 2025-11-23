import express from 'express';
import { registerUser, loginUser } from '../services/authService.js';
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
    // If no secret key is configured, skip verification (for development)
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

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, validateRegister, async (req, res, next) => {
  try {
    const { email, password, firstName, middleName, lastName, roles, phone, recaptchaToken } = req.body;
    
    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({
          error: {
            message: 'Невалидна reCAPTCHA верификация. Моля, опитайте отново.',
          },
        });
      }
    }
    
    const user = await registerUser(email, password, firstName, middleName, lastName, roles, phone);
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error.message === 'Потребител с този имейл вече съществува') {
      return res.status(409).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authRateLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const result = await loginUser(email, password);
    
    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    if (error.message === 'Невалиден имейл или парола' || error.message === 'Профилът е неактивен. Моля, свържете се с администратор.') {
      return res.status(401).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

export default router;

