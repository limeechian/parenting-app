// API service for new endpoints using fetch
import { UserInput, ChatInput } from '../types/types';

// const API_BASE_URL = 'http://localhost:8000';
// const API_BASE_URL = 'https://5e0em7cm60.execute-api.ap-southeast-2.amazonaws.com/prod';
const API_BASE_URL = 'http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://2fayughxfh.execute-api.ap-southeast-2.amazonaws.com/prod';
//const API_BASE_URL = 'http://3.26.204.206:8000';

// Common fetch options to handle mixed content and CORS
const getFetchOptions = (method: string, body?: any, additionalHeaders?: Record<string, string>) => {
  const options: RequestInit = {
    method,
    mode: 'cors' as RequestMode,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  };
  
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  return options;
};

// Helper function to handle mixed content issues
const makeRequest = async (url: string, options: RequestInit) => {
  try {
    // Try the normal request first
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.warn('Mixed content error, trying alternative approach:', error);
    // If mixed content error, we could implement a fallback here
    throw error;
  }
};

export const sendLogin = async (input: { email: string; password: string }) => {
  const formData = new URLSearchParams();
  formData.append('username', input.email);
  formData.append('password', input.password);
  //const res = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
  const res = await makeRequest(`${API_BASE_URL}/auth/jwt/login`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const sendSignup = async (input: UserInput) => {
  const res = await makeRequest(`${API_BASE_URL}/auth/register`, getFetchOptions('POST', input));
  if (!res.ok) throw new Error('Signup failed');
  return res.json();
};

export const googleSignIn = async (idToken: string, email: string) => {
  const res = await makeRequest(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Google sign-in failed');
  return res.json();
};

export const getParentProfile = async () => {
  const res = await makeRequest(`${API_BASE_URL}/profile/parent`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch parent profile');
  return res.json();
};

export const updateParentProfile = async (profile: any) => {
  const res = await makeRequest(`${API_BASE_URL}/profile/parent`, getFetchOptions('POST', profile));
  if (!res.ok) throw new Error('Failed to update parent profile');
  return res.json();
};

export const getChildren = async () => {
  const res = await makeRequest(`${API_BASE_URL}/profile/children`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch children');
  return res.json();
};

export const addChild = async (child: any) => {
  const res = await makeRequest(`${API_BASE_URL}/profile/children`, getFetchOptions('POST', child));
  if (!res.ok) throw new Error('Failed to add child');
  return res.json();
};

export const updateChild = async (childId: string, child: any) => {
  const res = await makeRequest(`${API_BASE_URL}/profile/children/${childId}`, getFetchOptions('PUT', child));
  if (!res.ok) throw new Error('Failed to update child');
  return res.json();
};

export const deleteChild = async (childId: string) => {
  const res = await makeRequest(`${API_BASE_URL}/profile/children/${childId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete child');
  return res.json();
};

// Chat and conversation functions
export const getConversations = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/conversations`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

export const getConversationMessages = async (conversationId: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch conversation messages');
  return res.json();
};

export const sendChat = async (input: { query: string; child_id?: number; conversation_id?: number; manual_agent?: string }) => {
  const res = await makeRequest(`${API_BASE_URL}/api/chat`, getFetchOptions('POST', input));
  if (!res.ok) throw new Error('Failed to send chat message');
  return res.json();
};

export const updateConversationMetadata = async (conversationId: string, metadata: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/conversations/${conversationId}/update-metadata`, getFetchOptions('PUT', metadata));
  if (!res.ok) throw new Error('Failed to update conversation metadata');
  return res.json();
};
