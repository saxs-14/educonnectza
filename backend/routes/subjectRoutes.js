import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createSubject,
  getSubjects,
  getMySubjects,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';

const router = express.Router();

router.use(protect);

router.get('/my', authorize('Teacher'), getMySubjects);
router.get('/', getSubjects);
router.post('/', authorize('SchoolAdmin', 'DevAdmin'), createSubject);
router.route('/:id')
  .put(authorize('SchoolAdmin', 'DevAdmin'), updateSubject)
  .delete(authorize('DevAdmin'), deleteSubject);

export default router;
