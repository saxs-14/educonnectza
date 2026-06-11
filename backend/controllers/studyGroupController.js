import asyncHandler from 'express-async-handler';
import StudyGroup from '../models/StudyGroup.js';
import mongoose from 'mongoose';

// @desc    Create study group (Learner)
export const createGroup = asyncHandler(async (req, res) => {
  const { name, subjectId, maxMembers } = req.body;
  const groupId = new mongoose.Types.ObjectId();
  const meetLink = `https://meet.jit.si/EduConnectZA_${groupId.toString()}`;

  const group = await StudyGroup.create({
    _id: groupId,
    name,
    subjectId,
    schoolId: req.user.schoolId,
    createdBy: req.user._id,
    members: [req.user._id],
    maxMembers,
    meetLink,
  });
  res.status(201).json(group);
});

// @desc    Get study groups for user
export const getGroups = asyncHandler(async (req, res) => {
  const groups = await StudyGroup.find({ schoolId: req.user.schoolId, members: req.user._id })
    .populate('subjectId', 'name')
    .populate('createdBy', 'fullNames');
  res.json(groups);
});

// @desc    Get single group by ID
export const getGroupById = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.id)
    .populate('subjectId', 'name')
    .populate('createdBy', 'fullNames')
    .populate('members', 'fullNames surname profilePictureUrl');
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }
  res.json(group);
});

// @desc    Join group (Learner)
export const joinGroup = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.id);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }
  if (group.members.includes(req.user._id)) {
    res.status(400);
    throw new Error('Already a member');
  }
  if (group.maxMembers && group.members.length >= group.maxMembers) {
    res.status(400);
    throw new Error('Group is full');
  }
  group.members.push(req.user._id);
  await group.save();
  res.json(group);
});

// @desc    Leave group (Learner)
export const leaveGroup = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.id);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }
  group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
  if (group.members.length === 0) {
    await group.deleteOne();
    return res.json({ message: 'Group deleted (no members left)' });
  }
  await group.save();
  res.json(group);
});

// @desc    Delete group (Creator or Admin)
export const deleteGroup = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.id);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }
  if (group.createdBy.toString() !== req.user._id.toString() && !['Teacher', 'SchoolAdmin'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized');
  }
  await group.deleteOne();
  res.json({ message: 'Group removed' });
});
