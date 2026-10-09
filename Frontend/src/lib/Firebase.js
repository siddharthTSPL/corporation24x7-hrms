// src/lib/Firebase.js  (Talent blog)
//
// This is the Suite blog's Firebase.js pattern, pointed at its own
// Firestore collections so Talent's posts/subscribers never mix with
// the Suite blog's data even if both live in the same Firebase project.
//
// .env values needed (Vite):
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   VITE_FIREBASE_PROJECT_ID=...
//   VITE_FIREBASE_STORAGE_BUCKET=...
//   VITE_FIREBASE_MESSAGING_SENDER_ID=...
//   VITE_FIREBASE_APP_ID=...
//
// Firestore rules (Firestore → Rules):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /talent_blog_posts/{postId} {
//         allow read: if true;
//         allow create: if request.auth != null
//                        && request.resource.data.authorUid == request.auth.uid;
//         allow update: if request.auth != null; // covers likes/views from any reader
//         allow delete: if request.auth != null
//                        && request.auth.uid == resource.data.authorUid;
//       }
//       match /talent_blog_subscribers/{subId} {
//         allow read: if false;
//         allow create: if true;
//       }
//     }
//   }

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard against Firebase being re-initialized on Vite HMR reloads.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Point this at wherever the Talent blog actually lives (e.g. "/talent/blog").
// The email sign-in link brings people back to exactly this URL to finish signing in.
const EMAIL_LINK_REDIRECT_URL = `${window.location.origin}/blog`;
const EMAIL_FOR_SIGNIN_KEY = "tx-talent-blog-email-for-signin";

// Separate collection names from the Suite blog's "posts" / "subscribers"
// on purpose — this is the whole isolation boundary between the two blogs.
const postsCollection = collection(db, "talent_blog_posts");
const subscribersCollection = collection(db, "talent_blog_subscribers");

export {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EMAIL_LINK_REDIRECT_URL,
  EMAIL_FOR_SIGNIN_KEY,
  db,
  postsCollection,
  subscribersCollection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
};