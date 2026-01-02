// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: api.ts
// Description: To provide API service functions for making HTTP requests to backend endpoints
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// API service for new endpoints using fetch

//import { UserInput, ChatInput } from '../types/types';

//const API_BASE_URL = 'https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://parenzing.com';
//const API_BASE_URL = 'https://parenzing.com'; // For production
//const API_BASE_URL = 'https://5e0em7cm60.execute-api.ap-southeast-2.amazonaws.com/prod';
//const API_BASE_URL = 'https://2fayughxfh.execute-api.ap-southeast-2.amazonaws.com/prod';
//const API_BASE_URL = 'http://3.26.204.206:8000';

//console.log('API_BASE_URL configured as:', API_BASE_URL);
import { UserInput } from '../types/types';
import { API_BASE_URL } from '../config/api';

// Common fetch options to handle mixed content and CORS
const getFetchOptions = (method: string, body?: any, additionalHeaders?: Record<string, string>) => {
  const token = localStorage.getItem('auth_token');
  const options: RequestInit = {
    method,
    mode: 'cors' as RequestMode,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...additionalHeaders
    }
  };
  
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  return options;
};

// Helper function to handle mixed content issues and token expiry
const makeRequest = async (url: string, options: RequestInit) => {
  console.log('Making request to:', url);
  console.log('Request options:', options);
  
  try {
    // Try the normal request first
    const response = await fetch(url, options);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('Request failed with status:', response.status);
      
      // Handle token expiry (401 Unauthorized)
      if (response.status === 401) {
        console.warn('Token expired or invalid, redirecting to login...');
        
        // Clear expired token and user data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userEmail');
        
        // Redirect to login page
        window.location.href = '/login?session_expired=true';
        
        // Throw error to prevent further processing
        throw new Error('Session expired. Please log in again.');
      }
      
      console.error('Response not ok, status:', response.status);
    }
    
    return response;
  } catch (error) {
    console.error('Request error:', error);
    
    // If it's our session expired error, re-throw it
    if (error instanceof Error && error.message.includes('Session expired')) {
      throw error;
    }
    
    console.warn('Mixed content error, trying alternative approach:', error);
    // If mixed content error, we could implement a fallback here
    throw error;
  }
};

export const sendLogin = async (input: { identifier: string; password: string; remember_me?: boolean }) => {
  // Send as JSON to include remember_me
  const res = await fetch(`${API_BASE_URL}/api/auth/jwt/login`, {
    method: 'POST',
    mode: 'cors',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: input.identifier, // Backend expects 'username' field but accepts username OR email
      password: input.password,
      remember_me: input.remember_me || false
    }),
    credentials: 'include',
  });
  
  if (!res.ok) {
    try {
      const errorData = await res.json();
      const errorMessage = errorData.detail || 'Login failed';
      console.log('Error message from backend:', errorMessage);
      throw new Error(errorMessage);
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      // If it's already an Error object with a message, re-throw it
      if (parseError instanceof Error && parseError.message) {
        throw parseError;
      }
      throw new Error('Login failed');
    }
  }
  return res.json();
};

export const sendSignup = async (input: UserInput) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/register`, getFetchOptions('POST', input));
  if (!res.ok) {
    try {
      const errorData = await res.json();
      const errorMessage = errorData.detail || 'Signup failed';
      console.log('Error message from backend:', errorMessage);
      throw new Error(errorMessage);
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      // If it's already an Error object with a message, re-throw it
      if (parseError instanceof Error && parseError.message) {
        throw parseError;
      }
      throw new Error('Signup failed');
    }
  }
  return res.json();
};

export const googleSignIn = async (credential: string, email: string, role: 'parent' | 'professional' = 'parent') => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential}`,
    },
    body: JSON.stringify({ email, role }),
    credentials: 'include',
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      const errorMessage = errorData.detail || 'Google sign-in failed';
      console.log('Error message from backend:', errorMessage);
      throw new Error(errorMessage);
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      // If it's already an Error object with a message, re-throw it
      if (parseError instanceof Error && parseError.message) {
        throw parseError;
      }
      throw new Error('Google sign-in failed');
    }
  }
  return res.json();
};

export const getParentProfile = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/parent`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch parent profile');
  return res.json();
};

export const updateParentProfile = async (profile: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/parent`, getFetchOptions('POST', profile));
  if (!res.ok) throw new Error('Failed to update parent profile');
  return res.json();
};

export const getChildren = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/children`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch children');
  return res.json();
};

export const getParentStats = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/parent/stats`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch parent stats');
  return res.json();
};

export const getParentRecentActivity = async (limit: number = 5) => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/parent/recent-activity?limit=${limit}`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch recent activity');
  return res.json();
};

// Notification preferences
export const getNotificationPreferences = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/settings/notifications`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch notification preferences');
  return res.json();
};

export const updateNotificationPreferences = async (preferences: { in_app_notifications?: boolean; email_notifications?: boolean }) => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/settings/notifications`, {
    method: 'PUT',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(preferences)
  });
  if (!res.ok) throw new Error('Failed to update notification preferences');
  return res.json();
};

export const getParentStatsOld = async () => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/parent/stats`, {
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch parent stats');
  return res.json();
};

