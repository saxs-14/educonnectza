import asyncHandler from 'express-async-handler';
import OfflineSyncQueue from '../models/OfflineSyncQueue.js';
import Submission from '../models/Submission.js';

// @desc    Sync offline data (bulk upload)
export const syncData = asyncHandler(async (req, res) => {
  const { actions } = req.body; // array of pending actions
  const results = [];
  for (const action of actions) {
    try {
      if (action.type === 'SUBMIT_ASSIGNMENT') {
        const { assignmentId, textAnswer, file } = action.payload;
        // Process file upload if needed (base64 to file)
        const submission = await Submission.create({
          assignmentId,
          learnerId: req.user._id,
          textAnswer,
          fileUrl: file, // placeholder
          synced: true,
        });
        results.push({ success: true, id: action.id, submission });
      }
      // Add other action types
    } catch (error) {
      results.push({ success: false, id: action.id, error: error.message });
    }
  }
  res.json({ results });
});

// @desc    Get sync status
export const getSyncStatus = asyncHandler(async (req, res) => {
  const pending = await OfflineSyncQueue.countDocuments({ userId: req.user._id, status: 'pending' });
  res.json({ pending });
});
