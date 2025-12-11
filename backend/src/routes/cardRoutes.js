import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as cardQueueController from '../controllers/cardQueueController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Queue management
router.post('/queue', requireRole('admin', 'instructor'), cardQueueController.queueCardForPass);
router.get('/queue', requireRole('admin'), cardQueueController.getQueuedCards);
router.post('/queue/:id/activate', requireRole('admin'), cardQueueController.activateQueuedCard);

export default router;