export const addChild = async (child: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/children`, getFetchOptions('POST', child));
  if (!res.ok) throw new Error('Failed to add child');
  return res.json();
};

export const updateChild = async (childId: string, child: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/children/${childId}`, getFetchOptions('PUT', child));
  if (!res.ok) throw new Error('Failed to update child');
  return res.json();
};

export const deleteChild = async (childId: string) => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/profile/children/${childId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to delete child');
  return res.json();
};

// Chat and conversation functions
export const getConversations = async () => {
  console.log('🔍 DEBUG getConversations: Starting request...');
  try {
    const res = await makeRequest(`${API_BASE_URL}/api/conversations`, {
      mode: 'cors',
      credentials: 'include'
    });
    
    console.log('🔍 DEBUG getConversations: Response received');
    console.log('  - Status:', res.status);
    console.log('  - Status Text:', res.statusText);
    console.log('  - OK:', res.ok);
    console.log('  - Headers:', Object.fromEntries(res.headers.entries()));
    console.log('  - Has CORS Origin:', res.headers.get('access-control-allow-origin'));
    
    if (!res.ok) {
      console.error('❌ DEBUG getConversations: Response not OK');
      const text = await res.text();
      console.error('  - Error Response Body:', text);
      throw new Error(`Failed to fetch conversations: ${res.status} ${res.statusText}`);
    }
    
    console.log('🔍 DEBUG getConversations: Parsing JSON...');
    const data = await res.json();
    console.log('🔍 DEBUG getConversations: JSON parsed successfully');
    console.log('  - Data type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('  - Data length:', Array.isArray(data) ? data.length : 'N/A');
    console.log('  - Data:', data);
    
    return data;
  } catch (error: unknown) {
    console.error('❌ DEBUG getConversations: Error caught');
    const err = error as Error;
    console.error('  - Error type:', err?.constructor?.name);
    console.error('  - Error message:', err?.message || String(error));
    console.error('  - Error stack:', err?.stack || 'No stack trace');
    throw error;
  }
};

export const getConversationMessages = async (conversationId: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const error: any = new Error('Failed to fetch conversation messages');
    error.response = { status: res.status };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export const sendChat = async (input: { query: string; child_id?: number; conversation_id?: number; manual_agent?: string; enabled_agents?: string[] }) => {
  const res = await makeRequest(`${API_BASE_URL}/api/chat`, getFetchOptions('POST', input));
  if (!res.ok) throw new Error('Failed to send chat message');
  return res.json();
};

export const updateConversationMetadata = async (conversationId: string, metadata: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/conversations/${conversationId}/update-metadata`, getFetchOptions('PUT', metadata));
  if (!res.ok) throw new Error('Failed to update conversation metadata');
  return res.json();
};

export const deleteConversation = async (conversationId: string) => {
  const token = localStorage.getItem('auth_token');
  const res = await makeRequest(`${API_BASE_URL}/api/conversations/${conversationId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
};

// Email verification functions
export const sendVerificationEmail = async (email: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/send-verification-email`, getFetchOptions('POST', { email }));
  if (!res.ok) throw new Error('Failed to send verification email');
  return res.json();
};

export const verifyEmailChangeToken = async (token: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/verify-email-change?token=${token}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Email change verification failed' }));
    throw new Error(errorData.detail || 'Email change verification failed');
  }
  return res.json();
};

export const verifyEmailToken = async (token: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/verify-email?token=${token}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Email verification failed');
  return res.json();
};

// Password reset functions
export const requestPasswordReset = async (email: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/forgot-password`, getFetchOptions('POST', { email }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to request password reset' }));
    throw new Error(errorData.detail || 'Failed to request password reset');
  }
  return res.json();
};

export const verifyResetToken = async (token: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/verify-reset-token`, getFetchOptions('POST', { token }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Invalid or expired reset token' }));
    throw new Error(errorData.detail || 'Invalid or expired reset token');
  }
  return res.json();
};

export const resetPassword = async (token: string, password: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/reset-password`, getFetchOptions('POST', { token, password }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reset password' }));
    throw new Error(errorData.detail || 'Failed to reset password');
  }
  return res.json();
};

// Professional profile functions
export const getProfessionalProfile = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch professional profile');
  return res.json();
};

export const updateProfessionalProfile = async (profile: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional`, getFetchOptions('POST', profile));
  if (!res.ok) throw new Error('Failed to update professional profile');
  return res.json();
};

export const uploadProfessionalDocuments = async (documents: any[]) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional/documents`, getFetchOptions('POST', documents));
  if (!res.ok) throw new Error('Failed to upload documents');
  return res.json();
};

// Promotional materials functions
export const getPromotionalMaterials = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/promotional-materials`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch promotional materials');
  return res.json();
};

export const getPromotionalMaterial = async (id: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/promotional-materials/${id}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch promotional material');
  return res.json();
};

export const createPromotionalMaterial = async (material: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/promotional-materials`, getFetchOptions('POST', material));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create promotional material' }));
    throw new Error(errorData.detail || 'Failed to create promotional material');
  }
  return res.json();
};

