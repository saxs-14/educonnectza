import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadAssignmentFile, uploadSubmissionFile } from '../middleware/uploadMiddleware.js';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
  getSubmissions,
} from '../controllers/assignmentController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAssignments)
  .post(authorize('Teacher'), uploadAssignmentFile.array('attachments', 5), createAssignment);

router.route('/:id')
  .get(getAssignmentById)
  .put(authorize('Teacher'), updateAssignment)
  .delete(authorize('Teacher'), deleteAssignment);

router.post('/:id/submit', authorize('Learner'), uploadSubmissionFile.single('file'), submitAssignment);
router.get('/:id/submissions', authorize('Teacher'), getSubmissions);
router.put('/submissions/:id/grade', authorize('Teacher'), gradeSubmission);

export default router;
