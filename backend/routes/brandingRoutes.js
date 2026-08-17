import express from 'express';
import multer from 'multer';
import {
  getSchoolBranding,
  updateSchoolBranding,
  uploadBrandingAsset,
  resetSchoolBranding,
} from '../controllers/brandingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Memory storage for multer so buffer is accessible for R2 / local storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, SVG, ICO) are allowed'), false);
    }
  },
});

router.get('/:schoolId', getSchoolBranding);

router.put(
  '/:schoolId',
  protect,
  authorize('SchoolAdmin', 'DevAdmin'),
  updateSchoolBranding
);

router.post(
  '/:schoolId/upload',
  protect,
  authorize('SchoolAdmin', 'DevAdmin'),
  upload.single('asset'),
  uploadBrandingAsset
);

router.post(
  '/:schoolId/reset',
  protect,
  authorize('SchoolAdmin', 'DevAdmin'),
  resetSchoolBranding
);

export default router;