export const updatePromotionalMaterial = async (id: number, material: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/promotional-materials/${id}`, getFetchOptions('PUT', material));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update promotional material' }));
    throw new Error(errorData.detail || 'Failed to update promotional material');
  }
  return res.json();
};

export const deletePromotionalMaterial = async (id: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/promotional-materials/${id}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete promotional material' }));
    throw new Error(errorData.detail || 'Failed to delete promotional material');
  }
  return res.json();
};

// Professional services functions
export const getProfessionalServices = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional/services`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch professional services');
  return res.json();
};

export const createProfessionalService = async (service: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional/services`, getFetchOptions('POST', service));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create service' }));
    throw new Error(errorData.detail || 'Failed to create service');
  }
  return res.json();
};

export const updateProfessionalService = async (serviceId: number, service: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional/services/${serviceId}`, getFetchOptions('PUT', service));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update service' }));
    throw new Error(errorData.detail || 'Failed to update service');
  }
  return res.json();
};

export const deleteProfessionalService = async (serviceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/professional/services/${serviceId}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete service' }));
    throw new Error(errorData.detail || 'Failed to delete service');
  }
  return res.json();
};

export const uploadPromotionalImage = async (file: File) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/api/promotional-materials/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - browser will set it automatically with boundary for FormData
    },
    credentials: 'include',
    body: formData,
  });
  
  if (!res.ok) {
    // Handle token expiry (401 Unauthorized)
    if (res.status === 401) {
      console.warn('Token expired or invalid, redirecting to login...');
      
      // Clear expired token and user data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userEmail');
      
      // Redirect to login page
      window.location.href = '/login?session_expired=true';
      
      // Throw error to prevent further processing
      throw new Error('Session expired. Please log in again.');
    }
    
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
    throw new Error(errorData.detail || 'Failed to upload image');
  }
  return res.json();
};

export const uploadProfileImage = async (file: File) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/api/profile/professional/upload-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - browser will set it automatically with boundary for FormData
    },
    credentials: 'include',
    body: formData,
  });
  
  if (!res.ok) {
    // Handle token expiry (401 Unauthorized)
    if (res.status === 401) {
      console.warn('Token expired or invalid, redirecting to login...');
      
      // Clear expired token and user data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userEmail');
      
      // Redirect to login page
      window.location.href = '/login?session_expired=true';
      
      // Throw error to prevent further processing
      throw new Error('Session expired. Please log in again.');
    }
    
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
    throw new Error(errorData.detail || 'Failed to upload image');
  }
  return res.json();
};

// Coordinator functions
export const getCoordinatorStats = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/stats`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch coordinator stats');
  return res.json();
};

export const getCoordinatorApplications = async (filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const url = `${API_BASE_URL}/api/coordinator/applications${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
};

export const getCoordinatorApplication = async (profileId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/applications/${profileId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch application');
  return res.json();
};

export const approveApplication = async (profileId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/applications/${profileId}/approve`, getFetchOptions('PUT', {}));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to approve application' }));
    throw new Error(errorData.detail || 'Failed to approve application');
  }
  return res.json();
};

export const rejectApplication = async (profileId: number, rejectionReason: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/applications/${profileId}/reject`, getFetchOptions('PUT', { rejection_reason: rejectionReason }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reject application' }));
    throw new Error(errorData.detail || 'Failed to reject application');
  }
  return res.json();
};

export const getCoordinatorDirectory = async (filters?: {
  search?: string;
  status?: string;
  location?: string;
  specialization?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.location) params.append('location', filters.location);
  if (filters?.specialization) params.append('specialization', filters.specialization);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const url = `${API_BASE_URL}/api/coordinator/directory${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch directory');
  return res.json();
};

export const getCoordinatorDirectoryProfile = async (profileId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/directory/${profileId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch directory profile');
  return res.json();
};

export const updateCoordinatorDirectoryProfile = async (profileId: number, updates: {
  specializations?: string[];  // Array of specialization tags
  profile_status?: string;
  rejection_reason?: string;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/directory/${profileId}`, getFetchOptions('PUT', updates));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(errorData.detail || 'Failed to update profile');
  }
  return res.json();
};

export const archiveProfessionalProfile = async (profileId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/directory/${profileId}/archive`, getFetchOptions('PUT', {}));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to archive profile' }));
    throw new Error(errorData.detail || 'Failed to archive profile');
  }
  return res.json();
};

export const unarchiveProfessionalProfile = async (profileId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/directory/${profileId}/unarchive`, getFetchOptions('PUT', {}));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to unarchive profile' }));
    throw new Error(errorData.detail || 'Failed to unarchive profile');
  }
  return res.json();
};

export const getCoordinatorPromotions = async (filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const url = `${API_BASE_URL}/api/coordinator/promotions${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch promotions');
  return res.json();
};

export const approvePromotion = async (materialId: number, data: {
  display_start_date: string;
  display_end_date: string;
  display_sequence: number;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/promotions/${materialId}/approve`, getFetchOptions('PUT', data));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to approve promotion' }));
    throw new Error(errorData.detail || 'Failed to approve promotion');
  }
  return res.json();
};

