import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

try {
  // Dynamic import or require for JSON in ES modules is tricky, so we use createRequire
  const require = createRequire(import.meta.url);
  const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Please ensure firebase-service-account.json exists.', error.message);
}

export const auth = admin.auth();
export default admin;
