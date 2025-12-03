import express from 'express';
import * as trainingController from '../controllers/trainingController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Session Management
 */

// GET /api/v1/training/sessions - List sessions
// Public for climbers, full access for staff
router.get(
    '/sessions',
    trainingController.getSessions
);

// GET /api/v1/training/sessions/:id - Get session details
// Public for all authenticated users
router.get(
    '/sessions/:id',
    trainingController.getSessionById
);

// POST /api/v1/training/sessions - Create session
// Requires: coach or admin
router.post(
    '/sessions',
    requireMinRole('coach'),
    trainingController.createSession
);

// PATCH /api/v1/training/sessions/:id - Update session
// Requires: coach (own sessions) or admin
router.patch(
    '/sessions/:id',
    requireMinRole('coach'),
    trainingController.updateSession
);

// DELETE /api/v1/training/sessions/:id - Cancel session
// Requires: coach (own sessions) or admin
router.delete(
    '/sessions/:id',
    requireMinRole('coach'),
    trainingController.cancelSession
);

/**
 * Attendance Management
 */

// GET /api/v1/training/sessions/:sessionId/attendance - Get attendance
// Requires: coach or admin
router.get(
    '/sessions/:sessionId/attendance',
    requireMinRole('coach'),
    trainingController.getAttendance
);

// POST /api/v1/training/sessions/:sessionId/attendance - Mark attendance
// Requires: coach or admin
router.post(
    '/sessions/:sessionId/attendance',
    requireMinRole('coach'),
    trainingController.markAttendance
);

/**
 * Training Pass Management
 */

// POST /api/v1/training/passes - Create/sell training pass
// Requires: coach or admin
router.post(
    '/passes',
    requireMinRole('coach'),
    trainingController.createTrainingPass
);

// GET /api/v1/training/passes - List all training passes
// Requires: coach or admin
router.get(
    '/passes',
    requireMinRole('coach'),
    trainingController.getAllTrainingPasses
);

// GET /api/v1/training/my-passes - Get user's own passes
// Requires: any authenticated user
router.get(
    '/my-passes',
    trainingController.getMyTrainingPasses
);

// GET /api/v1/training/passes/:id - Get pass details
// Requires: owner, coach, or admin (checked in controller)
router.get(
    '/passes/:id',
    trainingController.getTrainingPassById
);

// PATCH /api/v1/training/passes/:id - Update pass
// Requires: admin only
router.patch(
    '/passes/:id',
    requireMinRole('admin'),
    trainingController.updateTrainingPass
);

/**
 * Booking Management
 */

// GET /api/v1/training/bookings - List all bookings
// Requires: coach or admin
router.get(
    '/bookings',
    requireMinRole('coach'),
    trainingController.getAllBookings
);

// Note: User-specific booking routes (create, cancel, my bookings)
// are already handled in the existing bookings.js routes

export default router;
