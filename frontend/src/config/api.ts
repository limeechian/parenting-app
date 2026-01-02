// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: api.ts
// Description: To provide centralized API base URL configuration for the application
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Centralized API configuration
// Production (deployed)
export const API_BASE_URL = 'https://parenzing.com';

// Localhost (development)
// Temporarily using 8001 because port 8000 has stuck sockets
// TODO: Switch back to 8000 once sockets are released
// export const API_BASE_URL = 'http://localhost:8001';


export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/jwt/login',
    google: '/auth/google',
  },
  profile: {
    parent: '/profile/parent',
    children: '/profile/children',
  },
  chat: {
    conversations: '/api/conversations',
    chat: '/api/chat',
  },
};

console.log('API_BASE_URL configured as:', API_BASE_URL);
