import mongoose from 'mongoose';

const learnerEnrollmentSchema = mongoose.Schema(
  {
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  },
  { timestamps: true }
);

learnerEnrollmentSchema.index({ learnerId: 1, subjectId: 1, classId: 1 }, { unique: true });

const LearnerEnrollment = mongoose.model('LearnerEnrollment', learnerEnrollmentSchema);
export default LearnerEnrollment;