export const rejectPromotion = async (materialId: number, rejectionReason: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/promotions/${materialId}/reject`, getFetchOptions('PUT', { rejection_reason: rejectionReason }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reject promotion' }));
    throw new Error(errorData.detail || 'Failed to reject promotion');
  }
  return res.json();
};

export const updatePromotionDisplaySettings = async (materialId: number, data: {
  display_start_date?: string;
  display_end_date?: string;
  display_sequence?: number;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/coordinator/promotions/${materialId}`, getFetchOptions('PUT', data));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update display settings' }));
    throw new Error(errorData.detail || 'Failed to update display settings');
  }
  return res.json();
};

// Admin functions
export const getAdminUsers = async (filters?: {
  role?: string;
  status?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  
  const url = `${API_BASE_URL}/api/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const getAdminUser = async (userId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
};

export const updateUserRole = async (userId: number, role: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}/role`, getFetchOptions('PUT', { role }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update user role' }));
    throw new Error(errorData.detail || 'Failed to update user role');
  }
  return res.json();
};

export const updateUserStatus = async (userId: number, isActive: boolean) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}/status`, getFetchOptions('PUT', { is_active: isActive }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update user status' }));
    throw new Error(errorData.detail || 'Failed to update user status');
  }
  return res.json();
};

export const getUserActivity = async (userId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}/activity`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch user activity');
  return res.json();
};

export const createAdminUser = async (userData: {
  email: string;
  password: string;
  role: string;
  is_active?: boolean;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users`, getFetchOptions('POST', userData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create user' }));
    throw new Error(errorData.detail || 'Failed to create user');
  }
  return res.json();
};

export const deleteAdminUser = async (userId: number, soft: boolean = true) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}?soft=${soft}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete user' }));
    throw new Error(errorData.detail || 'Failed to delete user');
  }
  return res.json();
};

export const getAdminStats = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/stats`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch stats' }));
    throw new Error(errorData.detail || 'Failed to fetch stats');
  }
  return res.json();
};

export const updateAdminUser = async (userId: number, userData: {
  email?: string;
  password?: string;
  role?: string;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/admin/users/${userId}`, getFetchOptions('PUT', userData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update user' }));
    throw new Error(errorData.detail || 'Failed to update user');
  }
  return res.json();
};

// Diary entry functions
export const getDiaryEntries = async (filters?: {
  start_date?: string;
  end_date?: string;
  child_id?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.child_id) params.append('child_id', filters.child_id.toString());
  
    const url = `${API_BASE_URL}/api/diary/entries${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch diary entries');
  return res.json();
};

export const getDiaryEntry = async (entryId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries/${entryId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch diary entry');
  return res.json();
};

export const createDiaryEntry = async (entry: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries`, getFetchOptions('POST', entry));
  if (!res.ok) throw new Error('Failed to create diary entry');
  return res.json();
};

export const updateDiaryEntry = async (entryId: number, entry: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries/${entryId}`, getFetchOptions('PUT', entry));
  if (!res.ok) throw new Error('Failed to update diary entry');
  return res.json();
};

export const deleteDiaryEntry = async (entryId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries/${entryId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete diary entry');
  return res.json();
};

// Diary draft functions
export const getDiaryDrafts = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/drafts`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch diary drafts');
  return res.json();
};

export const getDiaryDraft = async (draftId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/drafts/${draftId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch diary draft');
  return res.json();
};

export const createDiaryDraft = async (draft: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/drafts`, getFetchOptions('POST', draft));
  if (!res.ok) throw new Error('Failed to create diary draft');
  return res.json();
};

export const updateDiaryDraft = async (draftId: number, draft: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/drafts/${draftId}`, getFetchOptions('PUT', draft));
  if (!res.ok) throw new Error('Failed to update diary draft');
  return res.json();
};

export const deleteDiaryDraft = async (draftId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/drafts/${draftId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete diary draft');
  return res.json();
};

// Diary Attachments API functions
export const getDiaryAttachments = async (entryId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries/${entryId}/attachments`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch diary attachments');
  return res.json();
};

export const deleteDiaryAttachment = async (attachmentId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/attachments/${attachmentId}`, getFetchOptions('DELETE'));
  if (!res.ok) throw new Error('Failed to delete diary attachment');
  return res.json();
};

export const updateDiaryAttachment = async (attachmentId: number, attachmentData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/attachments/${attachmentId}`, getFetchOptions('PUT', attachmentData));
  if (!res.ok) throw new Error('Failed to update diary attachment');
  return res.json();
};

export const createDiaryAttachment = async (entryId: number, attachmentData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/diary/entries/${entryId}/attachments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(attachmentData),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to create diary attachment');
  return res.json();
};

