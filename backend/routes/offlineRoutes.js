import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { syncData, getSyncStatus } from '../controllers/offlineController.js';

const router = express.Router();

router.use(protect);

router.post('/sync', syncData);
router.get('/status', getSyncStatus);

export default router;
