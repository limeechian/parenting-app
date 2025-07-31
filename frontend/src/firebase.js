// public-facing name for project: project-401279522490


// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBXUza3uGWjhE2kDfbm9zHa6I2XpV0DFxA",
  authDomain: "parenting-app-bd3ff.firebaseapp.com",
  projectId: "parenting-app-bd3ff",
  appId: "1:401279522490:web:95f58c2ca29a501b239483",
  storageBucket: "parenting-app-bd3ff.firebasestorage.app",
  messagingSenderId: "401279522490",
  measurementId: "G-M5BF2SE3ZP",
  clientId: "401279522490-5pqo31vpfoabrnq08do2kf9spd2dmaa8.apps.googleusercontent.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account", // Forces account chooser on sign-in
});

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return await signInWithPopup(auth, provider);
};

/*
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    // Optional: extract user info
    const user = result.user;
    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export { auth };
*/