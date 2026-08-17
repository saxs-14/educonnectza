import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import { isSameSchool } from '../utils/authz.js';

// @desc    Get allocations (filtered by teacher/subject/class)
export const getAllocations = asyncHandler(async (req, res) => {
  const { teacherId, subjectId, classId } = req.query;
  let filter = {};
  if (req.user.role === 'Teacher') {
    filter.teacherId = req.user._id;
  } else if (teacherId) {
    filter.teacherId = teacherId;
  }
  if (subjectId) filter.subjectId = subjectId;
  if (classId) filter.classId = classId;
  const allocations = await TeacherAllocation.find(filter)
    .populate('teacherId', 'fullNames surname')
    .populate('subjectId', 'name grade')
    .populate('classId', 'grade classId');
  res.json(allocations);
});

// @desc    Allocate teacher to subject/class (SchoolAdmin)
export const allocateTeacher = asyncHandler(async (req, res) => {
  const { teacherId, subjectId, classId, isClassOwner } = req.body;
  if (!mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
    res.status(400);
    throw new Error('Invalid teacher or subject ID');
  }

  // Verify teacher belongs to same school
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== 'Teacher' || !isSameSchool(req.user, teacher.schoolId)) {
    res.status(400);
    throw new Error('Teacher not found in this school');
  }
  const subject = await Subject.findById(subjectId);
  if (!subject || !isSameSchool(req.user, subject.schoolId)) {
    res.status(404);
    throw new Error('Subject not found in this school');
  }

  const existing = await TeacherAllocation.findOne({ teacherId, subjectId, classId });
  if (existing) {
    res.status(400);
    throw new Error('Allocation already exists');
  }

  const allocation = await TeacherAllocation.create({ teacherId, subjectId, classId, isClassOwner });
  res.status(201).json(allocation);
});

// @desc    Bulk allocate teachers (SchoolAdmin)
export const allocateTeacherBulk = asyncHandler(async (req, res) => {
  const { allocations } = req.body;
  if (!Array.isArray(allocations)) {
    res.status(400);
    throw new Error('allocations must be an array');
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < allocations.length; i++) {
    const item = allocations[i];
    const { teacherId, subjectId, classId, isClassOwner } = item || {};

    if (!mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
      errors.push({ index: i, error: 'Invalid teacherId or subjectId' });
      continue;
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher' || !isSameSchool(req.user, teacher.schoolId)) {
      errors.push({ index: i, error: 'Teacher not found or belongs to another school' });
      continue;
    }

    const subject = await Subject.findById(subjectId);
    if (!subject || !isSameSchool(req.user, subject.schoolId)) {
      errors.push({ index: i, error: 'Subject not found or belongs to another school' });
      continue;
    }

    const existing = await TeacherAllocation.findOne({ teacherId, subjectId, classId });
    if (!existing) {
      const newAlloc = await TeacherAllocation.create({ teacherId, subjectId, classId, isClassOwner });
      created.push(newAlloc);
    }
  }

  res.json({
    created: created.length,
    errorsCount: errors.length,
    errors,
    message: `${created.length} allocations created successfully`,
  });
});

// @desc    Enroll learner in subject/class (SchoolAdmin)
export const enrollLearner = asyncHandler(async (req, res) => {
  const { learnerId, subjectId, classId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(learnerId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
    res.status(400);
    throw new Error('Invalid learner or subject ID');
  }

  const learner = await User.findById(learnerId);
  if (!learner || learner.role !== 'Learner' || !isSameSchool(req.user, learner.schoolId)) {
    res.status(400);
    throw new Error('Learner not found in this school');
  }

  const subject = await Subject.findById(subjectId);
  if (!subject || !isSameSchool(req.user, subject.schoolId)) {
    res.status(404);
    throw new Error('Subject not found in this school');
  }

  const existing = await LearnerEnrollment.findOne({ learnerId, subjectId, classId });
  if (existing) {
    res.status(400);
    throw new Error('Already enrolled');
  }

  const enrollment = await LearnerEnrollment.create({ learnerId, subjectId, classId });
  res.status(201).json(enrollment);
});

// @desc    Bulk enroll learners (SchoolAdmin)
export const enrollLearnerBulk = asyncHandler(async (req, res) => {
  const { enrollments } = req.body;
  if (!Array.isArray(enrollments)) {
    res.status(400);
    throw new Error('enrollments must be an array');
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < enrollments.length; i++) {
    const item = enrollments[i];
    const { learnerId, subjectId, classId } = item || {};

    if (!mongoose.Types.ObjectId.isValid(learnerId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
      errors.push({ index: i, error: 'Invalid learnerId or subjectId' });
      continue;
    }

    const learner = await User.findById(learnerId);
    if (!learner || learner.role !== 'Learner' || !isSameSchool(req.user, learner.schoolId)) {
      errors.push({ index: i, error: 'Learner not found or belongs to another school' });
      continue;
    }

    const subject = await Subject.findById(subjectId);
    if (!subject || !isSameSchool(req.user, subject.schoolId)) {
      errors.push({ index: i, error: 'Subject not found or belongs to another school' });
      continue;
    }

    const existing = await LearnerEnrollment.findOne({ learnerId, subjectId, classId });
    if (!existing) {
      const newEnroll = await LearnerEnrollment.create({ learnerId, subjectId, classId });
      created.push(newEnroll);
    }
  }

  res.json({
    created: created.length,
    errorsCount: errors.length,
    errors,
    message: `${created.length} enrollments created successfully`,
  });
});

// @desc    Remove allocation/enrollment
export const removeAllocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid allocation ID');
  }

  let deleted = await TeacherAllocation.findByIdAndDelete(id);
  if (!deleted) {
    deleted = await LearnerEnrollment.findByIdAndDelete(id);
  }

  if (!deleted) {
    res.status(404);
    throw new Error('Allocation not found');
  }

  res.json({ message: 'Removed' });
});
