import express from 'express';
import * as financeController from '../controllers/financeController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication AND admin role
router.use(authenticate);
router.use(requireMinRole('admin'));

/**
 * Finance Entry Management
 */

// POST /api/v1/finance/entries - Create finance entry
router.post('/entries', financeController.createEntry);

// GET /api/v1/finance/entries - List finance entries
router.get('/entries', financeController.getEntries);

// GET /api/v1/finance/entries/:id - Get entry details
router.get('/entries/:id', financeController.getEntryById);

// PATCH /api/v1/finance/entries/:id - Update entry
router.patch('/entries/:id', financeController.updateEntry);

// DELETE /api/v1/finance/entries/:id - Delete entry
router.delete('/entries/:id', financeController.deleteEntry);

/**
 * Financial Reports
 */

// GET /api/v1/finance/reports/summary - Summary report
router.get('/reports/summary', financeController.getSummaryReport);

// GET /api/v1/finance/reports/gym - Gym revenue report
router.get('/reports/gym', financeController.getGymReport);

// GET /api/v1/finance/reports/training - Training revenue report
router.get('/reports/training', financeController.getTrainingReport);

// GET /api/v1/finance/reports/coach-fees - Coach fees report
router.get('/reports/coach-fees', financeController.getCoachFeesReport);

export default router;
