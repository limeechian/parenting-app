# Amplify Deployment Setup Guide

## Issues Fixed

1. **✅ Certificate Error**: Changed API URL from HTTPS to HTTP (backend SSL certificate is invalid)
2. **✅ CORS Issues**: Updated backend CORS configuration to include your Amplify domain
3. **⚠️ Firebase Configuration**: Need to set environment variables in Amplify

## Current Configuration

- **Frontend**: `https://master.dcmcchu8q16tm.amplifyapp.com`
- **Backend**: `http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com` (using HTTP due to SSL certificate issue)

## Step 1: Configure Firebase Environment Variables in Amplify

### Go to AWS Amplify Console:

1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app: `parenting-app`
3. Go to **App settings** → **Environment variables**
4. Add the following environment variables:

```
REACT_APP_FIREBASE_API_KEY=your-actual-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
REACT_APP_FIREBASE_CLIENT_ID=your-client-id
```

### How to get Firebase configuration:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click on the web app (</>) or create a new one
7. Copy the configuration values

## Step 2: Configure Firebase Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Add your domain to **Authorized domains**:
   - `master.dcmcchu8q16tm.amplifyapp.com`
   - `dcmcchu8q16tm.amplifyapp.com`

## Step 3: Redeploy Your App

After adding the environment variables:

1. Go back to your Amplify app
2. Click **Redeploy this version** or trigger a new deployment
3. Wait for the build to complete

## Step 4: Test the Setup

1. Go to `https://master.dcmcchu8q16tm.amplifyapp.com/login`
2. Try the "Continue with Google" button
3. Check the browser console for any errors

## Troubleshooting

### If you still get Firebase errors:
1. Make sure all environment variables are set in Amplify
2. Check that the variable names start with `REACT_APP_`
3. Redeploy the app after adding environment variables
4. Check the browser console for specific error messages

### If you get CORS errors:
1. The backend CORS configuration has been updated
2. Make sure your backend is running and accessible
3. Check that the backend URL is correct: `http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com`

### If popup is blocked:
1. Allow pop-ups for `master.dcmcchu8q16tm.amplifyapp.com` in your browser
2. Make sure you're not in incognito/private mode
3. Check browser extensions that might block pop-ups

### If you get certificate errors:
1. The app now uses HTTP instead of HTTPS for the backend API
2. This is a temporary solution until the SSL certificate is fixed
3. For production, you should fix the SSL certificate on your ALB

## Next Steps for Production

1. **Fix SSL Certificate**: Configure a proper SSL certificate for your ALB
2. **Update API URL**: Once SSL is fixed, change back to HTTPS in `frontend/src/services/api.ts`
3. **Domain Name**: Consider using a custom domain name instead of the ALB URL

## Current Status

- ✅ Backend is accessible via HTTP
- ✅ CORS configuration updated
- ✅ API URL changed to HTTP
- ⚠️ Need to configure Firebase environment variables in Amplify
- ⚠️ Need to fix SSL certificate for production use 