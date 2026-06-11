import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
    const userCredential = await signInWithEmailAndPassword(auth, "mamagauphathu@gmail.com", "Phathutshedzo@14");
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
    process.exit(0);
  } catch (error) {
    console.error("Error setting devAdmin:", error);
    process.exit(1);
  }
}

initDevAdmin();
