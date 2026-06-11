import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  deleteGroup,
} from '../controllers/studyGroupController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getGroups)
  .post(authorize('Learner'), createGroup);

router.route('/:id')
  .get(getGroupById)
  .delete(authorize('Learner', 'Teacher', 'SchoolAdmin'), deleteGroup);

router.post('/:id/join', authorize('Learner'), joinGroup);
router.post('/:id/leave', authorize('Learner'), leaveGroup);

export default router;