// AI Insights / Monthly Summary functions
export const generateMonthlySummary = async (request: { child_id?: number; month: number; year: number }) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/generate-monthly-summary`, getFetchOptions('POST', request));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate monthly summary' }));
    throw new Error(errorData.detail || 'Failed to generate monthly summary');
  }
  return res.json();
};

export const getMonthlySummaries = async (child_id?: number, saved_only: boolean = true) => {
  const params = new URLSearchParams();
  if (child_id !== undefined) params.append('child_id', child_id.toString());
  if (saved_only !== undefined) params.append('saved_only', saved_only.toString());
  
  const url = `${API_BASE_URL}/api/insights/monthly-summaries${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch monthly summaries');
  return res.json();
};

export const generateWeeklySummary = async (request: { child_id?: number; week_start: string; week_end: string }) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/generate-weekly-summary`, getFetchOptions('POST', request));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate weekly summary' }));
    throw new Error(errorData.detail || 'Failed to generate weekly summary');
  }
  return res.json();
};

export const getWeeklySummaries = async (child_id?: number, saved_only: boolean = true) => {
  const params = new URLSearchParams();
  if (child_id !== undefined) params.append('child_id', child_id.toString());
  if (saved_only !== undefined) params.append('saved_only', saved_only.toString());
  
  const url = `${API_BASE_URL}/api/insights/weekly-summaries${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch weekly summaries');
  return res.json();
};

export const getInsight = async (insightId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/${insightId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch insight');
  return res.json();
};

export const saveInsight = async (insightId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/${insightId}/save`, {
    method: 'PATCH',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to save insight');
  return res.json();
};

export const markInsightAsRead = async (insightId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/${insightId}/mark-read`, {
    method: 'PATCH',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to mark insight as read');
  return res.json();
};

export const deleteInsight = async (insightId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/insights/${insightId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete insight');
  return res.json();
};

// Community API functions
export const getCommunities = async (filters?: {
  search?: string;
  age_group?: string;
  stage?: string;
  topics?: string[];
}) => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.age_group && filters.age_group !== 'all') params.append('age_group', filters.age_group);
  if (filters?.stage && filters.stage !== 'all') params.append('stage', filters.stage);
  if (filters?.topics && filters.topics.length > 0) {
    filters.topics.forEach(topic => params.append('topics', topic));
  }
  
  const url = `${API_BASE_URL}/api/communities${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch communities');
  return res.json();
};

export const getCommunityById = async (communityId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities/${communityId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch community');
  return res.json();
};

export const createCommunity = async (community: {
  name: string;
  description: string;
  cover_image_url?: string;
  rules?: string[];
  topics?: string[];
  age_groups?: string[];
  stages?: string[];
  moderators?: string[];
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities`, getFetchOptions('POST', community));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create community' }));
    throw new Error(errorData.detail || 'Failed to create community');
  }
  return res.json();
};

export const updateCommunity = async (communityId: number, community: {
  name: string;
  description: string;
  cover_image_url?: string | null;
  rules?: string[];
  topics?: string[];
  age_groups?: string[];
  stages?: string[];
  moderators?: string[];
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities/${communityId}`, getFetchOptions('PUT', community));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update community' }));
    throw new Error(errorData.detail || 'Failed to update community');
  }
  return res.json();
};

export const deleteCommunity = async (communityId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities/${communityId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete community');
  return res.json();
};

export const joinCommunity = async (communityId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities/${communityId}/join`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to join community' }));
    throw new Error(errorData.detail || 'Failed to join community');
  }
  return res.json();
};

export const leaveCommunity = async (communityId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/communities/${communityId}/leave`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to leave community');
  return res.json();
};

export const getCommunityMembers = async (communityId: number, search?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  
  const url = `${API_BASE_URL}/api/communities/${communityId}/members${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch community members');
  return res.json();
};


export const getTaxonomies = async (taxonomyType?: 'age_group' | 'stage' | 'topic', onlyInUse: boolean = true) => {
  const params = new URLSearchParams();
  if (taxonomyType) params.append('taxonomy_type', taxonomyType);
  if (onlyInUse) params.append('only_in_use', 'true');
  
  const url = `${API_BASE_URL}/api/communities/taxonomies/all${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch taxonomies');
  return res.json();
};

export const searchUsers = async (query: string) => {
  const params = new URLSearchParams();
  params.append('query', query);
  
  const url = `${API_BASE_URL}/api/communities/users/search?${params.toString()}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to search users');
  return res.json();
};

export const uploadCommunityCoverImage = async (file: File): Promise<{ url: string }> => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/api/communities/upload-cover-image`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
    throw new Error(errorData.detail || 'Failed to upload image');
  }
  
  return res.json();
};

export const uploadPostImage = async (file: File): Promise<{ url: string }> => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE_URL}/api/posts/upload-image`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
    throw new Error(errorData.detail || 'Failed to upload image');
  }
  
  return res.json();
};

// Posts API functions
export const getPosts = async (filters?: {
  community_id?: number;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.community_id) params.append('community_id', filters.community_id.toString());
  if (filters?.search) params.append('search', filters.search);
  
  const url = `${API_BASE_URL}/api/posts${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
};

export const getPost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
};

export const createPost = async (post: {
  community_id: number;
  title: string;
  body: string;
  attachments?: Array<{
    url: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
  }>;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts`, getFetchOptions('POST', post));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create post' }));
    throw new Error(errorData.detail || 'Failed to create post');
  }
  return res.json();
};

