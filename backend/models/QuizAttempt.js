import mongoose from 'mongoose';

const quizAttemptSchema = mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [{ questionIndex: Number, answer: mongoose.Schema.Types.Mixed }],
    score: { type: Number },
    aiEssayScores: { type: Map, of: Number },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ quizId: 1, learnerId: 1 }, { unique: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttempt;
