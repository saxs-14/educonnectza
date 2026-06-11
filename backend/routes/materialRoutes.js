import express from 'express';
import { createMaterial, getMaterialsBySubject, deleteMaterial } from '../controllers/materialController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadSubmissionFile } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('Teacher', 'SchoolAdmin'), uploadSubmissionFile.single('file'), createMaterial);
router.get('/subject/:subjectId', protect, getMaterialsBySubject);
router.delete('/:id', protect, authorize('Teacher', 'SchoolAdmin'), deleteMaterial);

export default router;