export const updatePost = async (postId: number, post: {
  community_id: number;
  title: string;
  body: string;
  attachments?: Array<{
    url: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
  }>;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}`, getFetchOptions('PUT', post));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update post' }));
    throw new Error(errorData.detail || 'Failed to update post');
  }
  return res.json();
};

export const deletePost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete post');
  return res.json();
};

export const likePost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to like post');
  return res.json();
};

export const createComment = async (postId: number, comment: {
  body: string;
  parent_comment_id?: number;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}/comments`, getFetchOptions('POST', comment));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create comment' }));
    throw new Error(errorData.detail || 'Failed to create comment');
  }
  return res.json();
};

export const likeComment = async (commentId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/comments/${commentId}/like`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to like comment');
  return res.json();
};

export const savePost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}/save`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to save post');
  return res.json();
};

export const pinPost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}/pin`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to pin post');
  }
  return res.json();
};

export const unpinPost = async (postId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/${postId}/unpin`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to unpin post');
  }
  return res.json();
};


export const getMyActivity = async (communityId?: number, activityType?: 'all' | 'created' | 'commented') => {
  const params = new URLSearchParams();
  if (communityId) params.append('community_id', communityId.toString());
  if (activityType) params.append('activity_type', activityType);
  
  const url = `${API_BASE_URL}/api/posts/activity/my${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch my activity');
  return res.json();
};

export const getMyActivityCommunities = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/activity/my/communities`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch my activity communities');
  return res.json();
};

export const getSavedPosts = async (communityId?: number, topics?: string[]) => {
  const params = new URLSearchParams();
  if (communityId) params.append('community_id', communityId.toString());
  if (topics && topics.length > 0) {
    topics.forEach(topic => params.append('topics', topic));
  }
  
  const url = `${API_BASE_URL}/api/posts/saved/my${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch saved posts');
  return res.json();
};

export const getSavedPostsCommunities = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/saved/my/communities`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch saved posts communities');
  return res.json();
};

export const getSavedPostsTopics = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/saved/my/topics`, {
    mode: 'cors',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch saved posts topics');
  return res.json();
};

export const submitReport = async (report: {
  entity_type: 'post' | 'comment' | 'community' | 'user';
  entity_id: number;
  reason: string;
  details?: string;
}) => {
  const res = await makeRequest(`${API_BASE_URL}/api/posts/reports`, getFetchOptions('POST', report));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to submit report' }));
    throw new Error(errorData.detail || 'Failed to submit report');
  }
  return res.json();
};

// Private Messaging API Functions
export const getPrivateConversations = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/messages/conversations`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch conversations' }));
    throw new Error(errorData.detail || 'Failed to fetch conversations');
  }
  return res.json();
};

export const getPrivateConversationMessages = async (conversationId: number, page: number = 1, limit: number = 50) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    getFetchOptions('GET')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch messages' }));
    throw new Error(errorData.detail || 'Failed to fetch messages');
  }
  return res.json();
};

export const sendMessage = async (conversationId: number, content: string, attachments?: string[]) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/conversations/${conversationId}/messages`,
    getFetchOptions('POST', { content, attachments })
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to send message' }));
    throw new Error(errorData.detail || 'Failed to send message');
  }
  return res.json();
};

export const createPrivateConversation = async (recipientId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/conversations`,
    getFetchOptions('POST', { recipient_id: recipientId })
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create conversation' }));
    throw new Error(errorData.detail || 'Failed to create conversation');
  }
  return res.json();
};

export const markPrivateConversationRead = async (conversationId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/conversations/${conversationId}/read`,
    getFetchOptions('PUT')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to mark conversation as read' }));
    throw new Error(errorData.detail || 'Failed to mark conversation as read');
  }
  return res.json();
};

export const deletePrivateConversation = async (conversationId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/conversations/${conversationId}`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete conversation' }));
    throw new Error(errorData.detail || 'Failed to delete conversation');
  }
  return res.json();
};

export const searchUsersForMessage = async (query: string) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/users/search?q=${encodeURIComponent(query)}`,
    getFetchOptions('GET')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to search users' }));
    throw new Error(errorData.detail || 'Failed to search users');
  }
  return res.json();
};

export const uploadMessageAttachment = async (messageId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE_URL}/api/messages/attachments/${messageId}/upload`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload attachment' }));
    throw new Error(errorData.detail || 'Failed to upload attachment');
  }
  return res.json();
};

export const addMessageReaction = async (messageId: number, reactionType: string) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/reactions/${messageId}`,
    getFetchOptions('POST', { reaction_type: reactionType })
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to add reaction' }));
    throw new Error(errorData.detail || 'Failed to add reaction');
  }
  return res.json();
};

export const removeMessageReaction = async (messageId: number, reactionType: string) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/reactions/${messageId}/${reactionType}`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to remove reaction' }));
    throw new Error(errorData.detail || 'Failed to remove reaction');
  }
  return res.json();
};

