import mongoose from 'mongoose';

const schoolSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: [3, 'School name must be at least 3 characters'], maxlength: 100 },
    uniqueCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    province: {
      type: String,
      enum: ['L', 'GP', 'EC', 'MP', 'NW', 'NC', 'WC', 'FS', 'ZN'],
      required: true,
    },
    address: { type: String },
    theme: {
      primaryColor: { type: String, default: '#1e3a8a' },
      secondaryColor: { type: String, default: '#10b981' },
      logoUrl: { type: String, default: '' },
    },
    subscriptionTier: { type: String, enum: ['basic', 'premium'], default: 'basic' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const School = mongoose.model('School', schoolSchema);
export default School;