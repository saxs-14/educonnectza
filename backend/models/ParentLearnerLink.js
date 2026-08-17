import mongoose from 'mongoose';

const parentLearnerLinkSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    relationship: {
      type: String,
      enum: ['parent', 'guardian', 'sponsor', 'relative'],
      default: 'parent',
    },
    isPOPIAConsentGiven: {
      type: Boolean,
      required: true,
      default: false,
    },
    consentDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'revoked'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Ensure unique parent-learner pair
parentLearnerLinkSchema.index({ parentId: 1, learnerId: 1 }, { unique: true });

export default mongoose.model('ParentLearnerLink', parentLearnerLinkSchema);
