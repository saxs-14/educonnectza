import express from 'express';
import {
  getParentLearners,
  getLearnerAcademicProgress,
  createParentLearnerLink,
} from '../controllers/parentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/learners', authorize('Parent'), getParentLearners);
router.get('/learner/:learnerId/progress', authorize('Parent', 'DevAdmin'), getLearnerAcademicProgress);
router.post('/link', authorize('Parent', 'SchoolAdmin', 'DevAdmin'), createParentLearnerLink);

export default router;
