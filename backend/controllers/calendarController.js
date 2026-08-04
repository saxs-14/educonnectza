import asyncHandler from 'express-async-handler';
import CalendarEvent from '../models/CalendarEvent.js';
import { isSameSchool } from '../utils/authz.js';

const EVENT_CREATOR_ROLES = ['Teacher', 'SchoolAdmin', 'DevAdmin'];

// @desc    Create event
export const createEvent = asyncHandler(async (req, res) => {
  if (!EVENT_CREATOR_ROLES.includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized to create calendar events');
  }
  const { title, description, startDate, endDate, eventType, targetFilters, meetingLink } = req.body;
  const event = await CalendarEvent.create({
    schoolId: req.user.schoolId,
    creatorId: req.user._id,
    creatorRole: req.user.role,
    title,
    description,
    startDate,
    endDate,
    eventType,
    targetFilters: targetFilters || {},
    meetingLink,
  });
  res.status(201).json(event);
});

// @desc    Get events for user
export const getEvents = asyncHandler(async (req, res) => {
  const user = req.user;
  const { start, end } = req.query;
  const filter = { schoolId: user.schoolId };
  if (start && end) {
    filter.startDate = { $gte: new Date(start) };
    filter.endDate = { $lte: new Date(end) };
  }
  if (user.role === 'Learner') {
    filter.$or = [
      { 'targetFilters.roles': 'Learner' },
      { 'targetFilters.specificUsers': user._id },
    ];
  } else if (user.role === 'Teacher') {
    filter.$or = [
      { 'targetFilters.roles': 'Teacher' },
      { creatorId: user._id },
    ];
  }
  const events = await CalendarEvent.find(filter).populate('creatorId', 'fullNames');
  res.json(events);
});

// @desc    Update event
export const updateEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }
  const isOwner = event.creatorId.toString() === req.user._id.toString();
  const isSchoolAdminForThisSchool = req.user.role === 'SchoolAdmin' && isSameSchool(req.user, event.schoolId);
  if (!isOwner && !isSchoolAdminForThisSchool) {
    res.status(403);
    throw new Error('Not authorized');
  }
  const { title, description, startDate, endDate, meetingLink } = req.body;
  event.title = title || event.title;
  event.description = description || event.description;
  event.startDate = startDate || event.startDate;
  event.endDate = endDate || event.endDate;
  event.meetingLink = meetingLink || event.meetingLink;
  const updated = await event.save();
  res.json(updated);
});

// @desc    Delete event
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }
  const isOwner = event.creatorId.toString() === req.user._id.toString();
  const isSchoolAdminForThisSchool = req.user.role === 'SchoolAdmin' && isSameSchool(req.user, event.schoolId);
  if (!isOwner && !isSchoolAdminForThisSchool) {
    res.status(403);
    throw new Error('Not authorized');
  }
  await event.deleteOne();
  res.json({ message: 'Event removed' });
});
