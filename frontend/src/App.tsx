import React from 'react';
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
  // Hide nav on login/signup/setup-profile
  const hideNav = ['/login', '/signup', '/setup-profile'].includes(location.pathname);
  return (
    <>
      {!hideNav && <Navigation />}
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
