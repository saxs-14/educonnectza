import asyncHandler from 'express-async-handler';
import StudyMaterial from '../models/StudyMaterial.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import fs from 'fs';

// @desc    Upload study material
// @route   POST /api/materials
export const createMaterial = asyncHandler(async (req, res) => {
  const { title, description, subjectId, topic, externalLink } = req.body;
  
  const allocation = await TeacherAllocation.findOne({ teacherId: req.user._id, subjectId });
  if (!allocation && req.user.role !== 'SchoolAdmin') {
    res.status(403);
    throw new Error('Not authorized to add materials to this subject');
  }

  const material = await StudyMaterial.create({
    title,
    description,
    subjectId,
    teacherId: req.user._id,
    topic,
    fileUrl: req.file?.path || '',
    externalLink,
  });

  res.status(201).json(material);
});

// @desc    Get materials for a subject
// @route   GET /api/materials/subject/:subjectId
export const getMaterialsBySubject = asyncHandler(async (req, res) => {
  const materials = await StudyMaterial.find({ subjectId: req.params.subjectId })
    .populate('teacherId', 'fullNames surname')
    .sort('topic createdAt');
  res.json(materials);
});

// @desc    Delete material
// @route   DELETE /api/materials/:id
export const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }
  
  if (material.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'SchoolAdmin') {
    res.status(403);
    throw new Error('Not authorized to delete this material');
  }

  if (material.fileUrl && fs.existsSync(material.fileUrl)) {
    fs.unlinkSync(material.fileUrl);
  }

  await material.deleteOne();
  res.json({ message: 'Material deleted' });
});
