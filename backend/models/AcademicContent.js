import mongoose from 'mongoose';

const academicContentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['Past Paper', 'Pacing Guide', 'Study Guide', 'Policy'], required: true },
    grade: { type: Number, required: true },
    subject: { type: String, required: true },
    year: { type: Number },
    url: { type: String, required: true },
    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Published' },
    isGlobal: { type: Boolean, default: true }
}, { timestamps: true });

const AcademicContent = mongoose.model('AcademicContent', academicContentSchema);
export default AcademicContent;
