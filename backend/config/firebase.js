import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  const defaultPathBackend = path.resolve(__dirname, '../firebase-service-account.json');
  const defaultPathCwd = path.resolve(process.cwd(), 'firebase-service-account.json');
  serviceAccountPath = fs.existsSync(defaultPathBackend) ? defaultPathBackend : defaultPathCwd;
} else if (!path.isAbsolute(serviceAccountPath)) {
  serviceAccountPath = path.resolve(process.cwd(), serviceAccountPath);
}

try {
  const require = createRequire(import.meta.url);
  const serviceAccount = require(serviceAccountPath);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Please ensure firebase-service-account.json exists.', error.message);
}

export const auth = admin.auth();
export default admin;
