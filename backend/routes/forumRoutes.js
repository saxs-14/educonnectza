import express from 'express';
import { createTopic, getTopics, createReply, getReplies } from '../controllers/forumController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/topics', protect, createTopic);
router.get('/subject/:subjectId', protect, getTopics);
router.post('/topics/:id/replies', protect, createReply);
router.get('/topics/:id/replies', protect, getReplies);

export default router;
