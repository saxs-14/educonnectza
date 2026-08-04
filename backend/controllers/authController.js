import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import { generateLearnerCode, generateTeacherCode } from '../utils/generateCodes.js';
import { auth } from '../config/firebase.js';

// @desc    Register a new user (Learner/Teacher)
// @route   POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { firebaseUid, schoolCode, role, fullNames, surname, idNumber, dateOfBirth, grade, email, parentConsent } = req.body;

  if (!firebaseUid) {
    res.status(400);
    throw new Error('Firebase UID is required');
  }

  // POPIA requires parental/guardian consent before processing a minor's data.
  // Learners (grades 8-12) are treated as minors for this purpose.
  const hasParentConsent = parentConsent === true || parentConsent === 'true';
  if (role === 'Learner' && !hasParentConsent) {
    res.status(400);
    throw new Error('Parent or guardian consent is required to register as a learner');
  }

  // Verify the user exists in Firebase
  try {
    await auth.getUser(firebaseUid);
  } catch (error) {
    res.status(400);
    throw new Error('Invalid Firebase UID');
  }

  const school = await School.findOne({ uniqueCode: schoolCode });
  if (!school) {
    res.status(400);
    throw new Error('Invalid school code');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists in database with this email');
  }

  let userCode;
  if (role === 'Learner') {
    userCode = await generateLearnerCode(schoolCode);
  } else if (role === 'Teacher') {
    userCode = await generateTeacherCode(school._id, schoolCode, school.province);
  } else {
    res.status(400);
    throw new Error('Invalid role for self-registration');
  }

  const user = await User.create({
    firebaseUid,
    schoolId: school._id,
    userCode,
    role,
    fullNames,
    surname,
    idNumber,
    dateOfBirth,
    grade: role === 'Learner' ? grade : null,
    email,
    parentConsent: hasParentConsent,
    profilePictureUrl: req.file ? `/uploads/profiles/${req.file.filename}` : (req.body.profilePictureUrl || ''),
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firebaseUid: user.firebaseUid,
      userCode: user.userCode,
      role: user.role,
      email: user.email,
      school: { _id: school._id, name: school.name, theme: school.theme }
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user (Sync Firebase with Mongo)
// @route   POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { firebaseUid } = req.body;

  if (!firebaseUid) {
    res.status(400);
    throw new Error('Firebase UID is required');
  }

  try {
    await auth.getUser(firebaseUid);
  } catch (error) {
    res.status(400);
    throw new Error('Invalid Firebase UID');
  }

  const user = await User.findOne({ firebaseUid }).populate('schoolId', 'name theme');
  if (user) {
    if (!user.isActive) {
      res.status(401);
      throw new Error('Account is deactivated. Contact administrator.');
    }
    res.json({
      _id: user._id,
      firebaseUid: user.firebaseUid,
      userCode: user.userCode,
      role: user.role,
      email: user.email,
      school: user.schoolId
    });
  } else {
    res.status(404);
    throw new Error('User profile not found in database. Please complete registration.');
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Verify school code exists
// @route   POST /api/auth/verify-school
export const verifySchool = asyncHandler(async (req, res) => {
  const { schoolCode } = req.body;
  const school = await School.findOne({ uniqueCode: schoolCode });
  if (school) {
    res.json({ exists: true, schoolName: school.name });
  } else {
    res.json({ exists: false });
  }
});
