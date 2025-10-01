import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from './Navigation';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SetupProfile from './pages/SetupProfile';
import Profile from './pages/Profile';
import ParentDashboard from './pages/ParentDashboard';
import AIChat from './pages/AIChat';
import './firebase';

// Placeholder components for future pages
//const AIChat = () => <div style={{ padding: 32 }}>AI Chat (Coming soon)</div>;

const AppRoutes = () => {
  const location = useLocation();
  // Initialize auth state based on token presence
  const hasToken = () => !!localStorage.getItem('auth_token');
  const [isAuthenticated, setIsAuthenticated] = useState(hasToken());
  const [authChecked, setAuthChecked] = useState(hasToken());
  const [justSignedIn, setJustSignedIn] = useState(false);
  
  // Hide nav on login/signup/setup-profile
  const hideNav = ['/login', '/signup', '/setup-profile'].includes(location.pathname);
  
  // Protected routes that require authentication
  const protectedRoutes = ['/parent-dashboard', '/ai-chat', '/profile'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname);
  
  
  // Only check authentication for protected routes
  useEffect(() => {
    if (isProtectedRoute) {
      // If we just signed in, trust that authentication and skip the check
      if (justSignedIn) {
        console.log('Just signed in, skipping auth check and setting authenticated to true');
        setIsAuthenticated(true);
        setAuthChecked(true);
        // Reset the flag after 3 seconds to match the delay
        setTimeout(() => setJustSignedIn(false), 3000);
        return;
      }

      // If we're already authenticated, don't run the check again
      if (isAuthenticated && authChecked) {
        console.log('Already authenticated, skipping auth check');
        return;
      }

      const checkAuth = async () => {
        try {
          console.log('Checking authentication for protected route:', location.pathname);
          
          // Get token from localStorage
          const token = localStorage.getItem('auth_token');
          if (!token) {
            console.log('No auth token found in localStorage');
            setIsAuthenticated(false);
            setAuthChecked(true);
            return;
          }
          
          // If we have a token, assume authenticated (skip API call on initial load)
          console.log('Token found in localStorage, setting authenticated to true');
          setIsAuthenticated(true);
          setAuthChecked(true);
        } catch (error) {
          console.log('Auth check failed:', error);
          console.log('Setting isAuthenticated to false due to error');
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
      };

      checkAuth();
    } else {
      // For non-protected routes, don't check auth but don't reset authentication state
      console.log('Non-protected route, skipping auth check:', location.pathname);
      setAuthChecked(true);
      // Don't reset isAuthenticated for non-protected routes
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isProtectedRoute, justSignedIn]);
  
  // Show loading while checking auth for protected routes
  if (isProtectedRoute && !authChecked) {
    console.log('Loading auth check for protected route:', location.pathname);
    return <div>Loading...</div>;
  }
  
  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && authChecked && !isAuthenticated) {
    console.log('Redirecting to login - isProtectedRoute:', isProtectedRoute, 'authChecked:', authChecked, 'isAuthenticated:', isAuthenticated);
    return <Navigate to="/login" replace />;
  }
  
  console.log('Rendering routes - isProtectedRoute:', isProtectedRoute, 'authChecked:', authChecked, 'isAuthenticated:', isAuthenticated, 'location:', location.pathname);
  
  return (
    <>
      {!hideNav && isAuthenticated && <Navigation />}
      <Routes>
        <Route path="/login" element={<LoginPage onSuccessfulSignIn={() => setJustSignedIn(true)} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/ai-chat" element={<AIChat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CssBaseline />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
