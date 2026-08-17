import asyncHandler from 'express-async-handler';
import { AIGatewayService } from '../services/aiGatewayService.js';

// @desc    Ask AI Tutor for CAPS-aligned study assistance
// @route   POST /api/v1/ai-tutor/ask
// @access  Private (Learner, Teacher, DevAdmin)
export const askAiTutor = asyncHandler(async (req, res) => {
  const { prompt, mode, subjectName, grade } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400);
    throw new Error('Prompt is required');
  }

  const response = await AIGatewayService.generateTutoringResponse({
    prompt,
    mode: mode || 'explain',
    subjectName: subjectName || 'General CAPS Subject',
    grade: grade || req.user.grade || 10,
  });

  res.json({ success: true, response });
});
