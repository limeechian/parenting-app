// Centralized API configuration
//export const API_BASE_URL = 'https://parenzing.com';
export const API_BASE_URL = 'https://parenzing.com';


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
