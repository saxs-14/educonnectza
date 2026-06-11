import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    userCode: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ['Learner', 'Teacher', 'SchoolAdmin', 'DevAdmin'],
      required: true,
    },
    fullNames: { type: String, required: [true, 'Full name is required'], trim: true, minlength: 2 },
    surname: { type: String, required: [true, 'Surname is required'], trim: true, minlength: 2 },
    idNumber: { type: String, required: [true, 'ID Number is required'], trim: true, minlength: 13, maxlength: 13 },
    dateOfBirth: { type: Date, required: true },
    grade: { type: Number, min: 8, max: 12, default: null },
    academicStatus: { type: String, enum: ['active', 'promoted', 'retained', 'graduated'], default: 'active' },
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    profilePictureUrl: { type: String, default: '' },
    parentConsent: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordHash: { type: String, select: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;