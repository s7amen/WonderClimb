import express from 'express';
import { processSale } from '../controllers/saleController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/sales - Process a sale (visits, passes, products)
// Requires: instructor, coach, or admin
router.post(
    '/',
    requireMinRole('instructor'),
    processSale
);

export default router;
