import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Subject from '../models/Subject.js';
import { isSameSchool } from '../utils/authz.js';

// @desc    Create quiz (Teacher)
export const createQuiz = asyncHandler(async (req, res) => {
  const { subjectId, classId, title, questions, dueDate } = req.body;
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  const allocation = await TeacherAllocation.findOne({ teacherId: req.user._id, subjectId });
  if (!allocation) {
    res.status(403);
    throw new Error('You are not assigned to this subject');
  }
  const quiz = await Quiz.create({
    teacherId: req.user._id,
    subjectId,
    classId: classId || null,
    title,
    questions,
    dueDate,
  });
  res.status(201).json(quiz);
});

// @desc    Get quizzes for user
export const getQuizzes = asyncHandler(async (req, res) => {
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
  const quizzes = await Quiz.find(filter).populate('subjectId', 'name');
  if (user.role === 'Learner') {
    const attempts = await QuizAttempt.find({ learnerId: user._id });
    const quizzesWithAttempt = quizzes.map(q => {
      const attempt = attempts.find(a => a.quizId.toString() === q._id.toString());
      return { ...q.toObject(), attempted: !!attempt, score: attempt?.score };
    });
    return res.json(quizzesWithAttempt);
  }
  res.json(quizzes);
});

// @desc    Get single quiz by ID
export const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('subjectId', 'name schoolId');
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (!quiz.subjectId) {
    // subjectId didn't resolve (dangling reference) - never treat this the
    // same as a legitimately global, schoolId-less Subject.
    res.status(404);
    throw new Error('Subject not found');
  }
  if (!isSameSchool(req.user, quiz.subjectId.schoolId)) {
    res.status(403);
    throw new Error('Not authorized to access this quiz');
  }
  // For learners, don't send correct answers unless attempted
  if (req.user.role === 'Learner') {
    const attempt = await QuizAttempt.findOne({ quizId: quiz._id, learnerId: req.user._id });
    if (!attempt) {
      // Hide correct answers
      quiz.questions = quiz.questions.map(q => {
        const { correctAnswer, ...rest } = q.toObject();
        return rest;
      });
    }
  }
  res.json(quiz);
});

// @desc    Update quiz (Teacher)
export const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (quiz.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const { title, questions, dueDate } = req.body;
  quiz.title = title || quiz.title;
  quiz.questions = questions || quiz.questions;
  quiz.dueDate = dueDate || quiz.dueDate;
  const updated = await quiz.save();
  res.json(updated);
});

// @desc    Delete quiz (Teacher)
export const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (quiz.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  await quiz.deleteOne();
  res.json({ message: 'Quiz removed' });
});

// @desc    Take quiz (Learner) - get questions without answers
export const takeQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('subjectId', 'schoolId');
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (!quiz.subjectId) {
    res.status(404);
    throw new Error('Subject not found');
  }
  if (!isSameSchool(req.user, quiz.subjectId.schoolId)) {
    res.status(403);
    throw new Error('Not authorized to access this quiz');
  }
  const attempt = await QuizAttempt.findOne({ quizId: quiz._id, learnerId: req.user._id });
  if (attempt) {
    res.status(400);
    throw new Error('Quiz already attempted');
  }
  const questionsWithoutAnswers = quiz.questions.map(q => {
    const { correctAnswer, ...rest } = q.toObject();
    return rest;
  });
  res.json({ ...quiz.toObject(), questions: questionsWithoutAnswers });
});

// @desc    Submit quiz answers (Learner)
export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const quiz = await Quiz.findById(req.params.id).populate('subjectId', 'schoolId');
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (!quiz.subjectId) {
    res.status(404);
    throw new Error('Subject not found');
  }
  if (!isSameSchool(req.user, quiz.subjectId.schoolId)) {
    res.status(403);
    throw new Error('Not authorized to access this quiz');
  }
  const existing = await QuizAttempt.findOne({ quizId: quiz._id, learnerId: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error('Quiz already submitted');
  }
  let score = 0;
  const aiEssayScores = {};
  quiz.questions.forEach((q, idx) => {
    const userAnswer = answers.find(a => a.questionIndex === idx)?.answer;
    if (q.type === 'mcq' && userAnswer === q.correctAnswer) {
      score += q.points;}
     else if (q.type === 'essay') {
      // Mock AI scoring
      const mockScore = Math.floor(Math.random() * q.points);
      aiEssayScores[idx] = mockScore;
      score += mockScore;
    }
  });
  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    learnerId: req.user._id,
    answers,
    score,
    aiEssayScores,
  });
  res.json({ score, attempt });
});

// @desc    Get quiz attempts (Teacher)
export const getQuizAttempts = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  if (quiz.teacherId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const attempts = await QuizAttempt.find({ quizId: req.params.id })
    .populate('learnerId', 'fullNames surname userCode');
  res.json(attempts);
});
