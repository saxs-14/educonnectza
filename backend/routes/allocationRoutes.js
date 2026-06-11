import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  allocateTeacher,
  allocateTeacherBulk,
  enrollLearner,
  enrollLearnerBulk,
  getAllocations,
  removeAllocation,
} from '../controllers/allocationController.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('SchoolAdmin', 'Teacher'), getAllocations);

router.post('/teacher', authorize('SchoolAdmin'), allocateTeacher);
router.post('/teacher/bulk', authorize('SchoolAdmin'), allocateTeacherBulk);
router.post('/learner', authorize('SchoolAdmin'), enrollLearner);
router.post('/learner/bulk', authorize('SchoolAdmin'), enrollLearnerBulk);
router.delete('/:id', authorize('SchoolAdmin'), removeAllocation);

export default router;
