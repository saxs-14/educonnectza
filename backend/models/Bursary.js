import mongoose from 'mongoose';

const bursarySchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    fieldsOfStudy: [{ type: String, required: true }],
    gradeEligibility: [{ type: Number, default: [11, 12] }], // e.g. Grade 11, Grade 12
    minimumAps: { type: Number, default: 0 },
    financialNeedRequired: { type: Boolean, default: true },
    householdIncomeThreshold: { type: Number }, // Max household income (e.g. NSFAS R350,000)
    closingDate: { type: String, required: true },
    officialUrl: { type: String, required: true },
    isVerified: { type: Boolean, default: true },
    lastVerifiedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Bursary', bursarySchema);
