import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { User } from '../models/user.js';

const router = express.Router();

// All routes require authentication and climber role
router.use(authenticate);
router.use(requireRole('climber', 'admin'));

/**
 * GET /api/v1/me/climber
 * Get own user profile (climber)
 */
router.get('/climber', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    if (!user.roles.includes('climber')) {
      return res.status(403).json({
        error: {
          message: 'User does not have climber role',
        },
      });
    }

    res.json({ climber: user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/me/climber
 * Update own climber profile
 */
router.put('/climber', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = {};

    // Only allow updating certain fields
    if (req.body.middleName !== undefined) {
      updateData.middleName = req.body.middleName ? req.body.middleName.trim() : null;
    }
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone || '';
    }
    if (req.body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = req.body.dateOfBirth || null;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes || '';
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash').lean();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    res.json({ climber: user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message),
        },
      });
    }
    next(error);
  }
});

export default router;

