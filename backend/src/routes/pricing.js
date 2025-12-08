import express from 'express';
import * as pricingController from '../controllers/pricingController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// All pricing routes require authentication
router.use(authenticate);

/**
 * GET /pricing/active
 * Get all active pricings (optionally filtered by category)
 * Access: instructor+
 */
router.get('/active', requireRole('instructor', 'admin'), pricingController.getActivePricings);

/**
 * GET /pricing/active/:pricingCode
 * Get active pricing by pricingCode
 * Access: instructor+
 */
router.get('/active/:pricingCode', requireRole('instructor', 'admin'), pricingController.getActivePricing);

/**
 * GET /pricing/history/:pricingCode
 * Get pricing history by pricingCode
 * Access: admin only
 */
router.get('/history/:pricingCode', requireRole('admin'), pricingController.getPricingHistory);

/**
 * GET /pricing
 * Get all pricings (active and inactive) with pagination
 * Access: admin only
 */
router.get('/', requireRole('admin'), pricingController.getAllPricings);

/**
 * POST /pricing
 * Create new pricing
 * Access: admin only
 */
router.post('/', requireRole('admin'), pricingController.createPricing);

/**
 * PUT /pricing/:pricingCode
 * Update pricing (creates new version)
 * Access: admin only
 */
router.put('/:pricingCode', requireRole('admin'), pricingController.updatePricing);

/**
 * DELETE /pricing/:pricingCode
 * Deactivate pricing
 * Access: admin only
 */
router.delete('/:pricingCode', requireRole('admin'), pricingController.deactivatePricing);

export default router;
