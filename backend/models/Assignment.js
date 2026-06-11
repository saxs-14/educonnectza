import mongoose from 'mongoose';

const assignmentSchema = mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }, // optional: null = whole grade
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    attachments: [{ type: String }],
    tierLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;