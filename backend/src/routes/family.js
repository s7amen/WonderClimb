import express from 'express';
import * as familyController from '../controllers/familyController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', familyController.createFamily);
router.get('/', familyController.getFamilies);
router.get('/:id', familyController.getFamily);
router.put('/:id', familyController.updateFamily);
router.delete('/:id', familyController.deleteFamily);

export default router;
