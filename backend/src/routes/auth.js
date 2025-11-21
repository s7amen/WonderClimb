import express from 'express';
import { registerUser, loginUser } from '../services/authService.js';
import { validateRegister, validateLogin } from '../middleware/validation/authValidation.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, validateRegister, async (req, res, next) => {
  try {
    const { email, password, firstName, middleName, lastName } = req.body;
    
    const user = await registerUser(email, password, firstName, middleName, lastName);
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error.message === 'User with this email already exists') {
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
    if (error.message === 'Invalid email or password' || error.message === 'Account is inactive. Please contact administrator.') {
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

