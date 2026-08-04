import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import { generateLearnerCode, generateTeacherCode } from '../utils/generateCodes.js';
import bcrypt from 'bcryptjs';
import { hashPassword } from '../utils/hashPassword.js';
import { auth } from '../config/firebase.js';

// @desc    Get all users (filtered by role, school, grade)
// @route   GET /api/users
export const getUsers = asyncHandler(async (req, res) => {
  const { role, grade, schoolId, search } = req.query;
  let filter = {};

  if (req.user.role === 'SchoolAdmin') {
    filter.schoolId = req.user.schoolId;
  } else if (req.user.role === 'DevAdmin' && schoolId) {
    filter.schoolId = schoolId;
  }

  if (role) filter.role = role;
  if (grade) filter.grade = parseInt(grade);
  if (search) {
    filter.$or = [
      { fullNames: { $regex: search, $options: 'i' } },
      { surname: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userCode: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('-passwordHash -mfaSecret -resetPasswordToken -resetPasswordExpire')
    .populate('schoolId', 'name uniqueCode')
    .sort('-createdAt');

  res.json(users);
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash -mfaSecret')
    .populate('schoolId', 'name uniqueCode theme');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.user.role === 'SchoolAdmin' && user.schoolId?._id.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this user');
  }

  res.json(user);
});

// @desc    Create a new user (SchoolAdmin/DevAdmin)
// @route   POST /api/users
export const createUser = asyncHandler(async (req, res) => {
  const {
    schoolId,
    role,
    fullNames,
    surname,
    idNumber,
    dateOfBirth,
    grade,
    email,
    password,
  } = req.body;

  let targetSchoolId;
  if (req.user.role === 'DevAdmin') {
    if (!schoolId) {
      res.status(400);
      throw new Error('School ID is required');
    }
    targetSchoolId = schoolId;
  } else {
    targetSchoolId = req.user.schoolId;
  }

  const school = await School.findById(targetSchoolId);
  if (!school) {
    res.status(400);
    throw new Error('Invalid school');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  let userCode;
  if (role === 'Learner') {
    userCode = await generateLearnerCode(school.uniqueCode);
  } else if (role === 'Teacher') {
    userCode = await generateTeacherCode(targetSchoolId, school.uniqueCode, school.province);
  } else if (role === 'SchoolAdmin') {
    const count = await User.countDocuments({ schoolId: targetSchoolId, role: 'SchoolAdmin' });
    userCode = `${school.uniqueCode}SA${count + 1}`;
  } else {
    res.status(400);
    throw new Error('Invalid role');
  }

  // Admin-created accounts have no client-side Firebase signup step (unlike
  // self-registration), so the backend has to provision the Firebase Auth
  // account itself before it can set a real firebaseUid on the Mongo profile.
  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({ email, password, displayName: `${fullNames} ${surname}` });
  } catch (error) {
    res.status(400);
    throw new Error(`Failed to create Firebase account: ${error.message}`);
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({
      firebaseUid: firebaseUser.uid,
      schoolId: targetSchoolId,
      userCode,
      role,
      fullNames,
      surname,
      idNumber,
      dateOfBirth,
      grade: role === 'Learner' ? grade : null,
      email,
      passwordHash,
      profilePictureUrl: req.file?.path || '',
    });
  } catch (error) {
    // Don't leave an orphaned Firebase account behind if the Mongo profile couldn't be saved.
    await auth.deleteUser(firebaseUser.uid).catch(() => {});
    throw error;
  }

  res.status(201).json({
    _id: user._id,
    userCode: user.userCode,
    role: user.role,
    email: user.email,
    fullNames: user.fullNames,
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.user.role === 'SchoolAdmin' && user.schoolId.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const { fullNames, surname, grade, isActive, email } = req.body;
  user.fullNames = fullNames || user.fullNames;
  user.surname = surname || user.surname;
  if (grade !== undefined && user.role === 'Learner') user.grade = grade;
  if (isActive !== undefined) user.isActive = isActive;
  if (email) user.email = email;
  if (req.file?.path) user.profilePictureUrl = req.file.path;

  const updatedUser = await user.save();
  res.json({
    _id: updatedUser._id,
    userCode: updatedUser.userCode,
    role: updatedUser.role,
    email: updatedUser.email,
    fullNames: updatedUser.fullNames,
    isActive: updatedUser.isActive,
  });
});

// @desc    Delete user (DevAdmin only)
// @route   DELETE /api/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await auth.deleteUser(user.firebaseUid).catch(() => {});
  await user.deleteOne();
  res.json({ message: 'User removed' });
});

// @desc    Reset user password (Admin)
// @route   PUT /api/users/:id/reset-password
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (req.user.role === 'SchoolAdmin' && user.schoolId.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  // Firebase is the actual login credential store - updating Mongo's passwordHash
  // alone would leave the user unable to log in with the "reset" password.
  try {
    await auth.updateUser(user.firebaseUid, { password: newPassword });
  } catch (error) {
    res.status(400);
    throw new Error(`Failed to update Firebase password: ${error.message}`);
  }
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();
  res.json({ message: 'Password reset successfully' });
});

// @desc    Get current user profile
// @route   GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-passwordHash -mfaSecret')
    .populate('schoolId', 'name uniqueCode theme');
  res.json(user);
});

// @desc    Update current user profile
// @route   PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const { fullNames, surname, email, parentConsent } = req.body;
  user.fullNames = fullNames || user.fullNames;
  user.surname = surname || user.surname;
  if (email) user.email = email;
  if (parentConsent !== undefined) user.parentConsent = parentConsent;
  if (req.file?.path) user.profilePictureUrl = req.file.path;
  const updatedUser = await user.save();
  res.json({
    _id: updatedUser._id,
    userCode: updatedUser.userCode,
    role: updatedUser.role,
    email: updatedUser.email,
    fullNames: updatedUser.fullNames,
    profilePictureUrl: updatedUser.profilePictureUrl,
  });
});
