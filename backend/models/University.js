import mongoose from 'mongoose';

const programmeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  faculty: { type: String, required: true },
  qualificationType: {
    type: String,
    enum: ['Degree', 'Diploma', 'Higher Certificate'],
    default: 'Degree',
  },
  minimumAps: { type: Number, required: true },
  durationYears: { type: Number, default: 3 },
  requiredSubjects: [
    {
      subjectName: { type: String, required: true },
      minimumMark: { type: Number, required: true },
      minimumApsLevel: { type: Number, required: true },
    },
  ],
  applicationClosingDate: { type: String, default: '30 September' },
  officialUrl: String,
});

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    shortName: { type: String, required: true, unique: true }, // e.g. Wits, UCT, UP, SUN, UJ
    province: { type: String, required: true },
    websiteUrl: String,
    logoUrl: String,
    programmes: [programmeSchema],
    lastVerifiedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('University', universitySchema);
