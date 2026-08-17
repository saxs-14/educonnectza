import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = path.resolve(scriptDir, '../backend/firebase-service-account.json');

import admin from '../backend/config/firebase.js';
import mongoose from '../backend/node_modules/mongoose/index.js';
import connectDB from '../backend/config/db.js';
import User from '../backend/models/User.js';
import School from '../backend/models/School.js';
import Subject from '../backend/models/Subject.js';
import SchoolMicrosite from '../backend/models/SchoolMicrosite.js';

async function resetAndSeed() {
  console.log('🔄 Starting Full Database Reset & Seed...');

  // 1. Connect MongoDB
  await connectDB();
  const firestore = admin.firestore();

  // 2. Clear Firestore Collections
  const collections = ['users', 'schools', 'subjects', 'microsites', 'announcements', 'audit_logs'];
  console.log('🧹 Clearing Firestore collections...');
  for (const collName of collections) {
    const snapshot = await firestore.collection(collName).get();
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    if (snapshot.size > 0) {
      await batch.commit();
      console.log(`  - Deleted ${snapshot.size} documents from Firestore collection: '${collName}'`);
    } else {
      console.log(`  - Firestore collection '${collName}' is already empty.`);
    }
  }

  // 3. Clear MongoDB Collections
  console.log('🧹 Clearing MongoDB collections...');
  await User.deleteMany({});
  await School.deleteMany({});
  await Subject.deleteMany({});
  await SchoolMicrosite.deleteMany({});
  console.log('  - All MongoDB collections cleared.');

  // 4. Seed DevAdmin Account
  const devAdminUid = '0fobIxycMpTRHxbwRRex7NEyw8q1';
  const devAdminEmail = 'mamagauphathu@gmail.com';

  console.log('🌱 Seeding DevAdmin Account...');
  // Firestore
  await firestore.collection('users').doc(devAdminUid).set({
    email: devAdminEmail,
    role: 'DevAdmin',
    name: 'Dev Admin',
    userCode: 'DEV-001',
    createdAt: new Date().toISOString()
  });

  // MongoDB
  const devAdminMongo = await User.findOneAndUpdate(
    { firebaseUid: devAdminUid },
    {
      firebaseUid: devAdminUid,
      email: devAdminEmail,
      role: 'DevAdmin',
      fullNames: 'Dev',
      surname: 'Admin',
      userCode: 'DEV-001',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`  - DevAdmin created: ${devAdminEmail} (${devAdminUid})`);

  // 5. Seed Demo School
  console.log('🌱 Seeding Demo School & Microsite...');
  const demoSchool = await School.create({
    name: 'Pretoria Secondary School',
    uniqueCode: 'PSS-2026',
    province: 'GP',
    address: '123 Park Street, Pretoria, South Africa',
    contactNumber: '0123456789',
    email: 'info@pretoriasecondary.co.za',
    isActive: true
  });

  // Seed School in Firestore
  await firestore.collection('schools').doc(demoSchool._id.toString()).set({
    name: demoSchool.name,
    uniqueCode: demoSchool.uniqueCode,
    province: demoSchool.province,
    address: demoSchool.address,
    createdAt: new Date().toISOString()
  });

  // Seed Microsite
  const microsite = await SchoolMicrosite.create({
    schoolId: demoSchool._id,
    slug: 'pretoria-secondary',
    tagline: 'Empowering Learner Success Through Digital Excellence',
    description: 'Welcome to Pretoria Secondary School learner and parent portal.',
    isPublished: true,
    theme: {
      primaryColor: '#1e3a8a',
      accentColor: '#3b82f6',
      logoUrl: '/images/logo.png',
      bannerUrl: ''
    }
  });

  // Seed Subjects
  console.log('🌱 Seeding Core Subjects...');
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH-10', grade: 10, schoolId: demoSchool._id },
    { name: 'Mathematics', code: 'MATH-11', grade: 11, schoolId: demoSchool._id },
    { name: 'Mathematics', code: 'MATH-12', grade: 12, schoolId: demoSchool._id },
    { name: 'Physical Sciences', code: 'PHYS-10', grade: 10, schoolId: demoSchool._id },
    { name: 'Physical Sciences', code: 'PHYS-11', grade: 11, schoolId: demoSchool._id },
    { name: 'Physical Sciences', code: 'PHYS-12', grade: 12, schoolId: demoSchool._id },
    { name: 'Life Sciences', code: 'LIFE-10', grade: 10, schoolId: demoSchool._id }
  ];

  for (const sub of subjectsData) {
    const createdSubject = await Subject.create(sub);
    await firestore.collection('subjects').doc(createdSubject._id.toString()).set({
      name: sub.name,
      code: sub.code,
      grade: sub.grade,
      schoolId: demoSchool._id.toString()
    });
  }
  console.log(`  - Seeded ${subjectsData.length} core subjects.`);

  console.log('🎉 DATABASE RESET AND RE-SEED COMPLETED SUCCESSFULLY!');
  await mongoose.disconnect();
  process.exit(0);
}

resetAndSeed().catch(err => {
  console.error('❌ Reset and seed failed:', err);
  process.exit(1);
});
