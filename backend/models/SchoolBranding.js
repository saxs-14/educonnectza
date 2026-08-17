import mongoose from 'mongoose';

const schoolBrandingSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      unique: true,
      index: true,
    },
    logoUrl: {
      type: String,
      default: '/assets/default-logo.png',
    },
    logoKey: {
      type: String,
      default: null,
    },
    faviconUrl: {
      type: String,
      default: '/favicon.ico',
    },
    faviconKey: {
      type: String,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: '/assets/default-banner.jpg',
    },
    bannerKey: {
      type: String,
      default: null,
    },
    primaryColor: {
      type: String,
      default: '#1e3a8a', // Deep navy blue
      validate: /^#([0-9a-fA-F]{3}){1,2}$/,
    },
    secondaryColor: {
      type: String,
      default: '#0d9488', // Teal
      validate: /^#([0-9a-fA-F]{3}){1,2}$/,
    },
    accentColor: {
      type: String,
      default: '#f59e0b', // Amber
      validate: /^#([0-9a-fA-F]{3}){1,2}$/,
    },
    backgroundColor: {
      type: String,
      default: '#f8fafc', // Light slate
      validate: /^#([0-9a-fA-F]{3}){1,2}$/,
    },
    textColor: {
      type: String,
      default: '#0f172a', // Dark slate text
      validate: /^#([0-9a-fA-F]{3}){1,2}$/,
    },
    motto: {
      type: String,
      trim: true,
      maxLength: 200,
      default: 'Excellence in Education',
    },
    isContrastAccessible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('SchoolBranding', schoolBrandingSchema);
