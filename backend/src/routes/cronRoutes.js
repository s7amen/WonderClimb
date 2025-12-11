import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as cronController from '../controllers/cronController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Cron job management (admin only)
router.get('/jobs', requireRole('admin'), cronController.listCronJobs);
router.post('/jobs/:jobName/trigger', requireRole('admin'), cronController.triggerCronJob);
router.get('/jobs/:jobName/history', requireRole('admin'), cronController.getCronJobHistory);

export default router;

