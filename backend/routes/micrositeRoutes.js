import express from 'express';
import {
  getPublicMicrosite,
  updateMicrositeConfig,
} from '../controllers/micrositeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for viewing school microsites by slug
router.get('/:slug', getPublicMicrosite);

// Admin route for editing microsite config
router.put(
  '/school/:schoolId',
  protect,
  authorize('SchoolAdmin', 'DevAdmin'),
  updateMicrositeConfig
);

export default router;
