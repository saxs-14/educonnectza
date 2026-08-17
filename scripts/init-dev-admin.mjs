import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "../backend/node_modules/mongoose/index.js";
import connectDB from "../backend/config/db.js";
import User from "../backend/models/User.js";

// Reuse backend/.env so this doesn't need its own env file.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend/.env") });

const email = process.env.DEV_ADMIN_EMAIL;
const password = process.env.DEV_ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Set DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD (e.g. in a local .env) before running this script.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: "AIzaSyCuiN_X3x8aEZA-MFbibczCsPb8qrnRUCQ",
  authDomain: "educonnectza-4ecd7.firebaseapp.com",
  projectId: "educonnectza-4ecd7",
  storageBucket: "educonnectza-4ecd7.firebasestorage.app",
  messagingSenderId: "234953768801",
  appId: "1:234953768801:web:66834b4c409009f7298f20"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function initDevAdmin() {
  try {
    console.log("Signing into devAdmin account...");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("Logged in. UID:", user.uid);
    console.log("Adding devAdmin role to Firestore...");
    
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "devAdmin",
      name: "Dev Admin",
      createdAt: new Date().toISOString()
    });
    console.log("Successfully initialized devAdmin in Firestore!");

    console.log("Syncing devAdmin profile to MongoDB...");
    await connectDB();
    await User.findOneAndUpdate(
      { firebaseUid: user.uid },
      {
        firebaseUid: user.uid,
        email: user.email,
        role: "DevAdmin",
        fullNames: "Dev",
        surname: "Admin",
        userCode: "DEV-001",
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log("Successfully initialized devAdmin in MongoDB!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error setting devAdmin:", error);
    process.exit(1);
  }
}

initDevAdmin();

