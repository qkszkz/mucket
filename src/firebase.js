import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPQZU2P9c5pMb2YRaXUHrQu0x0lz094PU",
  authDomain: "mucket-e0025.firebaseapp.com",
  projectId: "mucket-e0025",
  storageBucket: "mucket-e0025.firebasestorage.app",
  messagingSenderId: "1002462044955",
  appId: "1:1002462044955:web:04ae93ae290dcc6b21e9be",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();