export const getMessageReactions = async (messageId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/reactions/${messageId}`,
    getFetchOptions('GET')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to get reactions' }));
    throw new Error(errorData.detail || 'Failed to get reactions');
  }
  return res.json();
};

// Notifications API
export const getNotifications = async (filter?: string) => {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') {
    params.append('filter', filter);
  }
  const url = `${API_BASE_URL}/api/notifications${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await makeRequest(url, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to get notifications' }));
    throw new Error(errorData.detail || 'Failed to get notifications');
  }
  return res.json();
};

export const getUnreadNotificationCount = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/notifications/unread/count`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to get unread count' }));
    throw new Error(errorData.detail || 'Failed to get unread count');
  }
  return res.json();
};

export const markNotificationAsRead = async (notificationId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    getFetchOptions('PUT')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to mark notification as read' }));
    throw new Error(errorData.detail || 'Failed to mark notification as read');
  }
  return res.json();
};

export const markNotificationAsUnread = async (notificationId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/notifications/${notificationId}/unread`,
    getFetchOptions('PUT')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to mark notification as unread' }));
    throw new Error(errorData.detail || 'Failed to mark notification as unread');
  }
  return res.json();
};

export const markAllNotificationsAsRead = async () => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/notifications/read-all`,
    getFetchOptions('PUT')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to mark all notifications as read' }));
    throw new Error(errorData.detail || 'Failed to mark all notifications as read');
  }
  return res.json();
};

export const deleteNotification = async (notificationId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/notifications/${notificationId}`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete notification' }));
    throw new Error(errorData.detail || 'Failed to delete notification');
  }
  return res.json();
};

export const deleteAllNotifications = async () => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/notifications/all`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete all notifications' }));
    throw new Error(errorData.detail || 'Failed to delete all notifications');
  }
  return res.json();
};

export const deletePrivateMessage = async (messageId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/messages/messages/${messageId}`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete message' }));
    throw new Error(errorData.detail || 'Failed to delete message');
  }
  return res.json();
};

// Public Professional Directory functions (no authentication required)
export const getPublicProfessionals = async (filters?: {
  search?: string;
  city?: string;
  state?: string;
  specialization?: string;
  developmental_stage?: string;
  language?: string;
  availability?: string;
  service_category?: string;
  service_type?: string;
  price_range?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.city) params.append('city', filters.city);
  if (filters?.state) params.append('state', filters.state);
  if (filters?.specialization) params.append('specialization', filters.specialization);
  if (filters?.developmental_stage) params.append('developmental_stage', filters.developmental_stage);
  if (filters?.language) params.append('language', filters.language);
  if (filters?.availability) params.append('availability', filters.availability);
  if (filters?.service_category) params.append('service_category', filters.service_category);
  if (filters?.service_type) params.append('service_type', filters.service_type);
  if (filters?.price_range) params.append('price_range', filters.price_range);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.sort) params.append('sort', filters.sort);
  
  const url = `${API_BASE_URL}/api/public/professionals${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch professionals' }));
    throw new Error(errorData.detail || 'Failed to fetch professionals');
  }
  return res.json();
};

export const getPublicProfessionalDetail = async (professionalId: number) => {
  const res = await fetch(`${API_BASE_URL}/api/public/professionals/${professionalId}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch professional detail' }));
    throw new Error(errorData.detail || 'Failed to fetch professional detail');
  }
  return res.json();
};

export const getPublicPromotionalBanners = async (limit?: number) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  
  const url = `${API_BASE_URL}/api/public/promotional-banners${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch promotional banners' }));
    throw new Error(errorData.detail || 'Failed to fetch promotional banners');
  }
  return res.json();
};

// Saved Professionals API functions
export const saveProfessional = async (professionalId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/saved-professionals/${professionalId}`, getFetchOptions('POST'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to save professional' }));
    throw new Error(errorData.detail || 'Failed to save professional');
  }
  return res.json();
};

export const unsaveProfessional = async (professionalId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/saved-professionals/${professionalId}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to unsave professional' }));
    throw new Error(errorData.detail || 'Failed to unsave professional');
  }
  return res.json();
};

export const getSavedProfessionalsList = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/profile/saved-professionals`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to get saved professionals' }));
    throw new Error(errorData.detail || 'Failed to get saved professionals');
  }
  return res.json();
};

// Resources API functions (for parent users)
export const getResources = async (filters?: {
  status?: string;
  category?: string;
  resource_type?: string;
  search?: string;
  featured?: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.resource_type) params.append('resource_type', filters.resource_type);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
  
  const url = `${API_BASE_URL}/api/resources${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch resources' }));
    throw new Error(errorData.detail || 'Failed to fetch resources');
  }
  return res.json();
};

export const getResourceDetail = async (resourceId: number) => {
  const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch resource detail' }));
    throw new Error(errorData.detail || 'Failed to fetch resource detail');
  }
  return res.json();
};

