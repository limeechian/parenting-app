// Firebase configuration using environment variables
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

// Check if Firebase environment variables are set
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars);
  console.error('Please configure Firebase environment variables in your Amplify app settings.');
  console.error('Go to AWS Amplify Console > Your App > Environment Variables');
  console.error('Add the following variables:');
  console.error('REACT_APP_FIREBASE_API_KEY');
  console.error('REACT_APP_FIREBASE_AUTH_DOMAIN');
  console.error('REACT_APP_FIREBASE_PROJECT_ID');
  console.error('REACT_APP_FIREBASE_APP_ID');
  console.error('REACT_APP_FIREBASE_STORAGE_BUCKET');
  console.error('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
  console.error('REACT_APP_FIREBASE_MEASUREMENT_ID');
  console.error('REACT_APP_FIREBASE_CLIENT_ID');
}

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'placeholder',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'placeholder',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'placeholder',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'placeholder',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'placeholder',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'placeholder',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'placeholder',
  clientId: process.env.REACT_APP_FIREBASE_CLIENT_ID || 'placeholder'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account", // Forces account chooser on sign-in
});

// Detect if we're on mobile Safari
const isMobileSafari = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Use redirect for mobile Safari, popup for others
    if (isMobileSafari()) {
      console.log('Mobile Safari detected, using redirect method');
      await signInWithRedirect(auth, provider);
      // The redirect will handle the rest, this function won't return
      return null;
    } else {
      // Try popup for desktop and other browsers
      try {
        return await signInWithPopup(auth, provider);
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.warn('Popup blocked, trying redirect method');
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupError;
      }
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled by user');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked by browser. Please allow pop-ups for this site.');
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error('Firebase configuration is invalid. Please check your Amplify environment variables.');
    } else {
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }
};

// Handle redirect result (for mobile Safari)
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error('Redirect result error:', error);
    throw error;
  }
};

export { auth }; 