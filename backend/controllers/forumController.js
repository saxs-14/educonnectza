import asyncHandler from 'express-async-handler';
import ForumTopic from '../models/ForumTopic.js';
import ForumReply from '../models/ForumReply.js';

// @desc    Create a new topic
// @route   POST /api/forums/topics
export const createTopic = asyncHandler(async (req, res) => {
  const { title, content, subjectId } = req.body;
  const topic = await ForumTopic.create({
    title,
    content,
    subjectId,
    author: req.user._id,
  });
  res.status(201).json(topic);
});

// @desc    Get all topics for a subject
// @route   GET /api/forums/subject/:subjectId
export const getTopics = asyncHandler(async (req, res) => {
  const topics = await ForumTopic.find({ subjectId: req.params.subjectId })
    .populate('author', 'fullNames surname role profilePictureUrl')
    .sort('-isPinned -createdAt');
  res.json(topics);
});

// @desc    Create a reply
// @route   POST /api/forums/topics/:id/replies
export const createReply = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const topic = await ForumTopic.findById(req.params.id);
  
  if (!topic) {
    res.status(404);
    throw new Error('Topic not found');
  }
  if (topic.isLocked) {
    res.status(400);
    throw new Error('Topic is locked');
  }

  const reply = await ForumReply.create({
    content,
    topicId: topic._id,
    author: req.user._id,
  });
  
  res.status(201).json(reply);
});

// @desc    Get replies for a topic
// @route   GET /api/forums/topics/:id/replies
export const getReplies = asyncHandler(async (req, res) => {
  const replies = await ForumReply.find({ topicId: req.params.id })
    .populate('author', 'fullNames surname role profilePictureUrl')
    .sort('createdAt');
  res.json(replies);
});
