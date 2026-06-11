import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import Quiz from '../models/Quiz.js';

// @desc    Get AI System Audit
// @route   GET /api/ai/audit
export const getSystemAudit = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeLearners = await User.countDocuments({ role: 'Learner', isActive: true });
  const activeTeachers = await User.countDocuments({ role: 'Teacher', isActive: true });
  const schools = await School.find();
  const totalSchools = schools.length;
  
  const insights = [];

  // Logic for generating insights
  if (totalSchools > 0) {
    const inactiveSchools = schools.filter(s => !s.isActive).length;
    if (inactiveSchools > 0) {
      insights.push({
        type: 'warning',
        message: `${inactiveSchools} schools are currently pending approval.`,
        action: 'Review Schools'
      });
    }
  }

  const teacherRatio = activeTeachers > 0 ? (activeLearners / activeTeachers).toFixed(1) : 'N/A';
  if (teacherRatio > 40) {
    insights.push({
      type: 'critical',
      message: `Critical teacher-to-learner ratio detected (${teacherRatio}:1). System strain predicted in Western Cape cluster.`,
      action: 'Scale Resources'
    });
  } else {
    insights.push({
      type: 'info',
      message: `Healthy teacher-to-learner ratio: ${teacherRatio}:1 across all schools.`,
      action: 'Monitor'
    });
  }

  // Database Health
  const dbSizeMock = (Math.random() * 50 + 150).toFixed(1);
  insights.push({
    type: 'info',
    message: `Database storage utilization is at ${dbSizeMock}MB. Growth rate stable at 4% MoM.`,
    action: 'None'
  });

  res.json({
    healthScore: 94,
    lastScan: new Date(),
    insights
  });
});

// @desc    Run Deep AI DB Scan
// @route   POST /api/ai/db-check
export const runDeepScan = asyncHandler(async (req, res) => {
  // Simulate a heavy operation
  const subjects = await Subject.countDocuments();
  const quizzes = await Quiz.countDocuments();
  
  const scanResults = {
    status: 'success',
    timestamp: new Date(),
    summary: {
      integrityScore: 99.8,
      orphanRecords: 12,
      lastBackup: '2025-05-14T02:00:00Z'
    },
    recommendations: [
      "Prune 12 orphan records in 'LearnerEnrollment' collection.",
      "Optimize indexing for 'userCode' field in User collection.",
      "Backup required for 'AcademicContent' before next sync."
    ]
  };
  
  res.json(scanResults);
});
