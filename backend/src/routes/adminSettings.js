import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { clearSettingsCache } from '../services/configService.js';

const router = express.Router();

// All routes require authentication and admin role only
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/v1/admin/settings
 * Get all settings (admin only)
 * Note: GET /api/v1/settings is available publicly for reading training labels only
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
 * Update settings (admin only)
 */
router.put('/settings', async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await updateSettings(updates);
    
    // Clear config cache if training-related settings were updated
    if (updates.bookingHorizonHours !== undefined || updates.cancellationWindowHours !== undefined) {
      clearSettingsCache();
    }
    
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;













