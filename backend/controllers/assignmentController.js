import asyncHandler from 'express-async-handler';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import fs from 'fs';

// @desc    Create assignment (Teacher)
export const createAssignment = asyncHandler(async (req, res) => {
  const { subjectId, classId, title, description, dueDate, tierLevel } = req.body;
  // Verify teacher teaches this subject/class
  const allocationQuery = { teacherId: req.user._id, subjectId };
  if (classId) allocationQuery.classId = classId;
  const allocation = await TeacherAllocation.findOne(allocationQuery);
  if (!allocation) {
    res.status(403);
    throw new Error('You are not assigned to this subject/class');
  }
  const assignment = await Assignment.create({
    teacherId: req.user._id,
    subjectId,
    classId: classId || null,
    title,
    description,
    dueDate,
    tierLevel,
    attachments: req.files?.map(file => file.path) || [],
  });
  res.status(201).json(assignment);
});

// @desc    Get assignments for logged-in user
export const getAssignments = asyncHandler(async (req, res) => {
  const user = req.user;
  let filter = {};
  if (user.role === 'Teacher') {
    filter.teacherId = user._id;
  } else if (user.role === 'Learner') {
    const enrollments = await LearnerEnrollment.find({ learnerId: user._id }).populate('subjectId');
    const subjectIds = enrollments.map(e => e.subjectId._id);
    const classIds = enrollments.map(e => e.classId);
    filter.$or = [
      { subjectId: { $in: subjectIds }, classId: { $in: classIds } },
      { subjectId: { $in: subjectIds }, classId: null },
    ];
  }
  const assignments = await Assignment.find(filter)
    .populate('subjectId', 'name')
    .populate('teacherId', 'fullNames surname')
    .sort('-createdAt');
  if (user.role === 'Learner') {
    const submissions = await Submission.find({ learnerId: user._id });
    const assignmentsWithStatus = assignments.map(a => {
      const sub = submissions.find(s => s.assignmentId.toString() === a._id.toString());
      return { ...a.toObject(), submitted: !!sub, submission: sub || null };
    });
    return res.json(assignmentsWithStatus);
  }
  res.json(assignments);
});

// @desc    Get single assignment
export const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('subjectId', 'name')
    .populate('teacherId', 'fullNames surname');
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }
  res.json(assignment);
});

// @desc    Update assignment (Teacher)
export const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }
  if (assignment.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const { title, description, dueDate, tierLevel } = req.body;
  assignment.title = title || assignment.title;
  assignment.description = description || assignment.description;
  assignment.dueDate = dueDate || assignment.dueDate;
  assignment.tierLevel = tierLevel || assignment.tierLevel;
  if (req.files?.length) {
    assignment.attachments = req.files.map(f => f.path);
  }
  const updated = await assignment.save();
  res.json(updated);
});

// @desc    Delete assignment (Teacher)
export const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }
  if (assignment.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  // Delete attached files
  assignment.attachments.forEach(file => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
  await assignment.deleteOne();
  res.json({ message: 'Assignment removed' });
});

// @desc    Submit assignment (Learner)
export const submitAssignment = asyncHandler(async (req, res) => {
  const assignmentId = req.params.id;
  const learnerId = req.user._id;
  const { textAnswer } = req.body;
  const existing = await Submission.findOne({ assignmentId, learnerId });
  if (existing) {
    res.status(400);
    throw new Error('Assignment already submitted');
  }
  const submission = await Submission.create({
    assignmentId,
    learnerId,
    fileUrl: req.file?.path,
    textAnswer,
  });
  res.status(201).json(submission);
});

// @desc    Get submissions for an assignment (Teacher)
export const getSubmissions = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }
  if (assignment.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const submissions = await Submission.find({ assignmentId: req.params.id })
    .populate('learnerId', 'fullNames surname userCode');
  res.json(submissions);
});

// @desc    Grade submission (Teacher)
export const gradeSubmission = asyncHandler(async (req, res) => {
  const { grade, teacherFeedback } = req.body;
  const submission = await Submission.findById(req.params.id).populate('assignmentId');
  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }
  if (submission.assignmentId.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  submission.grade = grade;
  submission.teacherFeedback = teacherFeedback;
  await submission.save();
  res.json(submission);
});
