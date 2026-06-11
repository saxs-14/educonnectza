import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  takeQuiz,
  submitQuiz,
  getQuizAttempts,
} from '../controllers/quizController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getQuizzes)
  .post(authorize('Teacher'), createQuiz);

router.route('/:id')
  .get(getQuizById)
  .put(authorize('Teacher'), updateQuiz)
  .delete(authorize('Teacher'), deleteQuiz);

router.get('/:id/take', authorize('Learner'), takeQuiz);
router.post('/:id/submit', authorize('Learner'), submitQuiz);
router.get('/:id/attempts', authorize('Teacher'), getQuizAttempts);

export default router;
