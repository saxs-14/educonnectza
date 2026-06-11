import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadProfilePicture } from '../middleware/uploadMiddleware.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getProfile,
  updateProfile,
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(uploadProfilePicture.single('profilePicture'), updateProfile);

router.route('/')
  .get(authorize('SchoolAdmin', 'DevAdmin'), getUsers)
  .post(authorize('SchoolAdmin', 'DevAdmin'), createUser);

router.route('/:id')
  .get(authorize('SchoolAdmin', 'DevAdmin'), getUserById)
  .put(authorize('SchoolAdmin', 'DevAdmin'), updateUser)
  .delete(authorize('DevAdmin'), deleteUser);

router.put('/:id/reset-password', authorize('SchoolAdmin', 'DevAdmin'), resetUserPassword);

export default router;
