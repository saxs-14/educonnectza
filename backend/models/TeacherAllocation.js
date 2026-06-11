import mongoose from 'mongoose';

const teacherAllocationSchema = mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    isClassOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

teacherAllocationSchema.index({ teacherId: 1, subjectId: 1, classId: 1 }, { unique: true });

const TeacherAllocation = mongoose.model('TeacherAllocation', teacherAllocationSchema);
export default TeacherAllocation;