import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getSettings, updateSettings } from '../services/settingsService.js';

const router = express.Router();

// All routes require authentication and admin role only
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/v1/admin/settings
 * Get current settings
 */
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/admin/settings
 * Update settings
 */
router.put('/settings', async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await updateSettings(updates);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;



