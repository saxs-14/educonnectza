import mongoose from 'mongoose';

const forumReplySchema = mongoose.Schema(
  {
    content: { type: String, required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumTopic', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const ForumReply = mongoose.model('ForumReply', forumReplySchema);
export default ForumReply;
