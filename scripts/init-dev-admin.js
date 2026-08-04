import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    console.log("Creating devAdmin account...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("Account created. UID:", user.uid);
    console.log("Adding devAdmin role to Firestore...");
    
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "devAdmin",
      name: "Dev Admin",
      createdAt: new Date().toISOString()
    });
    
    console.log("Successfully initialized devAdmin!");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Account already exists. You can log in normally.");
    } else {
      console.error("Error creating devAdmin:", error);
    }
    process.exit(1);
  }
}

initDevAdmin();
