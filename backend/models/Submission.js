import mongoose from 'mongoose';

const submissionSchema = mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String },
    textAnswer: { type: String },
    grade: { type: Number, min: 0, max: 100 },
    aiFeedback: { type: String },
    teacherFeedback: { type: String },
    synced: { type: Boolean, default: true },
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, learnerId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;