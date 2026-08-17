import asyncHandler from 'express-async-handler';
import ParentLearnerLink from '../models/ParentLearnerLink.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Assignment from '../models/Assignment.js';
import { isSameSchool } from '../utils/authz.js';

// @desc    Get all linked learners for a parent
// @route   GET /api/v1/parent/learners
// @access  Private (Parent)
export const getParentLearners = asyncHandler(async (req, res) => {
  const parentId = req.user._id;

  const links = await ParentLearnerLink.find({ parentId, status: 'active' })
    .populate('learnerId', 'name email grade userCode schoolId')
    .populate('schoolId', 'name code district');

  res.json({ success: true, count: links.length, learners: links });
});

// @desc    Get detailed read-only academic progress for a linked learner
// @route   GET /api/v1/parent/learner/:learnerId/progress
// @access  Private (Parent, DevAdmin)
export const getLearnerAcademicProgress = asyncHandler(async (req, res) => {
  const { learnerId } = req.params;
  const parentId = req.user._id;

  // Verify explicit ParentLearnerLink unless DevAdmin
  if (req.user.role !== 'DevAdmin') {
    const link = await ParentLearnerLink.findOne({
      parentId,
      learnerId,
      status: 'active',
      isPOPIAConsentGiven: true,
    });

    if (!link) {
      res.status(403);
      throw new Error('Not authorized to view progress for this learner or POPIA consent is missing');
    }
  }

  const learner = await User.findById(learnerId).select('name email grade schoolId').populate('schoolId', 'name');
  if (!learner) {
    res.status(404);
    throw new Error('Learner profile not found');
  }

  // Fetch submissions and quiz attempts
  const submissions = await Submission.find({ learnerId })
    .populate('assignmentId', 'title totalMarks dueDate subjectId')
    .sort('-createdAt')
    .limit(10);

  const quizAttempts = await QuizAttempt.find({ learnerId })
    .populate('quizId', 'title totalMarks subjectId')
    .sort('-createdAt')
    .limit(10);

  res.json({
    success: true,
    learner,
    summary: {
      totalSubmissions: submissions.length,
      totalQuizzesTaken: quizAttempts.length,
    },
    recentSubmissions: submissions,
    recentQuizAttempts: quizAttempts,
  });
});

// @desc    Link parent to learner with POPIA consent
// @route   POST /api/v1/parent/link
// @access  Private (Parent, SchoolAdmin, DevAdmin)
export const createParentLearnerLink = asyncHandler(async (req, res) => {
  const { learnerCode, relationship, isPOPIAConsentGiven } = req.body;

  if (!isPOPIAConsentGiven) {
    res.status(400);
    throw new Error('POPIA consent is mandatory to link parent profile');
  }

  const learner = await User.findOne({ userCode: learnerCode, role: 'Learner' });
  if (!learner) {
    res.status(404);
    throw new Error('Learner with specified code was not found');
  }

  if (!isSameSchool(req.user, learner.schoolId)) {
    res.status(403);
    throw new Error('Cannot link to a learner from a different school');
  }

  const existingLink = await ParentLearnerLink.findOne({
    parentId: req.user._id,
    learnerId: learner._id,
  });

  if (existingLink) {
    res.status(400);
    throw new Error('Parent-Learner link already exists');
  }

  const link = await ParentLearnerLink.create({
    parentId: req.user._id,
    learnerId: learner._id,
    schoolId: learner.schoolId,
    relationship: relationship || 'parent',
    isPOPIAConsentGiven: true,
    consentDate: new Date(),
    status: 'active',
  });

  res.status(201).json({ success: true, link });
});
