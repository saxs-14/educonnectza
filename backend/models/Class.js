import mongoose from 'mongoose';

const classSchema = mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    grade: { type: Number, required: true, min: 8, max: 12 },
    classId: { type: String, required: true }, // e.g., "A", "B"
    classOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // teacher
    meetLink: { type: String },
  },
  { timestamps: true }
);

classSchema.index({ schoolId: 1, grade: 1, classId: 1 }, { unique: true });

const Class = mongoose.model('Class', classSchema);
export default Class;