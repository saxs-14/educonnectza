import asyncHandler from 'express-async-handler';
import { calculateAps } from '../utils/apsEngine.js';
import University from '../models/University.js';
import Bursary from '../models/Bursary.js';

// @desc    Calculate APS score and find matching university programmes
// @route   POST /api/v1/aps/calculate
// @access  Public / Authenticated
export const calculateLearnerAps = asyncHandler(async (req, res) => {
  const { subjectMarks, institution } = req.body;

  if (!Array.isArray(subjectMarks) || subjectMarks.length === 0) {
    res.status(400);
    throw new Error('subjectMarks must be a non-empty array of { subjectName, mark }');
  }

  const apsResult = calculateAps(subjectMarks, institution || 'generic');

  // Search qualifying university programmes
  const universities = await University.find().lean();
  const qualifyingProgrammes = [];

  universities.forEach((univ) => {
    (univ.programmes || []).forEach((prog) => {
      if (apsResult.totalAps >= prog.minimumAps) {
        qualifyingProgrammes.push({
          universityName: univ.name,
          universityShortName: univ.shortName,
          programmeName: prog.name,
          faculty: prog.faculty,
          qualificationType: prog.qualificationType,
          minimumAps: prog.minimumAps,
          applicationClosingDate: prog.applicationClosingDate,
          officialUrl: prog.officialUrl || univ.websiteUrl,
        });
      }
    });
  });

  res.json({
    success: true,
    apsResult,
    qualifyingCount: qualifyingProgrammes.length,
    qualifyingProgrammes,
  });
});

// @desc    Get all SA universities and programmes
// @route   GET /api/v1/aps/universities
// @access  Public
export const getUniversitiesAndProgrammes = asyncHandler(async (req, res) => {
  const universities = await University.find().sort('name').lean();
  res.json({ success: true, count: universities.length, universities });
});

// @desc    Get matching bursaries based on APS and grade
// @route   GET /api/v1/aps/bursaries
// @access  Public
export const getMatchingBursaries = asyncHandler(async (req, res) => {
  const { apsScore, grade, field } = req.query;

  const query = {};
  if (apsScore) {
    query.minimumAps = { $lte: Number(apsScore) };
  }
  if (grade) {
    query.gradeEligibility = Number(grade);
  }
  if (field) {
    query.fieldsOfStudy = { $regex: new RegExp(field, 'i') };
  }

  const bursaries = await Bursary.find(query).sort('closingDate').lean();
  res.json({ success: true, count: bursaries.length, bursaries });
});
