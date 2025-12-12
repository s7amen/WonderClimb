import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/logs', getAuditLogs);

export default router;
