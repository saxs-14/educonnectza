import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getSystemAudit, runDeepScan } from '../controllers/aiController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('DevAdmin'));

router.get('/audit', getSystemAudit);
router.post('/db-check', runDeepScan);

export default router;
