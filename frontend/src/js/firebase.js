// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuiN_X3x8aEZA-MFbibczCsPb8qrnRUCQ",
  authDomain: "educonnectza-4ecd7.firebaseapp.com",
  databaseURL: "https://educonnectza-4ecd7-default-rtdb.firebaseio.com",
  projectId: "educonnectza-4ecd7",
  storageBucket: "educonnectza-4ecd7.firebasestorage.app",
  messagingSenderId: "234953768801",
  appId: "1:234953768801:web:66834b4c409009f7298f20",
  measurementId: "G-5DR6ZJTEBJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { app, analytics, auth, db, rtdb, storage };
