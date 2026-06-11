import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  verifySchool,
} from '../controllers/authController.js';
import { uploadProfilePicture } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/forgot-password', (req, res) => {
  // TODO: integrate with Firebase Auth sendPasswordResetEmail or email service
  console.log('Forgot password request:', req.body);
  res.json({ message: 'Password reset email sent (stub).' });
});

router.post('/reset-password/:token', (req, res) => {
  // TODO: verify token and update password in Firebase/Auth DB
  console.log('Reset password for token:', req.params.token, 'new pwd:', req.body.password);
  res.json({ message: 'Password has been reset (stub).' });
});

router.post('/register', uploadProfilePicture.single('profilePicture'), registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/verify-school', verifySchool);

export default router;
