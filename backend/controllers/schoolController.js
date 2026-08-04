import asyncHandler from 'express-async-handler';
import School from '../models/School.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import { generateSchoolCode } from '../utils/generateCodes.js';
import { isSameSchool } from '../utils/authz.js';
import mongoose from 'mongoose';
import { parse } from 'csv-parse';
import fs from 'fs';

// @desc    Create a new school (DevAdmin)
// @route   POST /api/schools
export const createSchool = asyncHandler(async (req, res) => {
  const { name, province, address, primaryColor, secondaryColor } = req.body;
  
  if (!name || !province) {
    res.status(400);
    throw new Error('Name and province are required');
  }

  const uniqueCode = await generateSchoolCode(name, province);

  const school = await School.create({
    name,
    uniqueCode,
    province,
    address,
    theme: {
      primaryColor: primaryColor || '#1e3a8a',
      secondaryColor: secondaryColor || '#10b981',
      logoUrl: req.file?.path || '',
    },
  });
  res.status(201).json(school);
});

// @desc    Get all schools (DevAdmin)
// @route   GET /api/schools
export const getSchools = asyncHandler(async (req, res) => {
  const schools = await School.find().sort('name');
  res.json(schools);
});

// @desc    Get single school by ID
// @route   GET /api/schools/:id
export const getSchoolById = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) {
    res.status(404);
    throw new Error('School not found');
  }
  if (!isSameSchool(req.user, school._id)) {
    res.status(403);
    throw new Error('Not authorized to view this school');
  }
  res.json(school);
});

// @desc    Update school
// @route   PUT /api/schools/:id
export const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) {
    res.status(404);
    throw new Error('School not found');
  }
  const { name, address, subscriptionTier, isActive } = req.body;
  school.name = name || school.name;
  school.address = address || school.address;
  school.subscriptionTier = subscriptionTier || school.subscriptionTier;
  if (isActive !== undefined) school.isActive = isActive;
  const updatedSchool = await school.save();
  res.json(updatedSchool);
});

// @desc    Update school theme
// @route   PUT /api/schools/:id/theme
export const updateSchoolTheme = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) {
    res.status(404);
    throw new Error('School not found');
  }
  if (!isSameSchool(req.user, school._id)) {
    res.status(403);
    throw new Error('Not authorized to update this school\'s theme');
  }
  const { primaryColor, secondaryColor } = req.body;
  if (primaryColor) school.theme.primaryColor = primaryColor;
  if (secondaryColor) school.theme.secondaryColor = secondaryColor;
  if (req.file?.path) school.theme.logoUrl = req.file.path;
  await school.save();
  res.json(school.theme);
});

// @desc    Get school metrics (SchoolAdmin)
// @route   GET /api/schools/metrics
export const getSchoolMetrics = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const learners = await User.countDocuments({ schoolId, role: 'Learner', isActive: true });
  const teachers = await User.countDocuments({ schoolId, role: 'Teacher', isActive: true });
  const classes = await Class.countDocuments({ schoolId });
  const subjects = await Subject.countDocuments({ schoolId });
  res.json({ learners, teachers, classes, subjects });
});

// @desc    Get global metrics (DevAdmin)
// @route   GET /api/schools/global-metrics
export const getGlobalMetrics = asyncHandler(async (req, res) => {
  const schools = await School.countDocuments({ isActive: true });
  const learners = await User.countDocuments({ role: 'Learner', isActive: true });
  const teachers = await User.countDocuments({ role: 'Teacher', isActive: true });
  const admins = await User.countDocuments({ role: 'SchoolAdmin', isActive: true });
  res.json({ schools, learners, teachers, admins });
});

// @desc    Create a class (SchoolAdmin)
// @route   POST /api/schools/classes
export const createClass = asyncHandler(async (req, res) => {
  const { grade, classId, teacherId } = req.body;
  const schoolId = req.user.schoolId;
  const existing = await Class.findOne({ schoolId, grade, classId });
  if (existing) {
    res.status(400);
    throw new Error('Class already exists');
  }

  const cid = new mongoose.Types.ObjectId();
  const meetLink = `https://meet.jit.si/EduConnectZA_Class_${cid.toString()}`;

  const newClass = await Class.create({ _id: cid, schoolId, grade, classId, classOwner: teacherId, meetLink });
  res.status(201).json(newClass);
});

// @desc    Get classes (SchoolAdmin/Teacher)
// @route   GET /api/schools/classes
export const getClasses = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  let filter = { schoolId };
  if (req.user.role === 'Teacher') {
    // Get classes this teacher owns or teaches
    const allocations = await TeacherAllocation.find({ teacherId: req.user._id }).distinct('classId');
    filter._id = { $in: allocations };
  }
  const classes = await Class.find(filter).populate('classOwner', 'fullNames surname');
  // Add learner count
  const classesWithCount = await Promise.all(classes.map(async (c) => {
    const learnerCount = await LearnerEnrollment.countDocuments({ classId: c._id });
    return { ...c.toObject(), learnerCount };
  }));
  res.json(classesWithCount);
});

// @desc    Upload CSV for grade promotion (SchoolAdmin)
// @route   POST /api/schools/upload-reports
export const uploadReports = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a CSV file');
  }
  const results = [];
  const parser = fs.createReadStream(req.file.path).pipe(parse({ columns: true }));
  for await (const record of parser) {
    results.push(record);
  }
  for (const row of results) {
    const learner = await User.findOne({ userCode: row.learnerCode, schoolId: req.user.schoolId });
    if (!learner) continue;
    const promoted = row.promoted === 'true' || row.promoted === true;
    if (promoted) {
      if (learner.grade === 12) {
        learner.isActive = false; // graduated
      } else if (learner.grade < 12) {
        learner.grade += 1;
      }
      await learner.save();
    }
  }
  fs.unlinkSync(req.file.path); // clean up
  res.json({ message: `Processed ${results.length} records` });
});
