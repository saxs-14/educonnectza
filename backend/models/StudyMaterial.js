import mongoose from 'mongoose';

const studyMaterialSchema = mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, default: 'General' }, // e.g., "Week 1", "Algebra"
    fileUrl: { type: String }, // For PDFs, PPTs
    externalLink: { type: String }, // For YouTube/Vimeo links
  },
  { timestamps: true }
);

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
export default StudyMaterial;
