// Firebase Configuration
// ========================
// Firebase project: social-snap-mini-social-app
// Using: Authentication + Realtime Database

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyARM7L1LcP7dPV6dSZ9Ie2o7E9r9bYRoeM",
  authDomain: "social-snap-mini-social-app.firebaseapp.com",
  projectId: "social-snap-mini-social-app",
  storageBucket: "social-snap-mini-social-app.firebasestorage.app",
  messagingSenderId: "939280458300",
  appId: "1:939280458300:web:793d4644e064f58530d939",
  measurementId: "G-MD0RVWHG5Z",
  databaseURL: "https://social-snap-mini-social-app-default-rtdb.firebaseio.com",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
