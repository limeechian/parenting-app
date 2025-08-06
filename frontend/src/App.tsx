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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Hide nav on login/signup/setup-profile
  const hideNav = ['/login', '/signup', '/setup-profile'].includes(location.pathname);
  
  // Check authentication status by making an API call
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('https://parenzing.com/profile/parent', {
          method: 'GET',
          credentials: 'include',
          mode: 'cors'
        });
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.log('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [location.pathname]); // Re-check when location changes
  
  // Show loading while checking auth
  if (!authChecked) {
    return <div>Loading...</div>;
  }
  
  return (
    <>
      {!hideNav && isAuthenticated && <Navigation />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
