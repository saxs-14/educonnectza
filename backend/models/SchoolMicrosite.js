import mongoose from 'mongoose';

const schoolMicrositeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: /^[a-z0-9-]+$/,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    heroText: {
      type: String,
      default: 'Welcome to our school digital portal',
      maxLength: 300,
    },
    aboutUs: {
      type: String,
      default: 'Empowering learners with CAPS-aligned quality education.',
      maxLength: 2000,
    },
    principalMessage: {
      type: String,
      default: 'Welcome students, parents, and community members.',
      maxLength: 1500,
    },
    achievements: [
      {
        title: { type: String, required: true },
        year: { type: String, required: true },
        description: String,
      },
    ],
    contactInfo: {
      email: String,
      phone: String,
      address: String,
      websiteUrl: String,
    },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
    },
    publicAnnouncements: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('SchoolMicrosite', schoolMicrositeSchema);
