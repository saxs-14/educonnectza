import mongoose from 'mongoose';

const subjectSchema = mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    name: { type: String, required: true },
    grade: { type: Number, required: true, min: 8, max: 12 },
    capsTopics: [{ type: String }],
    isMandatory: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index to ensure unique subject per school/grade/name
subjectSchema.index({ schoolId: 1, name: 1, grade: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;