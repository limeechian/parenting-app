// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: App.tsx
// Description: To define the main application routing structure and route configuration for all pages
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfessionalSignupPage from './pages/ProfessionalSignupPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import EmailVerificationSuccessPage from './pages/EmailVerificationSuccessPage';
import EmailChangeVerificationPage from './pages/EmailChangeVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SetupProfile from './pages/SetupProfile';

import ProfessionalProfileSubmission from './pages/ProfessionalProfileSubmission';
import Profile from './pages/Profile';
import ProfessionalProfile from './pages/ProfessionalProfile';
import ParentDashboard from './pages/ParentDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ContentManagerDashboard from './pages/ContentManagerDashboard';
import AIChatPage from './pages/AIChatPage';
import DiaryPage from './pages/DiaryPage';
import DiaryEntryEditor from './pages/DiaryEntryEditor';
import LandingPage from './pages/LandingPage';
import CommunityPage from './pages/CommunityPage';
import PrivateMessagePage from './pages/PrivateMessagePage';
import NotificationsPage from './pages/NotificationsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import ProfessionalDirectoryPage from './pages/ProfessionalDirectoryPage';
import ResourcesPage from './pages/ResourcesPage';
import ContentCreationPage from './pages/ContentCreationPage';
import './firebase';

// Placeholder components for future pages
//const AIChat = () => <div style={{ padding: 32 }}>AI Chat (Coming soon)</div>;

const AppRoutes = () => {
  const location = useLocation();
  // Check if user has a valid token in localStorage
  const hasToken = () => !!localStorage.getItem('auth_token');
  
  // Hide nav on login/signup/professional-signup/email-verification/verify-email/setup-profile/professional-setup-profile/professional-profile-submission/diary/create/diary/edit/content-manager/content
  const hideNav = ['/login', '/signup', '/professional-signup', '/email-verification', '/verify-email', '/verify-email-change', '/forgot-password', '/reset-password', '/setup-profile', '/professional-setup-profile', '/professional-profile-submission', '/', '/diary/create'].includes(location.pathname) || location.pathname.startsWith('/diary/edit/') || location.pathname.startsWith('/content-manager/content/');
  
  // Protected routes that require authentication
  const protectedRoutes = ['/parent-dashboard', '/professional-dashboard', '/admin-dashboard', '/coordinator-dashboard', '/content-manager', '/content-manager-dashboard', '/ai-chat', '/profile', '/professional-profile', '/diary', '/diary/create', '/notifications', '/account-settings', '/messages', '/resources'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname) || location.pathname.startsWith('/diary/edit/') || location.pathname.startsWith('/content-manager/');
  
  // Check if user is authenticated (has token)
  const isAuthenticated = hasToken();
  
  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    console.log('Redirecting to login - no token found');
    return <Navigate to="/login" replace />;
  }
  
  // Show navigation for authenticated users OR for shared community links OR public directory
  const showNav = !hideNav && (isAuthenticated || location.pathname.startsWith('/communities/') || location.search.includes('communityId=') || location.pathname === '/professional-directory' || location.pathname === '/resources' || location.pathname.startsWith('/resources/'));
  
  return (
    <>
      {showNav && <Navigation />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/professional-signup" element={<ProfessionalSignupPage />} />
        <Route path="/email-verification" element={<EmailVerificationPage />} />
        <Route path="/verify-email" element={<EmailVerificationSuccessPage />} />
        <Route path="/verify-email-change" element={<EmailChangeVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
        <Route path="/professional-profile-submission" element={<ProfessionalProfileSubmission />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
        <Route path="/content-manager" element={<ContentManagerDashboard />} />
        <Route path="/content-manager-dashboard" element={<ContentManagerDashboard />} />
        <Route path="/content-manager/content/create" element={<ContentCreationPage />} />
        <Route path="/content-manager/content/:id/edit" element={<ContentCreationPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/:id" element={<ResourcesPage />} />
        <Route path="/ai-chat" element={<AIChatPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/diary/create" element={<DiaryEntryEditor />} />
        <Route path="/diary/edit/:entryId" element={<DiaryEntryEditor />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/professional-profile" element={<ProfessionalProfile />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/communities/:id" element={<CommunityPage />} />
        <Route path="/messages" element={<PrivateMessagePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account-settings" element={<AccountSettingsPage />} />
        <Route path="/professional-directory" element={<ProfessionalDirectoryPage />} />
        <Route path="/professional-directory/:id" element={<ProfessionalDirectoryPage />} />
        {/* <Route path="/" element={<Navigate to="/login" replace />} /> */}
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
