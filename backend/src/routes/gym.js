import express from 'express';
import * as gymController from '../controllers/gymController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Check-in endpoints
 */

// POST /api/v1/gym/check-in - Record gym check-in
// Requires: coach, instructor, or admin
router.post(
    '/check-in',
    requireMinRole('instructor'),
    gymController.checkIn
);

// GET /api/v1/gym/visits/today - Get today's check-ins
// Requires: instructor, coach, or admin
router.get(
    '/visits/today',
    requireMinRole('instructor'),
    gymController.getTodaysVisits
);

// GET /api/v1/gym/visits - List gym visits with filters
// Requires: coach or admin
router.get(
    '/visits',
    requireMinRole('coach'),
    gymController.getVisits
);

/**
 * Gym pass endpoints
 */

// POST /api/v1/gym/passes - Create/sell gym pass
// Requires: coach or admin
router.post(
    '/passes',
    requireMinRole('coach'),
    gymController.createGymPass
);

// GET /api/v1/gym/passes - List all gym passes
// Requires: coach or admin
router.get(
    '/passes',
    requireMinRole('climber'),
    gymController.getAllPasses
);

// GET /api/v1/gym/my-passes - Get user's own passes
// Requires: any authenticated user
router.get(
    '/my-passes',
    gymController.getMyPasses
);

// GET /api/v1/gym/passes/:id - Get pass details
// Requires: owner, coach, or admin (checked in controller)
router.get(
    '/passes/:id',
    gymController.getPassById
);

// PATCH /api/v1/gym/passes/:id - Update pass
// Requires: admin only
router.patch(
    '/passes/:id',
    requireMinRole('admin'),
    gymController.updatePass
);

// DELETE /api/v1/gym/passes/:id - Delete pass (soft delete)
// Requires: admin only
router.delete(
    '/passes/:id',
    requireMinRole('admin'),
    gymController.deletePass
);

// POST /api/v1/gym/passes/extend-all - Extend all active passes
// Requires: admin only
router.post(
    '/passes/extend-all',
    requireMinRole('admin'),
    gymController.extendAllPasses
);

// DELETE /api/v1/gym/passes/:id/cascade - Delete pass and all related visits (hard delete)
// Requires: admin only
router.delete(
    '/passes/:id/cascade',
    requireMinRole('admin'),
    gymController.deletePassCascade
);

/**
 * Pricing endpoints
 */

// GET /api/v1/gym/pricing - Get all pricing
// Requires: instructor, coach, or admin
router.get(
    '/pricing',
    requireMinRole('instructor'),
    gymController.getAllPricing
);

// POST /api/v1/gym/pricing - Create new pricing
// Requires: admin only
router.post(
    '/pricing',
    requireMinRole('admin'),
    gymController.createPricing
);

// PUT /api/v1/gym/pricing/:id - Update pricing
// Requires: admin only
router.put(
    '/pricing/:id',
    requireMinRole('admin'),
    gymController.updatePricing
);

// DELETE /api/v1/gym/pricing/:id - Delete pricing (soft delete)
// Requires: admin only
router.delete(
    '/pricing/:id',
    requireMinRole('admin'),
    gymController.deletePricing
);

export default router;
