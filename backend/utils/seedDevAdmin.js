import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import User from '../models/User.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

async function seedMongoDevAdmin() {
  const firebaseUid = '0fobIxycMpTRHxbwRRex7NEyw8q1';
  const email = process.env.DEV_ADMIN_EMAIL || 'mamagauphathu@gmail.com';

  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/educonnectza', { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/educonnectza';
    await mongoose.connect(mongoUri);
  }

  console.log('Upserting DevAdmin profile in MongoDB...');
  const user = await User.findOneAndUpdate(
    { firebaseUid },
    {
      firebaseUid,
      email,
      role: 'DevAdmin',
      fullNames: 'Dev',
      surname: 'Admin',
      userCode: 'DEV-001',
      isActive: true,
    },
    { upsert: true, new: true }
  );

  console.log('DevAdmin profile in MongoDB:', user._id, user.email, user.role);
  await mongoose.disconnect();
  process.exit(0);
}

seedMongoDevAdmin();
