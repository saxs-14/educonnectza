import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadLogo, uploadAssignmentFile } from '../middleware/uploadMiddleware.js';
import {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  updateSchoolTheme,
  getSchoolMetrics,
  getGlobalMetrics,
  createClass,
  getClasses,
  uploadReports,
} from '../controllers/schoolController.js';

const router = express.Router();

// Public/authenticated mixed
router.get('/global-metrics', protect, authorize('DevAdmin'), getGlobalMetrics);

// SchoolAdmin routes
router.get('/metrics', protect, authorize('SchoolAdmin'), getSchoolMetrics);
router.post('/classes', protect, authorize('SchoolAdmin'), createClass);
router.get('/classes', protect, authorize('SchoolAdmin', 'Teacher'), getClasses);
router.post('/upload-reports', protect, authorize('SchoolAdmin'), uploadAssignmentFile.single('file'), uploadReports);

// DevAdmin routes
router.route('/')
  .get(protect, authorize('DevAdmin'), getSchools)
  .post(protect, authorize('DevAdmin'), uploadLogo.single('logo'), createSchool);

router.route('/:id')
  .get(protect, getSchoolById)
  .put(protect, authorize('DevAdmin'), updateSchool);

router.put('/:id/theme', protect, authorize('DevAdmin', 'SchoolAdmin'), uploadLogo.single('logo'), updateSchoolTheme);

export default router;
