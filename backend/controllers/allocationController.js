import asyncHandler from 'express-async-handler';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';

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
  // Verify teacher belongs to school
  const teacher = await User.findOne({ _id: teacherId, schoolId: req.user.schoolId });
  if (!teacher) {
    res.status(400);
    throw new Error('Teacher not found in this school');
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
  const created = [];
  for (const alloc of allocations) {
    const existing = await TeacherAllocation.findOne(alloc);
    if (!existing) {
      const newAlloc = await TeacherAllocation.create(alloc);
      created.push(newAlloc);
    }
  }
  res.json({ created: created.length, message: `${created.length} allocations created` });
});

// @desc    Enroll learner in subject/class (SchoolAdmin)
export const enrollLearner = asyncHandler(async (req, res) => {
  const { learnerId, subjectId, classId } = req.body;
  const learner = await User.findOne({ _id: learnerId, schoolId: req.user.schoolId, role: 'Learner' });
  if (!learner) {
    res.status(400);
    throw new Error('Learner not found');
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
  const created = [];
  for (const enroll of enrollments) {
    const existing = await LearnerEnrollment.findOne(enroll);
    if (!existing) {
      const newEnroll = await LearnerEnrollment.create(enroll);
      created.push(newEnroll);
    }
  }
  res.json({ created: created.length, message: `${created.length} enrollments created` });
});

// @desc    Remove allocation/enrollment
export const removeAllocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Could be teacher allocation or learner enrollment; check both
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
