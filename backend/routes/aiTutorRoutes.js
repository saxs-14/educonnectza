import express from 'express';
import { askAiTutor } from '../controllers/aiTutorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/ask', protect, askAiTutor);

export default router;