// Saved Resources API functions (for parent users)
export const saveResource = async (resourceId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/resources/${resourceId}/save`,
    getFetchOptions('POST')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to save resource' }));
    throw new Error(errorData.detail || 'Failed to save resource');
  }
  return res.json();
};

export const unsaveResource = async (resourceId: number) => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/resources/${resourceId}/save`,
    getFetchOptions('DELETE')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to unsave resource' }));
    throw new Error(errorData.detail || 'Failed to unsave resource');
  }
  return res.json();
};

export const getSavedResourcesList = async () => {
  const res = await makeRequest(
    `${API_BASE_URL}/api/resources/saved`,
    getFetchOptions('GET')
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch saved resources' }));
    throw new Error(errorData.detail || 'Failed to fetch saved resources');
  }
  return res.json();
};

// Content Manager Resources API functions
export const getContentManagerResources = async (filters?: {
  status?: string;
  category?: string;
  resource_type?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.resource_type) params.append('resource_type', filters.resource_type);
  if (filters?.search) params.append('search', filters.search);
  
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources?${params.toString()}`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch resources' }));
    throw new Error(errorData.detail || 'Failed to fetch resources');
  }
  return res.json();
};

export const getContentManagerResource = async (resourceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch resource' }));
    throw new Error(errorData.detail || 'Failed to fetch resource');
  }
  return res.json();
};

export const createResource = async (resourceData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources`, getFetchOptions('POST', resourceData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create resource' }));
    throw new Error(errorData.detail || 'Failed to create resource');
  }
  return res.json();
};

export const updateResource = async (resourceId: number, resourceData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}`, getFetchOptions('PUT', resourceData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update resource' }));
    throw new Error(errorData.detail || 'Failed to update resource');
  }
  return res.json();
};

export const deleteResource = async (resourceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete resource' }));
    throw new Error(errorData.detail || 'Failed to delete resource');
  }
  return res.json();
};

export const publishResource = async (resourceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}/publish`, getFetchOptions('PUT'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to publish resource' }));
    throw new Error(errorData.detail || 'Failed to publish resource');
  }
  return res.json();
};

export const unpublishResource = async (resourceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}/unpublish`, getFetchOptions('PUT'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to unpublish resource' }));
    throw new Error(errorData.detail || 'Failed to unpublish resource');
  }
  return res.json();
};

export const toggleFeaturedResource = async (resourceId: number, featured: boolean, featuredOrder?: number | null) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}/feature`, getFetchOptions('PUT', { featured, featured_order: featuredOrder }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update featured status' }));
    throw new Error(errorData.detail || 'Failed to update featured status');
  }
  return res.json();
};

// Resource Attachments API functions
export const getResourceAttachments = async (resourceId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}/attachments`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch attachments' }));
    throw new Error(errorData.detail || 'Failed to fetch attachments');
  }
  return res.json();
};

export const createResourceAttachment = async (resourceId: number, attachmentData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/resources/${resourceId}/attachments`, getFetchOptions('POST', attachmentData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create attachment' }));
    throw new Error(errorData.detail || 'Failed to create attachment');
  }
  return res.json();
};

export const updateResourceAttachment = async (attachmentId: number, attachmentData: any) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/attachments/${attachmentId}`, getFetchOptions('PUT', attachmentData));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update attachment' }));
    throw new Error(errorData.detail || 'Failed to update attachment');
  }
  return res.json();
};

export const deleteResourceAttachment = async (attachmentId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/attachments/${attachmentId}`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete attachment' }));
    throw new Error(errorData.detail || 'Failed to delete attachment');
  }
  return res.json();
};

// Content Manager Reports API functions
export const getContentManagerReports = async (filters?: {
  status?: string;
  report_type?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.report_type) params.append('report_type', filters.report_type);
  
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/reports?${params.toString()}`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch reports' }));
    throw new Error(errorData.detail || 'Failed to fetch reports');
  }
  return res.json();
};

export const getContentManagerReport = async (reportId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/reports/${reportId}`, getFetchOptions('GET'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch report' }));
    throw new Error(errorData.detail || 'Failed to fetch report');
  }
  return res.json();
};

export const resolveReport = async (reportId: number, resolutionNotes?: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/reports/${reportId}/resolve`, getFetchOptions('PUT', { resolution_notes: resolutionNotes }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to resolve report' }));
    throw new Error(errorData.detail || 'Failed to resolve report');
  }
  return res.json();
};

export const dismissReport = async (reportId: number) => {
  const res = await makeRequest(`${API_BASE_URL}/api/content-manager/reports/${reportId}/dismiss`, getFetchOptions('PUT'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to dismiss report' }));
    throw new Error(errorData.detail || 'Failed to dismiss report');
  }
  return res.json();
};

export const deleteOwnAccount = async () => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/delete-account`, getFetchOptions('DELETE'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete account' }));
    throw new Error(errorData.detail || 'Failed to delete account');
  }
  return res.json();
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const res = await makeRequest(`${API_BASE_URL}/api/auth/change-password`, getFetchOptions('POST', {
    current_password: currentPassword,
    new_password: newPassword
  }));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to change password' }));
    throw new Error(errorData.detail || 'Failed to change password');
  }
  return res.json();
};
