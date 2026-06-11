import asyncHandler from 'express-async-handler';
import Subject from '../models/Subject.js';
import TeacherAllocation from '../models/TeacherAllocation.js';

// @desc    Create subject (SchoolAdmin/DevAdmin)
// @route   POST /api/subjects
export const createSubject = asyncHandler(async (req, res) => {
  const { name, grade, capsTopics, isMandatory, schoolId } = req.body;
  let targetSchoolId = req.user.role === 'DevAdmin' ? schoolId : req.user.schoolId;
  if (req.user.role === 'SchoolAdmin' && schoolId && schoolId !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Cannot create subject for another school');
  }
  const subject = await Subject.create({
    schoolId: targetSchoolId || null,
    name,
    grade,
    capsTopics,
    isMandatory,
  });
  res.status(201).json(subject);
});

// @desc    Get subjects (filtered by school/grade)
// @route   GET /api/subjects
export const getSubjects = asyncHandler(async (req, res) => {
  const { grade, schoolId } = req.query;
  let filter = {};
  if (req.user.role === 'SchoolAdmin' || req.user.role === 'Teacher' || req.user.role === 'Learner') {
    filter.schoolId = req.user.schoolId;
  } else if (req.user.role === 'DevAdmin' && schoolId) {
    filter.schoolId = schoolId;
  }
  if (grade) filter.grade = parseInt(grade);
  const subjects = await Subject.find(filter).sort('grade name');
  res.json(subjects);
});

// @desc    Get subjects taught by teacher (Teacher only)
// @route   GET /api/subjects/my
export const getMySubjects = asyncHandler(async (req, res) => {
  const allocations = await TeacherAllocation.find({ teacherId: req.user._id }).populate('subjectId');
  const subjects = allocations.map(a => a.subjectId);
  res.json(subjects);
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  if (req.user.role === 'SchoolAdmin' && subject.schoolId?.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const { name, capsTopics, isMandatory } = req.body;
  subject.name = name || subject.name;
  subject.capsTopics = capsTopics || subject.capsTopics;
  if (isMandatory !== undefined) subject.isMandatory = isMandatory;
  const updated = await subject.save();
  res.json(updated);
});

// @desc    Delete subject (DevAdmin only)
// @route   DELETE /api/subjects/:id
export const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  await subject.deleteOne();
  res.json({ message: 'Subject removed' });
});
