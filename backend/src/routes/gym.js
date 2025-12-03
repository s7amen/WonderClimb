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
    requireMinRole('coach'),
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

export default router;
