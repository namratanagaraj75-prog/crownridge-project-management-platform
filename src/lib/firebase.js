import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCgU0yKprEdC1Wh1f59Jy-pL3maYLRVPRY",
  authDomain: "my-only-project-fa437.firebaseapp.com",
  projectId: "my-only-project-fa437",
  storageBucket: "my-only-project-fa437.firebasestorage.app",
  messagingSenderId: "1028105174436",
  appId: "1:1028105174436:web:3d801835319f9c02511531",
  measurementId: "G-S4Q8CJLY39",
};

const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const db = getFirestore(app);

export default app;
