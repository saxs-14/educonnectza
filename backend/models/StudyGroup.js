import mongoose from 'mongoose';

const studyGroupSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxMembers: { type: Number },
    meetLink: { type: String },
  },
  { timestamps: true }
);

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
export default StudyGroup;
