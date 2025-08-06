# Firebase Setup Guide

## Issues You're Experiencing

1. **Certificate Error**: The backend URL has an invalid SSL certificate
2. **Firebase API Key Error**: Missing Firebase environment variables
3. **CORS Issues**: Cross-origin policy blocking popup windows

## Step 1: Fix Firebase Configuration

### Create a `.env` file in the `frontend` directory:

```bash
# Navigate to frontend directory
cd frontend

# Create .env file
touch .env
```

### Add the following content to `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Firebase Configuration
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
2. Select your project (or create a new one)
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click on the web app (</>) or create a new one
7. Copy the configuration values

## Step 2: Configure Firebase Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Google" as a sign-in provider
3. Add your domain to authorized domains:
   - `localhost` (for development)
   - `master.dcmcchu8q16tm.amplifyapp.com` (for production)

## Step 3: Fix Backend Certificate Issue

The backend URL `https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com` has an invalid SSL certificate. You have two options:

### Option A: Use HTTP for local development (Recommended)
The code has been updated to automatically use `http://localhost:8000` when running in development mode.

### Option B: Fix the SSL certificate
If you need to use the production backend, you'll need to:
1. Configure a proper SSL certificate for your ALB
2. Or use a domain name with a valid certificate

## Step 4: Test the Setup

1. Start your backend server:
```bash
cd backend
python main.py
```

2. Start your frontend (in a new terminal):
```bash
cd frontend
npm start
```

3. Open `http://localhost:3000` in your browser
4. Try the "Continue with Google" button

## Troubleshooting

### If you still get Firebase errors:
1. Make sure your `.env` file is in the `frontend` directory
2. Restart your React development server after creating the `.env` file
3. Check that all Firebase environment variables are set correctly

### If you get CORS errors:
1. Make sure your backend is running on `http://localhost:8000`
2. Check that the CORS configuration in `backend/main.py` includes your domain

### If popup is blocked:
1. Allow pop-ups for `localhost:3000` in your browser
2. Make sure you're not in incognito/private mode
3. Check browser extensions that might block pop-ups

## Production Deployment

For production, make sure to:
1. Set the correct Firebase configuration for your production domain
2. Update the CORS configuration in your backend to include your production domain
3. Use HTTPS for all API calls in production 