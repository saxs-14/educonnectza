import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { auth } from './config/firebase.js';
import User from './models/User.js';
import School from './models/School.js';
import Class from './models/Class.js';
import Subject from './models/Subject.js';
import Assignment from './models/Assignment.js';
import Submission from './models/Submission.js';
import Quiz from './models/Quiz.js';
import QuizAttempt from './models/QuizAttempt.js';
import StudyGroup from './models/StudyGroup.js';
import TeacherAllocation from './models/TeacherAllocation.js';
import LearnerEnrollment from './models/LearnerEnrollment.js';
import StudyMaterial from './models/StudyMaterial.js';
import ForumTopic from './models/ForumTopic.js';
import ForumReply from './models/ForumReply.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    let mongoUri = process.env.MONGO_URI;

    // Custom DNS SRV Resolver to bypass strict local ISP/Router DNS blocking
    if (mongoUri.startsWith('mongodb+srv://')) {
      console.log('Detected mongodb+srv. Attempting custom DNS resolution to bypass ETIMEOUT...');
      try {
        const dns = await import('dns/promises');
        dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS
        const url = new URL(mongoUri);
        const hostname = url.hostname;
        
        console.log(`Resolving SRV for _mongodb._tcp.${hostname}...`);
        const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
        
        if (srvRecords && srvRecords.length > 0) {
          const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
          
          // Construct standard mongodb:// URI
          let newUri = `mongodb://${url.username}:${url.password}@${hosts}/educonnectza?ssl=true&authSource=admin`;
          if (url.search) {
             const params = new URLSearchParams(url.search);
             params.forEach((value, key) => {
                 if (key !== 'appName' && key !== 'retryWrites') newUri += `&${key}=${value}`;
             });
             newUri += '&retryWrites=true';
          }
          console.log('Successfully resolved raw MongoDB nodes. Bypassing +srv.');
          mongoUri = newUri;
        }
      } catch (dnsError) {
        console.warn('Custom DNS resolution failed, falling back to original URI.', dnsError.message);
      }
    }

    await mongoose.connect(mongoUri, {
      dbName: 'educonnectza',
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log('MongoDB Connected successfully.');

    console.log('Initializing collections...');
    await User.createCollection();
    await School.createCollection();
    await Class.createCollection();
    await Subject.createCollection();
    await Assignment.createCollection();
    await Submission.createCollection();
    await Quiz.createCollection();
    await QuizAttempt.createCollection();
    await StudyGroup.createCollection();
    await TeacherAllocation.createCollection();
    await LearnerEnrollment.createCollection();
    await StudyMaterial.createCollection();
    await ForumTopic.createCollection();
    await ForumReply.createCollection();
    console.log('All collections initialized properly.');

    console.log('Creating DevAdmin account in Firebase and MongoDB...');
    
    const devAdminEmail = 'mamagauphathu@gmail.com';
    const devAdminPassword = 'Phathutshedzo@14';
    let firebaseUid;

    try {
      const userRecord = await auth.getUserByEmail(devAdminEmail);
      firebaseUid = userRecord.uid;
      console.log('Firebase user already exists with UID:', firebaseUid);
      // Optional: Update password in Firebase if needed
      await auth.updateUser(firebaseUid, { password: devAdminPassword });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const newUserRecord = await auth.createUser({
          email: devAdminEmail,
          password: devAdminPassword,
          displayName: 'Mamagau Phathu',
        });
        firebaseUid = newUserRecord.uid;
        console.log('Created new Firebase user with UID:', firebaseUid);
      } else {
        throw error;
      }
    }
    
    const existingAdmin = await User.findOne({ email: devAdminEmail });
    
    if (existingAdmin) {
      console.log('DevAdmin already exists in MongoDB. Updating details...');
      existingAdmin.firebaseUid = firebaseUid;
      existingAdmin.fullNames = 'Mamagau';
      existingAdmin.surname = 'Phathu';
      existingAdmin.role = 'DevAdmin';
      await existingAdmin.save();
      console.log('DevAdmin MongoDB account updated successfully.');
    } else {
      await User.create({
        firebaseUid,
        userCode: 'DEVADMIN-001',
        role: 'DevAdmin',
        fullNames: 'Mamagau',
        surname: 'Phathu',
        idNumber: '9901010000000',
        dateOfBirth: new Date('1999-01-01'),
        email: devAdminEmail,
        isActive: true,
      });
      console.log('DevAdmin MongoDB account created successfully.');
    }

    console.log('=============================================');
    console.log('Database seeding completed successfully!');
    console.log('You can now log in at the frontend with:');
    console.log(`Email: ${devAdminEmail}`);
    console.log(`Password: ${devAdminPassword}`);
    console.log('=============================================');
    process.exit();

  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
