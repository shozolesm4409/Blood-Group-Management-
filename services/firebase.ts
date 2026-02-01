// Standard Firebase v9+ modular SDK initialization
import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getAnalytics } from "@firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDle9Uw1xrzO-TsthznekaCegIoeYrDnNA",
  authDomain: "blood--group-management.firebaseapp.com",
  projectId: "blood--group-management",
  storageBucket: "blood--group-management.firebasestorage.app",
  messagingSenderId: "327366110943",
  appId: "1:327366110943:web:ad5334be2413eb8534836a",
  measurementId: "G-NBNYRRLL5T"
};

// Initialize Firebase services
// Fix: Using @firebase scoped packages for all Firebase imports to resolve export errors for initializeApp
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Analytics is optional and depends on browser context
// Fix: Using @firebase scoped packages for all Firebase imports to resolve export errors for getAnalytics
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;